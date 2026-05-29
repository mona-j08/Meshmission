import React from 'react';
import StatCard from '../components/Common/StatCard';
import BarChart from '../components/Charts/BarChart';
import StatusBadge from '../components/Common/StatusBadge';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { useCollection } from '../hooks/useFirestore';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { data: donations, loading: loadingDonations } = useCollection('donations');
  const { data: users, loading: loadingUsers } = useCollection('users');
  const { data: deliveries, loading: loadingDeliveries } = useCollection('deliveries');

  if (loadingDonations || loadingUsers || loadingDeliveries) {
    return <LoadingSpinner message="Reconciling records and initializing dashboard metrics..." />;
  }

  // Calculate Stats
  const totalDonations = donations.length;
  const pendingVerifications = donations.filter(d => d.verificationStatus === 'pending' || !d.verificationStatus).length;
  const activeVolunteers = users.filter(u => u.role === 'volunteer').length;
  const completedDeliveries = deliveries.filter(d => d.status === 'delivered').length;

  // Process data for Chart (Donations by Category)
  const categoryCounts = donations.reduce((acc, curr) => {
    const cat = curr.category || 'other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const chartData = {
    labels: Object.keys(categoryCounts).map(cat => cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')),
    datasets: [
      {
        label: 'Donation Items',
        data: Object.values(categoryCounts),
        backgroundColor: '#10B981', // primary green
        borderRadius: 6,
        borderWidth: 0,
      }
    ]
  };

  // Extract recent 5 donations
  const recentDonations = donations.slice(0, 5);

  return (
    <div className="dashboard-page-container">
      {/* 4 Stat Cards */}
      <div className="stat-cards-grid">
        <StatCard
          title="Total Contributions"
          value={totalDonations}
          icon="📦"
          trend="+12% from last week"
          trendType="up"
        />
        <StatCard
          title="Pending Verifications"
          value={pendingVerifications}
          icon="🔍"
          trend={`${pendingVerifications} require review`}
          trendType={pendingVerifications > 0 ? 'down' : 'up'}
        />
        <StatCard
          title="Active Volunteers"
          value={activeVolunteers}
          icon="🚴"
          trend="2 currently on route"
          trendType="up"
        />
        <StatCard
          title="Completed Deliveries"
          value={completedDeliveries}
          icon="🏢"
          trend="99.4% success rate"
          trendType="up"
        />
      </div>

      <div className="dashboard-content-grid">
        {/* Chart Column */}
        <div className="dashboard-card-wrapper chart-panel">
          <div className="card-header-container">
            <h3>Donations by Category</h3>
            <span className="subtitle">Real-time inventory analysis</span>
          </div>
          <div className="card-body-content">
            {totalDonations > 0 ? (
              <BarChart data={chartData} />
            ) : (
              <div className="empty-state-card">
                <span>📈 No donation data available to chart yet</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions & Recent Activity */}
        <div className="dashboard-card-wrapper activity-panel">
          <div className="card-header-container">
            <h3>Recent Contribution Activity</h3>
            <span className="subtitle">Latest submissions across regions</span>
          </div>
          
          <div className="card-body-content">
            <div className="recent-list">
              {recentDonations.length > 0 ? (
                recentDonations.map((item) => (
                  <div className="recent-item" key={item.id}>
                    <div className="recent-item-left">
                      <span className="item-icon">🎁</span>
                      <div className="item-details">
                        <span className="item-title">{item.description || 'Anonymous contribution'}</span>
                        <span className="item-meta">
                          {item.quantity} units • {item.category} • By {item.donorId?.slice(0, 8)}...
                        </span>
                      </div>
                    </div>
                    <div className="recent-item-right">
                      <StatusBadge status={item.verificationStatus || item.status} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-activity">
                  <p>No activity logs found. Waiting for first contribution.</p>
                </div>
              )}
            </div>
            
            <div className="quick-actions-footer">
              <Link to="/verification" className="action-btn btn-outline">
                Verify Pending Items ({pendingVerifications})
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
