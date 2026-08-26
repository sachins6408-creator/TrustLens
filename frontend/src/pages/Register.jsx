import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Register = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [status, setStatus] = useState({
    loading: false,
    error: '',
    success: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (status.error) {
      setStatus({ ...status, error: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, email, password, confirmPassword } = formData;

    if (!name.trim()) {
      setStatus({ loading: false, error: 'Please enter your full name', success: '' });
      return;
    }

    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setStatus({ loading: false, error: 'Please enter a valid email address', success: '' });
      return;
    }

    if (!password || password.length < 6) {
      setStatus({ loading: false, error: 'Password must be at least 6 characters long', success: '' });
      return;
    }

    if (password !== confirmPassword) {
      setStatus({ loading: false, error: 'Passwords do not match', success: '' });
      return;
    }

    setStatus({ loading: true, error: '', success: '' });

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus({
          loading: false,
          error: '',
          success: 'Account created successfully! Redirecting to dashboard...'
        });
        login(data.token, data.user);
        setTimeout(() => {
          navigate('/dashboard');
        }, 600);
      } else {
        setStatus({
          loading: false,
          error: data.message || 'Registration failed. Please try again.',
          success: ''
        });
      }
    } catch (err) {
      setStatus({
        loading: false,
        error: 'Network or server error. Please check your backend connection.',
        success: ''
      });
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2 className="auth-title">Create Account</h2>
          <p className="auth-subtitle">Join TrustLens to evaluate website trust and reliability</p>
        </div>

        {status.error && (
          <div className="auth-alert error">
            {status.error}
          </div>
        )}

        {status.success && (
          <div className="auth-alert success">
            {status.success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              className="form-input"
              placeholder="e.g. Saravanavel P"
              value={formData.name}
              onChange={handleChange}
              disabled={status.loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              className="form-input"
              placeholder="e.g. user@example.com"
              value={formData.email}
              onChange={handleChange}
              disabled={status.loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              className="form-input"
              placeholder="At least 6 characters"
              value={formData.password}
              onChange={handleChange}
              disabled={status.loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              className="form-input"
              placeholder="Re-enter password"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={status.loading}
            />
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={status.loading}
          >
            {status.loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Log In</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
