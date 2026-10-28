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

const Dashboard = () => {
  const { user, token } = useContext(AuthContext);
  const isAdmin = user && user.role === 'admin';

  // --- Search & Website Directory States ---
  const [websiteQuery, setWebsiteQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState([]);
  const [websites, setWebsites] = useState([]);
  const [loadingWebsites, setLoadingWebsites] = useState(true);

  // --- Admin Website Management Filter Tab State ---
  const [adminStatusFilter, setAdminStatusFilter] = useState('all'); // 'all' | 'pending' | 'active' | 'rejected'
  const [adminActionStatus, setAdminActionStatus] = useState({ error: '', success: '' });
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [confirmDeleteWebsiteId, setConfirmDeleteWebsiteId] = useState(null);

  // --- User / Admin Add Website Form State ---
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSiteData, setNewSiteData] = useState({
    name: '',
    url: '',
    category: 'E-Commerce',
    customCategory: '',
    description: ''
  });
  const [isSubmittingSite, setIsSubmittingSite] = useState(false);
  const [formStatus, setFormStatus] = useState({ error: '', success: '' });

  // --- User Search History State ---
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // --- Admin User Management State ---
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userActionStatus, setUserActionStatus] = useState({ error: '', success: '' });
  const [userActionLoadingId, setUserActionLoadingId] = useState(null);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState(null);

  // --- View User Details Modal State ---
  const [viewingUser, setViewingUser] = useState(null);
  const [viewingUserStats, setViewingUserStats] = useState(null);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);

  // --- Admin Category & Dynamic Evaluation Parameters Management State ---
  const [evalParamsList, setEvalParamsList] = useState([]);
  const [loadingEvalParams, setLoadingEvalParams] = useState(false);
  const [evalParamStatus, setEvalParamStatus] = useState({ error: '', success: '' });
  const [paramActionLoadingId, setParamActionLoadingId] = useState(null);
  const [confirmDeleteCatId, setConfirmDeleteCatId] = useState(null);

  // New Category & Parameters Form State
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);
  const [newCatData, setNewCatData] = useState({
    category: '',
    parameters: ['Service Quality', 'Customer Support', 'Pricing Transparency'],
    paramInput: ''
  });
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);

  // Quick Add Parameter Input state per Category (mapped by category ID)
  const [quickParamInputs, setQuickParamInputs] = useState({});

  // -------------------------------------------------------------
  // 1. Fetch Websites
  // -------------------------------------------------------------
  const fetchWebsites = useCallback(() => {
    setLoadingWebsites(true);
    const searchParams = new URLSearchParams();
    if (websiteQuery.trim()) searchParams.append('query', websiteQuery.trim());
    if (selectedCategory && selectedCategory !== 'All') searchParams.append('category', selectedCategory);

    // If Admin, pass status filter
    if (isAdmin) {
      searchParams.append('status', adminStatusFilter);
    }

    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    fetch(`/api/websites?${searchParams.toString()}`, { headers })
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
  }, [websiteQuery, selectedCategory, isAdmin, adminStatusFilter, token]);

  // -------------------------------------------------------------
  // 2. Fetch Categories & Evaluation Parameters
  // -------------------------------------------------------------
  const fetchEvaluationParameters = useCallback(() => {
    setLoadingEvalParams(true);
    fetch('/api/evaluation-parameters')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.evaluationParameters) {
          setEvalParamsList(data.evaluationParameters);
          const evalCatNames = data.evaluationParameters.map((p) => p.category);
          const merged = Array.from(new Set([...DEFAULT_CATEGORIES, ...evalCatNames]));
          setCategories(['All', ...merged]);
        }
        setLoadingEvalParams(false);
      })
      .catch((err) => {
        console.error('Error fetching evaluation parameters:', err);
        setLoadingEvalParams(false);
      });
  }, []);

  const fetchCategories = useCallback(() => {
    fetch('/api/websites/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.categories) {
          setCategories((prev) => {
            const currentWithoutAll = prev.filter((c) => c !== 'All');
            const merged = Array.from(new Set([...currentWithoutAll, ...DEFAULT_CATEGORIES, ...data.categories]));
            return ['All', ...merged];
          });
        }
      })
      .catch((err) => console.error('Error fetching categories:', err));
  }, []);

  // -------------------------------------------------------------
  // 3. Fetch User Search History
  // -------------------------------------------------------------
  const fetchUserHistory = useCallback(() => {
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
  }, [token]);

  // -------------------------------------------------------------
  // 4. Fetch Users List (Admin Only)
  // -------------------------------------------------------------
  const fetchUsers = useCallback(() => {
    if (!isAdmin || !token) return;
    setLoadingUsers(true);
    fetch('/api/users', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setUsersList(data.users || []);
        }
        setLoadingUsers(false);
      })
      .catch((err) => {
        console.error('Error fetching users:', err);
        setLoadingUsers(false);
      });
  }, [isAdmin, token]);

  useEffect(() => {
    fetchWebsites();
  }, [fetchWebsites]);

  useEffect(() => {
    fetchEvaluationParameters();
    fetchCategories();
  }, [fetchEvaluationParameters, fetchCategories]);

  useEffect(() => {
    fetchUserHistory();
  }, [fetchUserHistory]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, fetchUsers]);

  // -------------------------------------------------------------
  // Handlers for User History
  // -------------------------------------------------------------
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

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // -------------------------------------------------------------
  // Handlers for Add Website (User + Admin)
  // -------------------------------------------------------------
  const handleAddWebsiteSubmit = async (e) => {
    e.preventDefault();
    setFormStatus({ error: '', success: '' });

    const name = newSiteData.name.trim();
    const url = newSiteData.url.trim();
    const finalCategory = newSiteData.category === 'Custom'
      ? newSiteData.customCategory.trim()
      : newSiteData.category.trim();
    const description = newSiteData.description.trim();

    // Validation
    if (!name) {
      setFormStatus({ error: 'Website name is required.', success: '' });
      return;
    }

    if (!url) {
      setFormStatus({ error: 'Website URL is required.', success: '' });
      return;
    }

    // URL validation
    const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/i;
    if (!urlPattern.test(url)) {
      setFormStatus({
        error: 'Please enter a valid website URL (e.g., https://example.com or example.com).',
        success: ''
      });
      return;
    }

    if (!finalCategory) {
      setFormStatus({ error: 'Website category is required.', success: '' });
      return;
    }

    const finalDescription = description || `Platform request for ${name}`;

    setIsSubmittingSite(true);

    try {
      const res = await fetch('/api/websites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          url,
          category: finalCategory,
          description: finalDescription
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setFormStatus({
          error: '',
          success: data.message || 'Website submitted successfully!'
        });
        // Reset form
        setNewSiteData({
          name: '',
          url: '',
          category: 'E-Commerce',
          customCategory: '',
          description: ''
        });

        fetchWebsites();
        fetchCategories();
        fetchEvaluationParameters();

        setTimeout(() => {
          setShowAddForm(false);
          setFormStatus({ error: '', success: '' });
        }, 3000);
      } else {
        setFormStatus({ error: data.message || 'Failed to submit website.', success: '' });
      }
    } catch (err) {
      console.error('Error adding website:', err);
      setFormStatus({ error: 'Network error occurred while submitting website.', success: '' });
    } finally {
      setIsSubmittingSite(false);
    }
  };

  // -------------------------------------------------------------
  // Handlers for Admin Website Review (Approve / Reject / Delete)
  // -------------------------------------------------------------
  const handleUpdateWebsiteStatus = async (siteId, newStatus) => {
    if (!isAdmin || !token) return;
    setActionLoadingId(siteId);
    setAdminActionStatus({ error: '', success: '' });

    try {
      const res = await fetch(`/api/websites/${siteId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setAdminActionStatus({ error: '', success: data.message });
        fetchWebsites();
        fetchCategories();
        setTimeout(() => setAdminActionStatus({ error: '', success: '' }), 4000);
      } else {
        setAdminActionStatus({ error: data.message || 'Failed to update status', success: '' });
      }
    } catch (err) {
      console.error('Error updating website status:', err);
      setAdminActionStatus({ error: 'Network error while updating website status.', success: '' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteWebsite = async (siteId) => {
    if (!isAdmin || !token) return;
    setActionLoadingId(siteId);
    setAdminActionStatus({ error: '', success: '' });

    try {
      const res = await fetch(`/api/websites/${siteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setAdminActionStatus({ error: '', success: data.message });
        setConfirmDeleteWebsiteId(null);
        fetchWebsites();
        fetchCategories();
        setTimeout(() => setAdminActionStatus({ error: '', success: '' }), 4000);
      } else {
        setAdminActionStatus({ error: data.message || 'Failed to delete website', success: '' });
      }
    } catch (err) {
      console.error('Error deleting website:', err);
      setAdminActionStatus({ error: 'Network error while deleting website.', success: '' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // -------------------------------------------------------------
  // Handlers for Admin User Management
  // -------------------------------------------------------------
  const handleViewUser = async (userId) => {
    if (!isAdmin || !token) return;
    setLoadingUserDetails(true);
    setViewingUser(null);
    setViewingUserStats(null);

    try {
      const res = await fetch(`/api/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setViewingUser(data.user);
        setViewingUserStats(data.stats);
      }
    } catch (err) {
      console.error('Error viewing user details:', err);
    } finally {
      setLoadingUserDetails(false);
    }
  };

  const handleToggleUserStatus = async (targetUser) => {
    if (!isAdmin || !token) return;
    const isSelf = user && (user.id === targetUser._id || user._id === targetUser._id);
    if (isSelf) return;

    setUserActionLoadingId(targetUser._id);
    setUserActionStatus({ error: '', success: '' });

    const newStatus = (targetUser.status || 'active').toLowerCase() === 'active' ? 'inactive' : 'active';

    try {
      const res = await fetch(`/api/users/${targetUser._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setUserActionStatus({ error: '', success: data.message });
        setUsersList((prev) =>
          prev.map((u) => (u._id === targetUser._id ? { ...u, status: newStatus } : u))
        );
        setTimeout(() => setUserActionStatus({ error: '', success: '' }), 4000);
      } else {
        setUserActionStatus({ error: data.message || 'Failed to update user status', success: '' });
      }
    } catch (err) {
      console.error('Error toggling user status:', err);
      setUserActionStatus({ error: 'Network error updating user status.', success: '' });
    } finally {
      setUserActionLoadingId(null);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!isAdmin || !token) return;
    setUserActionLoadingId(userId);
    setUserActionStatus({ error: '', success: '' });

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setUserActionStatus({ error: '', success: data.message });
        setUsersList((prev) => prev.filter((u) => u._id !== userId));
        setConfirmDeleteUserId(null);
        setTimeout(() => setUserActionStatus({ error: '', success: '' }), 4000);
      } else {
        setUserActionStatus({ error: data.message || 'Failed to delete user account', success: '' });
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      setUserActionStatus({ error: 'Network error deleting user account.', success: '' });
    } finally {
      setUserActionLoadingId(null);
    }
  };

  // -------------------------------------------------------------
  // Handlers for Admin Category & Evaluation Parameters Management
  // -------------------------------------------------------------
  const handleAddParamToNewCat = () => {
    const val = newCatData.paramInput.trim();
    if (!val) return;
    if (newCatData.parameters.includes(val)) {
      setEvalParamStatus({ error: `Parameter "${val}" is already in the list.`, success: '' });
      return;
    }
    setNewCatData((prev) => ({
      ...prev,
      parameters: [...prev.parameters, val],
      paramInput: ''
    }));
  };

  const handleRemoveParamFromNewCat = (paramToRemove) => {
    setNewCatData((prev) => ({
      ...prev,
      parameters: prev.parameters.filter((p) => p !== paramToRemove)
    }));
  };

  const handleCreateCategorySubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin || !token) return;

    const categoryName = newCatData.category.trim();
    if (!categoryName) {
      setEvalParamStatus({ error: 'Category name is required.', success: '' });
      return;
    }

    if (newCatData.parameters.length === 0) {
      setEvalParamStatus({ error: 'Please add at least one evaluation parameter.', success: '' });
      return;
    }

    setIsSubmittingCategory(true);
    setEvalParamStatus({ error: '', success: '' });

    try {
      const res = await fetch('/api/evaluation-parameters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          category: categoryName,
          parameters: newCatData.parameters
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setEvalParamStatus({
          error: '',
          success: `Category "${categoryName}" configured with ${newCatData.parameters.length} parameters successfully!`
        });
        setNewCatData({
          category: '',
          parameters: ['Service Quality', 'Customer Support', 'Pricing Transparency'],
          paramInput: ''
        });
        setShowAddCategoryForm(false);
        fetchEvaluationParameters();
        fetchCategories();
        setTimeout(() => setEvalParamStatus({ error: '', success: '' }), 4000);
      } else {
        setEvalParamStatus({ error: data.message || 'Failed to save category parameters.', success: '' });
      }
    } catch (err) {
      console.error('Error saving category parameters:', err);
      setEvalParamStatus({ error: 'Network error saving category parameters.', success: '' });
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  // Add parameter to existing category
  const handleQuickAddParamToCategory = async (config) => {
    const inputVal = (quickParamInputs[config._id] || '').trim();
    if (!inputVal) return;

    if (config.parameters.includes(inputVal)) {
      setEvalParamStatus({ error: `Parameter "${inputVal}" already exists in ${config.category}.`, success: '' });
      return;
    }

    const updatedParams = [...config.parameters, inputVal];
    setParamActionLoadingId(config._id);
    setEvalParamStatus({ error: '', success: '' });

    try {
      const res = await fetch(`/api/evaluation-parameters/${config._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          category: config.category,
          parameters: updatedParams
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setEvalParamStatus({
          error: '',
          success: `Added "${inputVal}" parameter to ${config.category}.`
        });
        setQuickParamInputs((prev) => ({ ...prev, [config._id]: '' }));
        fetchEvaluationParameters();
        setTimeout(() => setEvalParamStatus({ error: '', success: '' }), 4000);
      } else {
        setEvalParamStatus({ error: data.message || 'Failed to update category.', success: '' });
      }
    } catch (err) {
      console.error('Error updating parameters:', err);
      setEvalParamStatus({ error: 'Network error updating category parameters.', success: '' });
    } finally {
      setParamActionLoadingId(null);
    }
  };

  // Remove parameter from existing category
  const handleRemoveParamFromCategory = async (config, paramToRemove) => {
    if (config.parameters.length <= 1) {
      setEvalParamStatus({
        error: `Category "${config.category}" must have at least one evaluation parameter.`,
        success: ''
      });
      return;
    }

    const updatedParams = config.parameters.filter((p) => p !== paramToRemove);
    setParamActionLoadingId(config._id);
    setEvalParamStatus({ error: '', success: '' });

    try {
      const res = await fetch(`/api/evaluation-parameters/${config._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          category: config.category,
          parameters: updatedParams
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setEvalParamStatus({
          error: '',
          success: `Removed "${paramToRemove}" from ${config.category}.`
        });
        fetchEvaluationParameters();
        setTimeout(() => setEvalParamStatus({ error: '', success: '' }), 4000);
      } else {
        setEvalParamStatus({ error: data.message || 'Failed to remove parameter.', success: '' });
      }
    } catch (err) {
      console.error('Error removing parameter:', err);
      setEvalParamStatus({ error: 'Network error removing parameter.', success: '' });
    } finally {
      setParamActionLoadingId(null);
    }
  };

  // Delete category configuration
  const handleDeleteCategoryConfig = async (configId) => {
    if (!isAdmin || !token) return;
    setParamActionLoadingId(configId);
    setEvalParamStatus({ error: '', success: '' });

    try {
      const res = await fetch(`/api/evaluation-parameters/${configId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setEvalParamStatus({ error: '', success: data.message });
        setConfirmDeleteCatId(null);
        fetchEvaluationParameters();
        fetchCategories();
        setTimeout(() => setEvalParamStatus({ error: '', success: '' }), 4000);
      } else {
        setEvalParamStatus({ error: data.message || 'Failed to delete category.', success: '' });
      }
    } catch (err) {
      console.error('Error deleting category config:', err);
      setEvalParamStatus({ error: 'Network error deleting category parameters.', success: '' });
    } finally {
      setParamActionLoadingId(null);
    }
  };

  // Compute pending count if admin
  const pendingCount = websites.filter(
    (s) => s.status && s.status.toLowerCase() === 'pending'
  ).length;

  return (
    <div className="dashboard-container">
      {/* Primary Top Navigation Tabs: Database Overview vs Data Mining */}
      <div className="primary-navigation-tabs-bar">
        <div className="primary-nav-tab active">
          <span className="tab-icon">🌐</span>
          <span>Database Overview</span>
          <span className="tab-active-dot"></span>
        </div>
        <Link to="/data-mining" className="primary-nav-tab">
          <span className="tab-icon">⚡</span>
          <span>Data Mining Engine</span>
        </Link>
      </div>

      {/* Welcome Banner */}
      <div className="welcome-banner-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="welcome-title">
              Welcome
              {isAdmin && <span className="admin-pill-badge">Admin</span>}
            </h1>
            <p className="welcome-subtitle">
              Explore, evaluate, and verify trusted e-commerce and service provider websites with dynamic category parameters.
            </p>
          </div>
          {isAdmin && (
            <div className="admin-status-indicator">
              <span className="admin-pulse-dot"></span>
              <span>Admin Privileges Active</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Dual Search & Add Website Card */}
      <div className="dashboard-section-card">
        <div className="section-header-flex" style={{ flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h2 className="dashboard-section-title">Search Platform</h2>
            <p className="dashboard-section-subtitle">
              Search websites or submit new platforms for credibility verification.
            </p>
          </div>
          {/* User & Admin [ + Add Website ] Button */}
          <div>
            <button
              type="button"
              id="user-add-website-btn"
              className={`user-add-website-btn ${showAddForm ? 'active' : ''}`}
              onClick={() => {
                setShowAddForm((prev) => !prev);
                setFormStatus({ error: '', success: '' });
              }}
            >
              {showAddForm ? '✕ Cancel / Close' : '+ Add Website'}
            </button>
          </div>
        </div>

        {/* Add Website Form */}
        {showAddForm && (
          <div className="add-website-form-panel">
            <div className="form-panel-header">
              <div>
                <h3 className="form-panel-title">
                  {isAdmin ? 'Add Active Website to Directory' : 'Submit Website for Verification'}
                </h3>
                <p className="form-panel-subtitle">
                  {isAdmin
                    ? 'Register a new domain directly into the active TrustLens directory.'
                    : 'Submit a new website domain. Once submitted, it will be reviewed and approved by an administrator.'}
                </p>
              </div>
            </div>

            {formStatus.error && (
              <div className="auth-alert error" style={{ marginBottom: '1.25rem' }}>
                ⚠️ {formStatus.error}
              </div>
            )}
            {formStatus.success && (
              <div className="auth-alert success" style={{ marginBottom: '1.25rem' }}>
                ✓ {formStatus.success}
              </div>
            )}

            <form onSubmit={handleAddWebsiteSubmit} className="add-website-form">
              <div className="form-grid-layout">
                {/* Website Name */}
                <div className="form-group">
                  <label className="form-label" htmlFor="new-website-name">
                    Website Name <span className="req-star">*</span>
                  </label>
                  <input
                    id="new-website-name"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Swiggy, Zomato, Croma"
                    value={newSiteData.name}
                    onChange={(e) => setNewSiteData({ ...newSiteData, name: e.target.value })}
                    required
                  />
                </div>

                {/* Website URL */}
                <div className="form-group">
                  <label className="form-label" htmlFor="new-website-url">
                    Website URL <span className="req-star">*</span>
                  </label>
                  <input
                    id="new-website-url"
                    type="text"
                    className="form-input"
                    placeholder="e.g. https://www.swiggy.com or swiggy.com"
                    value={newSiteData.url}
                    onChange={(e) => setNewSiteData({ ...newSiteData, url: e.target.value })}
                    required
                  />
                </div>

                {/* Website Category */}
                <div className="form-group">
                  <label className="form-label" htmlFor="new-website-category">
                    Category <span className="req-star">*</span>
                  </label>
                  <select
                    id="new-website-category"
                    className="category-select"
                    style={{ width: '100%' }}
                    value={newSiteData.category}
                    onChange={(e) => setNewSiteData({ ...newSiteData, category: e.target.value })}
                  >
                    {categories.filter((c) => c !== 'All').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="Custom">+ Other / Custom Category</option>
                  </select>
                </div>

                {/* Custom Category Input */}
                {newSiteData.category === 'Custom' && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="new-custom-category">
                      Enter Custom Category <span className="req-star">*</span>
                    </label>
                    <input
                      id="new-custom-category"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Food Delivery, OTT Streaming"
                      value={newSiteData.customCategory}
                      onChange={(e) => setNewSiteData({ ...newSiteData, customCategory: e.target.value })}
                      required
                    />
                  </div>
                )}
              </div>

              {/* Website Description */}
              <div className="form-group" style={{ marginTop: '1.25rem' }}>
                <label className="form-label" htmlFor="new-website-desc">
                  Description <span className="req-star">*</span>
                </label>
                <textarea
                  id="new-website-desc"
                  className="form-input"
                  rows="3"
                  placeholder="Provide a brief overview of the services, products, or operations provided by this platform..."
                  value={newSiteData.description}
                  onChange={(e) => setNewSiteData({ ...newSiteData, description: e.target.value })}
                  required
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Form Action Buttons */}
              <div className="form-panel-actions">
                <button
                  type="button"
                  className="btn-secondary-cancel"
                  onClick={() => {
                    setShowAddForm(false);
                    setFormStatus({ error: '', success: '' });
                  }}
                  disabled={isSubmittingSite}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-website-btn"
                  className="btn-primary-submit"
                  disabled={isSubmittingSite}
                >
                  {isSubmittingSite
                    ? 'Submitting...'
                    : isAdmin
                      ? 'Save & Activate Website'
                      : 'Submit for Approval'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="dual-search-grid">
          <div className="search-box-group">
            <label className="form-label">Search Website</label>
            <input
              type="text"
              className="search-input"
              placeholder="Search by website name or domain (e.g. Amazon, Flipkart, Paytm)..."
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
                        className="history-delete-btn"
                        title="Delete from history"
                        onClick={(e) => handleDeleteHistory(item._id, e)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================
          ADMIN ONLY: DYNAMIC CATEGORY & EVALUATION PARAMETERS MANAGEMENT
          ========================================================= */}
      {isAdmin && (
        <div className="dashboard-section-card">
          <div className="section-header-flex" style={{ flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <h2 className="dashboard-section-title">Category & Dynamic Evaluation Parameters</h2>
              <p className="dashboard-section-subtitle">
                Configure category-specific intelligent review parameters. Add new categories or modify parameters dynamically.
              </p>
            </div>
            <button
              type="button"
              className={`user-add-website-btn ${showAddCategoryForm ? 'active' : ''}`}
              onClick={() => {
                setShowAddCategoryForm((prev) => !prev);
                setEvalParamStatus({ error: '', success: '' });
              }}
            >
              {showAddCategoryForm ? '✕ Close Form' : '+ Add New Category & Parameters'}
            </button>
          </div>

          {/* Feedback Alerts */}
          {evalParamStatus.error && (
            <div className="auth-alert error" style={{ marginBottom: '1rem' }}>
              ⚠️ {evalParamStatus.error}
            </div>
          )}
          {evalParamStatus.success && (
            <div className="auth-alert success" style={{ marginBottom: '1rem' }}>
              ✓ {evalParamStatus.success}
            </div>
          )}

          {/* Add Category Form Panel */}
          {showAddCategoryForm && (
            <div className="add-website-form-panel" style={{ marginBottom: '1.5rem' }}>
              <h3 className="form-panel-title">Create New Category Evaluation Profile</h3>
              <p className="form-panel-subtitle">
                Define the website category name and list the specific parameters users will rate for this category.
              </p>

              <form onSubmit={handleCreateCategorySubmit} style={{ marginTop: '1rem' }}>
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
                    onClick={() => setShowAddCategoryForm(false)}
                    disabled={isSubmittingCategory}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary-submit"
                    disabled={isSubmittingCategory}
                  >
                    {isSubmittingCategory ? 'Saving Profile...' : 'Save Category & Parameters'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Configured Categories Grid */}
          {loadingEvalParams ? (
            <div className="search-loading">Loading dynamic category configurations...</div>
          ) : evalParamsList.length === 0 ? (
            <div className="no-results-card">
              <h3>No Category Parameters Configured</h3>
              <p>Add your first category evaluation parameters profile above.</p>
            </div>
          ) : (
            <div className="category-params-grid">
              {evalParamsList.map((config) => (
                <div key={config._id} className="category-param-card">
                  <div className="category-param-card-header">
                    <div>
                      <h4 className="category-param-title">{config.category}</h4>
                      <span className="category-param-count-badge">
                        {config.parameters?.length || 0} Dynamic Parameters
                      </span>
                    </div>
                    {confirmDeleteCatId === config._id ? (
                      <div className="inline-confirm-dialog">
                        <span style={{ fontSize: '0.75rem', color: '#fca5a5' }}>Delete?</span>
                        <button
                          type="button"
                          className="confirm-yes-btn"
                          onClick={() => handleDeleteCategoryConfig(config._id)}
                          disabled={paramActionLoadingId === config._id}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          className="confirm-no-btn"
                          onClick={() => setConfirmDeleteCatId(null)}
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="cat-delete-btn"
                        title={`Delete ${config.category} parameters`}
                        onClick={() => setConfirmDeleteCatId(config._id)}
                        disabled={paramActionLoadingId === config._id}
                      >
                        🗑️
                      </button>
                    )}
                  </div>

                  {/* List of Parameter Chips */}
                  <div className="parameters-tag-cloud" style={{ margin: '1rem 0' }}>
                    {(config.parameters || []).map((param) => (
                      <span key={param} className="param-tag-chip">
                        {param}
                        <button
                          type="button"
                          className="param-tag-remove-btn"
                          title={`Remove ${param}`}
                          onClick={() => handleRemoveParamFromCategory(config, param)}
                          disabled={paramActionLoadingId === config._id}
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
                          handleQuickAddParamToCategory(config);
                        }
                      }}
                      disabled={paramActionLoadingId === config._id}
                    />
                    <button
                      type="button"
                      className="quick-param-add-btn"
                      onClick={() => handleQuickAddParamToCategory(config)}
                      disabled={paramActionLoadingId === config._id || !(quickParamInputs[config._id] || '').trim()}
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          ADMIN ONLY: WEBSITE VERIFICATION & MANAGEMENT TABLE
          ========================================================= */}
      {isAdmin ? (
        <div className="dashboard-section-card">
          <div className="section-header-flex" style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 className="dashboard-section-title">Website Verification & Directory Management</h2>
              <p className="dashboard-section-subtitle">
                Review submitted websites, approve pending platforms, or reject unverified entries.
              </p>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="admin-status-tabs-container">
            <button
              type="button"
              className={`status-tab-btn ${adminStatusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setAdminStatusFilter('all')}
            >
              All Platforms ({websites.length})
            </button>
            <button
              type="button"
              className={`status-tab-btn ${adminStatusFilter === 'pending' ? 'active' : ''}`}
              onClick={() => setAdminStatusFilter('pending')}
            >
              Pending Approval {pendingCount > 0 && <span className="tab-counter-badge">{pendingCount}</span>}
            </button>
            <button
              type="button"
              className={`status-tab-btn ${adminStatusFilter === 'active' ? 'active' : ''}`}
              onClick={() => setAdminStatusFilter('active')}
            >
              Active
            </button>
            <button
              type="button"
              className={`status-tab-btn ${adminStatusFilter === 'rejected' ? 'active' : ''}`}
              onClick={() => setAdminStatusFilter('rejected')}
            >
              Rejected
            </button>
          </div>

          {/* Admin Action Feedback Alerts */}
          {adminActionStatus.error && (
            <div className="auth-alert error" style={{ marginTop: '1rem' }}>
              ⚠️ {adminActionStatus.error}
            </div>
          )}
          {adminActionStatus.success && (
            <div className="auth-alert success" style={{ marginTop: '1rem' }}>
              ✓ {adminActionStatus.success}
            </div>
          )}

          {loadingWebsites ? (
            <div className="search-loading">Loading website directory...</div>
          ) : websites.length === 0 ? (
            <div className="no-results-card">
              <h3>No Websites Found</h3>
              <p>No registered website records matched the selected status and filter criteria.</p>
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Website Name</th>
                    <th>URL</th>
                    <th>Category</th>
                    <th>Submitted By</th>
                    <th>Status</th>
                    <th>Date Added</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {websites.map((site) => {
                    const statusLower = (site.status || 'active').toLowerCase();
                    const isPending = statusLower === 'pending';
                    const isRejected = statusLower === 'rejected';
                    const isActive = statusLower === 'active';
                    const statusLabel = statusLower.charAt(0).toUpperCase() + statusLower.slice(1);

                    return (
                      <tr key={site._id}>
                        <td>
                          <strong style={{ fontSize: '0.95rem' }}>{site.name}</strong>
                        </td>
                        <td>
                          <a
                            href={site.url && (site.url.startsWith('http://') || site.url.startsWith('https://')) ? site.url : `https://${site.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--accent-cyan)', fontFamily: 'monospace', fontSize: '0.85rem', textDecoration: 'none' }}
                          >
                            {site.url || site.domain}
                          </a>
                        </td>
                        <td>
                          <span className="website-category-tag" style={{ fontSize: '0.75rem' }}>
                            {site.category}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem', color: site.createdBy ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {site.createdBy ? (site.createdBy.name || site.createdBy.email) : 'Admin / System'}
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill ${statusLower}`}>
                            ● {statusLabel}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {formatDateTime(site.createdAt)}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions-cell">
                            {/* Approve Action */}
                            {(isPending || isRejected) && (
                              <button
                                type="button"
                                className="action-btn-approve"
                                title="Approve website and make it searchable"
                                onClick={() => handleUpdateWebsiteStatus(site._id, 'active')}
                                disabled={actionLoadingId === site._id}
                              >
                                Approve
                              </button>
                            )}

                            {/* Reject Action */}
                            {(isPending || isActive) && (
                              <button
                                type="button"
                                className="action-btn-reject"
                                title="Reject website"
                                onClick={() => handleUpdateWebsiteStatus(site._id, 'rejected')}
                                disabled={actionLoadingId === site._id}
                              >
                                Reject
                              </button>
                            )}

                            {/* Delete Confirmation Box / Trigger */}
                            {confirmDeleteWebsiteId === site._id ? (
                              <div className="inline-confirm-dialog">
                                <span style={{ fontSize: '0.75rem', color: '#fca5a5' }}>Confirm?</span>
                                <button
                                  type="button"
                                  className="confirm-yes-btn"
                                  onClick={() => handleDeleteWebsite(site._id)}
                                  disabled={actionLoadingId === site._id}
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  className="confirm-no-btn"
                                  onClick={() => setConfirmDeleteWebsiteId(null)}
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="action-btn-delete"
                                title="Delete website"
                                onClick={() => setConfirmDeleteWebsiteId(site._id)}
                                disabled={actionLoadingId === site._id}
                              >
                                Delete
                              </button>
                            )}

                            {/* View Profile Link */}
                            <Link to={`/websites/${site._id}`} className="admin-table-action-link">
                              View →
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* =========================================================
           REGULAR USER: AVAILABLE WEBSITES DIRECTORY
           ========================================================= */
        <div className="dashboard-section-card">
          <div className="section-header-flex">
            <div>
              <h2 className="dashboard-section-title">Available Websites ({websites.length})</h2>
              <p className="dashboard-section-subtitle">
                Browse registered websites and access dynamic category-specific evaluations.
              </p>
            </div>
          </div>

          {loadingWebsites ? (
            <div className="search-loading">Loading website directory...</div>
          ) : websites.length === 0 ? (
            <div className="no-results-card">
              <div className="no-results-icon">🔍</div>
              <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Website Not Found
              </h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 1.25rem' }}>
                {websiteQuery.trim()
                  ? `No registered website found matching "${websiteQuery}". If you want TrustLens to index and verify this platform, you can submit a request below.`
                  : 'No registered website records matched your search criteria.'}
              </p>
              <button
                type="button"
                className="request-website-trigger-btn"
                onClick={() => {
                  setNewSiteData((prev) => ({
                    ...prev,
                    name: websiteQuery.trim() || prev.name,
                    category: selectedCategory !== 'All' ? selectedCategory : prev.category
                  }));
                  setShowAddForm(true);
                  window.scrollTo({ top: 180, behavior: 'smooth' });
                }}
              >
                ➕ Request this Website
              </button>
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
                    {site.description || `Registered platform in category "${site.category}".`}
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
      )}

      {/* =========================================================
          ADMIN ONLY: USER MANAGEMENT SECTION
          ========================================================= */}
      {isAdmin && (
        <div className="dashboard-section-card">
          <div className="section-header-flex" style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 className="dashboard-section-title">User Management</h2>
              <p className="dashboard-section-subtitle">
                Monitor registered accounts, manage user access permissions, and activate or deactivate accounts.
              </p>
            </div>
          </div>

          {/* User Management Action Feedback Alerts */}
          {userActionStatus.error && (
            <div className="auth-alert error" style={{ marginTop: '1rem' }}>
              ⚠️ {userActionStatus.error}
            </div>
          )}
          {userActionStatus.success && (
            <div className="auth-alert success" style={{ marginTop: '1rem' }}>
              ✓ {userActionStatus.success}
            </div>
          )}

          {loadingUsers ? (
            <div className="search-loading">Loading registered users...</div>
          ) : usersList.length === 0 ? (
            <div className="no-results-card">
              <h3>No Users Found</h3>
              <p>No registered user accounts found in the database.</p>
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Email Address</th>
                    <th>Role</th>
                    <th>Account Status</th>
                    <th>Registration Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u) => {
                    const isSelf = user && (user.id === u._id || user._id === u._id);
                    const isUserActive = (u.status || 'active').toLowerCase() === 'active';

                    return (
                      <tr key={u._id}>
                        <td>
                          <strong style={{ fontSize: '0.95rem' }}>{u.name}</strong>
                          {isSelf && <span className="self-badge">(You)</span>}
                        </td>
                        <td>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                            {u.email}
                          </span>
                        </td>
                        <td>
                          <span className={`user-role-badge ${u.role}`}>
                            {u.role ? u.role.toUpperCase() : 'USER'}
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill ${isUserActive ? 'active' : 'inactive'}`}>
                            ● {isUserActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {formatDateTime(u.createdAt)}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions-cell">
                            {/* View User Modal Trigger */}
                            <button
                              type="button"
                              className="action-btn-view"
                              onClick={() => handleViewUser(u._id)}
                            >
                              View
                            </button>

                            {/* Toggle Activate / Deactivate */}
                            <button
                              type="button"
                              className={`action-btn-toggle ${isUserActive ? 'deactivate' : 'activate'}`}
                              onClick={() => handleToggleUserStatus(u)}
                              disabled={isSelf || userActionLoadingId === u._id}
                              title={isSelf ? 'Cannot deactivate own account' : isUserActive ? 'Deactivate account' : 'Activate account'}
                            >
                              {isUserActive ? 'Deactivate' : 'Activate'}
                            </button>

                            {/* Delete User */}
                            {confirmDeleteUserId === u._id ? (
                              <div className="inline-confirm-dialog">
                                <span style={{ fontSize: '0.75rem', color: '#fca5a5' }}>Delete?</span>
                                <button
                                  type="button"
                                  className="confirm-yes-btn"
                                  onClick={() => handleDeleteUser(u._id)}
                                  disabled={userActionLoadingId === u._id}
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  className="confirm-no-btn"
                                  onClick={() => setConfirmDeleteUserId(null)}
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="action-btn-delete"
                                onClick={() => setConfirmDeleteUserId(u._id)}
                                disabled={isSelf || userActionLoadingId === u._id}
                                title={isSelf ? 'Cannot delete own account' : 'Delete user account'}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          USER DETAILS MODAL (ADMIN VIEW)
          ========================================================= */}
      {(viewingUser || loadingUserDetails) && (
        <div className="modal-backdrop-overlay" onClick={() => setViewingUser(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">User Account Profile</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setViewingUser(null)}
              >
                ✕
              </button>
            </div>

            {loadingUserDetails ? (
              <div className="search-loading">Loading user statistics...</div>
            ) : viewingUser ? (
              <div className="modal-body">
                <div className="user-profile-details-grid">
                  <div className="detail-field-box">
                    <span className="field-label">Full Name</span>
                    <strong className="field-value">{viewingUser.name}</strong>
                  </div>

                  <div className="detail-field-box">
                    <span className="field-label">Email Address</span>
                    <span className="field-value">{viewingUser.email}</span>
                  </div>

                  <div className="detail-field-box">
                    <span className="field-label">System Role</span>
                    <span className={`user-role-badge ${viewingUser.role}`}>
                      {viewingUser.role ? viewingUser.role.toUpperCase() : 'USER'}
                    </span>
                  </div>

                  <div className="detail-field-box">
                    <span className="field-label">Account Status</span>
                    <span className={`status-pill ${viewingUser.status || 'active'}`}>
                      ● {(viewingUser.status || 'active').toUpperCase()}
                    </span>
                  </div>

                  <div className="detail-field-box">
                    <span className="field-label">Registration Date</span>
                    <span className="field-value">{formatDateTime(viewingUser.createdAt)}</span>
                  </div>

                  <div className="detail-field-box">
                    <span className="field-label">Last Updated</span>
                    <span className="field-value">{formatDateTime(viewingUser.updatedAt)}</span>
                  </div>
                </div>

                {viewingUserStats && (
                  <div className="user-stats-container">
                    <h4 className="user-stats-title">User Activity Summary</h4>
                    <div className="stats-metric-cards">
                      <div className="metric-stat-card">
                        <span className="metric-number">{viewingUserStats.totalReviews || 0}</span>
                        <span className="metric-name">Reviews Submitted</span>
                      </div>
                      <div className="metric-stat-card">
                        <span className="metric-number">{viewingUserStats.totalWebsitesSubmitted || 0}</span>
                        <span className="metric-name">Websites Added</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="modal-actions-row">
                  <button
                    type="button"
                    className="btn-secondary-cancel"
                    onClick={() => setViewingUser(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
