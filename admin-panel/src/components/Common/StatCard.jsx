import React from 'react';

export default function StatCard({ title, value, icon, trend, trendType = 'up' }) {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <span className="stat-card-title">{title}</span>
        <span className="stat-card-icon">{icon}</span>
      </div>
      <div className="stat-card-body">
        <h3 className="stat-card-value">{value}</h3>
        {trend && (
          <div className={`stat-card-trend trend-${trendType}`}>
            <span className="trend-arrow">{trendType === 'up' ? '▲' : '▼'}</span>
            <span className="trend-text">{trend}</span>
          </div>
        )}
      </div>
    </div>
  );
}
