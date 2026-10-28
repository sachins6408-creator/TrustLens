import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const DEFAULT_FALLBACK_PARAMETERS = [
  'Reliability',
  'User Experience',
  'Service Quality',
  'Security',
  'Customer Support',
  'Transparency',
  'Overall Satisfaction'
];

const WebsiteDetails = () => {
  const { id } = useParams();
  const { user, token } = useContext(AuthContext);

  const [website, setWebsite] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dynamic Category Evaluation Parameters State
  const [categoryParameters, setCategoryParameters] = useState([]);
  const [loadingParams, setLoadingParams] = useState(true);

  // Review Form State - Initialized dynamically based ONLY on website category
  const [ratings, setRatings] = useState({});
  const [hoverRatings, setHoverRatings] = useState({});
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ error: '', success: '' });

  // 1. Fetch Website Profile & Reviews
  const fetchDetails = useCallback(() => {
    fetch(`/api/websites/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setWebsite(data.website);
          setReviews(data.reviews || []);
        } else {
          setError(data.message || 'Website not found');
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching website details:', err);
        setError('Server error loading website profile');
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // 2. Fetch Dynamic Parameters for Website Category
  useEffect(() => {
    if (!website?.category) return;

    setLoadingParams(true);
    // Clear old ratings when category changes
    setRatings({});
    setHoverRatings({});

    const encodedCat = encodeURIComponent(website.category);
    fetch(`/api/evaluation-parameters/${encodedCat}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.parameters) && data.parameters.length > 0) {
          setCategoryParameters(data.parameters);
          // Initialize fresh ratings map exclusively for this category's parameters
          const initial = {};
          data.parameters.forEach((param) => {
            initial[param] = 0;
          });
          setRatings(initial);
        } else {
          setCategoryParameters(DEFAULT_FALLBACK_PARAMETERS);
          const initial = {};
          DEFAULT_FALLBACK_PARAMETERS.forEach((param) => {
            initial[param] = 0;
          });
          setRatings(initial);
        }
        setLoadingParams(false);
      })
      .catch((err) => {
        console.error('Error fetching category parameters:', err);
        setCategoryParameters(DEFAULT_FALLBACK_PARAMETERS);
        const initial = {};
        DEFAULT_FALLBACK_PARAMETERS.forEach((param) => {
          initial[param] = 0;
        });
        setRatings(initial);
        setLoadingParams(false);
      });
  }, [website?.category]);

  // Record search history for authenticated user
  useEffect(() => {
    if (id && token) {
      fetch('/api/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ websiteId: id })
      }).catch((err) => console.error('Error recording history:', err));
    }
  }, [id, token]);

  const handleRatingChange = (paramKey, value) => {
    setRatings((prev) => ({
      ...prev,
      [paramKey]: Number(value)
    }));
    if (submitStatus.error) setSubmitStatus({ ...submitStatus, error: '' });
  };

  const handleMouseEnterStar = (paramKey, value) => {
    setHoverRatings((prev) => ({
      ...prev,
      [paramKey]: Number(value)
    }));
  };

  const handleMouseLeaveStar = (paramKey) => {
    setHoverRatings((prev) => ({
      ...prev,
      [paramKey]: 0
    }));
  };

  // Calculate live dynamic overall rating from selected category parameters
  const currentParamsList = categoryParameters.length > 0 ? categoryParameters : DEFAULT_FALLBACK_PARAMETERS;
  const ratedKeys = currentParamsList.filter(
    (param) => ratings[param] >= 1 && ratings[param] <= 5
  );
  const isAllRated = currentParamsList.length > 0 && ratedKeys.length === currentParamsList.length;
  const calculatedOverallRating = isAllRated
    ? Number(
        (
          currentParamsList.reduce((sum, param) => sum + (ratings[param] || 0), 0) /
          currentParamsList.length
        ).toFixed(1)
      )
    : null;

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setSubmitStatus({ error: 'You must be logged in to submit a review.', success: '' });
      return;
    }

    // Dynamic validation: check that all category-specific parameters are rated
    const unratedParams = currentParamsList.filter(
      (param) => !ratings[param] || ratings[param] < 1 || ratings[param] > 5
    );

    if (unratedParams.length > 0) {
      setSubmitStatus({
        error: `Please rate all ${currentParamsList.length} evaluation parameters before submitting. (${unratedParams.length} parameter${unratedParams.length > 1 ? 's' : ''} left unrated: ${unratedParams.join(', ')})`,
        success: ''
      });
      return;
    }

    setSubmitting(true);
    setSubmitStatus({ error: '', success: '' });

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          websiteId: id,
          overallRating: calculatedOverallRating,
          ratings,
          comment: comment.trim(),
          review: comment.trim()
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSubmitStatus({
          error: '',
          success: 'Review submitted successfully! Thank you for rating this website.'
        });
        setComment('');
        // Reset dynamic rating state back to 0s
        const resetRatings = {};
        currentParamsList.forEach((param) => {
          resetRatings[param] = 0;
        });
        setRatings(resetRatings);
        setHoverRatings({});
        fetchDetails();
      } else {
        setSubmitStatus({
          error: data.message || 'Failed to submit review.',
          success: ''
        });
      }
    } catch (err) {
      setSubmitStatus({
        error: 'Network or server error during submission.',
        success: ''
      });
    } finally {
      setSubmitting(false);
    }
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const handleDeleteReview = async (reviewId) => {
    if (!token) {
      setSubmitStatus({ error: 'You must be logged in to delete a review.', success: '' });
      return;
    }

    setDeletingId(reviewId);
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSubmitStatus({
          error: '',
          success: 'Review deleted successfully.'
        });
        setReviews((prev) => prev.filter((r) => r._id !== reviewId));
        setConfirmDeleteId(null);
        fetchDetails();
      } else {
        setSubmitStatus({
          error: data.message || 'Failed to delete review.',
          success: ''
        });
      }
    } catch (err) {
      setSubmitStatus({
        error: 'Network or server error while deleting review.',
        success: ''
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <div className="detail-loading">Loading website profile...</div>;
  }

  if (error || !website) {
    return (
      <div className="detail-error-card">
        <h2>Website Not Found</h2>
        <p>{error || 'The requested website profile could not be loaded.'}</p>
        <Link to="/" className="nav-btn" style={{ display: 'inline-block', marginTop: '1rem' }}>
          ← Back to Search
        </Link>
      </div>
    );
  }

  const hasScore = website.trustScore > 0 && website.trustCategory !== 'Not Rated Yet';

  return (
    <div className="website-detail-container">
      <Link to="/" className="back-link">← Back to Search & Dashboard</Link>

      {/* Website Header Card */}
      <div className="detail-header-card">
        <div className="detail-header-top">
          <div>
            <h1 className="detail-title">{website.name}</h1>
            <a
              href={`https://${website.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="detail-domain-link"
            >
              {website.domain}
            </a>
          </div>
          <div>
            <span className="website-category-tag" style={{ fontSize: '0.9rem', padding: '0.3rem 0.8rem' }}>
              {website.category}
            </span>
          </div>
        </div>

        <p className="detail-description">
          {website.description || `Registered platform in category "${website.category}".`}
        </p>

        {/* Trust Score & Category Banner */}
        <div className="trust-status-banner">
          {hasScore ? (
            <div className="score-active-box">
              <div>
                <span className="score-heading">Calculated Trust Score</span>
                <div className="score-value-big">{website.trustScore}/100</div>
              </div>
              <div className={`trust-badge ${website.trustCategory.toLowerCase().replace(/\s+/g, '-')}`} style={{ fontSize: '1rem', padding: '0.5rem 1.25rem' }}>
                Classification: {website.trustCategory}
              </div>
            </div>
          ) : (
            <div className="score-pending-box">
              <div className="score-pending-badge">● Trust Classification: Pending</div>
              <p className="score-pending-notice">
                <strong>Trust Score Notice:</strong> Trust Score will be calculated based on user evaluations and verified metrics.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Evaluation Parameters Rating Breakdown */}
      <div className="detail-section-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 className="section-title">Category Evaluation Breakdown</h2>
            <p className="section-subtitle">
              Dynamic multi-parameter breakdown for <strong>{website.category}</strong> platforms (1 to 5 scale)
            </p>
          </div>
          <span className="website-category-tag" style={{ fontSize: '0.8rem', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-cyan)' }}>
            ✓ Category: {website.category} ({currentParamsList.length} Parameters)
          </span>
        </div>

        {loadingParams ? (
          <div className="search-loading" style={{ margin: '1rem 0' }}>Loading dynamic evaluation parameters...</div>
        ) : (
          <div className="parameters-grid">
            {currentParamsList.map((paramName) => {
              const score = website.parameterRatings?.[paramName] || 0;
              const percentage = (score / 5) * 100;

              return (
                <div key={paramName} className="parameter-card">
                  <div className="parameter-header">
                    <span className="parameter-name">{paramName}</span>
                    <span className="parameter-score">{score > 0 ? `${score.toFixed(1)} / 5` : 'N/A'}</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Submission Form Section */}
      <div className="detail-section-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 className="section-title">Submit Category-Specific Evaluation</h2>
            <p className="section-subtitle">
              Rate {website.name} across dynamic evaluation parameters tailored for <strong>{website.category}</strong>
            </p>
          </div>
          {isAllRated && calculatedOverallRating !== null && (
            <div className="live-overall-badge">
              <span>Calculated Overall Rating: </span>
              <strong>{calculatedOverallRating} / 5 ★</strong>
            </div>
          )}
        </div>

        {!user ? (
          <div className="auth-prompt-box">
            <span>You must be logged in to submit a review. </span>
            <Link to="/login" className="auth-prompt-link">Log In</Link>
            <span> or </span>
            <Link to="/register" className="auth-prompt-link">Register</Link>
          </div>
        ) : (
          <form onSubmit={handleReviewSubmit} className="review-form">
            {submitStatus.error && (
              <div className="auth-alert error">
                {submitStatus.error}
              </div>
            )}
            {submitStatus.success && (
              <div className="auth-alert success">
                {submitStatus.success}
              </div>
            )}

            {loadingParams ? (
              <div className="search-loading">Loading evaluation parameters for {website.category}...</div>
            ) : (
              <div className="form-ratings-grid">
                {currentParamsList.map((paramName) => {
                  const currentRating = ratings[paramName] || 0;
                  const activeHover = hoverRatings[paramName] || 0;
                  const displayRating = activeHover > 0 ? activeHover : currentRating;

                  return (
                    <div key={paramName} className="rating-field-card">
                      <label className="rating-label">{paramName}</label>
                      <div className="star-rating-selector" onMouseLeave={() => handleMouseLeaveStar(paramName)}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            className={`star-btn ${star <= displayRating ? 'active' : ''}`}
                            onClick={() => handleRatingChange(paramName, star)}
                            onMouseEnter={() => handleMouseEnterStar(paramName, star)}
                            aria-label={`Rate ${paramName} ${star} out of 5 stars`}
                          >
                            {star <= displayRating ? '★' : '☆'}
                          </button>
                        ))}
                        <span className="star-value-badge">
                          {currentRating > 0 ? `${currentRating}/5` : '0/5'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="form-group" style={{ marginTop: '1.25rem' }}>
              <label className="form-label" htmlFor="comment">Written Review / Comment (Optional)</label>
              <textarea
                id="comment"
                className="form-input"
                rows="3"
                placeholder={`Share your experience with ${website.name}...`}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={submitting}
              ></textarea>
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              style={{ width: 'fit-content', padding: '0.75rem 2rem' }}
              disabled={submitting || loadingParams}
            >
              {submitting ? 'Submitting Evaluation...' : 'Submit Evaluation Review'}
            </button>
          </form>
        )}
      </div>

      {/* Associated User Reviews Section */}
      <div className="detail-section-card">
        <h2 className="section-title">User Reviews ({reviews.length})</h2>
        <p className="section-subtitle">Dynamic category ratings submitted by registered users</p>

        {reviews.length === 0 ? (
          <div className="no-reviews-box">
            <p>No user reviews submitted yet for {website.name}. Be the first to submit a review!</p>
          </div>
        ) : (
          <div className="reviews-list">
            {reviews.map((rev) => {
              const reviewRatings = rev.ratings || {};
              const ratingEntries = Object.entries(reviewRatings).filter(
                ([, val]) => typeof val === 'number' && val > 0
              );

              return (
                <div key={rev._id} className="review-card">
                  <div className="review-card-header">
                    <div>
                      <span className="review-user-name">{rev.user?.name || 'Verified User'}</span>
                      {rev.overallRating && (
                        <span className="review-overall-pill" style={{ marginLeft: '0.75rem' }}>
                          Overall: {rev.overallRating}★
                        </span>
                      )}
                    </div>
                    <span className="review-date">
                      {new Date(rev.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>

                  {rev.comment && (
                    <p className="review-comment">"{rev.comment}"</p>
                  )}

                  <div className="review-parameters-summary">
                    {ratingEntries.map(([paramKey, paramScore]) => (
                      <span key={paramKey} className="review-param-pill">
                        {paramKey}: {paramScore}★
                      </span>
                    ))}
                  </div>

                  {/* Delete Review Actions & Confirmation Box */}
                  {confirmDeleteId === rev._id ? (
                    <div className="delete-confirm-box">
                      <span className="delete-confirm-text">Are you sure you want to delete this review?</span>
                      <div className="delete-confirm-actions">
                        <button
                          type="button"
                          className="confirm-cancel-btn"
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={deletingId === rev._id}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="confirm-delete-btn"
                          onClick={() => handleDeleteReview(rev._id)}
                          disabled={deletingId === rev._id}
                        >
                          {deletingId === rev._id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="review-card-footer-actions">
                      <button
                        type="button"
                        className="delete-review-btn"
                        onClick={() => setConfirmDeleteId(rev._id)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.35rem' }}>
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          <line x1="10" y1="11" x2="10" y2="17"></line>
                          <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                        Delete Review
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default WebsiteDetails;
