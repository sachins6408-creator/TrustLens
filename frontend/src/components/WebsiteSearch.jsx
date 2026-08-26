import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const WebsiteSearch = () => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [categories, setCategories] = useState([]);
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch unique categories on mount
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

  // Fetch websites whenever query or category changes
  useEffect(() => {
    setLoading(true);
    const searchParams = new URLSearchParams();
    if (query.trim()) searchParams.append('query', query.trim());
    if (category && category !== 'All') searchParams.append('category', category);

    fetch(`/api/websites?${searchParams.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setWebsites(data.websites);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching website search results:', err);
        setLoading(false);
      });
  }, [query, category]);

  return (
    <div className="search-section">
      <div className="search-header-box">
        <h2 className="search-section-title">Search Website Trust Index</h2>
        <p className="search-section-subtitle">
          Search registered e-commerce and service websites by name or browse by category.
        </p>

        <div className="search-bar-container">
          <div className="search-input-wrapper">
            <span className="search-icon"></span>
            <input
              type="text"
              className="search-input"
              placeholder="Search by website name or domain (e.g. Amazon, Flipkart)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button className="clear-btn" onClick={() => setQuery('')}>
                ✕
              </button>
            )}
          </div>

          <div className="category-select-wrapper">
            <label className="select-label">Category:</label>
            <select
              className="category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
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

      {loading ? (
        <div className="search-loading">Searching websites...</div>
      ) : websites.length === 0 ? (
        <div className="no-results-card">
          <h3>No Websites Found</h3>
          <p>No website records matched your search criteria "{query}".</p>
        </div>
      ) : (
        <div className="results-grid">
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
                <span className="reviews-count">{site.totalReviews} Reviews</span>
                <Link to={`/websites/${site._id}`} className="view-details-btn">
                  View Details & Reviews →
                </Link>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WebsiteSearch;
