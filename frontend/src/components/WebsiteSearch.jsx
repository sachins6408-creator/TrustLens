import React, { useState, useEffect, useContext } from 'react';
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

const WebsiteSearch = () => {
  const { token } = useContext(AuthContext) || {};
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [categories, setCategories] = useState([]);
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);

  // Request Website Form State
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestData, setRequestData] = useState({
    name: '',
    url: '',
    category: 'E-Commerce'
  });
  const [requestStatus, setRequestStatus] = useState({ error: '', success: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // URL Validation helper
  const validateUrl = (urlInput) => {
    if (!urlInput || !urlInput.trim()) return { isValid: false, message: '' };
    const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/i;
    if (urlPattern.test(urlInput.trim())) {
      try {
        let domain = urlInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
        return { isValid: true, domain, message: `Valid domain format: ${domain}` };
      } catch (e) {
        return { isValid: false, message: 'Invalid URL format' };
      }
    }
    return { isValid: false, message: 'Invalid URL format (e.g. https://example.com or example.com)' };
  };

  const urlValidation = validateUrl(requestData.url);

  // Fetch unique categories on mount
  useEffect(() => {
    fetch('/api/websites/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.categories) {
          const merged = Array.from(new Set([...DEFAULT_CATEGORIES, ...data.categories]));
          setCategories(['All', ...merged]);
        } else {
          setCategories(['All', ...DEFAULT_CATEGORIES]);
        }
      })
      .catch((err) => {
        console.error('Error fetching categories:', err);
        setCategories(['All', ...DEFAULT_CATEGORIES]);
      });
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
          setWebsites(data.websites || []);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching website search results:', err);
        setLoading(false);
      });
  }, [query, category]);

  // Open Request form prefilled with search query
  const handleOpenRequestForm = () => {
    setRequestData({
      name: query.trim() || '',
      url: '',
      category: category !== 'All' ? category : 'E-Commerce'
    });
    setRequestStatus({ error: '', success: '' });
    setShowRequestForm(true);
  };

  // Submit Website Request Handler
  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setRequestStatus({ error: '', success: '' });

    const name = requestData.name.trim();
    const url = requestData.url.trim();
    const cat = requestData.category.trim();

    // 1. Validate Website Name
    if (!name) {
      setRequestStatus({ error: 'Please enter the website name.', success: '' });
      return;
    }

    // 2. Validate URL
    if (!url) {
      setRequestStatus({ error: 'Please enter the website URL.', success: '' });
      return;
    }

    if (!urlValidation.isValid) {
      setRequestStatus({
        error: 'Invalid website URL. Please provide a valid domain (e.g. https://example.com or example.com).',
        success: ''
      });
      return;
    }

    // 3. Validate Category
    if (!cat) {
      setRequestStatus({ error: 'Please select a website category.', success: '' });
      return;
    }

    setIsSubmitting(true);

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/websites', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name,
          url,
          category: cat
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setRequestStatus({
          error: '',
          success: data.message || 'Website request submitted successfully! Marked as "New Website Request" for administrator verification.'
        });
        setRequestData({ name: '', url: '', category: 'E-Commerce' });
      } else {
        setRequestStatus({
          error: data.message || 'Failed to submit website request. Domain may already exist.',
          success: ''
        });
      }
    } catch (err) {
      console.error('Error submitting website request:', err);
      setRequestStatus({
        error: 'Network error occurred while submitting website request. Please try again.',
        success: ''
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
              onChange={(e) => {
                setQuery(e.target.value);
                setShowRequestForm(false);
                setRequestStatus({ error: '', success: '' });
              }}
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
          <div className="no-results-icon">🔍</div>
          <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Website Not Found
          </h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 1.25rem' }}>
            {query.trim()
              ? `No registered website found matching "${query}". If you want TrustLens to index and verify this platform, you can submit a request below.`
              : 'No websites match the selected category filter. You can submit a request to add a new website to TrustLens.'}
          </p>

          {!showRequestForm ? (
            <button
              type="button"
              className="request-website-trigger-btn"
              onClick={handleOpenRequestForm}
            >
              ➕ Request this Website
            </button>
          ) : (
            <div className="request-website-box" style={{ maxWidth: '560px', margin: '1.5rem auto 0' }}>
              <div className="request-website-box-title">
                <span>📝 Request New Website Verification</span>
              </div>
              <p className="request-website-box-subtitle">
                Submit website details for administrator verification. Once approved, the platform will be added to the active directory.
              </p>

              {requestStatus.error && (
                <div className="auth-alert error" style={{ marginBottom: '1rem' }}>
                  ⚠️ {requestStatus.error}
                </div>
              )}
              {requestStatus.success && (
                <div className="auth-alert success" style={{ marginBottom: '1rem' }}>
                  ✓ {requestStatus.success}
                </div>
              )}

              <form onSubmit={handleRequestSubmit}>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">
                    Website Name <span className="req-star">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Myntra, Swiggy, Netflix"
                    value={requestData.name}
                    onChange={(e) => setRequestData({ ...requestData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">
                    Website URL / Domain <span className="req-star">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. https://www.example.com or example.com"
                    value={requestData.url}
                    onChange={(e) => setRequestData({ ...requestData, url: e.target.value })}
                    required
                  />
                  {requestData.url.trim() && (
                    <div className={`url-validation-indicator ${urlValidation.isValid ? 'valid' : 'invalid'}`}>
                      {urlValidation.isValid ? '✓ ' : '⚠️ '}
                      {urlValidation.message}
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label">
                    Category <span className="req-star">*</span>
                  </label>
                  <select
                    className="category-select"
                    style={{ width: '100%' }}
                    value={requestData.category}
                    onChange={(e) => setRequestData({ ...requestData, category: e.target.value })}
                    required
                  >
                    {categories.filter((c) => c !== 'All').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-panel-actions">
                  <button
                    type="button"
                    className="btn-secondary-cancel"
                    onClick={() => {
                      setShowRequestForm(false);
                      setRequestStatus({ error: '', success: '' });
                    }}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary-submit"
                    disabled={isSubmitting || (requestData.url.trim() && !urlValidation.isValid)}
                  >
                    {isSubmitting ? 'Submitting Request...' : 'Submit Website Request'}
                  </button>
                </div>
              </form>
            </div>
          )}
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
  );
};

export default WebsiteSearch;

