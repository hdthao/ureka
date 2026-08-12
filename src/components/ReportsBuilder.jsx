"use client";

import { useState, useEffect } from 'react';
import { ArrowLeft, Download, RefreshCw, BarChart2, Plus, Edit2, Trash2, Save, X, Calendar } from 'lucide-react';
import { 
  getReportsListAction, 
  getReportDetailsAction, 
  createReportAction, 
  updateReportAction, 
  deleteReportAction 
} from '../app/actions';

const SITES_LIST = [
  { id: 106083, name: 'news.pioneerindiya.com' },
  { id: 106095, name: 'feel.pioneerindiya.com' }
];

const AVAILABLE_DIMENSIONS = [
  { key: 'date', label: 'Date' },
  { key: 'sites', label: 'Sites' },
  { key: 'adunits', label: 'Adunits' },
  { key: 'formats', label: 'Formats' }
];

const AVAILABLE_METRICS = [
  { key: 'impressions_dfp', label: 'Inventory' },
  { key: 'pub_revenues', label: 'Publisher Revenues (USD)' },
  { key: 'pageview', label: 'Pageview' },
  { key: 'vrpm', label: 'VRPM' }
];

export default function ReportsBuilder() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // View state: 'list' | 'details' | 'create' | 'edit'
  const [viewMode, setViewMode] = useState('list');
  const [selectedReportId, setSelectedReportId] = useState(null);
  
  // Details view states
  const [reportDetails, setReportDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  // Form states for Create/Edit
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDateRangeType, setFormDateRangeType] = useState('dynamic');
  const [formDateDynamic, setFormDateDynamic] = useState('yesterday');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formDimensions, setFormDimensions] = useState(['date', 'sites']);
  const [formMetrics, setFormMetrics] = useState(['impressions_dfp', 'pub_revenues', 'pageview', 'vrpm']);
  const [formFilters, setFormFilters] = useState([]);
  const [formStatus, setFormStatus] = useState(1);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Custom delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getReportsListAction();
      if (res && res.status && res.list) {
        setReports(res.list);
      } else {
        setError(res?.error || "Unable to fetch reports list.");
      }
    } catch (err) {
      setError("A system error occurred while loading reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleRunReport = async (id) => {
    setViewMode('details');
    setSelectedReportId(id);
    setDetailsLoading(true);
    setDetailsError(null);
    setReportDetails(null);
    try {
      const res = await getReportDetailsAction(id);
      if (res && res.status) {
        setReportDetails(res);
      } else {
        setDetailsError(res?.error || "Unable to load report details.");
      }
    } catch (err) {
      setDetailsError("System error while loading report details.");
    } finally {
      setViewMode('details');
      setDetailsLoading(false);
    }
  };

  const handleInitCreate = () => {
    setFormName('');
    setFormDescription('');
    setFormDateRangeType('dynamic');
    setFormDateDynamic('yesterday');
    setFormStartDate('');
    setFormEndDate('');
    setFormDimensions(['date', 'sites']);
    setFormMetrics(['impressions_dfp', 'pub_revenues', 'pageview', 'vrpm']);
    setFormFilters([]);
    setFormStatus(1);
    setFormError(null);
    setViewMode('create');
  };

  const handleInitEdit = (report) => {
    setFormName(report.name || '');
    setFormDescription(report.description || '');
    setFormDateRangeType(report.date_range_type || 'dynamic');
    setFormDateDynamic(report.date_dynamic || 'yesterday');
    
    // Convert date formats if custom
    if (report.start_date) {
      setFormStartDate(report.start_date.replace(/\//g, '-'));
    } else {
      setFormStartDate('');
    }
    if (report.end_date) {
      setFormEndDate(report.end_date.replace(/\//g, '-'));
    } else {
      setFormEndDate('');
    }

    // Parse dimensions
    let dims = [];
    try {
      dims = typeof report.dimensions === 'string' ? JSON.parse(report.dimensions) : report.dimensions;
    } catch (e) {
      dims = [];
    }
    setFormDimensions(Array.isArray(dims) ? dims : []);

    // Parse metrics
    let mets = [];
    try {
      mets = typeof report.metrics === 'string' ? JSON.parse(report.metrics) : report.metrics;
    } catch (e) {
      mets = [];
    }
    setFormMetrics(Array.isArray(mets) ? mets : []);

    // Parse filters
    let filts = [];
    try {
      filts = typeof report.filters === 'string' ? JSON.parse(report.filters) : report.filters;
    } catch (e) {
      filts = [];
    }
    setFormFilters(Array.isArray(filts) ? filts : []);

    setFormStatus(report.status !== undefined ? report.status : 1);
    setFormError(null);
    setSelectedReportId(report.id);
    setViewMode('edit');
  };

  const handleDeleteReport = (id, name) => {
    setReportToDelete({ id, name });
    setShowDeleteModal(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError("Please enter report name!");
      return;
    }

    if (formDateRangeType === 'custom' && (!formStartDate || !formEndDate)) {
      setFormError("Please select both start date and end date for Custom configuration!");
      return;
    }

    if (formDimensions.length === 0 && formMetrics.length === 0) {
      setFormError("Please select at least one Dimension or Metric!");
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    const payload = {
      name: formName,
      description: formDescription,
      date_range_type: formDateRangeType,
      date_dynamic: formDateRangeType === 'dynamic' ? formDateDynamic : '',
      start_date: formDateRangeType === 'custom' ? formStartDate.replace(/-/g, '/') : '',
      end_date: formDateRangeType === 'custom' ? formEndDate.replace(/-/g, '/') : '',
      dimensions: formDimensions,
      metrics: formMetrics,
      filters: formFilters,
      status: formStatus
    };

    try {
      let res;
      if (viewMode === 'create') {
        res = await createReportAction(payload);
      } else {
        res = await updateReportAction({ id: selectedReportId, ...payload });
      }

      if (res && res.status) {
        setViewMode('list');
        fetchReports();
      } else {
        setFormError(res?.error || "Unable to save report configuration.");
      }
    } catch (err) {
      setFormError("System error while saving report configuration.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleDimension = (dimKey) => {
    setFormDimensions(prev => 
      prev.includes(dimKey) ? prev.filter(k => k !== dimKey) : [...prev, dimKey]
    );
  };

  const handleToggleMetric = (metKey) => {
    setFormMetrics(prev => 
      prev.includes(metKey) ? prev.filter(k => k !== metKey) : [...prev, metKey]
    );
  };

  const handleToggleFilter = (siteId) => {
    setFormFilters(prev => 
      prev.includes(siteId) ? prev.filter(id => id !== siteId) : [...prev, siteId]
    );
  };

  const handleExportCSV = () => {
    if (!reportDetails || !reportDetails.result) return;
    
    const { report, result, summary } = reportDetails;
    
    const labelMap = {
      date: 'Date',
      sites: 'Sites',
      impressions_dfp: 'Inventory',
      pub_revenues: 'Publisher Revenues (USD)',
      pageview: 'Pageview',
      vrpm: 'VRPM'
    };

    const headers = [
      ...report.dimensions.map(d => labelMap[d] || d),
      ...report.metrics.map(m => labelMap[m] || m)
    ];

    const rows = result.map(item => {
      return [
        ...report.dimensions.map(d => {
          if (d === 'sites') return item.sites_name || '-';
          return item[d] || '-';
        }),
        ...report.metrics.map(m => {
          if (m === 'pub_revenues') return (item[m] || 0).toFixed(2);
          return item[m] !== undefined ? item[m] : 0;
        })
      ];
    });

    if (summary) {
      const summaryRow = [
        ...report.dimensions.map(() => '-'),
        ...report.metrics.map(m => {
          if (m === 'pub_revenues') return (summary[m] || 0).toFixed(2);
          return summary[m] !== undefined ? summary[m] : 0;
        })
      ];
      if (summaryRow.length > 0) summaryRow[0] = 'Total';
      rows.push(summaryRow);
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${report.name || 'report'}_details.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDateField = (reportItem) => {
    if (reportItem.date_range_type === 'dynamic') {
      return (
        <div>
          <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>Type: Dynamic</span>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
            {reportItem.date_dynamic || 'today'}
          </div>
        </div>
      );
    }
    return (
      <div style={{ color: 'var(--color-text-main)' }}>
        {reportItem.start_date} &rarr; {reportItem.end_date}
      </div>
    );
  };

  const formatCell = (key, val, rowData) => {
    if (key === 'pub_revenues') {
      return `$${Number(val || 0).toFixed(2)}`;
    }
    if (key === 'vrpm') {
      return Number(val || 0).toFixed(3);
    }
    if (key === 'sites') {
      return rowData.sites_name || '-';
    }
    if (key === 'adunits') {
      return rowData.adunits_name || '-';
    }
    if (key === 'formats') {
      return rowData.formats || (rowData.adunits_name ? rowData.adunits_name.split('_')[0] : '-');
    }
    return val !== undefined ? val : '-';
  };

  // ================= VIEW: CREATE OR EDIT FORM =================
  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <div className="main-content">
        <div className="breadcrumb" style={{ marginBottom: '20px' }}>
          Reports / <span className="active">{viewMode === 'create' ? 'Create Report' : 'Edit Report'}</span>
        </div>

        <div className="chart-section" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              {viewMode === 'create' ? 'Create Report Configuration' : 'Edit Report Configuration'}
            </h2>
            <button 
              className="retry-btn" 
              onClick={() => setViewMode('list')} 
              style={{ background: '#757575', padding: '6px 12px', fontSize: '0.85rem' }}
            >
              Back to list
            </button>
          </div>

          {formError && (
            <div style={{ padding: '12px 16px', background: '#ffebee', borderLeft: '4px solid #f44336', color: '#c62828', borderRadius: '4px', marginBottom: '20px', fontSize: '0.9rem' }}>
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Name & Description */}
            <div style={{ background: '#fafafa', padding: '16px', borderRadius: '8px', border: '1px solid #eaeaea' }}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px', display: 'block' }}>Report Name <span style={{ color: 'red' }}>*</span></label>
                <input 
                  type="text" 
                  value={formName} 
                  onChange={(e) => setFormName(e.target.value)} 
                  placeholder="Enter report configuration name..." 
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
                  required
                  disabled={formSubmitting}
                />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px', display: 'block' }}>Description</label>
                <textarea 
                  value={formDescription} 
                  onChange={(e) => setFormDescription(e.target.value)} 
                  placeholder="Enter a short description..." 
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px', minHeight: '80px', fontFamily: 'inherit' }}
                  disabled={formSubmitting}
                />
              </div>
            </div>

            {/* Date Range Configuration */}
            <div style={{ background: '#fafafa', padding: '16px', borderRadius: '8px', border: '1px solid #eaeaea' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={16} /> Date Range
              </h3>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input 
                    type="radio" 
                    name="date_range_type" 
                    checked={formDateRangeType === 'dynamic'} 
                    onChange={() => setFormDateRangeType('dynamic')}
                    disabled={formSubmitting}
                  />
                  Dynamic range
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input 
                    type="radio" 
                    name="date_range_type" 
                    checked={formDateRangeType === 'custom'} 
                    onChange={() => setFormDateRangeType('custom')}
                    disabled={formSubmitting}
                  />
                  Custom range
                </label>
              </div>

              {formDateRangeType === 'dynamic' ? (
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>Select dynamic range</label>
                  <select 
                    value={formDateDynamic} 
                    onChange={(e) => setFormDateDynamic(e.target.value)}
                    style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px', width: '200px' }}
                    disabled={formSubmitting}
                  >
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="last7days">Last 7 days</option>
                    <option value="last30days">Last 30 days</option>
                  </select>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>Start Date</label>
                    <input 
                      type="date" 
                      value={formStartDate} 
                      onChange={(e) => setFormStartDate(e.target.value)}
                      style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
                      disabled={formSubmitting}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>End Date</label>
                    <input 
                      type="date" 
                      value={formEndDate} 
                      onChange={(e) => setFormEndDate(e.target.value)}
                      style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
                      disabled={formSubmitting}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Dimensions */}
            <div style={{ background: '#fafafa', padding: '16px', borderRadius: '8px', border: '1px solid #eaeaea' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px' }}>Dimensions</h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {AVAILABLE_DIMENSIONS.map(dim => {
                  const isSelected = formDimensions.includes(dim.key);
                  return (
                    <button
                      key={dim.key}
                      type="button"
                      onClick={() => handleToggleDimension(dim.key)}
                      disabled={formSubmitting}
                      style={{
                        padding: '6px 16px',
                        border: isSelected ? '1px solid var(--color-accent)' : '1px solid #ccc',
                        borderRadius: '20px',
                        background: isSelected ? 'rgba(33, 150, 243, 0.1)' : 'white',
                        color: isSelected ? 'var(--color-accent)' : '#555',
                        fontWeight: isSelected ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontSize: '0.85rem'
                      }}
                    >
                      {dim.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Metrics */}
            <div style={{ background: '#fafafa', padding: '16px', borderRadius: '8px', border: '1px solid #eaeaea' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px' }}>Metrics</h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {AVAILABLE_METRICS.map(met => {
                  const isSelected = formMetrics.includes(met.key);
                  return (
                    <button
                      key={met.key}
                      type="button"
                      onClick={() => handleToggleMetric(met.key)}
                      disabled={formSubmitting}
                      style={{
                        padding: '6px 16px',
                        border: isSelected ? '1px solid var(--color-accent)' : '1px solid #ccc',
                        borderRadius: '20px',
                        background: isSelected ? 'rgba(33, 150, 243, 0.1)' : 'white',
                        color: isSelected ? 'var(--color-accent)' : '#555',
                        fontWeight: isSelected ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontSize: '0.85rem'
                      }}
                    >
                      {met.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filters (Website filter) */}
            <div style={{ background: '#fafafa', padding: '16px', borderRadius: '8px', border: '1px solid #eaeaea' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px' }}>Website Filter</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {SITES_LIST.map(site => {
                  const isSelected = formFilters.includes(site.id);
                  return (
                    <label 
                      key={site.id} 
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        cursor: 'pointer', 
                        fontSize: '0.9rem',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        background: isSelected ? '#eef5fc' : 'transparent',
                        border: isSelected ? '1px dashed #2196f3' : '1px solid transparent',
                        maxWidth: '300px'
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={isSelected} 
                        onChange={() => handleToggleFilter(site.id)}
                        disabled={formSubmitting}
                      />
                      {site.name}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Submit & Cancel Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <button
                type="submit"
                disabled={formSubmitting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  background: 'var(--color-accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  opacity: formSubmitting ? 0.7 : 1
                }}
              >
                {formSubmitting ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save report</span>
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => setViewMode('list')}
                disabled={formSubmitting}
                style={{
                  padding: '10px 20px',
                  background: 'white',
                  color: '#333',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>

          </form>
        </div>
      </div>
    );
  }

  // ================= VIEW: DETAILED REPORT VIEW =================
  if (viewMode === 'details') {
    const totalCols = reportDetails ? (reportDetails.report.dimensions.length + reportDetails.report.metrics.length) : 1;
    const colWidth = `${(100 / totalCols).toFixed(2)}%`;

    return (
      <div className="main-content">
        <div className="breadcrumb" style={{ marginBottom: '20px' }}>
          Reports / <span className="active">Reports Builder</span>
        </div>

        {detailsLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '12px' }}>
            <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--color-accent)' }} />
            <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Running report...</span>
          </div>
        )}

        {detailsError && (
          <div style={{ padding: '24px', background: '#ffebee', borderRadius: '8px', border: '1px solid #ffcdd2', color: '#c62828', marginBottom: '20px' }}>
            <div style={{ fontWeight: 600, marginBottom: '8px' }}>Error running report</div>
            <p style={{ fontSize: '0.9rem' }}>{detailsError}</p>
            <button className="retry-btn" onClick={() => handleRunReport(selectedReportId)} style={{ marginTop: '12px' }}>Retry</button>
            <button className="retry-btn" onClick={() => setViewMode('list')} style={{ marginTop: '12px', marginLeft: '12px', background: '#757575' }}>Back</button>
          </div>
        )}

        {reportDetails && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '6px' }}>
                Report Name: {reportDetails.report.name}
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                Report Date: <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{reportDetails.report.date_range_type}</span>
                {reportDetails.report.date_range_type === 'dynamic' ? ` - Range: ${reportDetails.report.date_dynamic}` : ` - Range: ${reportDetails.report.start_date} to ${reportDetails.report.end_date}`}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <button 
                onClick={() => setViewMode('list')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: '#2196f3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <ArrowLeft size={16} /> Back
              </button>

              <button 
                onClick={handleExportCSV}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: 'white',
                  color: '#333',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Download size={16} /> Export
              </button>
            </div>

            <div className="chart-section" style={{ padding: '0', overflowX: 'auto' }}>
              <table className="data-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                <thead>
                  <tr>
                    {/* Render Dimensions */}
                    {reportDetails.report.dimensions.map(dim => (
                      <th key={dim} style={{ width: colWidth, textTransform: 'capitalize' }}>
                        {dim === 'sites' ? 'Sites' : dim}
                      </th>
                    ))}
                    {/* Render Metrics */}
                    {reportDetails.report.metrics.map(met => (
                      <th key={met} className="text-right" style={{ width: colWidth, textTransform: 'capitalize' }}>
                        {met === 'impressions_dfp' ? 'Inventory' : met === 'pub_revenues' ? 'Publisher Revenues (USD)' : met === 'pageview' ? 'Pageview' : 'VRPM'}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportDetails.result.map((row, i) => (
                    <tr key={i}>
                      {/* Dimension Cells */}
                      {reportDetails.report.dimensions.map(dim => (
                        <td key={dim} style={{ width: colWidth }}>{formatCell(dim, row[dim], row)}</td>
                      ))}
                      {/* Metric Cells */}
                      {reportDetails.report.metrics.map(met => (
                        <td key={met} className="text-right" style={{ width: colWidth }}>{formatCell(met, row[met], row)}</td>
                      ))}
                    </tr>
                  ))}
                  {/* Summary Row */}
                  {reportDetails.summary && (
                    <tr style={{ fontWeight: 'bold', background: '#fcfcfc', borderTop: '2px solid #eaeaea' }}>
                      {/* Dimension cells for total */}
                      {reportDetails.report.dimensions.map((dim, i) => (
                        <td key={dim} style={{ width: colWidth }}>{i === 0 ? 'Total' : '-'}</td>
                      ))}
                      {/* Metric cells for total */}
                      {reportDetails.report.metrics.map(met => (
                        <td key={met} className="text-right" style={{ width: colWidth }}>
                          {formatCell(met, reportDetails.summary[met], reportDetails.summary)}
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ================= VIEW: LIST OF REPORTS =================
  return (
    <div className="main-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div className="breadcrumb" style={{ margin: 0 }}>
          Reports / <span className="active">Reports Builder</span>
        </div>
        <button
          onClick={handleInitCreate}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            background: 'var(--color-accent)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          <Plus size={16} /> Create Report
        </button>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '12px' }}>
          <RefreshCw className="animate-spin" size={28} style={{ color: 'var(--color-accent)' }} />
          <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Loading reports list...</span>
        </div>
      )}

      {error && (
        <div style={{ padding: '20px', background: '#ffebee', borderRadius: '8px', color: '#c62828', marginBottom: '20px' }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>Error loading reports list</div>
          <p style={{ fontSize: '0.9rem' }}>{error}</p>
          <button className="retry-btn" onClick={fetchReports} style={{ marginTop: '8px' }}>Retry</button>
        </div>
      )}

      {!loading && !error && reports.length === 0 && (
        <div className="dashboard-empty-state" style={{ height: '200px' }}>
          <BarChart2 size={40} style={{ color: 'var(--color-text-muted)', opacity: 0.4 }} />
          <div className="dashboard-empty-state-title" style={{ fontSize: '1rem', marginTop: '8px' }}>No reports found</div>
          <p style={{ fontSize: '0.85rem' }}>No report configurations have been created yet.</p>
        </div>
      )}

      {!loading && !error && reports.length > 0 && (
        <div className="chart-section" style={{ padding: '0', overflowX: 'auto' }}>
          <table className="data-table" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '10%' }}>ID</th>
                <th style={{ width: '30%' }}>Name</th>
                <th style={{ width: '30%' }}>Date</th>
                <th style={{ width: '30%', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td style={{ width: '10%', fontWeight: 600, color: 'var(--color-text-muted)' }}>{report.id}</td>
                  <td style={{ width: '30%', fontWeight: 600, color: 'var(--color-text-main)' }}>{report.name}</td>
                  <td style={{ width: '30%' }}>{formatDateField(report)}</td>
                  <td style={{ width: '30%', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button 
                        onClick={() => handleRunReport(report.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2196f3',
                          cursor: 'pointer',
                          fontWeight: 600,
                          padding: '4px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        View
                      </button>

                      <button 
                        onClick={() => handleInitEdit(report)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ff9800',
                          cursor: 'pointer',
                          fontWeight: 600,
                          padding: '4px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Edit2 size={13} /> Edit
                      </button>

                      <button 
                        onClick={() => handleDeleteReport(report.id, report.name)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#f44336',
                          cursor: 'pointer',
                          fontWeight: 600,
                          padding: '4px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showDeleteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '8px',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px' }}>Confirm Delete</h3>
            <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: '24px' }}>
              Are you sure you want to delete report configuration <strong>"{reportToDelete?.name}"</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setReportToDelete(null);
                }}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  background: 'white',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const id = reportToDelete.id;
                  setShowDeleteModal(false);
                  setReportToDelete(null);
                  try {
                    const res = await deleteReportAction(id);
                    if (res && res.status) {
                      fetchReports();
                    } else {
                      alert(res?.error || "Unable to delete report.");
                    }
                  } catch (err) {
                    alert("System error while deleting report.");
                  }
                }}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  background: '#f44336',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
