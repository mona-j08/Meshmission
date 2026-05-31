import React, { useState, useEffect } from 'react';
import StatusBadge from '../Common/StatusBadge';
import { firestoreService, useCollection } from '../../hooks/useFirestore';

export default function DonationDetailModal({ isOpen, donation, onClose, onActionSuccess }) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showApproveForm, setShowApproveForm] = useState(false);
  const [selectedNgoId, setSelectedNgoId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load all NGO profiles for the drop-off dropdown
  const { data: ngoProfiles, loading: ngosLoading } = useCollection('ngo_profiles', null);

  // Reset form state when modal opens with a new donation
  useEffect(() => {
    if (isOpen) {
      setShowApproveForm(false);
      setShowRejectForm(false);
      setSelectedNgoId('');
      setError(null);
    }
  }, [isOpen, donation?.id]);

  if (!isOpen || !donation) return null;

  const selectedNgo = ngoProfiles.find((n) => n.id === selectedNgoId) || null;

  const handleApproveConfirm = async () => {
    if (!selectedNgoId) {
      setError('Please select a drop-off NGO before approving.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await firestoreService.updateDonationVerification(donation.id, 'approved', {
        matchedNgoId: selectedNgoId,
      });

      // Create open pickup task with NGO drop-off info attached
      await firestoreService.createOpenPickupTask({
        donationId: donation.id,
        donorId: donation.donorId || '',
        category: donation.category || '',
        description: donation.description || 'Approved Item',
        pickupAddress: donation.pickupAddress || 'Address not listed',
        donorLocation: donation.location || donation.donorLocation || null,
        // Drop-off destination for the volunteer
        collectionPoint: {
          ngoId: selectedNgo.id,
          name: selectedNgo.ngoName || selectedNgo.name || 'NGO',
          address: selectedNgo.address || 'Address not listed',
          location: selectedNgo.location || null,
          contactPerson: selectedNgo.contactPerson || null,
          phone: selectedNgo.phone || null,
        },
        matchedNgoId: selectedNgoId,
      });

      if (onActionSuccess) onActionSuccess();
      setTimeout(() => onClose(), 300);
    } catch (err) {
      console.error('Approval failed:', err);
      setError('Failed to approve donation. Please try again.');
      setLoading(false);
    }
  };

  const handleNeedsReview = async () => {
    setLoading(true);
    setError(null);
    try {
      await firestoreService.updateDonationVerification(donation.id, 'needs_review');
      if (onActionSuccess) onActionSuccess();
      setTimeout(() => onClose(), 300);
    } catch (err) {
      console.error('Needs review update failed:', err);
      setError('Failed to flag donation as Needs Review.');
      setLoading(false);
    }
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
      setTimeout(() => onClose(), 300);
    } catch (err) {
      console.error('Rejection failed:', err);
      setError('Failed to reject donation.');
      setLoading(false);
    }
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

          {/* ── Donation Info ───────────────────────────── */}
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
                  <span className="info-label">Verification Status</span>
                  <div><StatusBadge status={donation.verificationStatus || donation.status} /></div>
                </div>
                <div className="info-block">
                  <span className="info-label">Submitted On</span>
                  <span className="info-value">
                    {donation.createdAt
                      ? new Date(donation.createdAt?.seconds ? donation.createdAt.seconds * 1000 : donation.createdAt).toLocaleDateString()
                      : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="info-block divider-top">
                <span className="info-label">Pickup / Donor Information</span>
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
                {(() => {
                  const imgs = donation.imageUrls || donation.images || [];
                  if (imgs.length > 0) {
                    return imgs.map((url, idx) => (
                      <div className="gallery-image-frame" key={idx}>
                        <img src={url} alt={`Donation Item ${idx + 1}`} />
                      </div>
                    ));
                  }
                  return (
                    <div className="no-images-placeholder">
                      <span>📷 No images uploaded</span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* ── NGO Drop-off Selector (shown when Approve is clicked) ─── */}
          {showApproveForm && (
            <div style={{
              marginTop: '20px',
              padding: '20px',
              background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
              borderRadius: '12px',
              border: '1.5px solid #86efac',
            }}>
              <h4 style={{ margin: '0 0 6px', color: '#166534', fontSize: '1rem' }}>
                🏢 Select Drop-off NGO
              </h4>
              <p style={{ margin: '0 0 14px', color: '#15803d', fontSize: '0.85rem' }}>
                The volunteer will see this NGO's address as their delivery destination.
              </p>

              {ngosLoading ? (
                <p style={{ color: '#64748b' }}>Loading NGOs...</p>
              ) : ngoProfiles.length === 0 ? (
                <div style={{
                  padding: '12px',
                  background: '#fef9c3',
                  borderRadius: '8px',
                  color: '#854d0e',
                  fontSize: '0.875rem',
                }}>
                  ⚠️ No NGO profiles found. Ask NGOs to complete their profile in the mobile app first.
                </div>
              ) : (
                <>
                  <select
                    className="form-input-control"
                    value={selectedNgoId}
                    onChange={(e) => { setSelectedNgoId(e.target.value); setError(null); }}
                    style={{ marginBottom: '12px' }}
                  >
                    <option value="">— Choose an NGO —</option>
                    {ngoProfiles.map((ngo) => (
                      <option key={ngo.id} value={ngo.id}>
                        {ngo.ngoName || ngo.name || 'Unnamed NGO'}
                        {ngo.address ? ` — ${ngo.address}` : ''}
                      </option>
                    ))}
                  </select>

                  {/* Preview card for selected NGO */}
                  {selectedNgo && (
                    <div style={{
                      padding: '12px 14px',
                      background: '#fff',
                      borderRadius: '8px',
                      border: '1px solid #bbf7d0',
                      fontSize: '0.875rem',
                      lineHeight: 1.6,
                    }}>
                      <strong style={{ color: '#166534' }}>
                        📍 {selectedNgo.ngoName || selectedNgo.name}
                      </strong><br />
                      <span style={{ color: '#374151' }}>
                        {selectedNgo.address || 'No address on file'}
                      </span><br />
                      {selectedNgo.contactPerson && (
                        <span style={{ color: '#6b7280' }}>
                          Contact: {selectedNgo.contactPerson}
                          {selectedNgo.phone ? ` · ${selectedNgo.phone}` : ''}
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => { setShowApproveForm(false); setSelectedNgoId(''); setError(null); }}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary btn-success"
                  onClick={handleApproveConfirm}
                  disabled={loading || !selectedNgoId}
                  style={{ flex: 1 }}
                >
                  {loading ? 'Approving & posting task...' : '✅ Confirm Approval & Post to Market'}
                </button>
              </div>
            </div>
          )}

          {/* ── Rejection Form ───────────────────────────── */}
          {showRejectForm && (
            <form onSubmit={handleReject} className="rejection-form-overlay animate-slide">
              <h4>Specify Rejection Reason</h4>
              <p className="form-help-text">
                This will be shared with the donor to help them fix the donation submission.
              </p>
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
                <button type="submit" className="btn-danger btn-sm" disabled={loading}>
                  {loading ? 'Rejecting...' : 'Submit Rejection'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ── Footer Actions ──────────────────────────────── */}
        <div className="modal-footer">
          <div className="modal-footer-actions-left">
            <button className="btn-secondary" onClick={onClose} disabled={loading}>
              Close
            </button>
          </div>
          <div className="modal-footer-actions-right">
            {!showRejectForm && !showApproveForm && (
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
                  onClick={() => { setShowApproveForm(true); setShowRejectForm(false); }}
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
