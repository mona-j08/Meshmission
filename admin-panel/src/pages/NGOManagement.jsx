import React, { useState } from 'react';
import { useCollection } from '../hooks/useFirestore';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import UrgencyBadge from '../components/Common/UrgencyBadge';
import StatusBadge from '../components/Common/StatusBadge';

export default function NGOManagement() {
  const { data: ngos, loading: loadingNgos } = useCollection('ngo_profiles');
  const { data: requirements, loading: loadingReqs } = useCollection('ngo_requirements');
  const { data: users, loading: loadingUsers } = useCollection('users');

  const [expandedNgoId, setExpandedNgoId] = useState(null);

  if (loadingNgos || loadingReqs || loadingUsers) {
    return <LoadingSpinner message="Auditing NGO organizations and syncing resource requests..." />;
  }

  // Bind NGO details with corporate user profile
  const ngoList = ngos.map((ngo) => {
    const user = users.find((u) => u.id === ngo.id) || {};
    const ngoReqs = requirements.filter((r) => r.ngoId === ngo.id);
    return {
      ...ngo,
      name: ngo.name || user.name || 'Unnamed Organization',
      email: ngo.email || user.email || 'N/A',
      contactPerson: ngo.contactPerson || 'N/A',
      phoneNumber: ngo.phoneNumber || user.phoneNumber || 'N/A',
      requirementsCount: ngoReqs.length,
      activeRequirements: ngoReqs.filter((r) => r.status !== 'fulfilled'),
    };
  });

  const toggleExpand = (ngoId) => {
    setExpandedNgoId(expandedNgoId === ngoId ? null : ngoId);
  };

  const getUrgencySortClass = (urgency) => {
    const u = String(urgency).toLowerCase();
    if (u === 'emergency') return 'text-danger fw-bold';
    if (u === 'high_priority') return 'text-warning';
    return 'text-muted';
  };

  return (
    <div className="ngo-management-page">
      {/* Short Summary Section */}
      <div className="ngo-summary-banner">
        <div className="mini-stat-card">
          <span className="stat-label">Registered NGO Partners</span>
          <h3>{ngoList.length}</h3>
        </div>
        <div className="mini-stat-card">
          <span className="stat-label">Active Open Resource Demands</span>
          <h3>{requirements.filter((r) => r.status !== 'fulfilled').length}</h3>
        </div>
      </div>

      {/* Main NGO List Cards */}
      <div className="ngo-cards-list-wrapper">
        {ngoList.length > 0 ? (
          ngoList.map((ngo) => {
            const isExpanded = expandedNgoId === ngo.id;

            return (
              <div 
                className={`ngo-premium-card ${isExpanded ? 'expanded' : ''}`} 
                key={ngo.id}
              >
                <div className="ngo-card-main-row" onClick={() => toggleExpand(ngo.id)}>
                  <div className="ngo-identity">
                    <div className="ngo-avatar">🏢</div>
                    <div className="ngo-details">
                      <h4>{ngo.name}</h4>
                      <span className="ngo-meta-info">
                        Contact: {ngo.contactPerson} • {ngo.phoneNumber}
                      </span>
                    </div>
                  </div>

                  <div className="ngo-stats-pills">
                    <span className="badge-requirement-count">
                      📋 {ngo.activeRequirements.length} Pending Requests
                    </span>
                    <button className="expand-chevron-btn">
                      {isExpanded ? '▲ Hide Details' : '▼ Expand Details'}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="ngo-card-expanded-content animate-slide">
                    <hr className="divider-line" />
                    
                    <div className="expanded-details-grid">
                      <div className="ngo-profile-info-section">
                        <h5>Operational Info</h5>
                        <p><strong>Official Email:</strong> {ngo.email}</p>
                        <p><strong>Primary Address:</strong> {ngo.address || 'Address not registered'}</p>
                        
                        {ngo.serviceAreas && ngo.serviceAreas.length > 0 && (
                          <div className="tags-section">
                            <strong>Service Regions:</strong>
                            <div className="service-tags-wrapper">
                              {ngo.serviceAreas.map((area, idx) => (
                                <span className="service-tag-pill" key={idx}>{area}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {ngo.availability && (
                          <p>
                            <strong>Operating Hours:</strong> {ngo.availability.openTime || '09:00'} - {ngo.availability.closeTime || '18:00'} 
                            <br />
                            <strong>Working Days:</strong> {ngo.availability.days ? ngo.availability.days.join(', ') : 'Mon-Fri'}
                          </p>
                        )}
                      </div>

                      <div className="ngo-requirements-section">
                        <h5>Open Inventory Requirements</h5>
                        {ngo.activeRequirements.length > 0 ? (
                          <div className="req-sub-table-wrapper">
                            <table className="req-sub-table">
                              <thead>
                                <tr>
                                  <th>Category</th>
                                  <th>Required Qty</th>
                                  <th>Priority</th>
                                  <th>Deadline</th>
                                </tr>
                              </thead>
                              <tbody>
                                {ngo.activeRequirements.map((req) => (
                                  <tr key={req.id}>
                                    <td><span className="category-pill-label">{req.category}</span></td>
                                    <td><strong>{req.quantity}</strong> items</td>
                                    <td><UrgencyBadge urgency={req.urgency} /></td>
                                    <td>
                                      {req.deliveryDeadline 
                                        ? new Date(req.deliveryDeadline).toLocaleDateString() 
                                        : 'Flexible'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="empty-requirements-note">
                            ✓ No active resource requirements requested by this NGO.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="table-empty-state">
            <span className="empty-icon">🏢</span>
            <h4>No NGO partners configured</h4>
            <p>Ensure NGOs are creating profiles and filling out credentials via mobile applications.</p>
          </div>
        )}
      </div>
    </div>
  );
}
