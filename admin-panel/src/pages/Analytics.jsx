import React from 'react';
import { useCollection } from '../hooks/useFirestore';
import PieChart from '../components/Charts/PieChart';
import LineChart from '../components/Charts/LineChart';
import UrgencyBadge from '../components/Common/UrgencyBadge';
import LoadingSpinner from '../components/Common/LoadingSpinner';

export default function Analytics() {
  const { data: donations, loading: loadingDonations } = useCollection('donations');
  const { data: users, loading: loadingUsers } = useCollection('users');
  const { data: tasks, loading: loadingTasks } = useCollection('pickup_tasks');
  const { data: requirements, loading: loadingReqs } = useCollection('ngo_requirements');

  if (loadingDonations || loadingUsers || loadingTasks || loadingReqs) {
    return <LoadingSpinner message="Consolidating operations records and parsing chart statistics..." />;
  }

  // 1. Process Pie Chart (Donations by Category)
  const categoryCounts = donations.reduce((acc, curr) => {
    const cat = curr.category || 'other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const pieData = {
    labels: Object.keys(categoryCounts).map(cat => cat.toUpperCase().replace('_', ' ')),
    datasets: [
      {
        data: Object.values(categoryCounts),
        backgroundColor: [
          '#10B981', // green
          '#34D399', // light-green
          '#0F766E', // teal
          '#A7F3D0', // soft-mint
          '#F59E0B', // amber
          '#3B82F6', // blue
          '#EC4899', // pink
          '#6B7280', // grey
        ],
        borderWidth: 1,
        borderColor: '#FFFFFF',
      }
    ]
  };

  // 2. Process Line Chart (Tasks completed by month / day of the week)
  // Let's group tasks by month of creation
  const monthlyTaskData = tasks.reduce((acc, curr) => {
    if (!curr.createdAt) return acc;
    const date = new Date(curr.createdAt);
    const month = date.toLocaleString('default', { month: 'short' });
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});

  // Complete missing months for smooth graphing
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonthIdx = new Date().getMonth();
  const past6Months = [];
  for (let i = 5; i >= 0; i--) {
    let idx = currentMonthIdx - i;
    if (idx < 0) idx += 12;
    past6Months.push(months[idx]);
  }

  const lineData = {
    labels: past6Months,
    datasets: [
      {
        label: 'Courier Dispatches Resolved',
        data: past6Months.map(m => monthlyTaskData[m] || 0),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true,
      }
    ]
  };

  // 3. Leaderboard of Top Volunteers (completed tasks count)
  const volunteers = users.filter(u => u.role === 'volunteer');
  const volunteerLeaderboard = volunteers.map(vol => {
    const completedTasks = tasks.filter(t => t.volunteerId === vol.id && t.status === 'completed').length;
    return {
      name: vol.name || 'Anonymous Rider',
      email: vol.email || 'N/A',
      phoneNumber: vol.phoneNumber || 'N/A',
      count: completedTasks
    };
  }).sort((a, b) => b.count - a.count).slice(0, 5);

  // 4. Filter Emergency Resource Demands
  const emergencyReqs = requirements.filter(
    r => r.urgency === 'emergency' && r.status !== 'fulfilled'
  ).slice(0, 5);

  return (
    <div className="analytics-page-container">
      {/* 2 Chart Panels Grid */}
      <div className="analytics-charts-grid">
        <div className="analytics-chart-card">
          <h4>Donation Inventory Splits</h4>
          <span className="chart-description">Category percentage breakdown across contributions</span>
          <div className="chart-wrapper">
            {donations.length > 0 ? (
              <PieChart data={pieData} />
            ) : (
              <div className="empty-chart-note">📊 No data points to display</div>
            )}
          </div>
        </div>

        <div className="analytics-chart-card">
          <h4>Dispatch & Logistics Growth</h4>
          <span className="chart-description">Monthly volume tracking of volunteer delivery runs</span>
          <div className="chart-wrapper">
            <LineChart data={lineData} />
          </div>
        </div>
      </div>

      <div className="analytics-details-grid">
        {/* Leaderboard Column */}
        <div className="analytics-card-table leaderboard-panel">
          <div className="card-header">
            <h4>🏆 Volunteer Honor Leaderboard</h4>
            <span className="card-subtitle">Riders ranked by completed donation drop-offs</span>
          </div>
          <div className="card-body">
            {volunteerLeaderboard.length > 0 ? (
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Volunteer Name</th>
                    <th>Runs Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {volunteerLeaderboard.map((vol, idx) => (
                    <tr key={idx} className={`rank-row-${idx + 1}`}>
                      <td className="rank-cell">
                        <span className="rank-badge">#{idx + 1}</span>
                      </td>
                      <td>
                        <div className="rider-info">
                          <strong>{vol.name}</strong>
                          <span>{vol.phoneNumber}</span>
                        </div>
                      </td>
                      <td className="count-cell">
                        <strong>{vol.count}</strong> dispatches
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-leaderboard-note">
                No completed courier deliveries registered yet.
              </div>
            )}
          </div>
        </div>

        {/* Emergency Alert Column */}
        <div className="analytics-card-table emergency-panel">
          <div className="card-header">
            <h4>🚨 Emergency Resource Shortages</h4>
            <span className="card-subtitle">Critical demands requesting immediate volunteer collection</span>
          </div>
          <div className="card-body">
            {emergencyReqs.length > 0 ? (
              <div className="emergency-alert-list">
                {emergencyReqs.map((req) => (
                  <div className="emergency-alert-item" key={req.id}>
                    <div className="alert-details">
                      <span className="category-pill">{req.category}</span>
                      <h5>Need: {req.quantity} units</h5>
                      <span className="ngo-name-label">Requested by NGO ID: {req.ngoId.slice(0, 8)}...</span>
                    </div>
                    <div className="alert-urgency">
                      <UrgencyBadge urgency="emergency" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-emergency-note">
                🌿 No active emergency resource shortages. System matches normal requirements smoothly.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
