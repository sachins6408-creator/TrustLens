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

  // Pagination (Multipart list - 25 items per part)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReviewsCount, setTotalReviewsCount] = useState(0);
  const PAGE_SIZE = 25;

  // Actions
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [moderationNote, setModerationNote] = useState({});
  const [expandedReviewId, setExpandedReviewId] = useState(null);

  const fetchReviews = useCallback(async (targetPage = currentPage) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (search.trim()) params.append('search', search.trim());
      if (sortBy) params.append('sortBy', sortBy);
      params.append('page', targetPage);
      params.append('limit', PAGE_SIZE);

      const res = await fetch(`/api/admin/reviews?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReviews(data.reviews || []);
        setWebsiteRequests(data.websiteRequests || []);
        setSummary(data.summary || { pending: 0, approved: 0, rejected: 0, flagged: 0, new_requests: 0, total: 0 });
        setTotalPages(data.totalPages || 1);
        setTotalReviewsCount(data.totalReviews !== undefined ? data.totalReviews : (data.reviews || []).length);
        setCurrentPage(data.currentPage || targetPage);
      } else {
        setError(data.message || 'Failed to load reviews and requests');
      }
    } catch (err) {
      setError('Network error loading moderation queue');
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, search, sortBy, currentPage]);

  // When filters or search changes, reset to page 1
  useEffect(() => {
    setCurrentPage(1);
    fetchReviews(1);
  }, [statusFilter, search, sortBy]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    setCurrentPage(newPage);
    fetchReviews(newPage);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

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
        fetchReviews(currentPage);
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
        fetchReviews(currentPage);
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
        fetchReviews(currentPage);
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
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
      return { valid: true, label: `✓ Valid Format` };
    } catch (e) {
      return { valid: false, label: '⚠️ Invalid Domain / URL' };
    }
  };

  // Helper to render pagination controls
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pageButtons = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      pageButtons.push(
        <button key="1" className={`multipart-btn ${currentPage === 1 ? 'active' : ''}`} onClick={() => handlePageChange(1)}>
          1
        </button>
      );
      if (startPage > 2) {
        pageButtons.push(<span key="dots-start" className="multipart-ellipsis">...</span>);
      }
    }

    for (let p = startPage; p <= endPage; p++) {
      pageButtons.push(
        <button
          key={p}
          className={`multipart-btn ${currentPage === p ? 'active' : ''}`}
          onClick={() => handlePageChange(p)}
        >
          {p}
        </button>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pageButtons.push(<span key="dots-end" className="multipart-ellipsis">...</span>);
      }
      pageButtons.push(
        <button key={totalPages} className={`multipart-btn ${currentPage === totalPages ? 'active' : ''}`} onClick={() => handlePageChange(totalPages)}>
          {totalPages}
        </button>
      );
    }

    const startItem = totalReviewsCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
    const endItem = Math.min(currentPage * PAGE_SIZE, totalReviewsCount);

    return (
      <div className="multipart-pagination-container">
        <div className="multipart-info">
          Showing <strong>{startItem} – {endItem}</strong> of <strong>{totalReviewsCount.toLocaleString()}</strong> reviews
          <span className="multipart-badge">Part {currentPage} of {totalPages} (25/part)</span>
        </div>
        <div className="multipart-nav">
          <button
            className="multipart-btn"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1 || loading}
            title="First Part"
          >
            « First
          </button>
          <button
            className="multipart-btn"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            title="Previous Part"
          >
            ‹ Prev
          </button>
          {pageButtons}
          <button
            className="multipart-btn"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            title="Next Part"
          >
            Next ›
          </button>
          <button
            className="multipart-btn"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages || loading}
            title="Last Part"
          >
            Last »
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-page-container">
      {/* Page Header */}
      <div className="products-header-card">
        <div className="products-header-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '1.8rem' }}>🛡️</span>
            <h1 className="products-page-title">Moderation & Verification Queue</h1>
          </div>
          <p className="products-page-subtitle">
            Review user feedback, moderate reported comments, and verify newly submitted website requests with dynamic evaluation parameters.
          </p>
        </div>
      </div>

      {/* Global Alerts */}
      {error && <div className="admin-alert error" style={{ marginBottom: '1.5rem' }}>⚠️ {error}</div>}
      {success && <div className="admin-alert success" style={{ marginBottom: '1.5rem' }}>✓ {success}</div>}

      {/* Metric Cards Summary */}
      <div className="admin-metrics-grid" style={{ marginBottom: '1.5rem' }}>
        <div
          className={`metric-card ${statusFilter === 'pending' ? 'active-metric' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
          style={{ cursor: 'pointer' }}
          title="Click to filter by Pending Reviews"
        >
          <div className="metric-icon" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#eab308' }}>⏳</div>
          <div className="metric-data">
            <span className="metric-label">Pending Reviews</span>
            <span className="metric-number" style={{ color: '#eab308' }}>{summary.pending || 0}</span>
          </div>
        </div>

        <div
          className={`metric-card ${statusFilter === 'flagged' ? 'active-metric' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'flagged' ? 'all' : 'flagged')}
          style={{ cursor: 'pointer' }}
          title="Click to filter by Flagged Reviews"
        >
          <div className="metric-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>🚩</div>
          <div className="metric-data">
            <span className="metric-label">Flagged Reviews</span>
            <span className="metric-number" style={{ color: '#8b5cf6' }}>{summary.flagged || 0}</span>
          </div>
        </div>

        <div
          className={`metric-card ${statusFilter === 'new_requests' ? 'active-metric' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'new_requests' ? 'all' : 'new_requests')}
          style={{ cursor: 'pointer' }}
          title="Click to filter by Website Requests"
        >
          <div className="metric-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>🌐</div>
          <div className="metric-data">
            <span className="metric-label">Website Requests</span>
            <span className="metric-number" style={{ color: '#38bdf8' }}>{summary.new_requests || 0}</span>
          </div>
        </div>

        <div
          className={`metric-card ${statusFilter === 'approved' ? 'active-metric' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'approved' ? 'all' : 'approved')}
          style={{ cursor: 'pointer' }}
          title="Click to filter by Approved Reviews"
        >
          <div className="metric-icon" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>✓</div>
          <div className="metric-data">
            <span className="metric-label">Approved Reviews</span>
            <span className="metric-number" style={{ color: '#22c55e' }}>{summary.approved || 0}</span>
          </div>
        </div>

        <div
          className={`metric-card ${statusFilter === 'rejected' ? 'active-metric' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'rejected' ? 'all' : 'rejected')}
          style={{ cursor: 'pointer' }}
          title="Click to filter by Rejected Reviews"
        >
          <div className="metric-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>✕</div>
          <div className="metric-data">
            <span className="metric-label">Rejected Reviews</span>
            <span className="metric-number" style={{ color: '#ef4444' }}>{summary.rejected || 0}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="dashboard-section-card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Status Tabs */}
          <div className="admin-status-tabs" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button
              className={`filter-pill-btn ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All Feedback ({summary.total || 0})
            </button>
            <button
              className={`filter-pill-btn ${statusFilter === 'pending' ? 'active' : ''}`}
              onClick={() => setStatusFilter('pending')}
            >
              Pending ({summary.pending || 0})
            </button>
            <button
              className={`filter-pill-btn ${statusFilter === 'flagged' ? 'active' : ''}`}
              onClick={() => setStatusFilter('flagged')}
            >
              Flagged ({summary.flagged || 0})
            </button>
            <button
              className={`filter-pill-btn ${statusFilter === 'new_requests' ? 'active' : ''}`}
              onClick={() => setStatusFilter('new_requests')}
            >
              Website Requests ({summary.new_requests || 0})
            </button>
            <button
              className={`filter-pill-btn ${statusFilter === 'approved' ? 'active' : ''}`}
              onClick={() => setStatusFilter('approved')}
            >
              Approved ({summary.approved || 0})
            </button>
            <button
              className={`filter-pill-btn ${statusFilter === 'rejected' ? 'active' : ''}`}
              onClick={() => setStatusFilter('rejected')}
            >
              Rejected ({summary.rejected || 0})
            </button>
          </div>

          {/* Search & Sort Controls */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              className="admin-search-input"
              placeholder="Search user, website, or comments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: '240px' }}
            />
            <select
              className="admin-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Sort by: Newest First</option>
              <option value="oldest">Sort by: Oldest First</option>
              <option value="rating-desc">Sort by: Highest Rating</option>
              <option value="rating-asc">Sort by: Lowest Rating</option>
            </select>
          </div>
        </div>
      </div>

      {/* =======================================================
          SECTION 1: WEBSITE REQUESTS QUEUE (NEW / SUSPICIOUS)
          ======================================================= */}
      {(statusFilter === 'all' || statusFilter === 'pending' || statusFilter === 'new_requests') && websiteRequests.length > 0 && (
        <div className="dashboard-section-card" style={{ marginBottom: '1.5rem' }}>
          <div className="section-header-flex">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🌐</span>
                <h2 className="dashboard-section-title">Website Verification Queue ({websiteRequests.length})</h2>
              </div>
              <p className="dashboard-section-subtitle">
                New website requests pending administrative domain validation and category approval.
              </p>
            </div>
          </div>

          <div className="admin-table-wrapper" style={{ marginTop: '1rem' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Website Name</th>
                  <th>Domain / URL</th>
                  <th>Category</th>
                  <th>Submitted By</th>
                  <th>Date</th>
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
          SECTION 2: REVIEW MODERATION QUEUE (MULTIPART LIST - 25 PER PART)
          ======================================================= */}
      {statusFilter !== 'new_requests' && (
        <div className="dashboard-section-card">
          <div className="section-header-flex">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>💬</span>
                <h2 className="dashboard-section-title">
                  Review Moderation Queue ({totalReviewsCount.toLocaleString()} Total)
                </h2>
              </div>
              <p className="dashboard-section-subtitle">
                Inspect submitted reviews, verify ratings, and moderate feedback. Displaying 25 reviews per part for lightning-fast rendering.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="search-loading">Loading reviews (Part {currentPage})...</div>
          ) : reviews.length === 0 ? (
            <div className="no-results-card">
              <h3>No Reviews Found</h3>
              <p>No user reviews matched your filter criteria.</p>
            </div>
          ) : (
            <>
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

              {/* Multipart Navigation / Pagination Controls */}
              {renderPagination()}
            </>
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
