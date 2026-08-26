import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const History = () => {
  const { token } = useContext(AuthContext);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHistory = () => {
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
  };

  useEffect(() => {
    fetchHistory();
  }, [token]);

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
      <div className="products-header-card">
        <h1 className="products-page-title">Personal Search History</h1>
        <p className="products-page-subtitle">
          Websites and e-commerce profiles you have searched or evaluated on TrustLens
        </p>
      </div>

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
    </div>
  );
};

export default History;
