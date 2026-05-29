import React, { useState } from 'react';
import { useCollection } from '../hooks/useFirestore';
import { firestoreService } from '../hooks/useFirestore';
import LoadingSpinner from '../components/Common/LoadingSpinner';

export default function UserManagement() {
  const { data: users, loading } = useCollection('users');
  const [roleFilter, setRoleFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [changingUserId, setChangingUserId] = useState(null);

  if (loading) {
    return <LoadingSpinner message="Querying corporate and public directories..." />;
  }

  // Filter users by role and search
  const filteredUsers = users.filter((user) => {
    const roleMatch = roleFilter === 'all' || user.role === roleFilter;
    const searchString = `${user.name || ''} ${user.email || ''} ${user.phoneNumber || ''}`.toLowerCase();
    const queryMatch = searchString.includes(searchQuery.toLowerCase());
    return roleMatch && queryMatch;
  });

  const handleRoleChange = async (userId, newRole) => {
    setChangingUserId(userId);
    try {
      await firestoreService.updateUserRole(userId, newRole);
    } catch (err) {
      console.error('Failed to change role:', err);
      alert('Error updating user role.');
    }
    setChangingUserId(null);
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    try {
      // Toggle the status
      const nextStatus = currentStatus === undefined ? false : !currentStatus;
      await firestoreService.updateUserStatus(userId, nextStatus);
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Error updating user status.');
    }
  };

  return (
    <div className="users-page-container">
      {/* Search & Filter Header */}
      <div className="filter-header-bar">
        <div className="search-group">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input-field"
            placeholder="Search by name, email, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-select-group">
          <label htmlFor="role-select">Filter by Role:</label>
          <select 
            id="role-select"
            className="filter-select-dropdown"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Users</option>
            <option value="donor">Donors</option>
            <option value="volunteer">Volunteers</option>
            <option value="ngo">NGOs</option>
            <option value="admin">Admins</option>
          </select>
        </div>
      </div>

      {/* Users Data List */}
      <div className="table-card-panel">
        {filteredUsers.length > 0 ? (
          <div className="table-responsive-wrapper">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>User Details</th>
                  <th>Primary Role</th>
                  <th>System Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="table-row-hoverable">
                    <td className="user-info-cell">
                      <div className="user-avatar-placeholder">
                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="user-metadata">
                        <span className="user-display-name">{user.name || 'Anonymous User'}</span>
                        <span className="user-email-text">{user.email || 'No Email Added'}</span>
                        <span className="user-phone-text">{user.phoneNumber || 'No Phone Added'}</span>
                      </div>
                    </td>
                    <td>
                      <select
                        className="role-change-dropdown"
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        disabled={changingUserId === user.id}
                      >
                        <option value="donor">Donor</option>
                        <option value="volunteer">Volunteer</option>
                        <option value="ngo">NGO Partner</option>
                        <option value="admin">Super Admin</option>
                      </select>
                    </td>
                    <td>
                      <span className={`status-pill ${user.isActive !== false ? 'active' : 'suspended'}`}>
                        {user.isActive !== false ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="action-cell">
                      <button
                        className={`btn-sm ${user.isActive !== false ? 'btn-danger' : 'btn-success'}`}
                        onClick={() => handleStatusToggle(user.id, user.isActive)}
                      >
                        {user.isActive !== false ? '🚫 Suspend' : '✅ Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-empty-state">
            <span className="empty-icon">👥</span>
            <h4>No users match query</h4>
            <p>Try refining your search text or removing the role filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
