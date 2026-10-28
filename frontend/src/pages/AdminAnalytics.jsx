import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const AdminAnalytics = () => {
  const { token } = useContext(AuthContext);

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/analytics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAnalytics(data);
      } else {
        setError(data.message || 'Failed to load analytics');
      }
    } catch (err) {
      setError('Network error loading analytics');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return <div className="detail-loading">Loading analytics dashboard...</div>;
  }

  if (error || !analytics) {
    return (
      <div className="detail-error-card">
        <h2>Error Loading Analytics</h2>
        <p>{error || 'Analytics data could not be loaded.'}</p>
        <button className="nav-btn" style={{ marginTop: '1rem' }} onClick={fetchAnalytics}>
          Retry
        </button>
      </div>
    );
  }

  const m = analytics.metrics;
  const categoryStats = analytics.categoryStats || [];
  const reviewStatus = analytics.reviewStatus || { pending: 0, approved: 0, rejected: 0, flagged: 0 };
  const trustBuckets = analytics.trustBuckets || { trusted: 0, moderatelyTrusted: 0, risky: 0, notRated: 0 };
  const topReviewed = analytics.topReviewedWebsites || [];
  const topRated = analytics.topRatedWebsites || [];
  const weeklyActivity = analytics.weeklyActivity || [];

  // Chart helpers
  const maxCategory = Math.max(1, ...categoryStats.map((c) => c.count));
  const maxActivity = Math.max(1, ...weeklyActivity.map((a) => a.count));
  const maxReviewStatus = Math.max(1, reviewStatus.approved, reviewStatus.pending, reviewStatus.rejected, reviewStatus.flagged);
  const maxTrustBucket = Math.max(1, trustBuckets.trusted, trustBuckets.moderatelyTrusted, trustBuckets.risky, trustBuckets.notRated);

  const statusColors = {
    approved: '#10b981',
    pending: '#f59e0b',
    rejected: '#ef4444',
    flagged: '#8b5cf6'
  };

  const trustColors = {
    trusted: '#10b981',
    moderatelyTrusted: '#f59e0b',
    risky: '#ef4444',
    notRated: '#94a3b8'
  };

  return (
    <div className="dashboard-container">
      {/* Page Header */}
      <div className="products-header-card">
        <h1 className="products-page-title">Analytics Dashboard</h1>
        <p className="products-page-subtitle">
          Platform performance, engagement trends, and trust score metrics
        </p>
      </div>

      {/* Error/Success */}
      {error && <div className="auth-alert error" style={{ margin: '1rem 0' }}>⚠️ {error}</div>}

      {/* ===== Key Metrics Cards ===== */}
      <div className="stats-metric-cards" style={{ marginBottom: '1.25rem' }}>
        <div className="metric-stat-card">
          <span className="metric-number">{m.totalUsers}</span>
          <span className="metric-name">Total Users</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {m.activeUsers} active / {m.inactiveUsers} inactive
          </span>
        </div>
        <div className="metric-stat-card">
          <span className="metric-number">{m.totalWebsites}</span>
          <span className="metric-name">Total Websites</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {m.activeWebsites} active / {m.pendingWebsites} pending
          </span>
        </div>
        <div className="metric-stat-card">
          <span className="metric-number">{m.totalReviews}</span>
          <span className="metric-name">Total Reviews</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {m.approvedReviews} approved
          </span>
        </div>
        <div className="metric-stat-card">
          <span className="metric-number">{m.avgTrustScore || 'N/A'}</span>
          <span className="metric-name">Average Trust Score</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Across rated websites
          </span>
        </div>
        <div className="metric-stat-card">
          <span className="metric-number">{m.totalCategories}</span>
          <span className="metric-name">Dynamic Categories</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Evaluation parameters
          </span>
        </div>
        <div className="metric-stat-card">
          <span className="metric-number">{m.totalSearches}</span>
          <span className="metric-name">Total Searches</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            User search events
          </span>
        </div>
      </div>

      {/* ===== Review Status Distribution ===== */}
      <div className="dashboard-section-card">
        <div className="section-header-flex">
          <div>
            <h2 className="dashboard-section-title">Review Distribution by Status</h2>
            <p className="dashboard-section-subtitle">Moderation queue breakdown</p>
          </div>
        </div>
        <div className="chart-horizontal-bars">
          {[
            { label: 'Approved', value: reviewStatus.approved, color: statusColors.approved },
            { label: 'Pending', value: reviewStatus.pending, color: statusColors.pending },
            { label: 'Rejected', value: reviewStatus.rejected, color: statusColors.rejected },
            { label: 'Flagged', value: reviewStatus.flagged, color: statusColors.flagged }
          ].map((item) => (
            <div key={item.label} className="chart-bar-row">
              <span className="chart-bar-label">{item.label}</span>
              <div className="chart-bar-track">
                <div
                  className="chart-bar-fill"
                  style={{ width: `${(item.value / maxReviewStatus) * 100}%`, background: item.color }}
                ></div>
              </div>
              <span className="chart-bar-value">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Website Categories Distribution ===== */}
      <div className="dashboard-section-card">
        <div className="section-header-flex">
          <div>
            <h2 className="dashboard-section-title">Websites by Category</h2>
            <p className="dashboard-section-subtitle">Distribution of registered platforms</p>
          </div>
        </div>
        {categoryStats.length === 0 ? (
          <div className="no-history-box"><p>No category data available.</p></div>
        ) : (
          <div className="chart-horizontal-bars">
            {categoryStats.map((c) => (
              <div key={c._id} className="chart-bar-row">
                <span className="chart-bar-label">{c._id}</span>
                <div className="chart-bar-track">
                  <div
                    className="chart-bar-fill"
                    style={{ width: `${(c.count / maxCategory) * 100}%`, background: 'var(--accent-cyan)' }}
                  ></div>
                </div>
                <span className="chart-bar-value">{c.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== Trust Score Distribution ===== */}
      <div className="dashboard-section-card">
        <div className="section-header-flex">
          <div>
            <h2 className="dashboard-section-title">Trust Score Distribution</h2>
            <p className="dashboard-section-subtitle">Websites classified by trust category</p>
          </div>
        </div>
        <div className="chart-horizontal-bars">
          {[
            { label: 'Trusted (80-100)', value: trustBuckets.trusted, color: trustColors.trusted },
            { label: 'Moderately Trusted (50-79)', value: trustBuckets.moderatelyTrusted, color: trustColors.moderatelyTrusted },
            { label: 'Risky (0-49)', value: trustBuckets.risky, color: trustColors.risky },
            { label: 'Not Rated Yet', value: trustBuckets.notRated, color: trustColors.notRated }
          ].map((item) => (
            <div key={item.label} className="chart-bar-row">
              <span className="chart-bar-label">{item.label}</span>
              <div className="chart-bar-track">
                <div
                  className="chart-bar-fill"
                  style={{ width: `${(item.value / maxTrustBucket) * 100}%`, background: item.color }}
                ></div>
              </div>
              <span className="chart-bar-value">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Weekly Review Activity ===== */}
      <div className="dashboard-section-card">
        <div className="section-header-flex">
          <div>
            <h2 className="dashboard-section-title">Recent Review Activity</h2>
            <p className="dashboard-section-subtitle">Daily review submissions (last 30 days)</p>
          </div>
        </div>
        {weeklyActivity.length === 0 ? (
          <div className="no-history-box"><p>No review activity recorded yet.</p></div>
        ) : (
          <div className="chart-column-bars">
            {weeklyActivity.map((day) => (
              <div key={day._id} className="chart-column-column" title={`${day._id}: ${day.count} reviews`}>
                <div className="chart-column-value">{day.count > 0 ? day.count : ''}</div>
                <div
                  className="chart-column-fill"
                  style={{ height: `${(day.count / maxActivity) * 100}%` }}
                ></div>
                <span className="chart-column-label">
                  {new Date(day._id + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== Top Reviewed & Top Rated Websites ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.25rem' }}>
        {/* Top Reviewed */}
        <div className="dashboard-section-card">
          <div className="section-header-flex">
            <div>
              <h2 className="dashboard-section-title">Top Reviewed Websites</h2>
              <p className="dashboard-section-subtitle">Websites with most user reviews</p>
            </div>
          </div>
          {topReviewed.length === 0 ? (
            <div className="no-history-box"><p>No review data available.</p></div>
          ) : (
            <div className="top-websites-list">
              {topReviewed.map((w, idx) => (
                <div key={w._id || idx} className="top-website-row">
                  <span className="top-website-rank">{idx + 1}</span>
                  <div className="top-website-info">
                    <Link to={`/websites/${w._id}`} style={{ color: 'var(--accent-cyan)', textDecoration: 'none', fontWeight: 600 }}>
                      {w.name || 'Unknown'}
                    </Link>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{w.domain}</span>
                  </div>
                  <span className="tab-counter-badge">{w.reviewCount || 0} reviews</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Rated */}
        <div className="dashboard-section-card">
          <div className="section-header-flex">
            <div>
              <h2 className="dashboard-section-title">Highest Trust Scores</h2>
              <p className="dashboard-section-subtitle">Websites with best trust ratings</p>
            </div>
          </div>
          {topRated.length === 0 ? (
            <div className="no-history-box"><p>No rated websites available yet. Submit reviews to generate trust scores.</p></div>
          ) : (
            <div className="top-websites-list">
              {topRated.map((w, idx) => (
                <div key={w.domain || idx} className="top-website-row">
                  <span className="top-website-rank">{idx + 1}</span>
                  <div className="top-website-info">
                    <Link to={`/websites/${w._id}`} style={{ color: 'var(--accent-cyan)', textDecoration: 'none', fontWeight: 600 }}>
                      {w.name}
                    </Link>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{w.domain}</span>
                  </div>
                  <span className={`trust-badge ${(w.trustCategory || '').toLowerCase().replace(/\s+/g, '-')}`}>
                    {w.trustScore}/100
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== Most Reviewed Categories (Websites) ===== */}
      <div className="dashboard-section-card" style={{ marginTop: '1.25rem' }}>
        <div className="section-header-flex">
          <div>
            <h2 className="dashboard-section-title">Most Reviewed Websites</h2>
            <p className="dashboard-section-subtitle">Platforms ranked by total review volume</p>
          </div>
        </div>
        {analytics.mostReviewedCategories.length === 0 ? (
          <div className="no-history-box"><p>No review data available.</p></div>
        ) : (
          <div className="top-websites-list">
            {analytics.mostReviewedCategories.map((item, idx) => (
              <div key={item.website._id || idx} className="top-website-row">
                <span className="top-website-rank">{idx + 1}</span>
                <div className="top-website-info">
                  <Link to={`/websites/${item.website._id}`} style={{ color: 'var(--accent-cyan)', textDecoration: 'none', fontWeight: 600 }}>
                    {item.website.name || 'Unknown'}
                  </Link>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {item.website.domain} • {item.website.category}
                  </span>
                </div>
                <span className="tab-counter-badge">{item.reviewCount} reviews</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAnalytics;