import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const DEFAULT_CATEGORIES = [
  'E-Commerce',
  'Travel & Booking',
  'Financial Services',
  'Entertainment',
  'Education',
  'Healthcare',
  'Technology',
  'Food & Dining',
  'Social Media',
  'Other'
];

const History = () => {
  const { token } = useContext(AuthContext);

  // --- Personal Search History State ---
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // --- Recommended Websites Section State ---
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [recsError, setRecsError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [categories, setCategories] = useState(['All Categories', ...DEFAULT_CATEGORIES]);

  // Fetch search history
  const fetchHistory = useCallback(() => {
    if (!token) return;
    setLoading(true);
    fetch('/api/history', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setHistory(data.history || []);
        } else {
          setError(data.message || 'Failed to load search history');
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading history:', err);
        setError('Server error loading history.');
        setLoading(false);
      });
  }, [token]);

  // Fetch dynamic categories from database
  const fetchCategories = useCallback(() => {
    fetch('/api/websites/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.categories)) {
          const merged = Array.from(new Set([...DEFAULT_CATEGORIES, ...data.categories])).sort();
          setCategories(['All Categories', ...merged]);
        }
      })
      .catch((err) => console.error('Error loading categories:', err));
  }, []);

  // Fetch recommendations from entire dataset based on selected category
  const fetchRecommendations = useCallback(() => {
    setLoadingRecs(true);
    setRecsError('');

    const searchParams = new URLSearchParams();
    if (selectedCategory && selectedCategory !== 'All Categories' && selectedCategory !== 'All') {
      searchParams.append('category', selectedCategory);
    }
    searchParams.append('limit', '12');

    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    fetch(`/api/websites/recommendations?${searchParams.toString()}`, {
      headers
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setRecommendations(data.recommendations || []);
        } else {
          setRecsError(data.message || 'Failed to load recommendations.');
        }
        setLoadingRecs(false);
      })
      .catch((err) => {
        console.error('Error loading recommendations:', err);
        setRecsError('Network error loading recommended websites.');
        setLoadingRecs(false);
      });
  }, [token, selectedCategory]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleDeleteHistoryItem = async (historyId) => {
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

  if (loading) {
    return <div className="detail-loading">Loading search history...</div>;
  }

  return (
    <div className="history-page-container">
      {/* Search History Header */}
      <div className="products-header-card">
        <h1 className="products-page-title">Personal Search History</h1>
        <p className="products-page-subtitle">
          Websites and e-commerce profiles you have searched or evaluated on TrustLens
        </p>
      </div>

      {/* Search History List */}
      {error ? (
        <div className="detail-error-card">
          <h2>Error Loading History</h2>
          <p>{error}</p>
        </div>
      ) : history.length === 0 ? (
        <div className="no-reviews-box" style={{ marginTop: '1.5rem' }}>
          <p>No search history recorded yet. Explore websites from the Dashboard to record search history.</p>
          <Link to="/dashboard" className="nav-btn" style={{ display: 'inline-block', marginTop: '1rem' }}>
            Go to Dashboard
          </Link>
        </div>
      ) : (
        <div className="history-list-vertical">
          {history.map((item) => {
            const site = item.website || {};
            if (!site._id) return null;

            return (
              <div key={item._id} className="history-item-row">
                <div className="history-item-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h3 className="history-item-title">{site.name}</h3>
                    <span className="history-category-pill">{site.category}</span>
                  </div>
                  <span className="history-item-domain">{site.domain}</span>
                </div>

                <div className="history-item-actions">
                  <span className="history-item-time">
                    {new Date(item.searchedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  <Link to={`/websites/${site._id}`} className="view-details-btn" style={{ padding: '0.45rem 1rem' }}>
                    Open Profile
                  </Link>
                  <button
                    type="button"
                    className="history-remove-btn"
                    onClick={() => handleDeleteHistoryItem(item._id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* Recommended Websites Section (Directly Below Personal Search History)    */}
      {/* ========================================================================= */}
      <div className="history-recommendations-section" style={{ marginTop: '3rem' }}>
        <div className="products-header-card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 className="products-page-title" style={{ fontSize: '1.65rem', marginBottom: '0.25rem' }}>
                Recommended Websites
              </h2>
              <p className="products-page-subtitle">
                Highest-rated trusted platforms evaluated across the TrustLens database
              </p>
            </div>

            {/* Category Filter Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <label htmlFor="rec-category-dropdown" className="form-label" style={{ marginBottom: 0, whiteSpace: 'nowrap', fontWeight: 600 }}>
                Category:
              </label>
              <select
                id="rec-category-dropdown"
                className="category-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{ minWidth: '180px' }}
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

        {/* Loading State */}
        {loadingRecs ? (
          <div className="search-loading">Loading recommended websites...</div>
        ) : recsError ? (
          <div className="detail-error-card" style={{ marginTop: '1rem' }}>
            <h3>Error Loading Recommendations</h3>
            <p>{recsError}</p>
            <button
              type="button"
              className="nav-btn"
              style={{ marginTop: '0.75rem' }}
              onClick={fetchRecommendations}
            >
              Retry
            </button>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="no-history-box" style={{ padding: '2.5rem', marginTop: '1rem' }}>
            <p>No eligible websites found in category "{selectedCategory}".</p>
          </div>
        ) : (
          <div className="results-grid">
            {recommendations.map((site) => (
              <div key={site._id} className="website-card">
                <div className="website-card-top">
                  <div>
                    <h3 className="website-name">{site.name}</h3>
                    <a
                      href={site.url || (site.domain ? `https://${site.domain}` : '#')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="website-domain"
                      title={`Visit ${site.domain || site.name}`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      {site.domain} ↗
                    </a>
                  </div>
                  <span className="website-category-tag">{site.category}</span>
                </div>

                <p className="website-desc">
                  {site.description || `Registered platform in category "${site.category}".`}
                </p>

                <div className="trust-score-badge-box">
                  <span className="trust-score-label">Trust Status:</span>
                  {site.trustScore > 0 ? (
                    <span
                      className={`trust-badge ${(site.trustCategory || 'trusted')
                        .toLowerCase()
                        .replace(/\s+/g, '-')}`}
                    >
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
                    View Details & Evaluation →
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

export default History;
