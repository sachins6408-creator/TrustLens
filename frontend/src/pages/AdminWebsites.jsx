import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const AdminWebsites = () => {
  const { token } = useContext(AuthContext);

  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Categories for dropdown
  const [categories, setCategories] = useState([]);

  // Actions
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/websites/categories');
      const data = await res.json();
      if (data.success) {
        setCategories(['All', ...data.categories]);
      }
    } catch (err) {
      // Noop - categories remain empty
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const fetchWebsites = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('query', search.trim());
      if (categoryFilter && categoryFilter !== 'All') params.append('category', categoryFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (sortBy) params.append('sortBy', sortBy);

      const res = await fetch(`/api/admin/websites?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWebsites(data.websites || []);
      } else {
        setError(data.message || 'Failed to load websites');
      }
    } catch (err) {
      setError('Network error loading websites');
    } finally {
      setLoading(false);
    }
  }, [token, search, categoryFilter, statusFilter, sortBy]);

  useEffect(() => {
    fetchWebsites();
  }, [fetchWebsites]);

  const handleUpdateStatus = async (siteId, newStatus) => {
    setActionLoadingId(siteId);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/admin/websites/${siteId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(data.message);
        setWebsites((prev) =>
          prev.map((w) => (w._id === siteId ? { ...w, status: newStatus } : w))
        );
      } else {
        setError(data.message || 'Failed to update website status');
      }
    } catch (err) {
      setError('Network error updating website status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteWebsite = async (siteId) => {
    setActionLoadingId(siteId);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/admin/websites/${siteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(data.message);
        setWebsites((prev) => prev.filter((w) => w._id !== siteId));
        setConfirmDeleteId(null);
      } else {
        setError(data.message || 'Failed to delete website');
      }
    } catch (err) {
      setError('Network error deleting website');
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const getStatusLower = (s) => (s || 'active').toLowerCase();

  const isSuspiciousStatus = (s) => {
    const lower = getStatusLower(s);
    return lower === 'suspicious' || lower === 'pending' || lower === 'new_request' || lower === 'new website request';
  };

  const checkUrlValidation = (site) => {
    const url = site.url || site.domain;
    if (!url) return { valid: false, label: 'Missing URL' };
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
    const isValidDomain = domainRegex.test(site.domain);
    if (isValidDomain) {
      return { valid: true, label: `✓ Valid (${site.domain})` };
    }
    return { valid: false, label: '⚠️ Invalid Domain' };
  };

  // Quick stats counters
  const totalCount = websites.length;
  const suspiciousCount = websites.filter((w) => isSuspiciousStatus(w.status)).length;
  const activeCount = websites.filter((w) => getStatusLower(w.status) === 'active').length;
  const flaggedCount = websites.filter((w) => getStatusLower(w.status) === 'flagged').length;
  const rejectedCount = websites.filter((w) => getStatusLower(w.status) === 'rejected').length;

  return (
    <div className="dashboard-container">
      {/* Page Header */}
      <div className="products-header-card">
        <h1 className="products-page-title">Admin Website Directory & Verification</h1>
        <p className="products-page-subtitle">
          Verify user-requested platforms, inspect suspicious websites, and manage active directory platforms
        </p>
      </div>

      {/* Feedback Alerts */}
      {error && <div className="auth-alert error" style={{ margin: '1rem 0' }}>⚠️ {error}</div>}
      {success && <div className="auth-alert success" style={{ margin: '1rem 0' }}>✓ {success}</div>}

      {/* Quick Status Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <button
          className={`nav-btn ${statusFilter === 'all' ? 'active-filter' : ''}`}
          style={{
            background: statusFilter === 'all' ? 'rgba(56, 189, 248, 0.2)' : 'var(--bg-card)',
            borderColor: statusFilter === 'all' ? 'var(--accent-cyan)' : 'var(--border-color)'
          }}
          onClick={() => setStatusFilter('all')}
        >
          All ({totalCount})
        </button>
        <button
          className={`nav-btn ${statusFilter === 'active' ? 'active-filter' : ''}`}
          style={{
            background: statusFilter === 'active' ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-card)',
            borderColor: statusFilter === 'active' ? '#34d399' : 'var(--border-color)'
          }}
          onClick={() => setStatusFilter('active')}
        >
          Active ({activeCount})
        </button>
        <button
          className={`nav-btn ${statusFilter === 'suspicious' || statusFilter === 'pending' ? 'active-filter' : ''}`}
          style={{
            background: statusFilter === 'suspicious' || statusFilter === 'pending' ? 'rgba(245, 158, 11, 0.2)' : 'var(--bg-card)',
            borderColor: statusFilter === 'suspicious' || statusFilter === 'pending' ? '#fbbf24' : 'var(--border-color)',
            color: suspiciousCount > 0 ? '#fbbf24' : 'var(--text-primary)'
          }}
          onClick={() => setStatusFilter('suspicious')}
        >
          ⚠️ Suspicious {suspiciousCount > 0 && `(${suspiciousCount})`}
        </button>
        <button
          className={`nav-btn ${statusFilter === 'rejected' ? 'active-filter' : ''}`}
          style={{
            background: statusFilter === 'rejected' ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg-card)',
            borderColor: statusFilter === 'rejected' ? '#f87171' : 'var(--border-color)'
          }}
          onClick={() => setStatusFilter('rejected')}
        >
          Rejected ({rejectedCount})
        </button>
      </div>

      {/* Filter Panel */}
      <div className="dashboard-section-card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div className="search-box-group">
            <label className="form-label">Search Websites</label>
            <input
              type="text"
              className="search-input"
              placeholder="Search by name or domain..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="search-box-group">
            <label className="form-label">Category</label>
            <select
              className="category-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="All">All Categories</option>
              {categories.filter((c) => c !== 'All').map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="search-box-group">
            <label className="form-label">Status Filter</label>
            <select
              className="category-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspicious">Suspicious (Pending Verification)</option>
              <option value="flagged">Flagged</option>
              <option value="rejected">Rejected</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="search-box-group">
            <label className="form-label">Sort By</label>
            <select
              className="category-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name (A-Z)</option>
              <option value="trustscore-desc">Trust Score (High → Low)</option>
              <option value="trustscore-asc">Trust Score (Low → High)</option>
              <option value="reviews">Most Reviews</option>
            </select>
          </div>
        </div>
        <button
          className="nav-btn"
          style={{ marginTop: '1rem' }}
          onClick={() => {
            setSearch('');
            setCategoryFilter('All');
            setStatusFilter('all');
            setSortBy('newest');
            fetchWebsites();
          }}
        >
          Reset Filters
        </button>
      </div>

      {/* Websites Table */}
      <div className="dashboard-section-card">
        <div className="section-header-flex">
          <div>
            <h2 className="dashboard-section-title">
              {statusFilter === 'suspicious' || statusFilter === 'pending' ? 'Suspicious Websites (Pending Verification)' : 'Website Directory'} ({websites.length})
            </h2>
            <p className="dashboard-section-subtitle">
              {statusFilter === 'suspicious' || statusFilter === 'pending'
                ? 'Unverified user-requested platforms requiring administrator review before activation'
                : 'All registered platforms, moderation statuses, and trust indexes'}
            </p>
          </div>
          <Link to="/dashboard" className="nav-btn">
            + Add Website
          </Link>
        </div>

        {loading ? (
          <div className="search-loading">Loading website directory...</div>
        ) : websites.length === 0 ? (
          <div className="no-results-card">
            <h3>No Websites Found</h3>
            <p>No website records matched your current filter criteria.</p>
          </div>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Website Name</th>
                  <th>URL / Domain</th>
                  <th>Category</th>
                  <th>Status & Notes</th>
                  <th>Trust Score</th>
                  <th>Source / Requested By</th>
                  <th>Date Added / Requested</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {websites.map((site) => {
                  const statusLower = getStatusLower(site.status);
                  const isSuspicious = isSuspiciousStatus(site.status);
                  const isActive = statusLower === 'active';
                  const isFlagged = statusLower === 'flagged';
                  const isRejected = statusLower === 'rejected';
                  const isInactive = statusLower === 'inactive';
                  const urlValidation = checkUrlValidation(site);

                  let displayStatus = 'ACTIVE';
                  let pillClass = 'active';
                  if (isSuspicious) {
                    displayStatus = 'SUSPICIOUS';
                    pillClass = 'suspicious';
                  } else if (isFlagged) {
                    displayStatus = 'FLAGGED';
                    pillClass = 'flagged';
                  } else if (isRejected) {
                    displayStatus = 'REJECTED';
                    pillClass = 'rejected';
                  } else if (isInactive) {
                    displayStatus = 'INACTIVE';
                    pillClass = 'inactive';
                  }

                  const requestingUserText = site.createdBy
                    ? `${site.createdBy.name || 'User'} (${site.createdBy.email || ''})`
                    : isSuspicious ? 'User Website Request' : 'Admin / Seeded';

                  return (
                    <tr key={site._id} style={{ background: isSuspicious ? 'rgba(245, 158, 11, 0.04)' : 'transparent' }}>
                      <td>
                        <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{site.name}</strong>
                      </td>
                      <td>
                        <div>
                          <a
                            href={site.url && (site.url.startsWith('http://') || site.url.startsWith('https://')) ? site.url : `https://${site.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--accent-cyan)', fontFamily: 'monospace', fontSize: '0.85rem', textDecoration: 'none' }}
                            title="Open URL"
                          >
                            {site.domain || site.url} ↗
                          </a>
                          <div style={{ marginTop: '0.2rem' }}>
                            <span className={urlValidation.valid ? 'url-valid-badge' : 'url-invalid-badge'}>
                              {urlValidation.label}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="website-category-tag" style={{ fontSize: '0.75rem' }}>
                          {site.category}
                        </span>
                      </td>
                      <td>
                        <div>
                          <span className={`status-pill ${pillClass}`}>
                            ● {displayStatus}
                          </span>
                          {isSuspicious && (
                            <div className="moderation-suspicious-note">
                              ⚠️ Note: Suspicious Website — Pending Admin Verification
                            </div>
                          )}
                          {isFlagged && (
                            <div className="moderation-suspicious-note" style={{ background: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171' }}>
                              ⚠️ Note: Flagged Website
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        {site.trustScore > 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className={`trust-badge ${(site.trustCategory || '').toLowerCase().replace(/\s+/g, '-')}`}>
                              {site.trustScore}/100
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{site.trustCategory}</span>
                          </div>
                        ) : (
                          <span className="trust-badge pending">● Not Rated Yet</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: site.createdBy ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {requestingUserText}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {formatDate(site.createdAt)}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions-cell" style={{ flexWrap: 'wrap', gap: '0.4rem' }}>
                          {/* Verify / Add Action (for suspicious, flagged, or rejected websites) */}
                          {(isSuspicious || isFlagged || isRejected || isInactive) && (
                            <button
                              className="action-btn-approve"
                              title="Verify and activate website into directory"
                              onClick={() => handleUpdateStatus(site._id, 'active')}
                              disabled={actionLoadingId === site._id}
                              style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }}
                            >
                              Verify / Add
                            </button>
                          )}

                          {/* Reject Action */}
                          {(isSuspicious || isFlagged || isActive) && (
                            <button
                              className="action-btn-reject"
                              title="Reject website"
                              onClick={() => handleUpdateStatus(site._id, 'rejected')}
                              disabled={actionLoadingId === site._id}
                              style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }}
                            >
                              Reject
                            </button>
                          )}

                          {/* Flag Action */}
                          {(isSuspicious || isActive) && (
                            <button
                              className="action-btn-flag"
                              title="Flag website"
                              onClick={() => handleUpdateStatus(site._id, 'flagged')}
                              disabled={actionLoadingId === site._id}
                              style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }}
                            >
                              Flag
                            </button>
                          )}

                          {/* Deactivate */}
                          {isActive && (
                            <button
                              className="action-btn-toggle deactivate"
                              title="Mark website inactive"
                              onClick={() => handleUpdateStatus(site._id, 'inactive')}
                              disabled={actionLoadingId === site._id}
                              style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }}
                            >
                              Deactivate
                            </button>
                          )}

                          {/* Delete */}
                          {confirmDeleteId === site._id ? (
                            <div className="inline-confirm-dialog">
                              <span style={{ fontSize: '0.75rem', color: '#fca5a5' }}>Delete?</span>
                              <button
                                className="confirm-yes-btn"
                                onClick={() => handleDeleteWebsite(site._id)}
                                disabled={actionLoadingId === site._id}
                              >
                                Yes
                              </button>
                              <button
                                className="confirm-no-btn"
                                onClick={() => setConfirmDeleteId(null)}
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              className="action-btn-delete"
                              title="Delete website"
                              onClick={() => setConfirmDeleteId(site._id)}
                              disabled={actionLoadingId === site._id}
                              style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }}
                            >
                              Delete
                            </button>
                          )}

                          {/* View Details */}
                          <Link to={`/websites/${site._id}`} className="admin-table-action-link" style={{ fontSize: '0.8rem' }}>
                            View →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminWebsites;