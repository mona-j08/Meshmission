import React, { useState } from 'react';
import StatusBadge from '../Common/StatusBadge';
import { firestoreService } from '../../hooks/useFirestore';

export default function DonationDetailModal({ isOpen, donation, onClose, onActionSuccess }) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !donation) return null;

  const handleApprove = async () => {
    setLoading(true);
    setError(null);
    try {
      await firestoreService.updateDonationVerification(donation.id, 'approved');
      
      // Open Market Task Creation
      await firestoreService.createOpenPickupTask({
        donationId: donation.id,
        donorId: donation.donorId || '',
        category: donation.category || '',
        description: donation.description || 'Approved Item',
        pickupAddress: donation.pickupAddress || 'Address not listed',
      });

      if (onActionSuccess) onActionSuccess();
      onClose();
    } catch (err) {
      console.error('Approval failed:', err);
      setError('Failed to approve donation. Please try again.');
    }
    setLoading(false);
  };

  const handleNeedsReview = async () => {
    setLoading(true);
    setError(null);
    try {
      await firestoreService.updateDonationVerification(donation.id, 'needs_review');
      if (onActionSuccess) onActionSuccess();
      onClose();
    } catch (err) {
      console.error('Needs review update failed:', err);
      setError('Failed to flag donation as Needs Review.');
    }
    setLoading(false);
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setError('Please provide a reason for rejecting this donation.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await firestoreService.updateDonationVerification(donation.id, 'rejected', {
        rejectionReason: rejectionReason.trim(),
      });
      if (onActionSuccess) onActionSuccess();
      onClose();
    } catch (err) {
      console.error('Rejection failed:', err);
      setError('Failed to reject donation.');
    }
    setLoading(false);
  };

  return (
    <div className="modal-backdrop-overlay">
      <div className="modal-content-container donation-detail-modal">
        <div className="modal-header">
          <h3>Donation Verification Detail</h3>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body scrollable-body">
          {error && <div className="modal-error-message">{error}</div>}
          
          <div className="donation-grid-layout">
            <div className="donation-main-info">
              <div className="info-block">
                <span className="info-label">Item Description</span>
                <p className="info-value-desc">{donation.description || 'No description provided'}</p>
              </div>

              <div className="info-row">
                <div className="info-block">
                  <span className="info-label">Category</span>
                  <span className="info-value category-pill">{donation.category}</span>
                </div>
                <div className="info-block">
                  <span className="info-label">Condition</span>
                  <span className="info-value condition-pill">{donation.condition}</span>
                </div>
                <div className="info-block">
                  <span className="info-label">Quantity</span>
                  <span className="info-value highlight">{donation.quantity} units</span>
                </div>
              </div>

              <div className="info-row">
                <div className="info-block">
                  <span className="info-label">Current Verification Status</span>
                  <div><StatusBadge status={donation.verificationStatus || donation.status} /></div>
                </div>
                <div className="info-block">
                  <span className="info-label">Submitted On</span>
                  <span className="info-value">{donation.createdAt ? new Date(donation.createdAt).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>

              <div className="info-block divider-top">
                <span className="info-label">Pickup/Donor Information</span>
                <p className="info-value"><strong>Donor ID:</strong> {donation.donorId}</p>
                <p className="info-value"><strong>Pickup Address:</strong> {donation.pickupAddress || 'Address not specified'}</p>
                {donation.pickupTime && <p className="info-value"><strong>Preferred Time:</strong> {donation.pickupTime}</p>}
              </div>

              {donation.rejectionReason && (
                <div className="info-block rejection-reason-block">
                  <span className="info-label">Previous Rejection Reason</span>
                  <p className="info-value error-color">{donation.rejectionReason}</p>
                </div>
              )}
            </div>

            <div className="donation-gallery">
              <span className="info-label">Uploaded Images</span>
              <div className="image-scroll-gallery">
                {donation.imageUrls && donation.imageUrls.length > 0 ? (
                  donation.imageUrls.map((url, idx) => (
                    <div className="gallery-image-frame" key={idx}>
                      <img src={url} alt={`Donation Item ${idx + 1}`} />
                    </div>
                  ))
                ) : (
                  <div className="no-images-placeholder">
                    <span>📷 No images uploaded</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {showRejectForm && (
            <form onSubmit={handleReject} className="rejection-form-overlay animate-slide">
              <h4>Specify Rejection Reason</h4>
              <p className="form-help-text">This will be shared with the donor to help them fix the donation submission.</p>
              <textarea
                className="rejection-textarea"
                rows="3"
                placeholder="e.g. Image blurry, items must be cleaned before donation, medicine is expired..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
              />
              <div className="rejection-form-actions">
                <button 
                  type="button" 
                  className="btn-secondary btn-sm" 
                  onClick={() => setShowRejectForm(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-danger btn-sm"
                  disabled={loading}
                >
                  {loading ? 'Rejecting...' : 'Submit Rejection'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="modal-footer">
          <div className="modal-footer-actions-left">
            <button 
              className="btn-secondary" 
              onClick={onClose} 
              disabled={loading}
            >
              Close
            </button>
          </div>
          <div className="modal-footer-actions-right">
            {!showRejectForm && (
              <>
                <button 
                  className="btn-danger" 
                  onClick={() => setShowRejectForm(true)} 
                  disabled={loading || donation.verificationStatus === 'rejected'}
                >
                  ❌ Reject
                </button>
                <button 
                  className="btn-warning" 
                  onClick={handleNeedsReview} 
                  disabled={loading || donation.verificationStatus === 'needs_review'}
                >
                  ⏳ Needs Review
                </button>
                <button 
                  className="btn-primary btn-success" 
                  onClick={handleApprove} 
                  disabled={loading || donation.verificationStatus === 'approved'}
                >
                  ✅ Approve
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
