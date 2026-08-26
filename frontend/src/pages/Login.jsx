import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [status, setStatus] = useState({
    loading: false,
    error: ''
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
    const { email, password } = formData;

    // Basic client-side validation
    if (!email.trim()) {
      setStatus({ loading: false, error: 'Please enter your email address' });
      return;
    }

    if (!password) {
      setStatus({ loading: false, error: 'Please enter your password' });
      return;
    }

    setStatus({ loading: true, error: '' });

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Save auth state globally and redirect to dashboard
        login(data.token, data.user);
        navigate('/dashboard');
      } else {
        setStatus({
          loading: false,
          error: data.message || 'Invalid email or password'
        });
      }
    } catch (err) {
      setStatus({
        loading: false,
        error: 'Network or server error. Please check your backend connection.'
      });
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2 className="auth-title">Welcome Back</h2>
          <p className="auth-subtitle">Log in to your TrustLens account</p>
        </div>

        {status.error && (
          <div className="auth-alert error">
            {status.error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
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
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              disabled={status.loading}
            />
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={status.loading}
          >
            {status.loading ? 'Authenticating...' : 'Log In'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account? <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
