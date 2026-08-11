"use client";

import { useState, useEffect } from 'react';
import { ArrowLeft, Download, RefreshCw, BarChart2 } from 'lucide-react';
import { getReportsListAction, getReportDetailsAction } from '../app/actions';

export default function ReportsBuilder() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detail view states
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [reportDetails, setReportDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getReportsListAction();
      if (res && res.status && res.list) {
        setReports(res.list);
      } else {
        setError(res?.error || "Không thể lấy danh sách báo cáo.");
      }
    } catch (err) {
      setError("Đã xảy ra lỗi hệ thống khi tải báo cáo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleView = async (id) => {
    setSelectedReportId(id);
    setDetailsLoading(true);
    setDetailsError(null);
    setReportDetails(null);
    try {
      const res = await getReportDetailsAction(id);
      if (res && res.status) {
        setReportDetails(res);
      } else {
        setDetailsError(res?.error || "Không thể tải chi tiết báo cáo.");
      }
    } catch (err) {
      setDetailsError("Lỗi hệ thống khi tải chi tiết báo cáo.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!reportDetails || !reportDetails.result) return;
    
    const { report, result, summary } = reportDetails;
    
    // Map of technical keys to user-friendly column headers
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

    // Add summary row
    if (summary) {
      const summaryRow = [
        ...report.dimensions.map(() => '-'),
        ...report.metrics.map(m => {
          if (m === 'pub_revenues') return (summary[m] || 0).toFixed(2);
          return summary[m] !== undefined ? summary[m] : 0;
        })
      ];
      // Set the first dimension cell to 'Total'
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

  // Helper to format table cells
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
    return val !== undefined ? val : '-';
  };

  // View 2: Detailed Report View
  if (selectedReportId !== null) {
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
            <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Đang chạy báo cáo...</span>
          </div>
        )}

        {detailsError && (
          <div style={{ padding: '24px', background: '#ffebee', borderRadius: '8px', border: '1px solid #ffcdd2', color: '#c62828', marginBottom: '20px' }}>
            <div style={{ fontWeight: 600, marginBottom: '8px' }}>Lỗi chạy báo cáo</div>
            <p style={{ fontSize: '0.9rem' }}>{detailsError}</p>
            <button className="retry-btn" onClick={() => handleView(selectedReportId)} style={{ marginTop: '12px' }}>Thử lại</button>
            <button className="retry-btn" onClick={() => setSelectedReportId(null)} style={{ marginTop: '12px', marginLeft: '12px', background: '#757575' }}>Quay lại</button>
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
                onClick={() => setSelectedReportId(null)}
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

  // View 1: List of Reports
  return (
    <div className="main-content">
      <div className="breadcrumb" style={{ marginBottom: '20px' }}>
        Reports / <span className="active">Reports Builder</span>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '12px' }}>
          <RefreshCw className="animate-spin" size={28} style={{ color: 'var(--color-accent)' }} />
          <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Đang tải danh sách báo cáo...</span>
        </div>
      )}

      {error && (
        <div style={{ padding: '20px', background: '#ffebee', borderRadius: '8px', color: '#c62828', marginBottom: '20px' }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>Lỗi tải danh sách báo cáo</div>
          <p style={{ fontSize: '0.9rem' }}>{error}</p>
          <button className="retry-btn" onClick={fetchReports} style={{ marginTop: '8px' }}>Tải lại</button>
        </div>
      )}

      {!loading && !error && reports.length === 0 && (
        <div className="dashboard-empty-state" style={{ height: '200px' }}>
          <BarChart2 size={40} style={{ color: 'var(--color-text-muted)', opacity: 0.4 }} />
          <div className="dashboard-empty-state-title" style={{ fontSize: '1rem', marginTop: '8px' }}>Không có báo cáo nào</div>
          <p style={{ fontSize: '0.85rem' }}>Hiện tại tài khoản chưa tạo cấu hình báo cáo nào.</p>
        </div>
      )}

      {!loading && !error && reports.length > 0 && (
        <div className="chart-section" style={{ padding: '0', overflowX: 'auto' }}>
          <table className="data-table" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '25%' }}>ID</th>
                <th style={{ width: '25%' }}>Name</th>
                <th style={{ width: '25%' }}>Date</th>
                <th style={{ width: '25%', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td style={{ width: '25%', fontWeight: 600, color: 'var(--color-text-muted)' }}>{report.id}</td>
                  <td style={{ width: '25%', fontWeight: 600, color: 'var(--color-text-main)' }}>{report.name}</td>
                  <td style={{ width: '25%' }}>{formatDateField(report)}</td>
                  <td style={{ width: '25%', textAlign: 'center' }}>
                    <span style={{ display: 'flex', gap: '8px', justifyContent: 'center', fontSize: '0.9rem' }}>
                      <button 
                        onClick={() => handleView(report.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2196f3',
                          cursor: 'pointer',
                          fontWeight: 600,
                          padding: '4px 8px'
                        }}
                      >
                        View
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
