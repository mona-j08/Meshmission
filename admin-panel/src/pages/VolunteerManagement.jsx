import React, { useState } from 'react';
import { useCollection } from '../hooks/useFirestore';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import StatusBadge from '../components/Common/StatusBadge';

export default function VolunteerManagement() {
  const { data: users, loading: loadingUsers } = useCollection('users');
  const { data: volunteers, loading: loadingVolunteers } = useCollection('volunteers');
  const { data: tasks, loading: loadingTasks } = useCollection('pickup_tasks');

  const [activeTab, setActiveTab] = useState('market');

  if (loadingUsers || loadingVolunteers || loadingTasks) {
    return <LoadingSpinner message="Loading volunteer network and open task market..." />;
  }

  // Combine volunteer profiles with user details
  const volunteerList = volunteers.map((vol) => {
    const user = users.find((u) => u.id === vol.id) || {};
    const volTasks = tasks.filter((t) => t.volunteerId === vol.id);
    return {
      ...vol,
      name: user.name || 'Unknown Volunteer',
      email: user.email || 'N/A',
      phoneNumber: user.phoneNumber || 'N/A',
      tasksCount: volTasks.length,
      activeTasks: volTasks.filter(
        (t) => t.status !== 'completed' && t.status !== 'declined'
      ),
      completedTasks: volTasks.filter((t) => t.status === 'completed'),
    };
  });

  // Open Market: tasks with status 'open' (no volunteer claimed yet)
  const openMarketTasks = tasks.filter((t) => t.status === 'open');

  // Active tasks: claimed and in-progress
  const activeTasks = tasks.filter(
    (t) => t.status === 'accepted' || t.status === 'otp_sent' || t.status === 'assigned'
  );

  // Completed tasks
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  const getVehicleIcon = (hasVehicle, type = 'bike') => {
    if (!hasVehicle) return '🚶 Walk';
    const t = String(type).toLowerCase();
    if (t === 'car') return '🚗 Car';
    if (t === 'van' || t === 'truck') return '🚚 Truck/Van';
    return '🛵 Scooter/Bike';
  };

  const formatDate = (val) => {
    if (!val) return 'N/A';
    try {
      const d = val?.seconds ? new Date(val.seconds * 1000) : new Date(val);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  const getVolunteerName = (volunteerId) => {
    if (!volunteerId) return '—';
    const vol = volunteerList.find((v) => v.id === volunteerId);
    return vol ? vol.name : `ID: ${volunteerId.slice(0, 8)}...`;
  };

  const TABS = [
    { key: 'market', label: `🛒 Open Market (${openMarketTasks.length})` },
    { key: 'active', label: `🚗 In Progress (${activeTasks.length})` },
    { key: 'completed', label: `✅ Completed (${completedTasks.length})` },
    { key: 'volunteers', label: `👤 Volunteers (${volunteerList.length})` },
  ];

  const renderMarket = () => (
    <div className="table-card-panel">
      <div className="panel-header-section">
        <div>
          <h3>🛒 Open Task Market</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '4px 0 0' }}>
            Approved donations waiting for a volunteer to self-assign. Volunteers see and claim these from the mobile app.
          </p>
        </div>
      </div>
      {openMarketTasks.length > 0 ? (
        <div className="table-responsive-wrapper">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Description</th>
                <th>Pickup Address</th>
                <th>Posted On</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {openMarketTasks.map((task) => (
                <tr key={task.id} className="table-row-hoverable">
                  <td>
                    <span className="category-pill-label">
                      {task.category || '—'}
                    </span>
                  </td>
                  <td className="desc-cell">
                    <div className="item-main-desc">{task.description || 'No description'}</div>
                    <div className="item-sub-id">Donation: {(task.donationId || '').slice(0, 8)}...</div>
                  </td>
                  <td style={{ color: '#475569', fontSize: '0.875rem' }}>
                    📍 {task.pickupAddress || 'Address not listed'}
                  </td>
                  <td>{formatDate(task.createdAt)}</td>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      background: 'rgba(14, 165, 233, 0.1)',
                      color: '#0ea5e9',
                      border: '1px solid rgba(14,165,233,0.3)',
                    }}>
                      🟢 Open — Awaiting Volunteer
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-empty-state">
          <span className="empty-icon">🎉</span>
          <h4>No open tasks right now</h4>
          <p>All approved donations have been claimed by volunteers, or no donations have been approved yet.</p>
        </div>
      )}
    </div>
  );

  const renderActive = () => (
    <div className="table-card-panel">
      <div className="panel-header-section">
        <h3>🚗 Tasks In Progress</h3>
      </div>
      {activeTasks.length > 0 ? (
        <div className="table-responsive-wrapper">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Description</th>
                <th>Volunteer</th>
                <th>Pickup Address</th>
                <th>Claimed On</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {activeTasks.map((task) => (
                <tr key={task.id} className="table-row-hoverable">
                  <td><span className="category-pill-label">{task.category || '—'}</span></td>
                  <td className="desc-cell">
                    <div className="item-main-desc">{task.description || 'No description'}</div>
                  </td>
                  <td>
                    <div className="user-metadata">
                      <span className="user-display-name">{getVolunteerName(task.volunteerId)}</span>
                    </div>
                  </td>
                  <td style={{ color: '#475569', fontSize: '0.875rem' }}>
                    📍 {task.pickupAddress || '—'}
                  </td>
                  <td>{formatDate(task.updatedAt || task.createdAt)}</td>
                  <td><StatusBadge status={task.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-empty-state">
          <span className="empty-icon">🚦</span>
          <h4>No tasks in progress</h4>
          <p>Tasks will appear here once volunteers claim open market items.</p>
        </div>
      )}
    </div>
  );

  const renderCompleted = () => (
    <div className="table-card-panel">
      <div className="panel-header-section">
        <h3>✅ Completed Deliveries</h3>
      </div>
      {completedTasks.length > 0 ? (
        <div className="table-responsive-wrapper">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Description</th>
                <th>Volunteer</th>
                <th>Completed On</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {completedTasks.map((task) => (
                <tr key={task.id} className="table-row-hoverable">
                  <td><span className="category-pill-label">{task.category || '—'}</span></td>
                  <td className="desc-cell">
                    <div className="item-main-desc">{task.description || 'No description'}</div>
                  </td>
                  <td>
                    <span className="user-display-name">{getVolunteerName(task.volunteerId)}</span>
                  </td>
                  <td>{formatDate(task.completedAt || task.updatedAt)}</td>
                  <td><StatusBadge status={task.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-empty-state">
          <span className="empty-icon">📦</span>
          <h4>No completed tasks yet</h4>
          <p>Deliveries confirmed via OTP will appear here.</p>
        </div>
      )}
    </div>
  );

  const renderVolunteers = () => (
    <div className="table-card-panel">
      <div className="panel-header-section">
        <h3>👤 Volunteer Directory</h3>
      </div>
      {volunteerList.length > 0 ? (
        <div className="table-responsive-wrapper">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Volunteer</th>
                <th>Transport</th>
                <th>Region</th>
                <th>Active Tasks</th>
                <th>Completed</th>
              </tr>
            </thead>
            <tbody>
              {volunteerList.map((vol) => (
                <tr key={vol.id} className="table-row-hoverable">
                  <td className="volunteer-info-cell">
                    <div className="user-avatar-placeholder bg-teal">
                      {vol.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-metadata">
                      <span className="user-display-name">{vol.name}</span>
                      <span className="user-email-text">{vol.phoneNumber} • {vol.email}</span>
                    </div>
                  </td>
                  <td>
                    <span className="vehicle-badge-pill">
                      {getVehicleIcon(vol.hasVehicle, vol.vehicleType)}
                    </span>
                  </td>
                  <td>
                    <span className="region-text">
                      {vol.activeArea || vol.serviceRegion || 'All Areas'}
                    </span>
                  </td>
                  <td>
                    <strong style={{ color: vol.activeTasks.length > 0 ? '#0ea5e9' : '#94a3b8' }}>
                      {vol.activeTasks.length} active
                    </strong>
                  </td>
                  <td>
                    <strong style={{ color: '#22c55e' }}>{vol.completedTasks.length}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-empty-state">
          <span className="empty-icon">🚴</span>
          <h4>No volunteers registered</h4>
          <p>Volunteers need to register and set up their profile in the mobile app.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="volunteers-page-container">
      {/* Stats Header */}
      <div className="overview-header-cards">
        <div className="mini-stat-card">
          <span className="stat-label">🛒 Open in Market</span>
          <h3 style={{ color: '#0ea5e9' }}>{openMarketTasks.length}</h3>
        </div>
        <div className="mini-stat-card">
          <span className="stat-label">🚗 In Progress</span>
          <h3 style={{ color: '#f59e0b' }}>{activeTasks.length}</h3>
        </div>
        <div className="mini-stat-card">
          <span className="stat-label">✅ Completed</span>
          <h3 style={{ color: '#22c55e' }}>{completedTasks.length}</h3>
        </div>
        <div className="mini-stat-card">
          <span className="stat-label">👤 Volunteers</span>
          <h3>{volunteerList.length}</h3>
        </div>
      </div>

      {/* How it works banner */}
      <div style={{
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
        border: '1px solid #bae6fd',
        borderRadius: '12px',
        padding: '16px 20px',
        margin: '0 0 24px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
      }}>
        <span style={{ fontSize: '1.5rem' }}>ℹ️</span>
        <div>
          <strong style={{ color: '#0369a1' }}>Open Market System</strong>
          <p style={{ margin: '4px 0 0', color: '#0c4a6e', fontSize: '0.875rem', lineHeight: 1.5 }}>
            When you <strong>approve</strong> a donation in the Verifications tab, a pickup task is automatically posted to the open market.
            Volunteers see available tasks in real-time on their mobile app and <strong>self-assign</strong> by clicking "Accept".
            No manual dispatch required.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-navigation-bar" style={{ marginBottom: '0' }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`tab-item ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'market' && renderMarket()}
      {activeTab === 'active' && renderActive()}
      {activeTab === 'completed' && renderCompleted()}
      {activeTab === 'volunteers' && renderVolunteers()}
    </div>
  );
}
