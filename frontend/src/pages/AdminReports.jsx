import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';

const AdminReports = () => {
  const { token } = useContext(AuthContext);

  const [activeReport, setActiveReport] = useState(null); // 'users' | 'websites' | 'reviews' | 'trust-scores'
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const reportTypes = [
    { key: 'users', label: 'User Report', icon: '👥', description: 'List of all registered user accounts with roles and statuses' },
    { key: 'websites', label: 'Website Report', icon: '🌐', description: 'All registered websites with trust scores and review counts' },
    { key: 'reviews', label: 'Review Report', icon: '⭐', description: 'All submitted reviews with user, website, ratings, and moderation status' },
    { key: 'trust-scores', label: 'Trust Score Report', icon: '🛡️', description: 'Website trust score rankings and classification distribution' }
  ];

  const fetchReport = useCallback(async (type) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/admin/reports/${type}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReportData(data);
        setActiveReport(type);
        setSuccess(`Report generated successfully (${data.count} records)`);
      } else {
        setError(data.message || 'Failed to generate report');
      }
    } catch (err) {
      setError('Network error generating report');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const exportCSV = () => {
    if (!reportData || !reportData.data || reportData.data.length === 0) {
      setError('No data to export');
      return;
    }

    const columns = Object.keys(reportData.data[0]);
    const header = columns.join(',');
    const rows = reportData.data.map((row) =>
      columns.map((col) => {
        let val = row[col] !== undefined ? row[col] : '';
        // Escape commas, quotes, and newlines for CSV
        val = String(val).replace(/"/g, '""');
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          val = `"${val}"`;
        }
        return val;
      }).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${reportData.reportType || 'trustlens'}-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setSuccess('Report exported as CSV successfully');
  };

  const exportJSON = () => {
    if (!reportData) {
      setError('No report data to export');
      return;
    }
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${reportData.reportType || 'trustlens'}-report-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setSuccess('Report exported as JSON successfully');
  };

  // Auto-download as PDF-like printable view (opens print dialog)
  const exportPrint = () => {
    if (!reportData || !reportData.data) {
      setError('No report data to print');
      return;
    }

    const title = reportData.title || 'TrustLens Report';
    const generated = new Date(reportData.generatedAt).toLocaleString();
    const columns = Object.keys(reportData.data[0] || {});

    let html = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 2rem; color: #1e293b; }
            h1 { color: #0e7490; margin-bottom: 0.25rem; }
            .meta { color: #64748b; font-size: 0.85rem; margin-bottom: 1.5rem; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #e2e8f0; padding: 0.5rem 0.75rem; text-align: left; font-size: 0.8rem; }
            th { background: #f1f5f9; font-weight: 600; }
            tr:nth-child(even) { background: #f8fafc; }
            .summary { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1.5rem; }
            .summary h3 { color: #166534; margin-bottom: 0.5rem; }
            .summary p { margin: 0.25rem 0; }
            @media print {
              body { padding: 0; }
              table { font-size: 0.7rem; }
            }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div class="meta">Generated: ${generated} | Records: ${reportData.count}</div>
    `;

    // Add summary for trust scores
    if (reportData.summary) {
      html += `<div class="summary"><h3>Summary</h3>`;
      Object.entries(reportData.summary).forEach(([k, v]) => {
        html += `<p><strong>${k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}:</strong> ${v}</p>`;
      });
      html += `</div>`;
    }

    if (columns.length > 0) {
      html += `<table><thead><tr>`;
      columns.forEach((c) => {
        html += `<th>${c.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}</th>`;
      });
      html += `</tr></thead><tbody>`;
      reportData.data.forEach((row) => {
        html += `<tr>`;
        columns.forEach((c) => {
          let val = row[c] !== undefined ? row[c] : '';
          if (typeof val === 'object') val = JSON.stringify(val);
          val = String(val);
          if (val.length > 100) val = val.slice(0, 100) + '...';
          html += `<td>${val}</td>`;
        });
        html += `</tr>`;
      });
      html += `</tbody></table>`;
    }

    html += `</body></html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 500);
      setSuccess('Print view opened - use browser print dialog to save as PDF');
    } else {
      setError('Popup blocked. Allow popups to export as PDF.');
    }
  };

  const formatValue = (val) => {
    if (val === null || val === undefined || val === '') return <span style={{ color: 'var(--text-muted)' }}>N/A</span>;
    if (typeof val === 'object') return <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{JSON.stringify(val).slice(0, 40)}</span>;
    return String(val);
  };

  const formatHeader = (key) =>
    key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase())
      .replace(/_/g, ' ');

  return (
    <div className="dashboard-container">
      {/* Page Header */}
      <div className="products-header-card">
        <h1 className="products-page-title">Report Generation</h1>
        <p className="products-page-subtitle">
          Generate verifiable credibility audit reports, system exports, and compliance logs
        </p>
      </div>

      {/* Feedback Alerts */}
      {error && <div className="auth-alert error" style={{ margin: '1rem 0' }}>⚠️ {error}</div>}
      {success && <div className="auth-alert success" style={{ margin: '1rem 0' }}>✓ {success}</div>}

      {/* Report Type Selection Cards */}
      <div className="stats-metric-cards" style={{ marginBottom: '1.25rem' }}>
        {reportTypes.map((rt) => (
          <div
            key={rt.key}
            className={`metric-stat-card report-type-card ${activeReport === rt.key ? 'active' : ''}`}
            onClick={() => fetchReport(rt.key)}
            style={{ cursor: 'pointer' }}
          >
            <span style={{ fontSize: '1.5rem' }}>{rt.icon}</span>
            <span className="metric-name" style={{ fontWeight: 600 }}>{rt.label}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              {rt.description}
            </span>
            <button className="nav-btn" style={{ marginTop: '0.5rem', width: '100%', textAlign: 'center' }}>
              Generate
            </button>
          </div>
        ))}
      </div>

      {/* Report Preview */}
      {(loading || reportData) && (
        <div className="dashboard-section-card">
          <div className="section-header-flex" style={{ flexWrap: 'wrap' }}>
            <div>
              <h2 className="dashboard-section-title">
                {reportData ? reportData.title : 'Generating Report...'}
              </h2>
              <p className="dashboard-section-subtitle">
                {reportData
                  ? `Generated: ${new Date(reportData.generatedAt).toLocaleString()} | ${reportData.count} records`
                  : 'Please wait...'}
              </p>
            </div>
            {reportData && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button className="nav-btn" onClick={exportCSV}>Export CSV</button>
                <button className="nav-btn" onClick={exportJSON}>Export JSON</button>
                <button className="nav-btn" onClick={exportPrint}>Export PDF (Print)</button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="search-loading">Generating report data...</div>
          ) : reportData ? (
            <>
              {/* Trust Score Report Summary */}
              {reportData.summary && (
                <div className="trust-report-summary">
                  <h4>Summary</h4>
                  <div className="stats-metric-cards">
                    {Object.entries(reportData.summary).map(([k, v]) => (
                      <div key={k} className="metric-stat-card">
                        <span className="metric-number">{v}</span>
                        <span className="metric-name">
                          {k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Data Table Preview */}
              <div className="admin-table-wrapper report-preview">
                {reportData.data && reportData.data.length > 0 ? (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        {Object.keys(reportData.data[0]).map((key) => (
                          <th key={key}>{formatHeader(key)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.data.slice(0, 50).map((row, idx) => (
                        <tr key={idx}>
                          {Object.keys(reportData.data[0]).map((key) => (
                            <td key={key}>{formatValue(row[key])}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="no-results-card">
                    <h3>No Data</h3>
                    <p>No records available for this report type.</p>
                  </div>
                )}
                {reportData.data && reportData.data.length > 50 && (
                  <div className="no-history-box" style={{ marginTop: '1rem' }}>
                    <p>Showing first 50 of {reportData.data.length} records. Use Export CSV/JSON to get the full dataset.</p>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default AdminReports;