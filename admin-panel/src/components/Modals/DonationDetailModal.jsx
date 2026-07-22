// ─── DonationDetailModal.jsx ────────────────────────────────────────────────
// Full donation verification modal with NGO + Collection Point assignment.
//
// UPDATED:
//  • Shows complete DONOR INFO section (name, phone, full address).
//  • Shows complete DONATION INFO (category, description, units, pickup date,
//    pickup time, photos, notes, status).
//  • Shows VOLUNTEER INFO when assigned.
//  • Shows RECEIVER / NGO INFO (name, address, phone).
//  • Passes donorPhone, donorAddress, units, preferredPickupDate, pickupTime,
//    receiverName, receiverPhone, receiverAddress into the pickup task on approve.
//  • Fetches donor user profile to display name/phone when not denormalized yet.
// ────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useCollection, firestoreService } from '../../hooks/useFirestore';
import StatusBadge from '../Common/StatusBadge';

// ── helpers ──────────────────────────────────────────────────────────────────

function buildDonorLocation(donation) {
  const loc = donation.location;
  if (loc && (loc.latitude != null || loc.lat != null)) return loc;
  if (loc && loc.address) return { ...loc, area: loc.address };
  if (donation.pickupAddress && typeof donation.pickupAddress === 'string') {
    return { area: donation.pickupAddress };
  }
  if (donation.donorAddress && typeof donation.donorAddress === 'object') {
    const a = donation.donorAddress;
    const addressStr = [a.street, a.area, a.city, a.state, a.pincode].filter(Boolean).join(', ');
    return { area: addressStr || null };
  }
  return null;
}

function formatAddressObj(addr) {
  if (!addr) return null;
  if (typeof addr === 'string') return addr;
  return [addr.street, addr.area, addr.city, addr.state, addr.pincode]
    .filter(Boolean)
    .join(', ') || null;
}

function InfoRow({ label, value, highlight = false }) {
  if (!value) return null;
  return (
    <p className="info-value" style={{ margin: '4px 0' }}>
      <strong>{label}:</strong>{' '}
      <span style={highlight ? { color: '#1d4ed8', fontWeight: '600' } : {}}>{value}</span>
    </p>
  );
}

// ── component ────────────────────────────────────────────────────────────────

export default function DonationDetailModal({ isOpen, donation, onClose, onActionSuccess }) {
  // Form state
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm]   = useState(false);
  const [showApproveForm, setShowApproveForm] = useState(false);
  const [selectedNgoId, setSelectedNgoId]     = useState('');
  const [selectedCpId, setSelectedCpId]       = useState('');
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState(null);

  // Fetched donor profile (fallback when donation doesn't have denormalized fields)
  const [donorProfile, setDonorProfile] = useState(null);
  const [loadingDonor, setLoadingDonor] = useState(false);

  // Fetch NGO profiles and collection points for dropdowns
  const { data: ngoProfiles, loading: ngosLoading }         = useCollection('ngo_profiles', 'createdAt', 'desc');
  const { data: collectionPoints, loading: cpsLoading }     = useCollection('collection_points', 'name', 'asc');

  // Fetch donor profile once when donation is known
  useEffect(() => {
    if (!donation?.donorId) return;

    // If denormalized name already present, skip fetch
    if (donation.donorName && donation.donorPhone) return;

    setLoadingDonor(true);
    getDoc(doc(db, 'users', donation.donorId))
      .then((snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setDonorProfile({
            name:  d.name || d.displayName || null,
            phone: d.donorPhone || d.phoneNumber || d.phone || null,
            email: d.email || null,
            donorAddress: d.donorAddress || null,
            donorId: d.donorId || null,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoadingDonor(false));
  }, [donation?.donorId, donation?.donorName, donation?.donorPhone]);

  if (!isOpen || !donation) return null;

  // ── Resolved donor info (denormalized wins; fallback to fetched profile) ──
  const resolvedDonorName    = donation.donorName    || donorProfile?.name    || null;
  const resolvedDonorPhone   = donation.donorPhone   || donorProfile?.phone   || null;
  const resolvedDonorAddress = donation.donorAddress || donorProfile?.donorAddress || null;
  const resolvedDonorEmail   = donorProfile?.email   || null;

  // Derived data
  const selectedNgo = ngoProfiles.find(n => n.id === selectedNgoId);
  const selectedCp  = collectionPoints.find(cp => cp.id === selectedCpId);
  const activeCollectionPoints = collectionPoints.filter(cp => cp.isActive !== false);

  // ── Approve handler ─────────────────────────────────────────────────────
  const handleApproveConfirm = async () => {
    if (!selectedNgoId) {
      setError('Please select an NGO before approving.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build robust donor location
      const donorLocation = buildDonorLocation(donation);
      const pickupPreference = donation.pickupPreference || donation.pickupTime || null;

      // Build drop-off location object
      let dropOffLocation = null;
      if (selectedCp) {
        dropOffLocation = {
          name:    selectedCp.name,
          address: selectedCp.address || 'Address not available',
          type:    'collection_point',
          id:      selectedCp.id,
        };
      } else if (selectedNgo) {
        dropOffLocation = {
          name:    selectedNgo.ngoName || selectedNgo.name || 'NGO',
          address: selectedNgo.address || 'Address not available',
          type:    'ngo',
          id:      selectedNgo.id,
        };
      }

      // Receiver info resolved from NGO or collection point
      const receiverName    = selectedCp?.name || selectedNgo?.ngoName || selectedNgo?.name || null;
      const receiverPhone   = selectedCp?.contactPhone || selectedNgo?.phone || selectedNgo?.phoneNumber || null;
      const receiverAddress = selectedCp?.address || selectedNgo?.address || null;

      // Create the pickup task with FULL data
      await firestoreService.createOpenPickupTask({
        donationId:  donation.id,
        donorId:     donation.donorId,
        // Donor details (denormalized)
        donorName:   resolvedDonorName,
        donorPhone:  resolvedDonorPhone,
        donorAddress: resolvedDonorAddress,
        donorLocation,
        pickupPreference,
        preferredPickupDate: donation.preferredPickupDate || null,
        pickupTime:          donation.pickupTime          || donation.pickupPreference || null,
        // Donation summary
        category:    donation.category,
        description: donation.description || '',
        units:       donation.units ?? donation.quantity ?? null,
        imageUrls:   donation.imageUrls || donation.images || [],
        // Receiver / NGO / collection point
        matchedNgoId:            selectedNgoId,
        ngoName:                 selectedNgo?.ngoName || selectedNgo?.name || '',
        ngoAddress:              selectedNgo?.address || '',
        receiverName,
        receiverPhone,
        receiverAddress,
        collectionPointId:       selectedCp?.id      || null,
        collectionPointName:     selectedCp?.name    || null,
        collectionPointAddress:  selectedCp?.address || null,
        dropOffLocation,
      });

      // Mark donation as approved
      await firestoreService.updateDonationVerification(donation.id, 'approved', {
        matchedNgoId:     selectedNgoId,
        collectionPointId: selectedCp?.id || null,
      });

      if (onActionSuccess) onActionSuccess();
      setTimeout(() => onClose(), 300);
    } catch (err) {
      console.error('Approval failed:', err);
      setError('Failed to approve donation. Please try again.');
      setLoading(false);
    }
  };

  // ── Needs Review handler ────────────────────────────────────────────────
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

  // ── Reject handler ──────────────────────────────────────────────────────
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

  // ── Render ──────────────────────────────────────────────────────────────
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

              {/* ── SECTION 1: DONOR INFORMATION ── */}
              <div className="info-block divider-top" style={{ background: '#f0f9ff', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                <span className="info-label" style={{ fontWeight: '700', color: '#0369a1', fontSize: '0.95rem' }}>
                  👤 Donor Information
                </span>
                {loadingDonor && <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Loading donor profile...</p>}
                <InfoRow label="Donor ID"      value={donation.donorId?.slice(0, 12) + '...'} />
                <InfoRow label="Name"          value={resolvedDonorName} highlight />
                <InfoRow label="Phone"         value={resolvedDonorPhone} highlight />
                <InfoRow label="Email"         value={resolvedDonorEmail} />
                {resolvedDonorAddress && (
                  <p className="info-value" style={{ margin: '4px 0' }}>
                    <strong>Address:</strong>{' '}
                    <span style={{ color: '#1d4ed8' }}>
                      {formatAddressObj(resolvedDonorAddress)}
                    </span>
                  </p>
                )}
                {!resolvedDonorName && !resolvedDonorPhone && !loadingDonor && (
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>
                    Donor has not completed registration yet.
                  </p>
                )}
              </div>

              {/* ── SECTION 2: DONATION INFORMATION ── */}
              <div className="info-block" style={{ marginBottom: 16 }}>
                <span className="info-label" style={{ fontWeight: '700', color: '#15803d', fontSize: '0.95rem' }}>
                  📦 Donation Information
                </span>

                <div className="info-block" style={{ marginTop: 8 }}>
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
                    <span className="info-label">Units</span>
                    <span className="info-value highlight" style={{ color: '#1d4ed8', fontWeight: '700', fontSize: '1.1rem' }}>
                      {donation.units ?? donation.quantity ?? '—'}
                    </span>
                  </div>
                </div>

                <div className="info-row">
                  <div className="info-block">
                    <span className="info-label">Preferred Pickup Date</span>
                    <span className="info-value">
                      {donation.preferredPickupDate || '—'}
                    </span>
                  </div>
                  <div className="info-block">
                    <span className="info-label">Pickup Time</span>
                    <span className="info-value">
                      {donation.pickupTime || donation.pickupPreference || '—'}
                    </span>
                  </div>
                </div>

                {donation.notes && (
                  <div className="info-block">
                    <span className="info-label">Notes</span>
                    <p className="info-value">{donation.notes}</p>
                  </div>
                )}
              </div>

              {/* ── SECTION 3: STATUS & DATES ── */}
              <div className="info-row">
                <div className="info-block">
                  <span className="info-label">Current Status</span>
                  <div><StatusBadge status={donation.verificationStatus || donation.status} /></div>
                </div>
                <div className="info-block">
                  <span className="info-label">Submitted On</span>
                  <span className="info-value">
                    {donation.createdAt
                      ? new Date(donation.createdAt.seconds ? donation.createdAt.seconds * 1000 : donation.createdAt).toLocaleDateString()
                      : 'N/A'}
                  </span>
                </div>
              </div>

              {/* ── SECTION 4: PICKUP / DONOR ADDRESS ── */}
              <div className="info-block divider-top">
                <span className="info-label">📍 Pickup / Donor Address</span>
                <p className="info-value">
                  {resolvedDonorAddress
                    ? formatAddressObj(resolvedDonorAddress)
                    : donation.pickupAddress || donation.location?.address || 'Address not specified'}
                </p>
                {resolvedDonorPhone && (
                  <p className="info-value"><strong>Contact:</strong> {resolvedDonorPhone}</p>
                )}
                {(donation.pickupTime || donation.pickupPreference) && (
                  <p className="info-value"><strong>Preferred Time:</strong> {donation.pickupPreference || donation.pickupTime}</p>
                )}
                {donation.preferredPickupDate && (
                  <p className="info-value"><strong>Preferred Date:</strong> {donation.preferredPickupDate}</p>
                )}
              </div>

              {/* Previous rejection reason */}
              {donation.rejectionReason && (
                <div className="info-block rejection-reason-block">
                  <span className="info-label">Previous Rejection Reason</span>
                  <p className="info-value error-color">{donation.rejectionReason}</p>
                </div>
              )}

              {/* ── SECTION 5: VOLUNTEER INFO (if assigned) ── */}
              {donation.matchedNgoId && (
                <div className="info-block divider-top" style={{ background: '#faf5ff', borderRadius: 8, padding: '10px 12px' }}>
                  <span className="info-label" style={{ fontWeight: '700', color: '#7c3aed' }}>
                    🚴 Assignment Info
                  </span>
                  <p className="info-value"><strong>Matched NGO ID:</strong> {donation.matchedNgoId}</p>
                  {donation.collectionPointId && (
                    <p className="info-value"><strong>Collection Point ID:</strong> {donation.collectionPointId}</p>
                  )}
                </div>
              )}
            </div>

            {/* Image gallery */}
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

          {/* ── NGO + Collection Point Selector (shown when Approve is clicked) ── */}
          {showApproveForm && (
            <div style={{
              marginTop: '20px',
              padding: '20px',
              background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
              borderRadius: '12px',
              border: '1.5px solid #86efac',
            }}>
              <h4 style={{ margin: '0 0 6px', color: '#166534', fontSize: '1rem' }}>
                🏢 Assign NGO & Drop-off Point
              </h4>
              <p style={{ margin: '0 0 14px', color: '#15803d', fontSize: '0.85rem' }}>
                Select the NGO to match this donation to, and optionally a collection point as the drop-off destination.
              </p>

              {/* NGO Dropdown */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: '600', color: '#166534', marginBottom: '6px', fontSize: '0.9rem' }}>
                  NGO <span style={{ color: '#dc2626' }}>*</span>
                </label>
                {ngosLoading ? (
                  <p style={{ color: '#64748b' }}>Loading NGOs...</p>
                ) : ngoProfiles.length === 0 ? (
                  <div style={{ padding: '12px', background: '#fef9c3', borderRadius: '8px', color: '#854d0e', fontSize: '0.875rem' }}>
                    ⚠️ No NGO profiles found. Ask NGOs to complete their profile in the mobile app first.
                  </div>
                ) : (
                  <>
                    <select
                      className="form-input-control"
                      value={selectedNgoId}
                      onChange={(e) => { setSelectedNgoId(e.target.value); setError(null); }}
                    >
                      <option value="">— Choose an NGO —</option>
                      {ngoProfiles.map((ngo) => (
                        <option key={ngo.id} value={ngo.id}>
                          {ngo.ngoName || ngo.name || 'Unnamed NGO'}
                          {ngo.address ? ` — ${ngo.address}` : ''}
                        </option>
                      ))}
                    </select>

                    {selectedNgo && (
                      <div style={{ marginTop: '10px', padding: '12px 14px', background: '#fff', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.875rem', lineHeight: 1.6 }}>
                        <strong style={{ color: '#166534' }}>📍 {selectedNgo.ngoName || selectedNgo.name}</strong><br />
                        <span style={{ color: '#374151' }}>{selectedNgo.address || 'No address on file'}</span><br />
                        {selectedNgo.phone && <span style={{ color: '#6b7280' }}>📞 {selectedNgo.phone}</span>}
                        {selectedNgo.contactPerson && (
                          <span style={{ color: '#6b7280' }}>
                            {selectedNgo.phone ? ' · ' : ''}Contact: {selectedNgo.contactPerson}
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Collection Point Dropdown */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: '600', color: '#166534', marginBottom: '6px', fontSize: '0.9rem' }}>
                  Drop-off Collection Point <span style={{ color: '#6b7280', fontWeight: '400' }}>(optional)</span>
                </label>
                {cpsLoading ? (
                  <p style={{ color: '#64748b' }}>Loading collection points...</p>
                ) : activeCollectionPoints.length === 0 ? (
                  <div style={{ padding: '12px', background: '#fef9c3', borderRadius: '8px', color: '#854d0e', fontSize: '0.875rem' }}>
                    ⚠️ No active collection points. The NGO address will be used as the drop-off location.
                  </div>
                ) : (
                  <>
                    <select
                      className="form-input-control"
                      value={selectedCpId}
                      onChange={(e) => setSelectedCpId(e.target.value)}
                    >
                      <option value="">— Use NGO address as drop-off —</option>
                      {activeCollectionPoints.map((cp) => (
                        <option key={cp.id} value={cp.id}>
                          {cp.name} — {cp.address || 'No address'}
                          {cp.currentCapacity != null && cp.maxCapacity ? ` (${cp.currentCapacity}/${cp.maxCapacity})` : ''}
                        </option>
                      ))}
                    </select>

                    {selectedCp && (
                      <div style={{ marginTop: '10px', padding: '12px 14px', background: '#fff', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.875rem', lineHeight: 1.6 }}>
                        <strong style={{ color: '#166534' }}>📦 {selectedCp.name}</strong><br />
                        <span style={{ color: '#374151' }}>{selectedCp.address || 'No address on file'}</span><br />
                        {selectedCp.acceptedCategories && (
                          <span style={{ color: '#6b7280' }}>
                            Accepts: {(selectedCp.acceptedCategories || selectedCp.acceptedTypes || []).join(', ')}
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => { setShowApproveForm(false); setSelectedNgoId(''); setSelectedCpId(''); setError(null); }}
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

          {/* Rejection Form */}
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

        {/* Footer Actions */}
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
