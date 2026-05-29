import { useState, useEffect, useCallback } from 'react';
import {
  getCollectionPoints,
  createCollectionPoint,
  updateCollectionPoint,
  updateCollectionPointLoad,
  deactivateCollectionPoint,
} from '../firebase/firestore';

/**
 * useCollectionPoints — hook for fetching and managing donation drop-off collection points.
 * Implements a single fetch on mount, with optimistic UI updates for writes.
 */
export const useCollectionPoints = () => {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Fetch once on mount ──────────────────────────────────────
  const fetchPoints = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchErr } = await getCollectionPoints();
      if (fetchErr) {
        setError(fetchErr);
      } else {
        setPoints(data || []);
        setError(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPoints();
  }, [fetchPoints]);

  // ── Create Collection Point (Optimistic/Local State Update) ──
  const createPoint = useCallback(async (pointData) => {
    try {
      setError(null);
      const { id, error: createErr } = await createCollectionPoint(pointData);
      if (createErr) {
        setError(createErr);
        return null;
      }

      const newPoint = {
        id,
        isActive: true,
        currentOccupancy: 0,
        ...pointData,
      };

      setPoints((prev) => [...prev, newPoint]);
      return id;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  // ── Update Collection Point (Optimistic UI) ─────────────────
  const updatePoint = useCallback(async (pointId, updates) => {
    const prevPoints = [...points];

    // Optimistic Update
    setPoints((prev) =>
      prev.map((p) => (p.id === pointId ? { ...p, ...updates } : p))
    );

    try {
      setError(null);
      const { error: updateErr } = await updateCollectionPoint(pointId, updates);
      if (updateErr) {
        setPoints(prevPoints);
        setError(updateErr);
        return false;
      }
      return true;
    } catch (err) {
      setPoints(prevPoints);
      setError(err.message);
      return false;
    }
  }, [points]);

  // ── Update Current Occupancy/Load (Optimistic UI) ───────────
  const updateLoad = useCallback(async (pointId, currentLoad) => {
    const prevPoints = [...points];

    // Optimistic Update
    setPoints((prev) =>
      prev.map((p) => (p.id === pointId ? { ...p, currentOccupancy: currentLoad } : p))
    );

    try {
      setError(null);
      const { error: loadErr } = await updateCollectionPointLoad(pointId, currentLoad);
      if (loadErr) {
        setPoints(prevPoints);
        setError(loadErr);
        return false;
      }
      return true;
    } catch (err) {
      setPoints(prevPoints);
      setError(err.message);
      return false;
    }
  }, [points]);

  // ── Deactivate Collection Point (Optimistic UI) ──────────────
  const deactivatePoint = useCallback(async (pointId) => {
    const prevPoints = [...points];

    // Optimistic Update (remove from active list)
    setPoints((prev) => prev.filter((p) => p.id !== pointId));

    try {
      setError(null);
      const { error: deactivateErr } = await deactivateCollectionPoint(pointId);
      if (deactivateErr) {
        setPoints(prevPoints);
        setError(deactivateErr);
        return false;
      }
      return true;
    } catch (err) {
      setPoints(prevPoints);
      setError(err.message);
      return false;
    }
  }, [points]);

  return {
    points,
    loading,
    error,
    createPoint,
    updatePoint,
    updateLoad,
    deactivatePoint,
    refreshPoints: fetchPoints,
  };
};

export default useCollectionPoints;
