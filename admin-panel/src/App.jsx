import React from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Sidebar from './components/Layout/Sidebar';
import Navbar from './components/Layout/Navbar';
import Footer from './components/Layout/Footer';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DonationVerification from './pages/DonationVerification';
import UserManagement from './pages/UserManagement';
import VolunteerManagement from './pages/VolunteerManagement';
import NGOManagement from './pages/NGOManagement';
import CollectionPoints from './pages/CollectionPoints';
import Analytics from './pages/Analytics';
import LoadingSpinner from './components/Common/LoadingSpinner';
import './App.css';

// Route protection component
function ProtectedRoute() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="fullscreen-loading-container">
        <LoadingSpinner message="Checking administrator authentication status..." />
      </div>
    );
  }
  
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

// Layout wrapper which computes navbar title
function LayoutWrapper() {
  const location = useLocation();

  const getNavbarTitle = (pathname) => {
    switch (pathname) {
      case '/':
        return 'Operations Dashboard';
      case '/verification':
        return 'Contribution Verifications';
      case '/users':
        return 'User Directory Management';
      case '/volunteers':
        return 'Volunteer Dispatch Router';
      case '/ngos':
        return 'NGO Partner Directory';
      case '/collection-points':
        return 'Distribution Node Logistics';
      case '/analytics':
        return 'Impact & Metrics Analytics';
      default:
        return 'Control Center';
    }
  };

  return (
    <div className="admin-layout-wrapper">
      <Sidebar />
      <div className="main-content-area">
        <Navbar title={getNavbarTitle(location.pathname)} />
        <main className="content-container">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Login Route */}
        <Route path="/login" element={<Login />} />
        
        {/* Protected Dashboard Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<LayoutWrapper />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/verification" element={<DonationVerification />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/volunteers" element={<VolunteerManagement />} />
            <Route path="/ngos" element={<NGOManagement />} />
            <Route path="/collection-points" element={<CollectionPoints />} />
            <Route path="/analytics" element={<Analytics />} />
          </Route>
        </Route>

        {/* Catch-all Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
