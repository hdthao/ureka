"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Calendar, Globe, ChevronDown, Check, Search, X, Loader2 } from 'lucide-react';
import { getReportAction } from '../app/actions';
import { eachDayOfInterval, format, parseISO, subDays } from 'date-fns';

// Helper function to generate default date range (7 days up to today)
const getInitialDates = () => {
  const today = new Date();
  const end = format(today, 'yyyy-MM-dd');
  const start = format(subDays(today, 6), 'yyyy-MM-dd');
  return { start, end };
};

// Component for Individual Stat Card
const StatCard = ({ title, mainValue, subValue, change }) => (
  <div className="stat-card">
    <div className="stat-title">{title}</div>
    <div className="stat-value">{mainValue}</div>
    {subValue && <div className="stat-subvalue">{subValue}</div>}
    {change !== undefined && (
      <div className={`stat-change ${change > 0 ? 'positive' : 'neutral'}`}>
        {change}%
      </div>
    )}
  </div>
);

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  const initialDates = useMemo(() => getInitialDates(), []);

  // Temp date states (bound to input values, changes instantly)
  const [tempStartDate, setTempStartDate] = useState(initialDates.start);
  const [tempEndDate, setTempEndDate] = useState(initialDates.end);

  // Applied date states (only changes when clicking "Apply" or on mount)
  const [appliedStartDate, setAppliedStartDate] = useState(initialDates.start);
  const [appliedEndDate, setAppliedEndDate] = useState(initialDates.end);

  // Toggle label visibility states
  const [visibleDaily, setVisibleDaily] = useState({
    'Revenues (USD)': true,
    'Inventory': true,
  });

  const [visibleSites, setVisibleSites] = useState({
    'pageview': true,
    'Revenues (USD)': true,
  });

  const [visibleFormats, setVisibleFormats] = useState({
    'Series 1': true,
    'Revenues (USD)': true,
  });

  // Dropdown open/close state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Search filter query inside the dropdown
  const [siteSearchQuery, setSiteSearchQuery] = useState('');

  // Selected websites state
  const [selectedSites, setSelectedSites] = useState(null);

  const fetchDashboardData = async (startStr, endStr) => {
    try {
      setLoading(true);
      setError(null);
      // Ensure token exists
      const token = localStorage.getItem('ureka_token');
      if (!token) {
        router.push('/');
        return;
      }

      const apiStartDate = startStr.replace(/-/g, '/');
      const apiEndDate = endStr.replace(/-/g, '/');

      const res = await getReportAction(token, apiStartDate, apiEndDate);
      if (res && res.data) {
        setData(res.data);
      } else {
        setData([]);
      }
    } catch (err) {
      if (err.response && err.response.status === 401) {
        router.push('/'); // Redirect to login on unauth
      }
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch only when applied dates change (on mount & on Apply click)
  useEffect(() => {
    fetchDashboardData(appliedStartDate, appliedEndDate);
  }, [appliedStartDate, appliedEndDate]);

  // Extract all unique sites from raw data
  const allSites = useMemo(() => {
    const sites = new Set();
    data.forEach(item => {
      if (item.sites_name) {
        sites.add(item.sites_name);
      }
    });
    return Array.from(sites).sort();
  }, [data]);

  // Sync selectedSites with allSites on data fetch
  useEffect(() => {
    setSelectedSites(prev => {
      if (!prev || prev.length === 0) return allSites;
      // Keep only selection that exists in new allSites list
      const filtered = prev.filter(site => allSites.includes(site));
      return filtered.length > 0 ? filtered : allSites;
    });
  }, [allSites]);

  // Filter websites options inside the dropdown based on search query
  const filteredSitesOptions = useMemo(() => {
    if (!siteSearchQuery.trim()) return allSites;
    const query = siteSearchQuery.toLowerCase();
    return allSites.filter(site => site.toLowerCase().includes(query));
  }, [allSites, siteSearchQuery]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Clear search query when dropdown closes
  useEffect(() => {
    if (!dropdownOpen) {
      setSiteSearchQuery('');
    }
  }, [dropdownOpen]);

  const handleToggleSite = (site) => {
    setSelectedSites(prev => {
      if (!prev) return [site];
      if (prev.includes(site)) {
        return prev.filter(s => s !== site);
      } else {
        return [...prev, site].sort();
      }
    });
  };

  // Filtered data based on selection
  const filteredData = useMemo(() => {
    if (!selectedSites) return data;
    return data.filter(item => selectedSites.includes(item.sites_name));
  }, [data, selectedSites]);

  // Compute Aggregates
  const { summary, dailyData, siteData, formatData } = useMemo(() => {
    let inventoryTotal = 0;
    let revenuesTotal = 0;
    let pageviewTotal = 0;

    const dailyMap = {};
    const siteMap = {};
    const formatMap = {};
    const seenSiteDate = new Set();

    filteredData.forEach(item => {
      // Summary Inventory & Revenues (sum of all adunit records)
      inventoryTotal += item.inventory || 0;
      revenuesTotal += item.revenues || 0;

      // Summary Pageview (unique per site + date)
      const siteDateKey = `${item.sites_name}_${item.date}`;
      if (!seenSiteDate.has(siteDateKey)) {
        seenSiteDate.add(siteDateKey);
        pageviewTotal += item.pageview || 0;
      }

      // Daily
      const date = item.date;
      if (!dailyMap[date]) dailyMap[date] = { name: date, Inventory: 0, 'Revenues (USD)': 0 };
      dailyMap[date].Inventory += item.inventory || 0;
      dailyMap[date]['Revenues (USD)'] += item.revenues || 0;

      // Site
      const site = item.sites_name;
      if (!siteMap[site]) {
        siteMap[site] = { name: site, pageview: 0, 'Revenues (USD)': 0, _datesSeen: new Set() };
      }
      siteMap[site]['Revenues (USD)'] += item.revenues || 0;
      if (!siteMap[site]._datesSeen.has(item.date)) {
        siteMap[site]._datesSeen.add(item.date);
        siteMap[site].pageview += item.pageview || 0;
      }

      // Format (extracted from adunits_name)
      const format = item.adunits_name ? item.adunits_name.split('_')[0] : 'Unknown';
      if (!formatMap[format]) formatMap[format] = { name: format, 'Series 1': 0, 'Revenues (USD)': 0 };
      formatMap[format]['Revenues (USD)'] += item.revenues || 0;
      formatMap[format]['Series 1'] += item.inventory || 0;
    });

    // Format Pageview main value (e.g. 3.52k) and sub value (e.g. 3,518)
    const pageviewMain = pageviewTotal >= 1000 
      ? (pageviewTotal / 1000).toFixed(2) + 'k' 
      : pageviewTotal.toString();
    const pageviewSub = pageviewTotal.toLocaleString('en-US');

    // Format Inventory main value (e.g. 14.73k) and sub value (e.g. 14,731)
    const inventoryMain = inventoryTotal >= 1000 
      ? (inventoryTotal / 1000).toFixed(2) + 'k' 
      : inventoryTotal.toString();
    const inventorySub = inventoryTotal.toLocaleString('en-US');

    // VRPM = (Revenues / Pageview) * 1000
    const vrpmValue = pageviewTotal > 0 ? ((revenuesTotal / pageviewTotal) * 1000).toFixed(2) : '0.00';

    // Populate all dates in the range with 0 if no data exists in dailyMap
    let dailyList = [];
    try {
      let start = parseISO(appliedStartDate);
      let end = parseISO(appliedEndDate);

      // Calculate difference in days to pad if range is too small to curve
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 2) {
        const paddedStart = new Date(start);
        paddedStart.setDate(paddedStart.getDate() - 1);
        const paddedEnd = new Date(end);
        paddedEnd.setDate(paddedEnd.getDate() + 1);

        start = paddedStart;
        end = paddedEnd;
      }

      const allDates = eachDayOfInterval({ start, end }).map(d => format(d, 'yyyy-MM-dd'));

      dailyList = allDates.map(dateStr => {
        if (dailyMap[dateStr]) {
          return dailyMap[dateStr];
        }
        return {
          name: dateStr,
          Inventory: 0,
          'Revenues (USD)': 0
        };
      });
    } catch (e) {
      dailyList = Object.values(dailyMap).sort((a, b) => a.name.localeCompare(b.name));
    }

    return {
      summary: {
        inventory: inventoryMain,
        inventoryRaw: inventorySub,
        revenues: revenuesTotal.toFixed(1) + ' $',
        revenuesRaw: revenuesTotal.toFixed(2),
        pageview: pageviewMain,
        pageviewSub: pageviewSub,
        vrpm: vrpmValue
      },
      dailyData: dailyList,
      siteData: Object.values(siteMap),
      formatData: Object.values(formatMap)
    };
  }, [filteredData, appliedStartDate, appliedEndDate]);

  const handleApplyFilter = () => {
    if (!tempStartDate || !tempEndDate) {
      setError("Vui lòng chọn đầy đủ cả Ngày Bắt đầu và Ngày Kết thúc!");
      return;
    }

    const start = new Date(tempStartDate);
    const end = new Date(tempEndDate);
    if (start > end) {
      setError("Ngày bắt đầu không được lớn hơn ngày kết thúc!");
      return;
    }

    // Clear any previous error and apply
    setError(null);
    setAppliedStartDate(tempStartDate);
    setAppliedEndDate(tempEndDate);
  };

  // Toggle handlers
  const handleDailyLegendClick = (o) => {
    const { dataKey } = o;
    setVisibleDaily(prev => ({
      ...prev,
      [dataKey]: !prev[dataKey]
    }));
  };

  const handleSitesLegendClick = (o) => {
    const { dataKey } = o;
    setVisibleSites(prev => ({
      ...prev,
      [dataKey]: !prev[dataKey]
    }));
  };

  const handleFormatsLegendClick = (o) => {
    const { dataKey } = o;
    setVisibleFormats(prev => ({
      ...prev,
      [dataKey]: !prev[dataKey]
    }));
  };

  // Custom legend text formatters
  const formatDailyLegend = (value) => {
    const isVisible = visibleDaily[value];
    return (
      <span style={{
        color: isVisible ? '#333' : '#bbb',
        textDecoration: isVisible ? 'none' : 'line-through',
        cursor: 'pointer',
        fontSize: '0.85rem',
        fontWeight: 500
      }}>
        {value}
      </span>
    );
  };

  const formatSitesLegend = (value) => {
    const isVisible = visibleSites[value];
    return (
      <span style={{
        color: isVisible ? '#333' : '#bbb',
        textDecoration: isVisible ? 'none' : 'line-through',
        cursor: 'pointer',
        fontSize: '0.85rem',
        fontWeight: 500
      }}>
        {value}
      </span>
    );
  };

  const formatFormatsLegend = (value) => {
    const isVisible = visibleFormats[value];
    return (
      <span style={{
        color: isVisible ? '#333' : '#bbb',
        textDecoration: isVisible ? 'none' : 'line-through',
        cursor: 'pointer',
        fontSize: '0.85rem',
        fontWeight: 500
      }}>
        {value}
      </span>
    );
  };



  return (
    <div className="main-content">
      <div className="breadcrumb">
        Dashboard / <span className="active">Overview</span>
      </div>

      <div className="page-header" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div className="page-title">Dashboard Overview</div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Website Filter Dropdown */}
          <div className="dropdown-container" ref={dropdownRef}>
            <button
              className={`dropdown-btn ${dropdownOpen ? 'active' : ''}`}
              onClick={() => setDropdownOpen(!dropdownOpen)}
              title="Lọc website"
            >
              <Globe size={15} style={{ color: 'var(--color-accent)' }} />
              <span className="dropdown-btn-text">
                {!selectedSites || selectedSites.length === allSites.length
                  ? 'Tất cả website'
                  : selectedSites.length === 0
                  ? 'Không website nào'
                  : `Website (${selectedSites.length}/${allSites.length})`}
              </span>
              <ChevronDown size={14} style={{
                transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
                color: 'var(--color-text-muted)'
              }} />
            </button>

            {dropdownOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-search-wrapper">
                  <span className="dropdown-search-icon">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    className="dropdown-search-input"
                    placeholder="Tìm kiếm website..."
                    value={siteSearchQuery}
                    onChange={(e) => setSiteSearchQuery(e.target.value)}
                  />
                  {siteSearchQuery && (
                    <button
                      style={{
                        position: 'absolute',
                        right: '8px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--color-text-muted)',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      onClick={() => setSiteSearchQuery('')}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="dropdown-actions">
                  <button
                    className="dropdown-action-btn"
                    onClick={() => setSelectedSites(allSites)}
                  >
                    Chọn tất cả
                  </button>
                  <button
                    className="dropdown-action-btn"
                    onClick={() => setSelectedSites([])}
                  >
                    Bỏ chọn hết
                  </button>
                </div>

                <div className="dropdown-list">
                  {filteredSitesOptions.length > 0 ? (
                    filteredSitesOptions.map((site) => {
                      const isSelected = selectedSites && selectedSites.includes(site);
                      return (
                        <div
                          key={site}
                          className={`dropdown-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleToggleSite(site)}
                        >
                          <div className="dropdown-checkbox">
                            <Check size={12} strokeWidth={3} />
                          </div>
                          <span className="dropdown-text" title={site}>{site}</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="dropdown-no-results">Không tìm thấy website</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="date-picker-wrap" style={{ display: 'flex', gap: '12px', background: 'transparent', padding: 0 }}>
            <input
              type="date"
              value={tempStartDate}
              onChange={(e) => setTempStartDate(e.target.value)}
              style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <span style={{ display: 'flex', alignItems: 'center' }}>&rarr;</span>
            <input
              type="date"
              value={tempEndDate}
              onChange={(e) => setTempEndDate(e.target.value)}
              style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
          <button
            onClick={handleApplyFilter}
            disabled={!tempStartDate || !tempEndDate || loading}
            style={{
              padding: '6px 16px',
              background: (!tempStartDate || !tempEndDate || loading) ? '#ccc' : 'var(--color-accent)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (!tempStartDate || !tempEndDate || loading) ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              minWidth: '76px'
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span>Apply</span>
              </>
            ) : (
              'Apply'
            )}
          </button>
        </div>
      </div>

      {error && <div className="login-error" style={{ marginBottom: '20px' }}>{error}</div>}

      {loading ? (
        <div className="loading-screen" style={{ minHeight: '400px', height: 'auto', padding: '60px 0' }}>
          <div className="spinner"></div>
          <p>Loading Dashboard Data...</p>
        </div>
      ) : selectedSites && selectedSites.length === 0 ? (
        <div className="dashboard-empty-state">
          <Globe size={48} style={{ color: 'var(--color-text-muted)', opacity: 0.5 }} />
          <div className="dashboard-empty-state-title">Chưa chọn Website nào</div>
          <p style={{ maxWidth: '400px', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
            Vui lòng chọn ít nhất một website từ danh sách lọc ở trên để hiển thị dữ liệu thống kê và biểu đồ.
          </p>
          <button 
            className="retry-btn" 
            onClick={() => setSelectedSites(allSites)}
            style={{ marginTop: '8px' }}
          >
            Chọn tất cả website
          </button>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <StatCard 
              title="Inventory" 
              mainValue={summary.inventory} 
              subValue={summary.inventoryRaw} 
              change={0} 
            />
            <StatCard 
              title="Publisher's Revenues (USD)" 
              mainValue={summary.revenues} 
              subValue={summary.revenuesRaw} 
              change={0} 
            />
            <StatCard 
              title="Pageview" 
              mainValue={summary.pageview} 
              subValue={summary.pageviewSub} 
              change={0} 
            />
            <StatCard 
              title="VRPM" 
              mainValue={summary.vrpm} 
              subValue={summary.vrpm} 
              change={0} 
            />
          </div>

          <div className="chart-section">
            <div className="chart-header">Overview Daily</div>
            <div style={{ width: '100%', height: 400 }}>
              <ResponsiveContainer>
                <LineChart data={dailyData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#666' }} dy={10} angle={-45} textAnchor="end" />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" onClick={handleDailyLegendClick} formatter={formatDailyLegend} wrapperStyle={{ bottom: 0, pt: 20 }} />
                  <Line yAxisId="left" type="monotone" dataKey="Revenues (USD)" stroke="#64b5f6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} hide={!visibleDaily['Revenues (USD)']} />
                  <Line yAxisId="right" type="monotone" dataKey="Inventory" stroke="#7952b3" strokeWidth={3} dot={false} activeDot={{ r: 6 }} hide={!visibleDaily['Inventory']} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bottom-grid">
            <div className="chart-section">
              <div className="chart-header">Overview Sites</div>
              <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer>
                  <BarChart data={siteData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#666' }} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="square" onClick={handleSitesLegendClick} formatter={formatSitesLegend} />
                    <Bar yAxisId="left" dataKey="pageview" fill="#64b5f6" radius={[4, 4, 0, 0]} maxBarSize={50} hide={!visibleSites['pageview']} />
                    <Bar yAxisId="right" dataKey="Revenues (USD)" fill="#7952b3" radius={[4, 4, 0, 0]} maxBarSize={50} hide={!visibleSites['Revenues (USD)']} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th className="text-right">revenues</th>
                    <th className="text-right">pageview</th>
                  </tr>
                </thead>
                <tbody>
                  {siteData.map((site, i) => (
                    <tr key={i}>
                      <td>{site.name}</td>
                      <td className="text-right">{site['Revenues (USD)'].toFixed(3)}</td>
                      <td className="text-right">{site.pageview}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="chart-section">
              <div className="chart-header">Overview Formats</div>
              <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer>
                  <BarChart data={formatData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#666' }} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="square" onClick={handleFormatsLegendClick} formatter={formatFormatsLegend} />
                    <Bar yAxisId="left" dataKey="Series 1" fill="#64b5f6" radius={[4, 4, 0, 0]} maxBarSize={50} hide={!visibleFormats['Series 1']} />
                    <Bar yAxisId="right" dataKey="Revenues (USD)" fill="#7952b3" radius={[4, 4, 0, 0]} maxBarSize={50} hide={!visibleFormats['Revenues (USD)']} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th className="text-right">revenues</th>
                  </tr>
                </thead>
                <tbody>
                  {formatData.map((format, i) => (
                    <tr key={i}>
                      <td>{format.name}</td>
                      <td className="text-right">{format['Revenues (USD)'].toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
