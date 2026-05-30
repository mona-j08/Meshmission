import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  subscribeToDonorDonations,
  createDonation,
  getDonorDonationsPaginated,
  updateDonation,
} from '../firebase/firestore';
import { uploadDonationImages } from '../firebase/storage';
import { compressImages } from '../utils/imageCompressor';
import { DONATION_STATUS } from '../constants/status';

/**
 * useDonations — real-time donation list + submission for a donor.
 * @param {string} donorId
 */
export const useDonations = (donorId) => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Real-time subscription ──────────────────────────────────
  useEffect(() => {
    if (!donorId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToDonorDonations(
      donorId,
      (data) => {
        setDonations(data);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message || 'Failed to fetch donations');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [donorId]);

  // ── Pagination logic ─────────────────────────────────────────
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchMore = useCallback(async () => {
    if (!hasMore || loading) return;
    setLoading(true);
    const { data, lastDoc: newLastDoc, error: fetchErr } = await getDonorDonationsPaginated(donorId, 10, lastDoc);
    if (fetchErr) {
      setError(fetchErr);
    } else {
      if (data.length < 10) setHasMore(false);
      setLastDoc(newLastDoc);
      setDonations((prev) => {
        const existingIds = new Set(prev.map(d => d.id));
        const newItems = data.filter(d => !existingIds.has(d.id));
        return [...prev, ...newItems];
      });
    }
    setLoading(false);
  }, [donorId, lastDoc, hasMore, loading]);

  // ── Derived filtered donation lists ──────────────────────────
  const pendingDonations = useMemo(() => {
    return donations.filter(
      (d) => d.status === DONATION_STATUS.UPLOADED || d.status === DONATION_STATUS.PENDING
    );
  }, [donations]);

  const approvedDonations = useMemo(() => {
    return donations.filter((d) => d.status === DONATION_STATUS.APPROVED);
  }, [donations]);

  const deliveredDonations = useMemo(() => {
    return donations.filter((d) => d.status === DONATION_STATUS.DELIVERED);
  }, [donations]);

  // ── Backward-compatible stats object ──────────────────────────
  const stats = useMemo(() => {
    const total = donations.length;
    const pending = pendingDonations.length;
    const approved = approvedDonations.length;
    const delivered = deliveredDonations.length;

    return { total, pending, approved, delivered };
  }, [donations, pendingDonations, approvedDonations, deliveredDonations]);

  // ── Submit a new donation ───────────────────────────────────
  const submitDonation = useCallback(
    async (donationData, imageUris, onProgress) => {
      try {
        setError(null);

        // 1. Compress images
        const { uris: compressedUris, error: compressError } =
          await compressImages(imageUris);
        if (compressError) {
          console.warn('Image compression warning:', compressError);
        }

        // 2. Create donation doc first to get an ID
        const { id: donationId, error: createError } = await createDonation({
          ...donationData,
          donorId,
          status: DONATION_STATUS.UPLOADED,
          images: [],
        });

        if (createError) {
          setError(createError);
          return null;
        }

        // 3. Upload compressed images
        const { urls, error: uploadError } = await uploadDonationImages(
          compressedUris,
          donationId,
          donorId,
          onProgress
        );

        if (uploadError) {
          setError(uploadError);
          return donationId; // Doc exists but images incomplete
        }

        // 4. Update donation with image URLs
        const { error: updateError } = await updateDonation(donationId, {
          images: urls,
          status: DONATION_STATUS.PENDING,
        });

        if (updateError) {
          setError(updateError);
        }

        return donationId;
      } catch (err) {
        console.error('[submitDonation] Error:', err.message);
        setError(err.message);
        return { error: err.message };
      }
    },
    [donorId]
  );

  return {
    donations,
    stats,
    pendingDonations,
    approvedDonations,
    deliveredDonations,
    loading,
    error,
    submitDonation,
    fetchMore,
    hasMore,
  };
};

export default useDonations;
