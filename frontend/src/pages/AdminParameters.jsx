import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';

const AdminParameters = () => {
  const { token } = useContext(AuthContext);

  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // New category form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCatData, setNewCatData] = useState({
    category: '',
    parameters: ['Service Quality', 'Customer Support', 'Pricing Transparency'],
    paramInput: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Per-category quick add input state
  const [quickParamInputs, setQuickParamInputs] = useState({});
  const [paramLoadingId, setParamLoadingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/evaluation-parameters');
      const data = await res.json();
      if (data.success) {
        setConfigs(data.evaluationParameters || []);
      } else {
        setError(data.message || 'Failed to load evaluation parameters');
      }
    } catch (err) {
      setError('Network error loading evaluation parameters');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleAddParamToNewCat = () => {
    const val = newCatData.paramInput.trim();
    if (!val) return;
    if (newCatData.parameters.includes(val)) {
      setError(`Parameter "${val}" is already in the list.`);
      return;
    }
    setNewCatData((prev) => ({
      ...prev,
      parameters: [...prev.parameters, val],
      paramInput: ''
    }));
    setError('');
  };

  const handleRemoveParamFromNewCat = (paramToRemove) => {
    setNewCatData((prev) => ({
      ...prev,
      parameters: prev.parameters.filter((p) => p !== paramToRemove)
    }));
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    const catName = newCatData.category.trim();
    if (!catName) {
      setError('Category name is required.');
      return;
    }
    if (newCatData.parameters.length === 0) {
      setError('Please add at least one evaluation parameter.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/evaluation-parameters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ category: catName, parameters: newCatData.parameters })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Category "${catName}" configured with ${newCatData.parameters.length} parameters successfully!`);
        setNewCatData({
          category: '',
          parameters: ['Service Quality', 'Customer Support', 'Pricing Transparency'],
          paramInput: ''
        });
        setShowAddForm(false);
        fetchConfigs();
      } else {
        setError(data.message || 'Failed to save category parameters.');
      }
    } catch (err) {
      setError('Network error saving category parameters.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAddParam = async (config) => {
    const inputVal = (quickParamInputs[config._id] || '').trim();
    if (!inputVal) return;

    if (config.parameters.includes(inputVal)) {
      setError(`Parameter "${inputVal}" already exists in ${config.category}.`);
      return;
    }

    const updatedParams = [...config.parameters, inputVal];
    setParamLoadingId(config._id);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/evaluation-parameters/${config._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ category: config.category, parameters: updatedParams })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Added "${inputVal}" parameter to ${config.category}.`);
        setQuickParamInputs((prev) => ({ ...prev, [config._id]: '' }));
        fetchConfigs();
      } else {
        setError(data.message || 'Failed to update category.');
      }
    } catch (err) {
      setError('Network error updating category parameters.');
    } finally {
      setParamLoadingId(null);
    }
  };

  const handleRemoveParam = async (config, paramToRemove) => {
    if (config.parameters.length <= 1) {
      setError(`Category "${config.category}" must have at least one evaluation parameter.`);
      return;
    }

    const updatedParams = config.parameters.filter((p) => p !== paramToRemove);
    setParamLoadingId(config._id);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/evaluation-parameters/${config._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ category: config.category, parameters: updatedParams })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Removed "${paramToRemove}" from ${config.category}.`);
        fetchConfigs();
      } else {
        setError(data.message || 'Failed to remove parameter.');
      }
    } catch (err) {
      setError('Network error removing parameter.');
    } finally {
      setParamLoadingId(null);
    }
  };

  const handleDeleteCategoryConfig = async (configId) => {
    setParamLoadingId(configId);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/evaluation-parameters/${configId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(data.message);
        setConfirmDeleteId(null);
        fetchConfigs();
      } else {
        setError(data.message || 'Failed to delete category.');
      }
    } catch (err) {
      setError('Network error deleting category parameters.');
    } finally {
      setParamLoadingId(null);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Page Header */}
      <div className="products-header-card">
        <h1 className="products-page-title">Evaluation Parameters</h1>
        <p className="products-page-subtitle">
          Configure category-specific intelligent criteria and manage parameter lists
        </p>
      </div>

      {/* Feedback Alerts */}
      {error && <div className="auth-alert error" style={{ margin: '1rem 0' }}>⚠️ {error}</div>}
      {success && <div className="auth-alert success" style={{ margin: '1rem 0' }}>✓ {success}</div>}

      {/* Add Category Form Panel */}
      <div className="dashboard-section-card" style={{ marginBottom: '1.25rem' }}>
        <div className="section-header-flex" style={{ flexWrap: 'wrap' }}>
          <div>
            <h2 className="dashboard-section-title">Category Configuration</h2>
            <p className="dashboard-section-subtitle">
              Add new dynamic evaluation parameter profiles or modify existing category parameters
            </p>
          </div>
          <button
            className={`user-add-website-btn ${showAddForm ? 'active' : ''}`}
            onClick={() => setShowAddForm((prev) => !prev)}
          >
            {showAddForm ? '✕ Close Form' : '+ Add New Category & Parameters'}
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleCreateCategory} style={{ marginTop: '1rem' }}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" htmlFor="new-cat-name">
                Category Name <span className="req-star">*</span>
              </label>
              <input
                id="new-cat-name"
                type="text"
                className="form-input"
                placeholder="e.g. Cloud Hosting, Gaming, Streaming, Real Estate"
                value={newCatData.category}
                onChange={(e) => setNewCatData({ ...newCatData, category: e.target.value })}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">
                Evaluation Parameters ({newCatData.parameters.length}) <span className="req-star">*</span>
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Server Uptime, Customer Response Speed"
                  value={newCatData.paramInput}
                  onChange={(e) => setNewCatData({ ...newCatData, paramInput: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddParamToNewCat();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn-primary-submit"
                  style={{ padding: '0.6rem 1.25rem', whiteSpace: 'nowrap' }}
                  onClick={handleAddParamToNewCat}
                >
                  + Add Parameter
                </button>
              </div>
              <div className="parameters-tag-cloud">
                {newCatData.parameters.map((param) => (
                  <span key={param} className="param-tag-chip">
                    {param}
                    <button
                      type="button"
                      className="param-tag-remove-btn"
                      onClick={() => handleRemoveParamFromNewCat(param)}
                      title="Remove parameter"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="form-panel-actions">
              <button
                type="button"
                className="btn-secondary-cancel"
                onClick={() => setShowAddForm(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving Profile...' : 'Save Category & Parameters'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Configured Categories Grid */}
      <div className="dashboard-section-card">
        <div className="section-header-flex">
          <div>
            <h2 className="dashboard-section-title">Configured Categories ({configs.length})</h2>
            <p className="dashboard-section-subtitle">
              Dynamic evaluation parameter profiles used by the review system
            </p>
          </div>
        </div>

        {loading ? (
          <div className="search-loading">Loading dynamic category configurations...</div>
        ) : configs.length === 0 ? (
          <div className="no-results-card">
            <h3>No Category Parameters Configured</h3>
            <p>Add your first category evaluation parameters profile above.</p>
          </div>
        ) : (
          <div className="category-params-grid">
            {configs.map((config) => (
              <div key={config._id} className="category-param-card">
                <div className="category-param-card-header">
                  <div>
                    <h4 className="category-param-title">{config.category}</h4>
                    <span className="category-param-count-badge">
                      {config.parameters?.length || 0} Dynamic Parameters
                    </span>
                  </div>
                  {confirmDeleteId === config._id ? (
                    <div className="inline-confirm-dialog">
                      <span style={{ fontSize: '0.75rem', color: '#fca5a5' }}>Delete?</span>
                      <button
                        className="confirm-yes-btn"
                        onClick={() => handleDeleteCategoryConfig(config._id)}
                        disabled={paramLoadingId === config._id}
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
                      className="cat-delete-btn"
                      title={`Delete ${config.category} parameters`}
                      onClick={() => setConfirmDeleteId(config._id)}
                      disabled={paramLoadingId === config._id}
                    >
                      🗑️
                    </button>
                  )}
                </div>

                {/* Parameter Chips */}
                <div className="parameters-tag-cloud" style={{ margin: '1rem 0' }}>
                  {(config.parameters || []).map((param) => (
                    <span key={param} className="param-tag-chip">
                      {param}
                      <button
                        type="button"
                        className="param-tag-remove-btn"
                        title={`Remove ${param}`}
                        onClick={() => handleRemoveParam(config, param)}
                        disabled={paramLoadingId === config._id}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>

                {/* Quick Add Parameter Input */}
                <div className="quick-add-param-row">
                  <input
                    type="text"
                    className="quick-param-input"
                    placeholder="+ Add parameter..."
                    value={quickParamInputs[config._id] || ''}
                    onChange={(e) =>
                      setQuickParamInputs({ ...quickParamInputs, [config._id]: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleQuickAddParam(config);
                      }
                    }}
                    disabled={paramLoadingId === config._id}
                  />
                  <button
                    className="quick-param-add-btn"
                    onClick={() => handleQuickAddParam(config)}
                    disabled={paramLoadingId === config._id || !(quickParamInputs[config._id] || '').trim()}
                  >
                    Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminParameters;