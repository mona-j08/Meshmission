import { useState, useEffect, useCallback } from 'react';
import {
  listenToNGOProfile,
  updateNGOProfile,
  createOrUpdateNGOProfile,
  subscribeToNGORequirements,
  createRequirement as createReq,
  updateRequirement as updateReq,
  deleteRequirement as deleteReq,
  subscribeToNGODeliveries,
  confirmDelivery as confirmDeliveryFn,
} from '../firebase/firestore';

/**
 * useNGO — triple real-time profile, requirements CRUD, and deliveries for an NGO.
 * @param {string} ngoId
 */
export const useNGO = (ngoId) => {
  const [profile, setProfile] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── NGO Profile Listener ───────────────────────────────────
  useEffect(() => {
    if (!ngoId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = listenToNGOProfile(
      ngoId,
      (data) => {
        setProfile(data);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message || 'Failed to load NGO profile');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [ngoId]);

  // ── NGO Requirements Listener ──────────────────────────────
  useEffect(() => {
    if (!ngoId) return;

    const unsubscribe = subscribeToNGORequirements(
      ngoId,
      (data) => {
        setRequirements(data);
        setError(null);
      },
      (err) => {
        setError(err.message || 'Failed to fetch requirements');
      }
    );

    return unsubscribe;
  }, [ngoId]);

  // ── NGO Deliveries Listener ────────────────────────────────
  useEffect(() => {
    if (!ngoId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToNGODeliveries(
      ngoId,
      (data) => {
        setDeliveries(data);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message || 'Failed to fetch NGO deliveries');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [ngoId]);

  // ── Save / Update Profile ──────────────────────────────────
  const saveProfile = useCallback(
    async (data) => {
      try {
        setError(null);
        const { error: saveError } = await createOrUpdateNGOProfile(ngoId, data);
        if (saveError) {
          setError(saveError);
          return false;
        }
        return true;
      } catch (err) {
        setError(err.message);
        return false;
      }
    },
    [ngoId]
  );

  // ── Requirements CRUD ───────────────────────────────────────
  const addRequirement = useCallback(
    async (data) => {
      try {
        setError(null);
        const { id, error: createError } = await createReq({
          ...data,
          ngoId,
        });
        if (createError) {
          setError(createError);
          return null;
        }
        return id;
      } catch (err) {
        setError(err.message);
        return null;
      }
    },
    [ngoId]
  );

  const updateRequirement = useCallback(async (requirementId, data) => {
    try {
      setError(null);
      const { error: updateError } = await updateReq(requirementId, data);
      if (updateError) {
        setError(updateError);
        return false;
      }
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, []);

  const deleteRequirement = useCallback(async (requirementId) => {
    try {
      setError(null);
      const { error: deleteError } = await deleteReq(requirementId);
      if (deleteError) {
        setError(deleteError);
        return false;
      }
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, []);

  // ── Confirm Delivery Receipt ────────────────────────────────
  const confirmDelivery = useCallback(async (deliveryId) => {
    try {
      setError(null);
      const { error: deliveryError } = await confirmDeliveryFn(deliveryId);
      if (deliveryError) {
        setError(deliveryError);
        return false;
      }
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, []);

  return {
    profile,
    requirements,
    deliveries,
    loading,
    error,
    saveProfile,
    addRequirement,
    updateRequirement,
    deleteRequirement,
    confirmDelivery,
  };
};

export default useNGO;
