import React from 'react';
import { useAuth } from '../../hooks/useAuth';

export default function Navbar({ title = 'Control Center' }) {
  const { user } = useAuth();
  
  return (
    <header className="admin-navbar">
      <div className="navbar-left">
        <h1 className="page-title">{title}</h1>
      </div>
      
      <div className="navbar-right">
        <div className="system-indicator">
          <span className="indicator-pulse"></span>
          <span className="indicator-text">System Live</span>
        </div>
        
        <div className="divider"></div>
        
        <div className="user-profile-badge">
          <span className="user-email">{user?.email}</span>
          <div className="status-dot online"></div>
        </div>
      </div>
    </header>
  );
}
