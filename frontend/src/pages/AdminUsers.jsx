import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const AdminUsers = () => {
  const { token, user: currentUser } = useContext(AuthContext);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // User detail modal
  const [viewingUser, setViewingUser] = useState(null);
  const [viewingStats, setViewingStats] = useState(null);
  const [viewingRecentReviews, setViewingRecentReviews] = useState([]);
  const [viewingRecentSearches, setViewingRecentSearches] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Actions state
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers(data.users || []);
      } else {
        setError(data.message || 'Failed to load users');
      }
    } catch (err) {
      setError('Network error loading users');
    } finally {
      setLoading(false);
    }
  }, [token, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleViewUser = async (userId) => {
    setLoadingDetails(true);
    setViewingUser(null);
    setViewingStats(null);
    setViewingRecentReviews([]);
    setViewingRecentSearches([]);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setViewingUser(data.user);
        setViewingStats(data.stats);
        setViewingRecentReviews(data.recentReviews || []);
        setViewingRecentSearches(data.recentSearches || []);
      } else {
        setError(data.message || 'Failed to load user details');
      }
    } catch (err) {
      setError('Network error loading user details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleToggleStatus = async (targetUser) => {
    if (!currentUser) return;
    const isSelf = currentUser.id === targetUser._id || currentUser._id === targetUser._id;
    if (isSelf) return;

    setActionLoadingId(targetUser._id);
    setError('');
    setSuccess('');
    const newStatus = (targetUser.status || 'active').toLowerCase() === 'active' ? 'inactive' : 'active';

    try {
      const res = await fetch(`/api/admin/users/${targetUser._id}/status`, {
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
        setUsers((prev) =>
          prev.map((u) => (u._id === targetUser._id ? { ...u, status: newStatus } : u))
        );
        if (viewingUser && viewingUser._id === targetUser._id) {
          setViewingUser({ ...viewingUser, status: newStatus });
        }
      } else {
        setError(data.message || 'Failed to update user status');
      }
    } catch (err) {
      setError('Network error updating user status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteUser = async (userId) => {
    setActionLoadingId(userId);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(data.message);
        setUsers((prev) => prev.filter((u) => u._id !== userId));
        setConfirmDeleteId(null);
      } else {
        setError(data.message || 'Failed to delete user');
      }
    } catch (err) {
      setError('Network error deleting user');
    } finally {
      setActionLoadingId(null);
    }
  };

  const isSelf = (userId) =>
    currentUser && (currentUser.id === userId || currentUser._id === userId);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  return (
    <div className="dashboard-container">
      {/* Page Header */}
      <div className="products-header-card">
        <h1 className="products-page-title">Manage Users</h1>
        <p className="products-page-subtitle">
          Monitor registered accounts, manage access permissions, and activate or deactivate accounts
        </p>
      </div>

      {/* Feedback Alerts */}
      {error && <div className="auth-alert error" style={{ margin: '1rem 0' }}>⚠️ {error}</div>}
      {success && <div className="auth-alert success" style={{ margin: '1rem 0' }}>✓ {success}</div>}

      {/* Filter Panel */}
      <div className="dashboard-section-card" style={{ marginBottom: '1.25rem' }}>
        <div className="dual-search-grid">
          <div className="search-box-group">
            <label className="form-label">Search Users</label>
            <input
              type="text"
              className="search-input"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="search-box-group">
            <label className="form-label">Role Filter</label>
            <select
              className="category-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="search-box-group">
            <label className="form-label">Status Filter</label>
            <select
              className="category-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <button
          className="nav-btn"
          style={{ marginTop: '1rem' }}
          onClick={() => {
            setSearch('');
            setRoleFilter('');
            setStatusFilter('');
            fetchUsers();
          }}
        >
          Reset Filters
        </button>
      </div>

      {/* Users Table */}
      <div className="dashboard-section-card">
        <div className="section-header-flex">
          <div>
            <h2 className="dashboard-section-title">Registered Users ({users.length})</h2>
            <p className="dashboard-section-subtitle">
              All user accounts with activity statistics
            </p>
          </div>
          <span className="website-category-tag" style={{ fontSize: '0.8rem' }}>
            Role-based access control active
          </span>
        </div>

        {loading ? (
          <div className="search-loading">Loading registered users...</div>
        ) : users.length === 0 ? (
          <div className="no-results-card">
            <h3>No Users Found</h3>
            <p>No registered user accounts matched your filters.</p>
          </div>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created Date</th>
                  <th>Reviews</th>
                  <th>Websites</th>
                  <th>Searches</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isActive = (u.status || 'active').toLowerCase() === 'active';
                  const self = isSelf(u._id);
                  const stats = u.activityStats || { totalReviews: 0, totalWebsitesSubmitted: 0, totalSearches: 0 };
                  return (
                    <tr key={u._id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {u._id.slice(0, 12)}...
                        </span>
                      </td>
                      <td>
                        <strong style={{ fontSize: '0.95rem' }}>{u.name}</strong>
                        {self && <span className="self-badge">(You)</span>}
                      </td>
                      <td>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{u.email}</span>
                      </td>
                      <td>
                        <span className={`user-role-badge ${u.role}`}>
                          {(u.role || 'user').toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill ${isActive ? 'active' : 'inactive'}`}>
                          ● {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {formatDate(u.createdAt)}
                        </span>
                      </td>
                      <td>
                        <span className="tab-counter-badge" style={{ fontSize: '0.85rem' }}>{stats.totalReviews}</span>
                      </td>
                      <td>
                        <span className="tab-counter-badge" style={{ fontSize: '0.85rem' }}>{stats.totalWebsitesSubmitted}</span>
                      </td>
                      <td>
                        <span className="tab-counter-badge" style={{ fontSize: '0.85rem' }}>{stats.totalSearches}</span>
                      </td>
                      <td>
                        <div className="table-actions-cell">
                          <button
                            type="button"
                            className="action-btn-view"
                            onClick={() => handleViewUser(u._id)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className={`action-btn-toggle ${isActive ? 'deactivate' : 'activate'}`}
                            onClick={() => handleToggleStatus(u)}
                            disabled={self || actionLoadingId === u._id}
                            title={self ? 'Cannot modify own account' : isActive ? 'Deactivate account' : 'Activate account'}
                          >
                            {isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          {confirmDeleteId === u._id ? (
                            <div className="inline-confirm-dialog">
                              <span style={{ fontSize: '0.75rem', color: '#fca5a5' }}>Delete?</span>
                              <button
                                className="confirm-yes-btn"
                                onClick={() => handleDeleteUser(u._id)}
                                disabled={actionLoadingId === u._id}
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
                              type="button"
                              className="action-btn-delete"
                              onClick={() => setConfirmDeleteId(u._id)}
                              disabled={self || actionLoadingId === u._id}
                              title={self ? 'Cannot delete own account' : 'Delete user account'}
                            >
                              Delete
                            </button>
                          )}
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

      {/* User Details Modal */}
      {(viewingUser || loadingDetails) && (
        <div className="modal-backdrop-overlay" onClick={() => setViewingUser(null)}>
          <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">User Account Profile</h3>
              <button
                className="modal-close-btn"
                onClick={() => setViewingUser(null)}
              >
                ✕
              </button>
            </div>

            {loadingDetails ? (
              <div className="search-loading">Loading user statistics...</div>
            ) : viewingUser ? (
              <div className="modal-body">
                <div className="user-profile-details-grid">
                  <div className="detail-field-box">
                    <span className="field-label">User ID</span>
                    <span className="field-value" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {viewingUser._id}
                    </span>
                  </div>
                  <div className="detail-field-box">
                    <span className="field-label">Full Name</span>
                    <strong className="field-value">{viewingUser.name}</strong>
                  </div>
                  <div className="detail-field-box">
                    <span className="field-label">Email Address</span>
                    <span className="field-value">{viewingUser.email}</span>
                  </div>
                  <div className="detail-field-box">
                    <span className="field-label">System Role</span>
                    <span className={`user-role-badge ${viewingUser.role}`}>
                      {(viewingUser.role || 'user').toUpperCase()}
                    </span>
                  </div>
                  <div className="detail-field-box">
                    <span className="field-label">Account Status</span>
                    <span className={`status-pill ${viewingUser.status || 'active'}`}>
                      ● {(viewingUser.status || 'active').toUpperCase()}
                    </span>
                  </div>
                  <div className="detail-field-box">
                    <span className="field-label">Registration Date</span>
                    <span className="field-value">{formatDate(viewingUser.createdAt)}</span>
                  </div>
                </div>

                {/* Activity Stats */}
                {viewingStats && (
                  <>
                    <div className="user-stats-container">
                      <h4 className="user-stats-title">User Activity Summary</h4>
                      <div className="stats-metric-cards">
                        <div className="metric-stat-card">
                          <span className="metric-number">{viewingStats.totalReviews || 0}</span>
                          <span className="metric-name">Reviews Submitted</span>
                        </div>
                        <div className="metric-stat-card">
                          <span className="metric-number">{viewingStats.totalWebsitesSubmitted || 0}</span>
                          <span className="metric-name">Websites Added</span>
                        </div>
                        <div className="metric-stat-card">
                          <span className="metric-number">{viewingStats.totalSearches || 0}</span>
                          <span className="metric-name">Searches Performed</span>
                        </div>
                      </div>
                    </div>

                    {/* Recent Reviews */}
                    {viewingRecentReviews.length > 0 && (
                      <div className="user-stats-container">
                        <h4 className="user-stats-title">Recent Reviews</h4>
                        <div className="recent-activity-list">
                          {viewingRecentReviews.map((r) => (
                            <div key={r._id} className="recent-activity-item">
                              <span className="recent-activity-name">
                                {r.website ? r.website.name : 'Unknown Website'}{' '}
                                <span className="review-overall-pill">Overall: {r.overallRating}★</span>
                                <span className={`status-pill ${r.status || 'approved'}`}>
                                  ● {r.status || 'approved'}
                                </span>
                              </span>
                              <span className="recent-activity-date">{formatDate(r.createdAt)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recent Searches */}
                    {viewingRecentSearches.length > 0 && (
                      <div className="user-stats-container">
                        <h4 className="user-stats-title">Recent Search Activity</h4>
                        <div className="recent-activity-list">
                          {viewingRecentSearches.map((h) => (
                            <div key={h._id} className="recent-activity-item">
                              <span className="recent-activity-name">
                                {h.website ? h.website.name : 'Unknown Website'}{' '}
                                <span className="website-category-tag" style={{ fontSize: '0.7rem' }}>
                                  {h.website && h.website.category}
                                </span>
                              </span>
                              <span className="recent-activity-date">
                                {new Date(h.searchedAt).toLocaleDateString(undefined, {
                                  month: 'short', day: 'numeric', year: 'numeric'
                                })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="modal-actions-row">
                  <button
                    type="button"
                    className="btn-secondary-cancel"
                    onClick={() => setViewingUser(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;