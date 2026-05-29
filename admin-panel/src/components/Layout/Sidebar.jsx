import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function Sidebar() {
  const { logout, user } = useAuth();

  const links = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/verification', label: 'Verifications', icon: '🔍' },
    { path: '/users', label: 'User Directory', icon: '👥' },
    { path: '/volunteers', label: 'Volunteers', icon: '🚴' },
    { path: '/ngos', label: 'NGO Partners', icon: '🏢' },
    { path: '/collection-points', label: 'Collection Points', icon: '📦' },
    { path: '/analytics', label: 'Impact Analytics', icon: '📈' },
  ];

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-brand">
        <span className="brand-icon">🕸️</span>
        <div className="brand-text">
          <h2>MeshMission</h2>
          <span className="brand-badge">ADMIN CONTROL</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) => 
              isActive ? 'nav-item active' : 'nav-item'
            }
            end={link.path === '/'}
          >
            <span className="nav-icon">{link.icon}</span>
            <span className="nav-label">{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="admin-profile">
          <div className="admin-avatar">A</div>
          <div className="admin-info">
            <span className="admin-name">{user?.email?.split('@')[0] || 'Administrator'}</span>
            <span className="admin-role">Super Admin</span>
          </div>
        </div>
        <button className="logout-btn" onClick={logout}>
          <span className="logout-icon">🚪</span>
          <span className="logout-label">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
