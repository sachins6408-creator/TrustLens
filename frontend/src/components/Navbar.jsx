import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="nav-brand">
        <Link to="/">TrustLens</Link>

      </div>
      <nav className="nav-links">
        <Link to="/" className="nav-link">Search & Dashboard</Link>

        {user ? (
          <div style={{ display: 'flex', items: 'center', gap: '0.75rem', marginLeft: '0.5rem' }}>
            <span className="status-badge-pill connected">
              {user.name}
            </span>
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
