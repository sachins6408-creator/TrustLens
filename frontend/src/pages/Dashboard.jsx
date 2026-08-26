import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Dashboard = () => {
  const { user, token } = useContext(AuthContext);

  // Search States
  const [websiteQuery, setWebsiteQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState([]);
  const [websites, setWebsites] = useState([]);
  const [loadingWebsites, setLoadingWebsites] = useState(true);

  // User History State
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Fetch Websites
  useEffect(() => {
    setLoadingWebsites(true);
    const searchParams = new URLSearchParams();
    if (websiteQuery.trim()) searchParams.append('query', websiteQuery.trim());
    if (selectedCategory && selectedCategory !== 'All') searchParams.append('category', selectedCategory);

    fetch(`/api/websites?${searchParams.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setWebsites(data.websites || []);
        }
        setLoadingWebsites(false);
      })
      .catch((err) => {
        console.error('Error fetching websites:', err);
        setLoadingWebsites(false);
      });
  }, [websiteQuery, selectedCategory]);

  // Fetch Categories
  useEffect(() => {
    fetch('/api/websites/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.categories) {
          setCategories(['All', ...data.categories]);
        }
      })
      .catch((err) => console.error('Error fetching categories:', err));
  }, []);

  // Fetch User History
  const fetchUserHistory = () => {
    if (!token) return;
    setLoadingHistory(true);
    fetch('/api/history', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setHistory(data.history || []);
        }
        setLoadingHistory(false);
      })
      .catch((err) => {
        console.error('Error fetching search history:', err);
        setLoadingHistory(false);
      });
  };

  useEffect(() => {
    fetchUserHistory();
  }, [token]);

  // Delete History Record
  const handleDeleteHistory = async (historyId, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token) return;

    try {
      const res = await fetch(`/api/history/${historyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHistory((prev) => prev.filter((item) => item._id !== historyId));
      }
    } catch (err) {
      console.error('Error deleting history item:', err);
    }
  };

  // Helper to format history relative date
  const formatHistoryDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.abs(now - date) / 36e5;

    if (diffHours < 24 && date.getDate() === now.getDate()) {
      return 'Today';
    } else if (diffHours < 48 && now.getDate() - date.getDate() === 1) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  return (
    <div className="dashboard-container">
      {/* Welcome Banner */}
      <div className="welcome-banner-card">
        <h1 className="welcome-title">Welcome, {user?.name || 'User'}</h1>
        <p className="welcome-subtitle">
          Explore, evaluate, and verify trusted e-commerce and service provider websites.
        </p>
      </div>

      {/* Main Dual Search Card */}
      <div className="dashboard-section-card">
        <h2 className="dashboard-section-title">Search Platform</h2>
        <div className="dual-search-grid">
          <div className="search-box-group">
            <label className="form-label">Search Website</label>
            <input
              type="text"
              className="search-input"
              placeholder="Search by website name or domain (e.g. Amazon, Flipkart)..."
              value={websiteQuery}
              onChange={(e) => setWebsiteQuery(e.target.value)}
            />
          </div>

          <div className="search-box-group">
            <label className="form-label">Category Filter</label>
            <select
              className="category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* User Search History Section */}
      <div className="dashboard-section-card">
        <div className="section-header-flex">
          <div>
            <h2 className="dashboard-section-title">Recent Search History</h2>
            <p className="dashboard-section-subtitle">Websites you recently searched or evaluated</p>
          </div>
          <Link to="/history" className="view-all-link">
            View All History →
          </Link>
        </div>

        {loadingHistory ? (
          <div className="search-loading">Loading search history...</div>
        ) : history.length === 0 ? (
          <div className="no-history-box">
            <p>No recent website search history recorded yet. Explore websites below to record history.</p>
          </div>
        ) : (
          <div className="history-grid">
            {history.slice(0, 4).map((item) => {
              const site = item.website || {};
              if (!site._id) return null;

              return (
                <div key={item._id} className="history-card">
                  <div className="history-card-header">
                    <div>
                      <h4 className="history-site-name">{site.name}</h4>
                      <span className="history-domain">{site.domain}</span>
                    </div>
                    <span className="history-category-pill">{site.category}</span>
                  </div>

                  <div className="history-card-footer">
                    <span className="history-date">Viewed: {formatHistoryDate(item.searchedAt)}</span>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <Link to={`/websites/${site._id}`} className="history-open-btn">
                        Open
                      </Link>
                      <button
                        type="button"
                        className="history-remove-btn"
                        onClick={(e) => handleDeleteHistory(item._id, e)}
                        title="Remove from history"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Available Websites Collection Grid */}
      <div className="dashboard-section-card">
        <h2 className="dashboard-section-title">Available Websites ({websites.length})</h2>
        <p className="dashboard-section-subtitle">Browse registered websites and access dynamic multi-parameter evaluations</p>

        {loadingWebsites ? (
          <div className="search-loading">Loading website directory...</div>
        ) : websites.length === 0 ? (
          <div className="no-results-card">
            <h3>No Websites Found</h3>
            <p>No registered website records matched your search criteria.</p>
          </div>
        ) : (
          <div className="results-grid" style={{ marginTop: '1.25rem' }}>
            {websites.map((site) => (
              <div key={site._id} className="website-card">
                <div className="website-card-top">
                  <div>
                    <h3 className="website-name">{site.name}</h3>
                    <span className="website-domain">{site.domain}</span>
                  </div>
                  <span className="website-category-tag">{site.category}</span>
                </div>

                <p className="website-desc">
                  {site.description || 'Registered e-commerce and service provider website.'}
                </p>

                <div className="trust-score-badge-box">
                  <span className="trust-score-label">Trust Status:</span>
                  {site.trustScore > 0 ? (
                    <span className={`trust-badge ${site.trustCategory.toLowerCase().replace(/\s+/g, '-')}`}>
                      {site.trustCategory} ({site.trustScore}/100)
                    </span>
                  ) : (
                    <span className="trust-badge pending">
                      ● {site.trustCategory || 'Not Rated Yet'}
                    </span>
                  )}
                </div>

                <div className="website-card-footer">
                  <span className="reviews-count">{site.totalReviews || 0} Reviews</span>
                  <Link to={`/websites/${site._id}`} className="view-details-btn">
                    View Details & Reviews →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
