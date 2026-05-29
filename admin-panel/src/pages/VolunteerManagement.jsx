import React, { useState } from 'react';
import { useCollection } from '../hooks/useFirestore';
import { firestoreService } from '../hooks/useFirestore';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import StatusBadge from '../components/Common/StatusBadge';

export default function VolunteerManagement() {
  const { data: users, loading: loadingUsers } = useCollection('users');
  const { data: volunteers, loading: loadingVolunteers } = useCollection('volunteers');
  const { data: tasks, loading: loadingTasks } = useCollection('pickup_tasks');
  const { data: donations, loading: loadingDonations } = useCollection('donations');

  const [assigningVolunteer, setAssigningVolunteer] = useState(null);
  const [selectedDonationId, setSelectedDonationId] = useState('');
  const [loadingAssign, setLoadingAssign] = useState(false);

  if (loadingUsers || loadingVolunteers || loadingTasks || loadingDonations) {
    return <LoadingSpinner message="Mobilizing volunteer networks and fetching operations logs..." />;
  }

  // Combine user details with volunteer profiles
  const volunteerList = volunteers.map((vol) => {
    const user = users.find((u) => u.id === vol.id) || {};
    const volTasks = tasks.filter((t) => t.volunteerId === vol.id);
    return {
      ...vol,
      name: user.name || 'Unknown Volunteer',
      email: user.email || 'N/A',
      phoneNumber: user.phoneNumber || 'N/A',
      tasksCount: volTasks.length,
      activeTasks: volTasks.filter((t) => t.status !== 'completed' && t.status !== 'declined'),
    };
  });

  // Filter donations that are approved but not yet assigned to any task
  const unassignedDonations = donations.filter((donation) => {
    const isApproved = donation.status === 'approved' || donation.verificationStatus === 'approved';
    const isAssigned = tasks.some((t) => t.donationId === donation.id && t.status !== 'declined');
    return isApproved && !isAssigned;
  });

  const getVehicleIcon = (hasVehicle, type = 'bike') => {
    if (!hasVehicle) return '🚶 Walk';
    const t = String(type).toLowerCase();
    if (t === 'car') return '🚗 Car';
    if (t === 'van' || t === 'truck') return '🚚 Truck/Van';
    return '🛵 Scooter/Bike';
  };

  const handleOpenAssignModal = (vol) => {
    setAssigningVolunteer(vol);
    setSelectedDonationId('');
  };

  const handleAssignTask = async (e) => {
    e.preventDefault();
    if (!selectedDonationId || !assigningVolunteer) return;

    setLoadingAssign(true);
    try {
      const selectedDonation = donations.find((d) => d.id === selectedDonationId);
      
      const taskData = {
        volunteerId: assigningVolunteer.id,
        donationId: selectedDonationId,
        donorId: selectedDonation.donorId || '',
        category: selectedDonation.category || '',
        description: selectedDonation.description || 'Assigned Item',
        pickupAddress: selectedDonation.pickupAddress || 'Address not listed',
        status: 'assigned',
      };

      await firestoreService.assignPickupTask(taskData);
      alert('Task successfully assigned to volunteer.');
      setAssigningVolunteer(null);
    } catch (err) {
      console.error('Failed to assign task:', err);
      alert('Failed to assign task. Try again.');
    }
    setLoadingAssign(false);
  };

  return (
    <div className="volunteers-page-container">
      {/* Overview Stat Header */}
      <div className="overview-header-cards">
        <div className="mini-stat-card">
          <span className="stat-label">Total Volunteers Registered</span>
          <h3>{volunteerList.length}</h3>
        </div>
        <div className="mini-stat-card">
          <span className="stat-label">Active Transits</span>
          <h3>{tasks.filter((t) => t.status === 'accepted' || t.status === 'otp_sent').length}</h3>
        </div>
        <div className="mini-stat-card">
          <span className="stat-label">Unassigned Donations Ready</span>
          <h3>{unassignedDonations.length}</h3>
        </div>
      </div>

      {/* Volunteer Directory Table */}
      <div className="table-card-panel">
        <div className="panel-header-section">
          <h3>Volunteer Directory & Routing Dispatch</h3>
        </div>

        {volunteerList.length > 0 ? (
          <div className="table-responsive-wrapper">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Volunteer Details</th>
                  <th>Transport Badge</th>
                  <th>Operating Region</th>
                  <th>Assigned Tasks</th>
                  <th>Actions</th>
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
                        {vol.activeArea || vol.serviceRegion || 'All Services'}
                      </span>
                    </td>
                    <td>
                      <div className="tasks-summary-cell">
                        <strong>{vol.activeTasks.length} Active</strong>
                        <span className="tasks-meta">({vol.tasksCount} total runs)</span>
                      </div>
                    </td>
                    <td className="action-cell">
                      <button
                        className="btn-primary btn-sm btn-success"
                        onClick={() => handleOpenAssignModal(vol)}
                      >
                        ⚡ Dispatch Task
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-empty-state">
            <span className="empty-icon">🚴</span>
            <h4>No volunteers found</h4>
            <p>Ensure users are registering and configuring volunteer profiles in the mobile app.</p>
          </div>
        )}
      </div>

      {/* Dispatch Assignment Modal Overlay */}
      {assigningVolunteer && (
        <div className="modal-backdrop-overlay">
          <div className="modal-content-container assignment-modal">
            <div className="modal-header">
              <h3>Manual Delivery Dispatch</h3>
              <button className="modal-close-btn" onClick={() => setAssigningVolunteer(null)}>&times;</button>
            </div>
            
            <form onSubmit={handleAssignTask}>
              <div className="modal-body">
                <div className="assignee-preview-card">
                  <h5>Assignee Details</h5>
                  <p><strong>Name:</strong> {assigningVolunteer.name}</p>
                  <p><strong>Vehicle:</strong> {getVehicleIcon(assigningVolunteer.hasVehicle, assigningVolunteer.vehicleType)}</p>
                  <p><strong>Current Load:</strong> {assigningVolunteer.activeTasks.length} pending tasks</p>
                </div>

                <div className="form-group margin-top-md">
                  <label htmlFor="donation-select">Select Approved Contribution to Dispatch:</label>
                  {unassignedDonations.length > 0 ? (
                    <select
                      id="donation-select"
                      className="form-input-control"
                      value={selectedDonationId}
                      onChange={(e) => setSelectedDonationId(e.target.value)}
                      required
                    >
                      <option value="">-- Choose Approved Donation Item --</option>
                      {unassignedDonations.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.category.toUpperCase()} - {d.description.slice(0, 30)}... ({d.quantity} units)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="no-donations-warning">
                      ⚠️ No approved, unassigned donations available right now. Approve donations in the Verifications tab first.
                    </div>
                  )}
                </div>
              </div>
              
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setAssigningVolunteer(null)}
                  disabled={loadingAssign}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loadingAssign || !selectedDonationId}
                >
                  {loadingAssign ? 'Dispatching Task...' : 'Confirm Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
