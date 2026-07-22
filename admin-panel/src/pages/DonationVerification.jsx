import React, { useState } from 'react';
import { useCollection } from '../hooks/useFirestore';
import StatusBadge from '../components/Common/StatusBadge';
import DonationDetailModal from '../components/Modals/DonationDetailModal';
import LoadingSpinner from '../components/Common/LoadingSpinner';

export default function DonationVerification() {
  const { data: donations, loading } = useCollection('donations');
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterCondition, setFilterCondition] = useState('');

  if (loading) {
    return <LoadingSpinner message="Retrieving donation registry and staging verification portal..." />;
  }

  // Filter donations based on active tab
  const getFilteredDonations = () => {
    return donations.filter((donation) => {
      const status = donation.verificationStatus || donation.status || 'pending';
      const matchesTab = activeTab === 'pending' 
        ? (status === 'pending' || status === 'uploaded')
        : (status === activeTab);
      
      const matchesSearch = !searchQuery |
        (donation.description?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (donation.donorName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (donation.donorPhone?.includes(searchQuery)) ||
        (donation.id?.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = !filterCategory || donation.category === filterCategory;
      const matchesCondition = !filterCondition || donation.condition === filterCondition;

      return matchesTab && matchesSearch && matchesCategory && matchesCondition;
    });
  };

  const filteredItems = getFilteredDonations();

  const handleReviewClick = (donation) => {
    setSelectedDonation(donation);
    setIsDetailOpen(true);
  };

  return (
    <div className="verification-page-container">
      {/* Tab Selectors */}
      <div className="tab-navigation-bar">
        <button 
          className={`tab-item ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          📥 Pending Verification ({donations.filter(d => (d.verificationStatus || d.status || 'pending') === 'pending' || (d.verificationStatus || d.status) === 'uploaded').length})
        </button>
        <button 
          className={`tab-item ${activeTab === 'needs_review' ? 'active' : ''}`}
          onClick={() => setActiveTab('needs_review')}
        >
          ⏳ Needs Review ({donations.filter(d => (d.verificationStatus || d.status) === 'needs_review').length})
        </button>
        <button 
          className={`tab-item ${activeTab === 'approved' ? 'active' : ''}`}
          onClick={() => setActiveTab('approved')}
        >
          ✅ Approved ({donations.filter(d => (d.verificationStatus || d.status) === 'approved').length})
        </button>
        <button 
          className={`tab-item ${activeTab === 'rejected' ? 'active' : ''}`}
          onClick={() => setActiveTab('rejected')}
        >
          ❌ Rejected ({donations.filter(d => (d.verificationStatus || d.status) === 'rejected').length})
        </button>
      </div>

      {/* Search and Filters */}
      <div className="search-filter-bar" style={{ display: 'flex', gap: '1rem', margin: '0 2rem 1.5rem', flexWrap: 'wrap' }}>
        <input 
          type="text" 
          placeholder="Search by ID or description..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
        />
        <select 
          value={filterCategory} 
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
        >
          <option value="">All Categories</option>
          <option value="Clothing">Clothing</option>
          <option value="Food">Food</option>
          <option value="Electronics">Electronics</option>
          <option value="Furniture">Furniture</option>
          <option value="Medical">Medical</option>
          <option value="Books">Books</option>
          <option value="Other">Other</option>
        </select>
        <select 
          value={filterCondition} 
          onChange={(e) => setFilterCondition(e.target.value)}
          style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
        >
          <option value="">All Conditions</option>
          <option value="new">New</option>
          <option value="good">Good</option>
          <option value="moderate">Moderate</option>
          <option value="damaged">Damaged</option>
        </select>
      </div>

      {/* Main Table Panel */}
      <div className="table-card-panel">
        {filteredItems.length > 0 ? (
          <div className="table-responsive-wrapper">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Preview</th>
                  <th>Donor</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Units</th>
                  <th>Pickup Date</th>
                  <th>Condition</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th className="actions-header">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className="table-row-hoverable">
                    {/* Preview */}
                    <td className="thumbnail-cell">
                      {(item.images && item.images.length > 0) || (item.imageUrls && item.imageUrls.length > 0) ? (
                        <img
                          className="table-thumbnail-img"
                          src={(item.images && item.images[0]) || (item.imageUrls && item.imageUrls[0])}
                          alt="Thumbnail"
                        />
                      ) : (
                        <div className="table-thumbnail-placeholder">📷</div>
                      )}
                    </td>

                    {/* Donor Name + Phone */}
                    <td className="desc-cell">
                      <div className="item-main-desc" style={{ fontWeight: '600', color: '#1e40af' }}>
                        {item.donorName || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Not registered</span>}
                      </div>
                      {item.donorPhone && (
                        <div className="item-sub-id">📞 {item.donorPhone}</div>
                      )}
                    </td>

                    {/* Description */}
                    <td className="desc-cell">
                      <div className="item-main-desc">{item.description || item.reason || 'No description'}</div>
                      <div className="item-sub-id">ID: {item.id.slice(0, 8)}...</div>
                    </td>

                    {/* Category */}
                    <td><span className="category-pill-label">{item.category}</span></td>

                    {/* Units */}
                    <td style={{ textAlign: 'center' }}>
                      <strong style={{ fontSize: '1.1rem', color: '#1d4ed8' }}>
                        {item.units ?? item.quantity ?? '—'}
                      </strong>
                    </td>

                    {/* Pickup Date */}
                    <td>
                      {item.preferredPickupDate
                        ? <span style={{ color: '#15803d', fontWeight: '600' }}>{item.preferredPickupDate}</span>
                        : <span style={{ color: '#94a3b8' }}>—</span>}
                      {(item.pickupTime || item.pickupPreference) && (
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2 }}>
                          {item.pickupTime || item.pickupPreference}
                        </div>
                      )}
                    </td>

                    {/* Condition */}
                    <td><span className={`condition-tag cond-${item.condition}`}>{item.condition}</span></td>

                    {/* Submitted Date */}
                    <td>
                      {item.createdAt
                        ? new Date(item.createdAt.seconds ? item.createdAt.seconds * 1000 : item.createdAt).toLocaleDateString()
                        : 'N/A'}
                    </td>

                    {/* Status */}
                    <td><StatusBadge status={item.verificationStatus || item.status} /></td>

                    {/* Action */}
                    <td className="action-cell">
                      <button
                        className="btn-primary btn-sm"
                        onClick={() => handleReviewClick(item)}
                      >
                        🔎 Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-empty-state">
            <span className="empty-icon">📭</span>
            <h4>No items found here</h4>
            <p>There are no donations matching the tab query of "{activeTab}".</p>
          </div>
        )}
      </div>

      {/* Donation Detail Modal */}
      {isDetailOpen && (
        <DonationDetailModal
          isOpen={isDetailOpen}
          donation={selectedDonation}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedDonation(null);
          }}
          onActionSuccess={() => {
            // Firestore updates are real-time, no need for manual trigger
          }}
        />
      )}
    </div>
  );
}
