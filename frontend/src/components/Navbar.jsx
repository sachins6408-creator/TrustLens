import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navbar = ({ onToggleSidebar, sidebarOpen }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="nav-brand">
        {user && onToggleSidebar && (
          <button
            type="button"
            className="navbar-hamburger-btn"
            onClick={onToggleSidebar}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-label="Toggle navigation sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        )}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none', color: 'inherit' }}>
          <span>TrustLens</span>
          <span className="brand-badge">Verification</span>
        </Link>
      </div>

      <nav className="nav-links">
        <Link to="/dashboard" className="nav-link">Dashboard</Link>

        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: '0.5rem' }}>
            <span className="status-badge-pill connected">
              {user.name}
            </span>
            {user.role === 'admin' && (
              <span className="admin-pill-badge" style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}>
                Admin
              </span>
            )}
            <button onClick={handleLogout} className="nav-btn" style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5' }}>
              Logout
            </button>
          </div>
        ) : (
          <>
            <Link to="/login" className="nav-link">Login</Link>
            <Link to="/register" className="nav-btn">Register</Link>
          </>
        )}
      </nav>
    </header>
  );
};

export default Navbar;
