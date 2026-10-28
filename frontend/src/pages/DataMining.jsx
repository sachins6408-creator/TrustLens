import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './DataMining.css';

const DataMining = () => {
  const { token } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab State: 'classification' | 'clustering' | 'apriori'
  const initialTab = searchParams.get('tab') || 'classification';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Data States
  const [classificationData, setClassificationData] = useState(null);
  const [clusteringData, setClusteringData] = useState(null);
  const [aprioriData, setAprioriData] = useState(null);

  // Loading and Error States
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Track attempted tab fetches to prevent repeated automatic retries on failure
  const attemptedTabsRef = useRef(new Set());

  // Classification Filters
  const [clfSearchQuery, setClfSearchQuery] = useState('');
  const [clfCategoryFilter, setClfCategoryFilter] = useState('All');
  const [clfMatchFilter, setClfMatchFilter] = useState('All'); // 'All' | 'Match' | 'Discrepancy' | 'Pending'

  // Apriori Interactive Settings
  const [minSupport, setMinSupport] = useState(0.15);
  const [minConfidence, setMinConfidence] = useState(0.5);

  // Sync tab with URL query parameter
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
    setError('');
    setSuccessMsg('');
  };

  // 1. Fetch Classification
  const fetchClassification = useCallback(async (isRefresh = false) => {
    if (isRefresh) setActionLoading(true);
    else setLoading(true);
    setError('');

    try {
      const url = isRefresh ? '/api/data-mining/classification/run' : '/api/data-mining/classification';
      const method = isRefresh ? 'POST' : 'GET';
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };

      const res = await fetch(url, { method, headers });
      const data = await res.json();

      if (res.ok && data.success) {
        setClassificationData(data);
        if (isRefresh) {
          setSuccessMsg(`Random Forest Classifier re-trained and executed successfully across ${data.metrics?.totalClassified || 0} websites!`);
          setTimeout(() => setSuccessMsg(''), 4000);
        }
      } else {
        setError(data.message || 'Failed to load Classification data');
      }
    } catch (err) {
      console.error('Classification Fetch Error:', err);
      setError('Network error connecting to Classification service');
    } finally {
      setLoading(false);
      setActionLoading(false);
    }
  }, [token]);

  // 2. Fetch Clustering (K-Means)
  const fetchClustering = useCallback(async (isRefresh = false) => {
    if (isRefresh) setActionLoading(true);
    else setLoading(true);
    setError('');

    try {
      const url = isRefresh ? '/api/data-mining/clustering/run' : '/api/data-mining/clustering';
      const method = isRefresh ? 'POST' : 'GET';
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };

      const res = await fetch(url, { method, headers });
      const data = await res.json();

      if (res.ok && data.success) {
        setClusteringData(data);
        if (isRefresh) {
          setSuccessMsg(`K-Means Clustering re-calculated successfully for ${data.metrics?.websitesAnalyzed || 0} websites!`);
          setTimeout(() => setSuccessMsg(''), 4000);
        }
      } else {
        setError(data.message || 'Failed to load Clustering data');
      }
    } catch (err) {
      console.error('Clustering Fetch Error:', err);
      setError('Network error connecting to Clustering service');
    } finally {
      setLoading(false);
      setActionLoading(false);
    }
  }, [token]);

  // 3. Fetch Apriori Association Rules
  const fetchApriori = useCallback(async (isRefresh = false, customSup = minSupport, customConf = minConfidence) => {
    if (isRefresh) setActionLoading(true);
    else setLoading(true);
    setError('');

    try {
      const url = isRefresh ? '/api/data-mining/apriori/run' : `/api/data-mining/apriori?minSupport=${customSup}&minConfidence=${customConf}`;
      const method = isRefresh ? 'POST' : 'GET';
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };
      const body = isRefresh ? JSON.stringify({ minSupport: customSup, minConfidence: customConf }) : undefined;

      const res = await fetch(url, { method, headers, body });
      const data = await res.json();

      if (res.ok && data.success) {
        setAprioriData(data);
        if (isRefresh) {
          setSuccessMsg(`Apriori algorithm generated ${data.metrics?.rulesCount || 0} association rules from ${data.metrics?.transactionsAnalyzed || 0} reviews!`);
          setTimeout(() => setSuccessMsg(''), 4000);
        }
      } else {
        setError(data.message || 'Failed to load Association Rules data');
      }
    } catch (err) {
      console.error('Apriori Fetch Error:', err);
      setError('Network error connecting to Apriori service');
    } finally {
      setLoading(false);
      setActionLoading(false);
    }
  }, [token, minSupport, minConfidence]);

  // Initial load based on active tab (attempted only once per tab to prevent repeated error loops)
  useEffect(() => {
    if (activeTab === 'classification' && !classificationData && !attemptedTabsRef.current.has('classification')) {
      attemptedTabsRef.current.add('classification');
      fetchClassification();
    } else if (activeTab === 'clustering' && !clusteringData && !attemptedTabsRef.current.has('clustering')) {
      attemptedTabsRef.current.add('clustering');
      fetchClustering();
    } else if (activeTab === 'apriori' && !aprioriData && !attemptedTabsRef.current.has('apriori')) {
      attemptedTabsRef.current.add('apriori');
      fetchApriori();
    }
  }, [activeTab, classificationData, clusteringData, aprioriData, fetchClassification, fetchClustering, fetchApriori]);

  // Classification filtering logic
  const filteredClassifications = (classificationData?.results || []).filter((item) => {
    // Search query match (name or domain)
    const matchesQuery = !clfSearchQuery.trim() ||
      item.name.toLowerCase().includes(clfSearchQuery.toLowerCase()) ||
      item.domain.toLowerCase().includes(clfSearchQuery.toLowerCase());

    // Category match
    const matchesCategory = clfCategoryFilter === 'All' || item.category === clfCategoryFilter;

    // Match status filter
    let matchesStatus = true;
    if (clfMatchFilter === 'Match') matchesStatus = item.matchStatus === 'Match';
    else if (clfMatchFilter === 'Discrepancy') matchesStatus = item.matchStatus === 'Discrepancy';
    else if (clfMatchFilter === 'Pending') matchesStatus = item.matchStatus === 'Pending Actual';

    return matchesQuery && matchesCategory && matchesStatus;
  });

  const uniqueCategories = Array.from(
    new Set((classificationData?.results || []).map((c) => c.category).filter(Boolean))
  );

  return (
    <div className="dashboard-container data-mining-page-container">
      {/* Primary Top Navigation Tabs: Database Overview vs Data Mining */}
      <div className="primary-navigation-tabs-bar">
        <Link to="/dashboard" className="primary-nav-tab">
          <span className="tab-icon">🌐</span>
          <span>Database Overview</span>
        </Link>
        <div className="primary-nav-tab active">
          <span className="tab-icon">⚡</span>
          <span>Data Mining Engine</span>
          <span className="tab-active-dot"></span>
        </div>
      </div>

      {/* Page Header Banner */}
      <div className="products-header-card data-mining-hero-card">
        <div className="hero-flex-row">
          <div>
            <div className="hero-badge-line">
              <span className="dm-badge-pill">Machine Learning & Data Mining</span>
              <span className="dm-status-pulse">
                <span className="pulse-indicator"></span> Python Scikit-Learn Engine Active
              </span>
            </div>
            <h1 className="products-page-title">TrustLens Data Mining Dashboard</h1>
            <p className="products-page-subtitle">
              Intelligent multi-parameter classification, K-Means clustering, and Apriori association rule discovery.
            </p>
          </div>

          <div className="hero-action-buttons">
            {activeTab === 'classification' && (
              <button
                type="button"
                id="rerun-classifier-btn"
                className="btn-primary-action"
                onClick={() => fetchClassification(true)}
                disabled={actionLoading || loading}
              >
                <span className={`action-icon ${actionLoading ? 'spinning' : ''}`}>⚡</span>
                <span>{actionLoading ? 'Re-training Classifier...' : 'Re-run Classifier'}</span>
              </button>
            )}

            {activeTab === 'clustering' && (
              <button
                type="button"
                id="rerun-clustering-btn"
                className="btn-primary-action"
                onClick={() => fetchClustering(true)}
                disabled={actionLoading || loading}
              >
                <span className={`action-icon ${actionLoading ? 'spinning' : ''}`}>🔄</span>
                <span>{actionLoading ? 'Re-calculating Clusters...' : 'Re-run K-Means Clustering'}</span>
              </button>
            )}

            {activeTab === 'apriori' && (
              <button
                type="button"
                id="rerun-apriori-btn"
                className="btn-primary-action"
                onClick={() => fetchApriori(true, minSupport, minConfidence)}
                disabled={actionLoading || loading}
              >
                <span className={`action-icon ${actionLoading ? 'spinning' : ''}`}>⚙️</span>
                <span>{actionLoading ? 'Mining Association Rules...' : 'Re-run Apriori Mining'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Feedback Alerts */}
      {error && (
        <div className="auth-alert error dm-alert">
          <span>⚠️ {error}</span>
          <button type="button" className="alert-retry-btn" onClick={() => {
            if (activeTab === 'classification') fetchClassification();
            else if (activeTab === 'clustering') fetchClustering();
            else if (activeTab === 'apriori') fetchApriori();
          }}>
            Retry
          </button>
        </div>
      )}
      {successMsg && (
        <div className="auth-alert success dm-alert">
          <span>✓ {successMsg}</span>
        </div>
      )}

      {/* Data Mining Secondary Navigation Tabs */}
      <div className="data-mining-subtabs-container">
        <button
          type="button"
          id="tab-classification"
          className={`dm-subtab-btn ${activeTab === 'classification' ? 'active' : ''}`}
          onClick={() => handleTabChange('classification')}
        >
          <span className="subtab-icon">🎯</span>
          <span className="subtab-label">Classification (ML)</span>
          {classificationData?.metrics?.totalClassified && (
            <span className="subtab-badge">{classificationData.metrics.totalClassified}</span>
          )}
        </button>

        <button
          type="button"
          id="tab-clustering"
          className={`dm-subtab-btn ${activeTab === 'clustering' ? 'active' : ''}`}
          onClick={() => handleTabChange('clustering')}
        >
          <span className="subtab-icon">📊</span>
          <span className="subtab-label">Clustering (K-Means)</span>
          {clusteringData?.metrics?.totalClusters && (
            <span className="subtab-badge">k={clusteringData.metrics.totalClusters}</span>
          )}
        </button>

        <button
          type="button"
          id="tab-apriori"
          className={`dm-subtab-btn ${activeTab === 'apriori' ? 'active' : ''}`}
          onClick={() => handleTabChange('apriori')}
        >
          <span className="subtab-icon">🔗</span>
          <span className="subtab-label">Association Rules (Apriori)</span>
          {aprioriData?.metrics?.rulesCount !== undefined && (
            <span className="subtab-badge">{aprioriData.metrics.rulesCount} Rules</span>
          )}
        </button>
      </div>

      {/* Global Loading Spinner for Initial View */}
      {loading && !classificationData && !clusteringData && !aprioriData ? (
        <div className="dashboard-section-card dm-loading-card">
          <div className="dm-spinner"></div>
          <h3>Executing Data Mining Pipeline...</h3>
          <p>Processing multidimensional parameter matrices from MongoDB database</p>
        </div>
      ) : (
        <>
          {/* =========================================================================
              MODULE 1: CLASSIFICATION (ML) TAB
              ========================================================================= */}
          {activeTab === 'classification' && classificationData && (
            <div className="dm-module-content-wrapper">
              {/* Classification Summary Cards */}
              <div className="stats-metric-cards dm-metric-cards-grid">
                <div className="metric-stat-card dm-stat-card">
                  <span className="dm-stat-icon">🌐</span>
                  <span className="metric-number">{classificationData.metrics.totalClassified}</span>
                  <span className="metric-name">Total Classified</span>
                  <span className="dm-stat-subtext">Registered platforms</span>
                </div>

                <div className="metric-stat-card dm-stat-card border-trusted">
                  <span className="dm-stat-icon color-trusted">🛡️</span>
                  <span className="metric-number color-trusted">
                    {classificationData.metrics.predictedTrusted}
                  </span>
                  <span className="metric-name">Predicted Trusted</span>
                  <span className="dm-stat-subtext">High reliability tier</span>
                </div>

                <div className="metric-stat-card dm-stat-card border-mod-trusted">
                  <span className="dm-stat-icon color-mod-trusted">⚖️</span>
                  <span className="metric-number color-mod-trusted">
                    {classificationData.metrics.predictedModeratelyTrusted}
                  </span>
                  <span className="metric-name">Predicted Moderate</span>
                  <span className="dm-stat-subtext">Average standard tier</span>
                </div>

                <div className="metric-stat-card dm-stat-card border-risky">
                  <span className="dm-stat-icon color-risky">⚠️</span>
                  <span className="metric-number color-risky">
                    {classificationData.metrics.predictedRisky}
                  </span>
                  <span className="metric-name">Predicted Risky</span>
                  <span className="dm-stat-subtext">Elevated risk tier</span>
                </div>

                <div className="metric-stat-card dm-stat-card border-cyan">
                  <span className="dm-stat-icon color-cyan">📈</span>
                  <span className="metric-number color-cyan">
                    {classificationData.metrics.modelAccuracy}%
                  </span>
                  <span className="metric-name">Model Accuracy</span>
                  <span className="dm-stat-subtext">Ground truth match rate</span>
                </div>
              </div>

              {/* Feature Importance Indicators Bar */}
              {classificationData.metrics?.featureImportances && (
                <div className="dashboard-section-card dm-features-card">
                  <div className="section-header-flex">
                    <div>
                      <h3 className="dashboard-section-title">Random Forest Feature Weight Distribution</h3>
                      <p className="dashboard-section-subtitle">
                        Relative importance of input attributes during algorithmic classification
                      </p>
                    </div>
                  </div>
                  <div className="feature-chips-grid">
                    {classificationData.metrics.featureImportances.map((item) => (
                      <div key={item.feature} className="feature-chip-card">
                        <div className="feature-chip-header">
                          <span className="feature-chip-name">{item.feature}</span>
                          <span className="feature-chip-val">{item.importance}%</span>
                        </div>
                        <div className="feature-progress-track">
                          <div
                            className="feature-progress-fill"
                            style={{ width: `${Math.min(100, item.importance * 3)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Classification Results Table Card */}
              <div className="dashboard-section-card dm-results-table-card">
                <div className="table-controls-header">
                  <div>
                    <h2 className="dashboard-section-title">Machine Learning Classification Results</h2>
                    <p className="dashboard-section-subtitle">
                      Predicted trust category classifications vs actual user evaluation records ({filteredClassifications.length} websites shown)
                    </p>
                  </div>

                  {/* Dual Filters */}
                  <div className="table-filters-row">
                    <input
                      type="text"
                      className="dm-search-input"
                      placeholder="Search website name or domain..."
                      value={clfSearchQuery}
                      onChange={(e) => setClfSearchQuery(e.target.value)}
                    />

                    <select
                      className="dm-select-filter"
                      value={clfCategoryFilter}
                      onChange={(e) => setClfCategoryFilter(e.target.value)}
                    >
                      <option value="All">All Categories</option>
                      {uniqueCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>

                    <select
                      className="dm-select-filter"
                      value={clfMatchFilter}
                      onChange={(e) => setClfMatchFilter(e.target.value)}
                    >
                      <option value="All">All Match Statuses</option>
                      <option value="Match">✓ Matches Only</option>
                      <option value="Discrepancy">≠ Discrepancies</option>
                      <option value="Pending">● Pending Actual</option>
                    </select>
                  </div>
                </div>

                {filteredClassifications.length === 0 ? (
                  <div className="no-results-card">
                    <h3>No Classification Records Match Filter</h3>
                    <p>Try resetting the search query or category filters above.</p>
                  </div>
                ) : (
                  <div className="admin-table-wrapper dm-table-wrapper">
                    <table className="admin-table dm-data-table">
                      <thead>
                        <tr>
                          <th>Website Name</th>
                          <th>Category</th>
                          <th>Actual Trust Score</th>
                          <th>Actual Category</th>
                          <th>ML Predicted Category</th>
                          <th>Prediction Match</th>
                          <th>Model Confidence</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredClassifications.map((item) => {
                          const predCatClass = item.predictedCategory.toLowerCase().replace(/\s+/g, '-');
                          const actualCatClass = (item.actualCategory || 'not-rated-yet').toLowerCase().replace(/\s+/g, '-');

                          return (
                            <tr key={item._id}>
                              {/* Website Name & Domain */}
                              <td>
                                <div className="site-name-cell">
                                  <strong className="site-name-title">{item.name}</strong>
                                  <span className="site-domain-sub">{item.domain}</span>
                                </div>
                              </td>

                              {/* Category Tag */}
                              <td>
                                <span className="website-category-tag dm-cat-tag">
                                  {item.category}
                                </span>
                              </td>

                              {/* Actual Trust Score */}
                              <td>
                                {item.actualTrustScore > 0 ? (
                                  <span className="actual-score-badge">
                                    <strong>{item.actualTrustScore}</strong> / 100
                                  </span>
                                ) : (
                                  <span className="score-pending-text">Not Rated</span>
                                )}
                              </td>

                              {/* Actual Category Badge */}
                              <td>
                                <span className={`trust-badge ${actualCatClass}`}>
                                  ● {item.actualCategory}
                                </span>
                              </td>

                              {/* ML Predicted Category */}
                              <td>
                                <span className={`trust-badge predicted-badge ${predCatClass}`}>
                                  ⚡ {item.predictedCategory}
                                </span>
                              </td>

                              {/* Prediction Match Indicator */}
                              <td>
                                {item.matchStatus === 'Match' ? (
                                  <span className="match-pill match-yes">
                                    ✓ Match
                                  </span>
                                ) : item.matchStatus === 'Pending Actual' ? (
                                  <span className="match-pill match-pending">
                                    ● Pending
                                  </span>
                                ) : (
                                  <span className="match-pill match-no">
                                    ≠ Discrepancy
                                  </span>
                                )}
                              </td>

                              {/* Model Confidence Bar */}
                              <td>
                                <div className="confidence-cell-wrapper">
                                  <div className="confidence-label-row">
                                    <span className="confidence-pct">{item.confidence}%</span>
                                    <span className={`confidence-tier ${item.confidenceLevel.toLowerCase()}`}>
                                      {item.confidenceLevel}
                                    </span>
                                  </div>
                                  <div className="confidence-track">
                                    <div
                                      className={`confidence-fill ${predCatClass}`}
                                      style={{ width: `${Math.min(100, item.confidence)}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </td>

                              {/* Actions Cell */}
                              <td>
                                <Link to={`/websites/${item._id}`} className="dm-view-link">
                                  View Details →
                                </Link>
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
          )}

          {/* =========================================================================
              MODULE 2: CLUSTERING (K-MEANS) TAB
              ========================================================================= */}
          {activeTab === 'clustering' && clusteringData && (
            <div className="dm-module-content-wrapper">
              {/* Clustering Metrics Banner */}
              <div className="stats-metric-cards dm-metric-cards-grid">
                <div className="metric-stat-card dm-stat-card">
                  <span className="dm-stat-icon">🌐</span>
                  <span className="metric-number">{clusteringData.metrics.websitesAnalyzed}</span>
                  <span className="metric-name">Websites Clustered</span>
                  <span className="dm-stat-subtext">Multidimensional vectors</span>
                </div>

                <div className="metric-stat-card dm-stat-card border-cyan">
                  <span className="dm-stat-icon color-cyan">🔢</span>
                  <span className="metric-number color-cyan">{clusteringData.metrics.totalClusters}</span>
                  <span className="metric-name">Optimal Clusters (K)</span>
                  <span className="dm-stat-subtext">K-Means algorithm</span>
                </div>

                <div className="metric-stat-card dm-stat-card border-trusted">
                  <span className="dm-stat-icon color-trusted">🏆</span>
                  <span className="metric-number color-trusted">
                    {clusteringData.clusters[0]?.count || 0}
                  </span>
                  <span className="metric-name">Tier 1: High Trust</span>
                  <span className="dm-stat-subtext">Top performing cluster</span>
                </div>

                <div className="metric-stat-card dm-stat-card border-risky">
                  <span className="dm-stat-icon color-risky">⚠️</span>
                  <span className="metric-number color-risky">
                    {clusteringData.clusters[2]?.count || 0}
                  </span>
                  <span className="metric-name">Tier 3: Risk Prone</span>
                  <span className="dm-stat-subtext">Elevated dispute cluster</span>
                </div>
              </div>

              {/* Cluster Profiles / Characteristics Cards */}
              <div className="cluster-profiles-container">
                <div className="section-header-flex" style={{ marginBottom: '1rem' }}>
                  <div>
                    <h2 className="dashboard-section-title">K-Means Cluster Profiles & Characteristics</h2>
                    <p className="dashboard-section-subtitle">
                      Unsupervised grouping based on multi-parameter performance, review volume, and trust indices
                    </p>
                  </div>
                </div>

                <div className="cluster-cards-grid">
                  {clusteringData.clusters.map((cluster) => (
                    <div key={cluster.clusterId} className={`cluster-profile-card border-${cluster.badgeColor}`}>
                      <div className="cluster-card-top-row">
                        <div className="cluster-id-badge">Cluster #{cluster.clusterId}</div>
                        <span className={`trust-badge ${cluster.badgeColor}`}>
                          {cluster.tier}
                        </span>
                      </div>

                      <h3 className="cluster-card-title">{cluster.name}</h3>
                      <p className="cluster-card-desc">{cluster.description}</p>

                      <div className="cluster-metrics-subgrid">
                        <div className="cluster-metric-box">
                          <span className="cmb-num">{cluster.count}</span>
                          <span className="cmb-label">Websites ({cluster.percentage}%)</span>
                        </div>
                        <div className="cluster-metric-box">
                          <span className="cmb-num">{cluster.meanTrustScore}/100</span>
                          <span className="cmb-label">Mean Trust Score</span>
                        </div>
                        <div className="cluster-metric-box">
                          <span className="cmb-num">{cluster.meanParamRating} ★</span>
                          <span className="cmb-label">Avg Parameter Score</span>
                        </div>
                      </div>

                      {/* Cluster Proportion Bar */}
                      <div className="cluster-bar-container">
                        <div className="cluster-bar-track">
                          <div
                            className={`cluster-bar-fill ${cluster.badgeColor}`}
                            style={{ width: `${cluster.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Website to Cluster Assignments Table */}
              <div className="dashboard-section-card dm-results-table-card">
                <div className="section-header-flex">
                  <div>
                    <h2 className="dashboard-section-title">Website Cluster Assignments</h2>
                    <p className="dashboard-section-subtitle">
                      Assigned cluster classification, distance fit score, and individual profile metrics
                    </p>
                  </div>
                </div>

                <div className="admin-table-wrapper dm-table-wrapper">
                  <table className="admin-table dm-data-table">
                    <thead>
                      <tr>
                        <th>Website Name</th>
                        <th>Category</th>
                        <th>Assigned Cluster</th>
                        <th>Trust Tier</th>
                        <th>Actual Trust Score</th>
                        <th>Reviews Count</th>
                        <th>Cluster Fit Degree</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clusteringData.assignments.map((item) => (
                        <tr key={item._id}>
                          <td>
                            <div className="site-name-cell">
                              <strong className="site-name-title">{item.name}</strong>
                              <span className="site-domain-sub">{item.domain}</span>
                            </div>
                          </td>
                          <td>
                            <span className="website-category-tag dm-cat-tag">{item.category}</span>
                          </td>
                          <td>
                            <span className="cluster-tag-pill">
                              Cluster #{item.clusterId}
                            </span>
                          </td>
                          <td>
                            <span className={`trust-badge ${item.badgeColor}`}>
                              ● {item.clusterTier}
                            </span>
                          </td>
                          <td>
                            <span className="actual-score-badge">
                              {item.trustScore > 0 ? `${item.trustScore}/100` : 'Not Rated'}
                            </span>
                          </td>
                          <td>
                            <span className="dm-review-count">{item.totalReviews || 0} reviews</span>
                          </td>
                          <td>
                            <div className="confidence-cell-wrapper">
                              <span className="confidence-pct">{item.fitScore}%</span>
                              <div className="confidence-track">
                                <div
                                  className={`confidence-fill ${item.badgeColor}`}
                                  style={{ width: `${item.fitScore}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <Link to={`/websites/${item._id}`} className="dm-view-link">
                              View →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              MODULE 3: ASSOCIATION RULE MINING (APRIORI) TAB
              ========================================================================= */}
          {activeTab === 'apriori' && aprioriData && (
            <div className="dm-module-content-wrapper">
              {/* Apriori Interactive Settings Bar */}
              <div className="dashboard-section-card apriori-settings-card">
                <div className="section-header-flex" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 className="dashboard-section-title">Apriori Algorithm Threshold Parameters</h3>
                    <p className="dashboard-section-subtitle">
                      Adjust minimum support and confidence thresholds to uncover latent rating correlations
                    </p>
                  </div>
                  <div className="apriori-controls-row">
                    <div className="apriori-input-group">
                      <label htmlFor="min-support-input">Min Support (s):</label>
                      <input
                        id="min-support-input"
                        type="number"
                        step="0.05"
                        min="0.05"
                        max="0.8"
                        className="apriori-number-input"
                        value={minSupport}
                        onChange={(e) => setMinSupport(parseFloat(e.target.value) || 0.15)}
                      />
                    </div>

                    <div className="apriori-input-group">
                      <label htmlFor="min-confidence-input">Min Confidence (c):</label>
                      <input
                        id="min-confidence-input"
                        type="number"
                        step="0.05"
                        min="0.2"
                        max="0.99"
                        className="apriori-number-input"
                        value={minConfidence}
                        onChange={(e) => setMinConfidence(parseFloat(e.target.value) || 0.5)}
                      />
                    </div>

                    <button
                      type="button"
                      className="btn-primary-action"
                      onClick={() => fetchApriori(true, minSupport, minConfidence)}
                      disabled={actionLoading || loading}
                    >
                      {actionLoading ? 'Mining...' : 'Apply & Run Apriori'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Apriori Summary Metric Cards */}
              <div className="stats-metric-cards dm-metric-cards-grid">
                <div className="metric-stat-card dm-stat-card">
                  <span className="dm-stat-icon">📑</span>
                  <span className="metric-number">{aprioriData.metrics.transactionsAnalyzed}</span>
                  <span className="metric-name">Review Transactions</span>
                  <span className="dm-stat-subtext">Multi-parameter evaluations</span>
                </div>

                <div className="metric-stat-card dm-stat-card border-cyan">
                  <span className="dm-stat-icon color-cyan">📦</span>
                  <span className="metric-number color-cyan">
                    {aprioriData.metrics.frequentItemsetsCount}
                  </span>
                  <span className="metric-name">Frequent Itemsets</span>
                  <span className="dm-stat-subtext">Satisfying support threshold</span>
                </div>

                <div className="metric-stat-card dm-stat-card border-trusted">
                  <span className="dm-stat-icon color-trusted">🔗</span>
                  <span className="metric-number color-trusted">{aprioriData.metrics.rulesCount}</span>
                  <span className="metric-name">Association Rules</span>
                  <span className="dm-stat-subtext">High confidence correlations</span>
                </div>

                <div className="metric-stat-card dm-stat-card border-mod-trusted">
                  <span className="dm-stat-icon color-mod-trusted">🚀</span>
                  <span className="metric-number color-mod-trusted">{aprioriData.metrics.maxLift}x</span>
                  <span className="metric-name">Max Rule Lift</span>
                  <span className="dm-stat-subtext">Correlation strength</span>
                </div>

                <div className="metric-stat-card dm-stat-card border-cyan">
                  <span className="dm-stat-icon color-cyan">🎯</span>
                  <span className="metric-number color-cyan">
                    {aprioriData.metrics.averageConfidence}%
                  </span>
                  <span className="metric-name">Average Confidence</span>
                  <span className="dm-stat-subtext">Prediction certainty</span>
                </div>
              </div>

              {/* Strong Association Rules Table Card */}
              <div className="dashboard-section-card dm-results-table-card">
                <div className="section-header-flex">
                  <div>
                    <h2 className="dashboard-section-title">Discovered Association Rules</h2>
                    <p className="dashboard-section-subtitle">
                      Strong operational correlations extracted using Apriori algorithm from real user reviews
                    </p>
                  </div>
                </div>

                {aprioriData.rules.length === 0 ? (
                  <div className="no-results-card">
                    <h3>No Association Rules Found</h3>
                    <p>Try lowering the Minimum Support or Minimum Confidence thresholds above to mine more rules.</p>
                  </div>
                ) : (
                  <div className="admin-table-wrapper dm-table-wrapper">
                    <table className="admin-table dm-data-table">
                      <thead>
                        <tr>
                          <th>Rule #</th>
                          <th>Antecedents (IF Condition)</th>
                          <th>Consequents (THEN Outcome)</th>
                          <th>Support (%)</th>
                          <th>Confidence (%)</th>
                          <th>Lift Ratio</th>
                          <th>Operational Interpretation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aprioriData.rules.map((rule) => (
                          <tr key={rule.id}>
                            <td>
                              <span className="rule-id-badge">#{rule.id}</span>
                            </td>

                            {/* Antecedents */}
                            <td>
                              <div className="itemset-chips-cell">
                                {rule.antecedents.map((item) => (
                                  <span key={item} className="item-chip ante-chip">
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </td>

                            {/* Consequents */}
                            <td>
                              <div className="itemset-chips-cell">
                                {rule.consequents.map((item) => (
                                  <span key={item} className="item-chip cons-chip">
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </td>

                            {/* Support */}
                            <td>
                              <span className="dm-numeric-val">{rule.support}%</span>
                            </td>

                            {/* Confidence */}
                            <td>
                              <div className="confidence-cell-wrapper">
                                <span className="confidence-pct">{rule.confidence}%</span>
                                <div className="confidence-track">
                                  <div
                                    className="confidence-fill trusted"
                                    style={{ width: `${rule.confidence}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>

                            {/* Lift */}
                            <td>
                              <span className={`lift-badge ${rule.lift >= 2.0 ? 'high-lift' : 'moderate-lift'}`}>
                                {rule.lift}x
                              </span>
                            </td>

                            {/* Human-readable insight */}
                            <td>
                              <p className="rule-insight-text">{rule.insight}</p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Frequent Itemsets Section */}
              <div className="dashboard-section-card dm-itemsets-card">
                <div className="section-header-flex">
                  <div>
                    <h3 className="dashboard-section-title">Discovered Frequent Itemsets</h3>
                    <p className="dashboard-section-subtitle">
                      Combinations of rating attributes frequently co-occurring across evaluations
                    </p>
                  </div>
                </div>

                <div className="itemsets-grid">
                  {aprioriData.frequentItemsets.map((iset, idx) => (
                    <div key={idx} className="itemset-box">
                      <div className="itemset-box-header">
                        <span className="itemset-k-label">{iset.length}-Itemset</span>
                        <span className="itemset-sup-badge">{iset.support}% Support</span>
                      </div>
                      <div className="itemset-items-list">
                        {iset.items.map((it) => (
                          <span key={it} className="item-chip iset-chip">
                            {it}
                          </span>
                        ))}
                      </div>
                      <div className="itemset-count-footer">
                        {iset.count} matching evaluations
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DataMining;
