import React, { useState, useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import WebsiteDetails from './pages/WebsiteDetails';
import PlaceholderView from './pages/PlaceholderView';
import AdminUsers from './pages/AdminUsers';
import AdminWebsites from './pages/AdminWebsites';
import AdminModeration from './pages/AdminModeration';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminReports from './pages/AdminReports';
import AdminParameters from './pages/AdminParameters';
import DataMining from './pages/DataMining';
import './App.css';

// Root redirect handler based on authentication state
const RootRedirect = () => {
  const { token, user, loading } = useContext(AuthContext);
  if (loading) {
    return <div className="detail-loading">Loading TrustLens...</div>;
  }
  if (token && user) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
};

// Main App Layout Wrapper
const AppLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 900);

  // Handle window resize to auto-collapse on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`app-layout-with-sidebar ${sidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
      {/* Role-based Collapsible Sidebar (rendered only when user is logged in) */}
      {user && (
        <Sidebar
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          user={user}
          logout={logout}
        />
      )}

      <div className="app-main-viewport">
        <Navbar
          onToggleSidebar={user ? () => setSidebarOpen((prev) => !prev) : null}
          sidebarOpen={sidebarOpen}
        />

        <main className="main-content">
          <Routes>
            {/* Root Navigation Gating */}
            <Route path="/" element={<RootRedirect />} />

            {/* Public Unauthenticated Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Core Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/search"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <History />
                </ProtectedRoute>
              }
            />
            <Route
              path="/websites/:id"
              element={
                <ProtectedRoute>
                  <WebsiteDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/data-mining"
              element={
                <ProtectedRoute>
                  <DataMining />
                </ProtectedRoute>
              }
            />

            {/* User Sidebar Routes */}
            <Route
              path="/my-reviews"
              element={
                <ProtectedRoute>
                  <PlaceholderView pageKey="my-reviews" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/trust-scores"
              element={
                <ProtectedRoute>
                  <PlaceholderView pageKey="trust-scores" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <PlaceholderView pageKey="profile" />
                </ProtectedRoute>
              }
            />

            {/* Admin Sidebar Routes - Fully Functional Pages */}
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute adminOnly>
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/websites"
              element={
                <ProtectedRoute adminOnly>
                  <AdminWebsites />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/moderation"
              element={
                <ProtectedRoute adminOnly>
                  <AdminModeration />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute adminOnly>
                  <AdminAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/parameters"
              element={
                <ProtectedRoute adminOnly>
                  <AdminParameters />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute adminOnly>
                  <AdminReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/data-mining"
              element={
                <ProtectedRoute adminOnly>
                  <DataMining />
                </ProtectedRoute>
              }
            />

            {/* Catch-all fallback */}
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppLayout />
      </Router>
    </AuthProvider>
  );
}

export default App;