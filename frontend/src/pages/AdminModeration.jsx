import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const AdminModeration = () => {
  const { token } = useContext(AuthContext);

  const [reviews, setReviews] = useState([]);
  const [websiteRequests, setWebsiteRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [summary, setSummary] = useState({ pending: 0, approved: 0, rejected: 0, flagged: 0, new_requests: 0, total: 0 });

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Actions
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [moderationNote, setModerationNote] = useState({});
  const [expandedReviewId, setExpandedReviewId] = useState(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (search.trim()) params.append('search', search.trim());
      if (sortBy) params.append('sortBy', sortBy);

      const res = await fetch(`/api/admin/reviews?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReviews(data.reviews || []);
        setWebsiteRequests(data.websiteRequests || []);
        setSummary(data.summary || { pending: 0, approved: 0, rejected: 0, flagged: 0, new_requests: 0, total: 0 });
      } else {
        setError(data.message || 'Failed to load reviews and requests');
      }
    } catch (err) {
      setError('Network error loading moderation queue');
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, search, sortBy]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Handle Review Moderation Status Update
  const handleUpdateStatus = async (reviewId, newStatus) => {
    setActionLoadingId(reviewId);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus,
          moderationNote: moderationNote[reviewId] || ''
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(data.message);
        setModerationNote((prev) => ({ ...prev, [reviewId]: '' }));
        setExpandedReviewId(null);
        fetchReviews();
      } else {
        setError(data.message || 'Failed to update review status');
      }
    } catch (err) {
      setError('Network error updating review status');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Website Request Status Update (Add Website / Reject)
  const handleWebsiteRequestStatus = async (siteId, newStatus) => {
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
        setSuccess(data.message || `Website request successfully ${newStatus === 'active' ? 'approved and activated' : 'rejected'}.`);
        fetchReviews();
      } else {
        setError(data.message || 'Failed to update website request status');
      }
    } catch (err) {
      setError('Network error updating website request status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    setActionLoadingId(reviewId);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(data.message);
        setConfirmDeleteId(null);
        fetchReviews();
      } else {
        setError(data.message || 'Failed to delete review');
      }
    } catch (err) {
      setError('Network error deleting review');
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getRatingEntries = (ratings) => {
    if (!ratings) return [];
    return Object.entries(ratings).filter(([, val]) => typeof val === 'number' && val > 0);
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

  const filterTabs = [
    { key: 'all', label: 'All', count: summary.total },
    { key: 'pending', label: 'Pending', count: summary.pending },
    { key: 'new_requests', label: 'New Website Requests', count: summary.new_requests || 0 },
    { key: 'flagged', label: 'Flagged', count: summary.flagged },
    { key: 'approved', label: 'Approved', count: summary.approved },
    { key: 'rejected', label: 'Rejected', count: summary.rejected }
  ];

  const totalItemsCount = reviews.length + websiteRequests.length;

  return (
    <div className="dashboard-container">
      {/* Page Header */}
      <div className="products-header-card">
        <h1 className="products-page-title">Admin Review & Moderation Queue</h1>
        <p className="products-page-subtitle">
          Verify user-requested websites, inspect flagged reviews, and moderate user submissions
        </p>
      </div>

      {/* Summary Filter Cards / Tabs */}
      <div className="stats-metric-cards" style={{ marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
        {filterTabs.map((tab) => (
          <div
            key={tab.key}
            className={`metric-stat-card ${statusFilter === tab.key ? 'active-metric-card' : ''}`}
            style={{
              cursor: 'pointer',
              border: statusFilter === tab.key ? '2px solid var(--accent-cyan)' : '1px solid var(--border-color)',
              background: statusFilter === tab.key ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-card)'
            }}
            onClick={() => setStatusFilter(tab.key)}
          >
            <span className="metric-number" style={{ color: tab.key === 'new_requests' && tab.count > 0 ? '#38bdf8' : 'inherit' }}>
              {tab.count}
            </span>
            <span className="metric-name">{tab.label}</span>
          </div>
        ))}
      </div>

      {/* Feedback Alerts */}
      {error && <div className="auth-alert error" style={{ margin: '1rem 0' }}>⚠️ {error}</div>}
      {success && <div className="auth-alert success" style={{ margin: '1rem 0' }}>✓ {success}</div>}

      {/* Filter Panel */}
      <div className="dashboard-section-card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div className="search-box-group">
            <label className="form-label">Queue Category Filter</label>
            <select
              className="category-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Queue Items ({summary.total})</option>
              <option value="pending">Pending Reviews ({summary.pending})</option>
              <option value="new_requests">New Website Requests ({summary.new_requests || 0})</option>
              <option value="flagged">Flagged Reviews ({summary.flagged})</option>
              <option value="approved">Approved Reviews ({summary.approved})</option>
              <option value="rejected">Rejected Reviews ({summary.rejected})</option>
            </select>
          </div>
          <div className="search-box-group">
            <label className="form-label">Search Items</label>
            <input
              type="text"
              className="search-input"
              placeholder="Search by name, website, user, comment, URL..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
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
              <option value="rating-desc">Rating (High → Low)</option>
              <option value="rating-asc">Rating (Low → High)</option>
            </select>
          </div>
        </div>
        <button
          className="nav-btn"
          style={{ marginTop: '1rem' }}
          onClick={() => {
            setStatusFilter('all');
            setSearch('');
            setSortBy('newest');
            fetchReviews();
          }}
        >
          Reset Filters
        </button>
      </div>

      {/* =======================================================
          SECTION 1: NEW WEBSITE REQUESTS (when present)
          ======================================================= */}
      {websiteRequests.length > 0 && (
        <div className="dashboard-section-card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--accent-cyan)' }}>
          <div className="section-header-flex">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🌐</span>
                <h2 className="dashboard-section-title">New Website Requests ({websiteRequests.length})</h2>
              </div>
              <p className="dashboard-section-subtitle">
                User-submitted website requests awaiting administrator verification to be added to the active TrustLens directory.
              </p>
            </div>
          </div>

          <div className="admin-table-wrapper" style={{ marginTop: '1rem' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Website Name</th>
                  <th>URL / Domain</th>
                  <th>Category</th>
                  <th>Requesting User</th>
                  <th>Request Date</th>
                  <th>URL Validation</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {websiteRequests.map((site) => {
                  const urlValidation = checkUrlValidation(site);
                  const requestingUserText = site.createdBy
                    ? `${site.createdBy.name || 'User'} (${site.createdBy.email || ''})`
                    : 'Guest User';

                  return (
                    <tr key={site._id} style={{ background: 'rgba(56, 189, 248, 0.04)' }}>
                      <td>
                        <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{site.name}</strong>
                      </td>
                      <td>
                        <a
                          href={site.url && (site.url.startsWith('http://') || site.url.startsWith('https://')) ? site.url : `https://${site.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--accent-cyan)', fontFamily: 'monospace', fontSize: '0.85rem', textDecoration: 'none' }}
                          title="Open URL"
                        >
                          {site.domain || site.url} ↗
                        </a>
                      </td>
                      <td>
                        <span className="website-category-tag" style={{ fontSize: '0.75rem' }}>
                          {site.category}
                        </span>
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
                        <span className={urlValidation.valid ? 'url-valid-badge' : 'url-invalid-badge'}>
                          {urlValidation.label}
                        </span>
                      </td>
                      <td>
                        <div>
                          <span className="status-pill suspicious">
                            ● SUSPICIOUS
                          </span>
                          <div className="moderation-suspicious-note">
                            ⚠️ Note: Suspicious Website — Pending Admin Verification
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="table-actions-cell" style={{ flexWrap: 'wrap', gap: '0.4rem' }}>
                          <button
                            className="action-btn-approve"
                            title="Verify and add website to active directory"
                            onClick={() => handleWebsiteRequestStatus(site._id, 'active')}
                            disabled={actionLoadingId === site._id}
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                          >
                            Verify / Add
                          </button>
                          <button
                            className="action-btn-reject"
                            title="Reject website request"
                            onClick={() => handleWebsiteRequestStatus(site._id, 'rejected')}
                            disabled={actionLoadingId === site._id}
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                          >
                            Reject
                          </button>
                          <button
                            className="action-btn-flag"
                            title="Flag website request"
                            onClick={() => handleWebsiteRequestStatus(site._id, 'flagged')}
                            disabled={actionLoadingId === site._id}
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                          >
                            Flag
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =======================================================
          SECTION 2: REVIEW MODERATION QUEUE
          ======================================================= */}
      {statusFilter !== 'new_requests' && (
        <div className="dashboard-section-card">
          <div className="section-header-flex">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>💬</span>
                <h2 className="dashboard-section-title">Review Moderation Queue ({reviews.length})</h2>
              </div>
              <p className="dashboard-section-subtitle">
                Inspect submitted reviews, verify ratings, and moderate approved/flagged/rejected feedback.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="search-loading">Loading moderation queue...</div>
          ) : reviews.length === 0 ? (
            <div className="no-results-card">
              <h3>No Reviews Found</h3>
              <p>No user reviews matched your filter criteria.</p>
            </div>
          ) : (
            <div className="admin-table-wrapper" style={{ marginTop: '1rem' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Review ID</th>
                    <th>User</th>
                    <th>Website</th>
                    <th>Rating</th>
                    <th>Comment</th>
                    <th>Status & Notes</th>
                    <th>Submitted Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((rev) => {
                    const statusLower = (rev.status || 'approved').toLowerCase();
                    const isFlagged = statusLower === 'flagged';
                    const isRejected = statusLower === 'rejected';
                    const hasSuspiciousNote = isFlagged || (isRejected && rev.moderationNote && /suspicious|fake|spam|duplicate|flag/i.test(rev.moderationNote));
                    const ratingEntries = getRatingEntries(rev.ratings);
                    return (
                      <tr key={rev._id} style={{ background: isFlagged ? 'rgba(139, 92, 246, 0.04)' : 'transparent' }}>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {rev._id.slice(0, 12)}...
                          </span>
                        </td>
                        <td>
                          <div>
                            <strong style={{ fontSize: '0.9rem' }}>{rev.user ? rev.user.name : 'Deleted User'}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {rev.user ? rev.user.email : ''}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>
                            <Link to={`/websites/${rev.website ? rev.website._id : '#'}`} style={{ color: 'var(--accent-cyan)', fontSize: '0.9rem', textDecoration: 'none' }}>
                              {rev.website ? rev.website.name : 'Deleted Website'}
                            </Link>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {rev.website ? rev.website.domain : ''}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ textAlign: 'center' }}>
                            <span className="review-overall-pill">{rev.overallRating || 'N/A'}★</span>
                            {ratingEntries.length > 0 && (
                              <button
                                className="review-param-toggle-btn"
                                onClick={() => setExpandedReviewId(expandedReviewId === rev._id ? null : rev._id)}
                                title="Toggle parameter breakdown"
                              >
                                {expandedReviewId === rev._id ? '▲' : '▼'} {ratingEntries.length}p
                              </button>
                            )}
                          </div>
                          {expandedReviewId === rev._id && ratingEntries.length > 0 && (
                            <div className="review-params-expanded">
                              {ratingEntries.map(([k, v]) => (
                                <span key={k} className="review-param-pill">{k}: {v}★</span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem' }}>
                            {rev.comment
                              ? (rev.comment.length > 80 ? rev.comment.slice(0, 80) + '...' : rev.comment)
                              : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No comment</span>}
                          </span>
                        </td>
                        <td>
                          <div>
                            <span className={`status-pill ${statusLower}`}>
                              ● {statusLower.toUpperCase()}
                            </span>
                            {hasSuspiciousNote && (
                              <div className="moderation-suspicious-note" style={{ background: 'rgba(139, 92, 246, 0.12)', borderColor: 'rgba(139, 92, 246, 0.3)', color: '#c4b5fd' }}>
                                ⚠️ Note: Suspicious
                              </div>
                            )}
                            {rev.moderationNote && (
                              <div className="moderation-reason-text">
                                <strong>Reason:</strong> {rev.moderationNote}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {formatDate(rev.createdAt)}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions-cell" style={{ flexWrap: 'wrap' }}>
                            {/* Moderation Action Buttons */}
                            {statusLower !== 'approved' && (
                              <button
                                className="action-btn-approve"
                                title="Approve review"
                                onClick={() => handleUpdateStatus(rev._id, 'approved')}
                                disabled={actionLoadingId === rev._id}
                              >
                                Approve
                              </button>
                            )}
                            {statusLower !== 'rejected' && (
                              <button
                                className="action-btn-reject"
                                title="Reject review"
                                onClick={() => handleUpdateStatus(rev._id, 'rejected')}
                                disabled={actionLoadingId === rev._id}
                              >
                                Reject
                              </button>
                            )}
                            {statusLower !== 'flagged' && (
                              <button
                                className="action-btn-flag"
                                title="Flag review"
                                onClick={() => handleUpdateStatus(rev._id, 'flagged')}
                                disabled={actionLoadingId === rev._id}
                              >
                                Flag
                              </button>
                            )}
                            {/* Delete */}
                            {confirmDeleteId === rev._id ? (
                              <div className="inline-confirm-dialog">
                                <span style={{ fontSize: '0.75rem', color: '#fca5a5' }}>Delete?</span>
                                <button
                                  className="confirm-yes-btn"
                                  onClick={() => handleDeleteReview(rev._id)}
                                  disabled={actionLoadingId === rev._id}
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
                                title="Delete review"
                                onClick={() => setConfirmDeleteId(rev._id)}
                                disabled={actionLoadingId === rev._id}
                              >
                                Delete
                              </button>
                            )}

                            {/* Moderation Note Input Toggle */}
                            <button
                              className="action-btn-view"
                              title="Add moderation note"
                              onClick={() => setExpandedReviewId(expandedReviewId === rev._id ? null : rev._id)}
                            >
                              Note
                            </button>
                          </div>

                          {/* Moderation Note Input */}
                          {expandedReviewId === rev._id && (
                            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                              <input
                                type="text"
                                className="quick-param-input"
                                placeholder="Add moderation note..."
                                value={moderationNote[rev._id] || ''}
                                onChange={(e) => setModerationNote({ ...moderationNote, [rev._id]: e.target.value })}
                              />
                              <button
                                className="quick-param-add-btn"
                                onClick={() => handleUpdateStatus(rev._id, statusLower)}
                                disabled={actionLoadingId === rev._id}
                              >
                                Save Note
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {statusFilter === 'new_requests' && websiteRequests.length === 0 && !loading && (
        <div className="dashboard-section-card">
          <div className="no-results-card">
            <div className="no-results-icon">✓</div>
            <h3>No Pending Website Requests</h3>
            <p>All user website requests have been reviewed and verified.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminModeration;