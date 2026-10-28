import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, token, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return <div className="detail-loading">Authenticating...</div>;
  }

  if (!token || !user) {
    // Redirect unauthenticated user to /login with state location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Requirement 4: Role-based access gating
  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
