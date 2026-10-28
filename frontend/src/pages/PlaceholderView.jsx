import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const PlaceholderView = ({ pageKey }) => {
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();

  // Page definitions and structured content
  const pageConfigs = {
    // User Routes
    'my-reviews': {
      title: 'My Submitted Reviews',
      subtitle: 'View and manage your evaluation reviews across registered platforms',
      icon: '⭐',
      renderContent: () => (
        <div className="dashboard-section-card">
          <div className="section-header-flex">
            <div>
              <h3 className="dashboard-section-title">Review Activity Summary</h3>
              <p className="dashboard-section-subtitle">
                Your submitted parameter evaluations and trust ratings.
              </p>
            </div>
            <Link to="/dashboard" className="nav-btn">
              + Rate a Website
            </Link>
          </div>
          <div className="stats-metric-cards" style={{ margin: '1.5rem 0' }}>
            <div className="metric-stat-card">
              <span className="metric-number">Active</span>
              <span className="metric-name">Review Status</span>
            </div>
            <div className="metric-stat-card">
              <span className="metric-number">100%</span>
              <span className="metric-name">Verified Authenticity</span>
            </div>
          </div>
          <div className="no-history-box" style={{ marginTop: '1rem' }}>
            <p>You can view, edit, or delete any of your reviews directly on each website's profile page.</p>
            <Link to="/dashboard" className="view-details-btn" style={{ marginTop: '0.75rem', display: 'inline-block' }}>
              Explore Website Directory →
            </Link>
          </div>
        </div>
      )
    },
    'trust-scores': {
      title: 'Trust Score & Verification Framework',
      subtitle: 'Understanding the multi-parameter trust rating and credibility metrics',
      icon: '🛡️',
      renderContent: () => (
        <div className="dashboard-section-card">
          <h3 className="dashboard-section-title">Credibility Rating Categories</h3>
          <p className="dashboard-section-subtitle">
            TrustLens calculates real-time credibility indexes ranging from 0 to 100 based on weighted user evaluations and verified operational metrics.
          </p>
          <div className="results-grid" style={{ marginTop: '1.5rem' }}>
            <div className="website-card" style={{ borderLeft: '4px solid #10b981' }}>
              <h4 style={{ color: '#10b981', margin: '0 0 0.5rem 0' }}>● Trusted (80 - 100)</h4>
              <p className="website-desc">
                Platforms with outstanding reliability, transparent refund policies, secure payment gateways, and highly rated customer service.
              </p>
            </div>
            <div className="website-card" style={{ borderLeft: '4px solid #f59e0b' }}>
              <h4 style={{ color: '#f59e0b', margin: '0 0 0.5rem 0' }}>● Moderately Trusted (50 - 79)</h4>
              <p className="website-desc">
                Verified platforms with acceptable standards, moderate user satisfaction, and consistent transaction history.
              </p>
            </div>
            <div className="website-card" style={{ borderLeft: '4px solid #ef4444' }}>
              <h4 style={{ color: '#ef4444', margin: '0 0 0.5rem 0' }}>● Risky (0 - 49)</h4>
              <p className="website-desc">
                Websites with recurring customer complaints, payment irregularities, or sub-par reliability indicators.
              </p>
            </div>
            <div className="website-card" style={{ borderLeft: '4px solid #94a3b8' }}>
              <h4 style={{ color: '#94a3b8', margin: '0 0 0.5rem 0' }}>● Not Rated Yet</h4>
              <p className="website-desc">
                Newly registered platforms pending sufficient multi-parameter evaluations from verified users.
              </p>
            </div>
          </div>
        </div>
      )
    },
    'profile': {
      title: 'User Profile & Account',
      subtitle: 'Manage your verified TrustLens account information and preferences',
      icon: '👤',
      renderContent: () => (
        <div className="dashboard-section-card">
          <h3 className="dashboard-section-title">Account Details</h3>
          <div className="user-profile-details-grid" style={{ marginTop: '1.25rem' }}>
            <div className="detail-field-box">
              <span className="field-label">Full Name</span>
              <strong className="field-value">{user?.name || 'Verified User'}</strong>
            </div>
            <div className="detail-field-box">
              <span className="field-label">Email Address</span>
              <span className="field-value">{user?.email || 'N/A'}</span>
            </div>
            <div className="detail-field-box">
              <span className="field-label">Account Role</span>
              <span className={`user-role-badge ${user?.role || 'user'}`}>
                {(user?.role || 'USER').toUpperCase()}
              </span>
            </div>
            <div className="detail-field-box">
              <span className="field-label">Security & Authentication</span>
              <span className="field-value" style={{ color: '#10b981' }}>✓ JWT Authenticated</span>
            </div>
          </div>
        </div>
      )
    },

    // Admin Routes
    'admin-users': {
      title: 'User Management Console',
      subtitle: 'Manage system users, adjust access permissions, and activate/deactivate accounts',
      icon: '👥',
      renderContent: () => (
        <div className="dashboard-section-card">
          <div className="section-header-flex">
            <div>
              <h3 className="dashboard-section-title">Registered Accounts</h3>
              <p className="dashboard-section-subtitle">
                Access full user management tools directly on the main dashboard.
              </p>
            </div>
            <Link to="/dashboard" className="nav-btn">
              Go to Dashboard User Controls →
            </Link>
          </div>
          <div className="no-history-box" style={{ marginTop: '1.5rem' }}>
            <p>User management table with status toggling, deletion safeguards, and activity modals is active on your Admin Dashboard.</p>
          </div>
        </div>
      )
    },
    'admin-websites': {
      title: 'Website Directory & Verification Management',
      subtitle: 'Review domain submissions, approve platforms, and manage directory statuses',
      icon: '🌐',
      renderContent: () => (
        <div className="dashboard-section-card">
          <div className="section-header-flex">
            <div>
              <h3 className="dashboard-section-title">Platform Verification Hub</h3>
              <p className="dashboard-section-subtitle">
                Approve pending websites, inspect domain URLs, and filter by status.
              </p>
            </div>
            <Link to="/dashboard" className="nav-btn">
              Go to Website Manager →
            </Link>
          </div>
          <div className="no-history-box" style={{ marginTop: '1.5rem' }}>
            <p>Website approvals, rejections, and domain additions are ready for management on your Admin Dashboard.</p>
          </div>
        </div>
      )
    },
    'admin-moderation': {
      title: 'Review Moderation & Compliance',
      subtitle: 'Monitor user submissions, inspect flagged content, and moderate reviews',
      icon: '🛡️',
      renderContent: () => (
        <div className="dashboard-section-card">
          <div className="section-header-flex">
            <div>
              <h3 className="dashboard-section-title">Content Moderation Feed</h3>
              <p className="dashboard-section-subtitle">
                Ensure evaluation comments adhere to platform community guidelines.
              </p>
            </div>
          </div>
          <div className="stats-metric-cards" style={{ margin: '1.5rem 0' }}>
            <div className="metric-stat-card">
              <span className="metric-number" style={{ color: '#10b981' }}>0</span>
              <span className="metric-name">Flagged Reviews</span>
            </div>
            <div className="metric-stat-card">
              <span className="metric-number">100%</span>
              <span className="metric-name">Compliant Content</span>
            </div>
          </div>
          <div className="no-history-box">
            <p>All submitted reviews are in compliance with community standards. Admins can delete any review directly from individual website pages.</p>
          </div>
        </div>
      )
    },
    'admin-analytics': {
      title: 'Analytics & Trust Score Metrics',
      subtitle: 'System performance, search engagement trends, and evaluation volume metrics',
      icon: '📈',
      renderContent: () => (
        <div className="dashboard-section-card">
          <h3 className="dashboard-section-title">Platform Performance Metrics</h3>
          <p className="dashboard-section-subtitle">Real-time system data and engagement metrics.</p>

          <div className="stats-metric-cards" style={{ margin: '1.5rem 0' }}>
            <div className="metric-stat-card">
              <span className="metric-number">10</span>
              <span className="metric-name">Dynamic Categories</span>
            </div>
            <div className="metric-stat-card">
              <span className="metric-number">100%</span>
              <span className="metric-name">System Health</span>
            </div>
          </div>
          <div className="no-history-box">
            <p>Interactive analytics tracking user search behaviors and evaluation distribution trends.</p>
          </div>
        </div>
      )
    },
    'admin-parameters': {
      title: 'Dynamic Evaluation Parameters Hub',
      subtitle: 'Configure category-specific intelligent criteria and manage parameter lists',
      icon: '⚙️',
      renderContent: () => (
        <div className="dashboard-section-card">
          <div className="section-header-flex">
            <div>
              <h3 className="dashboard-section-title">Category Parameter Configurations</h3>
              <p className="dashboard-section-subtitle">
                Manage parameter tags, add new industry categories, or modify parameter criteria.
              </p>
            </div>
            <Link to="/dashboard" className="nav-btn">
              Open Parameter Manager →
            </Link>
          </div>
          <div className="no-history-box" style={{ marginTop: '1.5rem' }}>
            <p>The Category & Dynamic Evaluation Parameters Management panel is live on your Admin Dashboard with instant tag editing and deletion controls.</p>
          </div>
        </div>
      )
    },
    'admin-reports': {
      title: 'System Audit & Reporting Engine',
      subtitle: 'Generate verifiable credibility audit reports, system exports, and compliance logs',
      icon: '📑',
      renderContent: () => (
        <div className="dashboard-section-card">
          <h3 className="dashboard-section-title">Audit Log & Reports</h3>
          <p className="dashboard-section-subtitle">Download system verification summaries and audit records.</p>
          <div className="no-history-box" style={{ marginTop: '1.5rem' }}>
            <p>System reporting module is enabled. Detailed evaluation breakdowns are exported per category.</p>
          </div>
        </div>
      )
    }
  };

  const currentConfig = pageConfigs[pageKey] || {
    title: 'Platform Section',
    subtitle: 'TrustLens navigation module',
    icon: '📌',
    renderContent: () => <div className="no-history-box"><p>Section ready for navigation.</p></div>
  };

  return (
    <div className="dashboard-container">
      {/* Page Header Card */}
      <div className="welcome-banner-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '1.75rem' }}>{currentConfig.icon}</span>
              <h1 className="welcome-title" style={{ margin: 0 }}>{currentConfig.title}</h1>
            </div>
            <p className="welcome-subtitle">{currentConfig.subtitle}</p>
          </div>
          <Link to="/dashboard" className="back-link" style={{ margin: 0 }}>
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Render Specific Page Content */}
      {currentConfig.renderContent()}
    </div>
  );
};

export default PlaceholderView;
