import React from 'react';

export default function Footer() {
  return (
    <footer className="admin-footer">
      <div className="footer-content">
        <p>&copy; {new Date().getFullYear()} MeshMission. All rights reserved.</p>
        <div className="footer-links">
          <span>Version 1.0.0</span>
          <span className="dot">•</span>
          <span>Security Rules Enabled</span>
        </div>
      </div>
    </footer>
  );
}
