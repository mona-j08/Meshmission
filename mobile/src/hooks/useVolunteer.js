import { useState, useEffect, useCallback } from 'react';
import {
  listenToVolunteerProfile,
  updateVolunteerProfile,
  createVolunteerProfile,
} from '../firebase/firestore';

/**
 * useVolunteer — real-time profile management hook for a volunteer.
 * @param {string} volunteerId
 */
export const useVolunteer = (volunteerId) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Real-time Volunteer Profile Listener ────────────────────
  useEffect(() => {
    if (!volunteerId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = listenToVolunteerProfile(
      volunteerId,
      (data) => {
        setProfile(data);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message || 'Failed to fetch volunteer profile');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [volunteerId]);

  // ── Save / Update Profile ──────────────────────────────────
  const saveProfile = useCallback(
    async (data) => {
      try {
        setError(null);
        let saveError;
        
        if (profile) {
          const { error: updateErr } = await updateVolunteerProfile(volunteerId, data);
          saveError = updateErr;
        } else {
          const { error: createErr } = await createVolunteerProfile(volunteerId, data);
          saveError = createErr;
        }

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
    [volunteerId, profile]
  );

  return {
    profile,
    loading,
    error,
    saveProfile,
  };
};

export default useVolunteer;
