import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  subscribeToVolunteerTasks,
  subscribeToOpenTasks,
  updatePickupTask,
  getVolunteerTasksPaginated,
} from '../firebase/firestore';
import { PICKUP_TASK_STATUS } from '../constants/status';

/**
 * Helper — check if a Firestore timestamp falls on today.
 */
const isToday = (timestamp) => {
  if (!timestamp) return false;
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

/**
 * Helper — check if a timestamp is within the current week (Mon–Sun).
 */
const isThisWeek = (timestamp) => {
  if (!timestamp) return false;
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0
  startOfWeek.setDate(now.getDate() - diff);
  startOfWeek.setHours(0, 0, 0, 0);
  return date >= startOfWeek && date <= now;
};

/**
 * useTasks — real-time pickup tasks and Open Market tasks for a volunteer.
 * @param {string} volunteerId
 */
export const useTasks = (volunteerId) => {
  const [tasks, setTasks] = useState([]);
  const [openTasks, setOpenTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Open Market subscription ────────────────────────────────
  useEffect(() => {
    const unsubscribe = subscribeToOpenTasks(
      (data) => {
        setOpenTasks(data);
      },
      (err) => {
        console.warn('[useTasks] Failed to fetch open tasks:', err);
      }
    );
    return unsubscribe;
  }, []);

  // ── Volunteer Tasks subscription ────────────────────────────
  useEffect(() => {
    if (!volunteerId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToVolunteerTasks(
      volunteerId,
      (data) => {
        setTasks(data);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message || 'Failed to fetch tasks');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [volunteerId]);

  // ── Pagination logic ─────────────────────────────────────────
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchMore = useCallback(async () => {
    if (!hasMore || loading) return;
    setLoading(true);
    const { data, lastDoc: newLastDoc, error: fetchErr } = await getVolunteerTasksPaginated(volunteerId, 10, lastDoc);
    if (fetchErr) {
      setError(fetchErr);
    } else {
      if (data.length < 10) setHasMore(false);
      setLastDoc(newLastDoc);
      setTasks((prev) => {
        const existingIds = new Set(prev.map(t => t.id));
        const newItems = data.filter(t => !existingIds.has(t.id));
        return [...prev, ...newItems];
      });
    }
    setLoading(false);
  }, [volunteerId, lastDoc, hasMore, loading]);

  // ── Derived Memos ────────────────────────────────────────────
  const activeTasks = useMemo(() => {
    return tasks.filter(
      (t) =>
        t.status !== PICKUP_TASK_STATUS.DECLINED &&
        t.status !== PICKUP_TASK_STATUS.COMPLETED
    );
  }, [tasks]);

  const completedTasks = useMemo(() => {
    return tasks.filter((t) => t.status === PICKUP_TASK_STATUS.COMPLETED);
  }, [tasks]);

  const stats = useMemo(() => {
    const todaysTasks = tasks.filter((t) => isToday(t.createdAt)).length;
    const completedThisWeek = tasks.filter(
      (t) =>
        t.status === PICKUP_TASK_STATUS.COMPLETED && isThisWeek(t.completedAt || t.updatedAt)
    ).length;
    const active = activeTasks.length;

    return { todaysTasks, completedThisWeek, active };
  }, [tasks, activeTasks]);

  // ── Accept Task (with Optimistic UI and Rollback) ────────────
  const acceptTask = useCallback(async (taskId) => {
    const prevTasks = [...tasks];
    const prevOpenTasks = [...openTasks];

    // Optimistically update local states
    setTasks((prev) => {
      const match = prev.find((t) => t.id === taskId);
      if (match) {
        return prev.map((t) => (t.id === taskId ? { ...t, status: PICKUP_TASK_STATUS.ACCEPTED } : t));
      }
      // If accepting from open market, add to tasks list
      const openMatch = openTasks.find((t) => t.id === taskId);
      if (openMatch) {
        return [{ ...openMatch, status: PICKUP_TASK_STATUS.ACCEPTED, volunteerId }, ...prev];
      }
      return prev;
    });

    setOpenTasks((prev) => prev.filter((t) => t.id !== taskId));

    try {
      setError(null);
      const { error: updateError } = await updatePickupTask(taskId, {
        status: PICKUP_TASK_STATUS.ACCEPTED,
        volunteerId,
      });

      if (updateError) {
        // Rollback on error
        setTasks(prevTasks);
        setOpenTasks(prevOpenTasks);
        setError(updateError);
        return false;
      }
      return true;
    } catch (err) {
      // Rollback on error
      setTasks(prevTasks);
      setOpenTasks(prevOpenTasks);
      setError(err.message);
      return false;
    }
  }, [volunteerId, tasks, openTasks]);

  // ── Decline Task (with Optimistic UI and Rollback) ────────────
  const declineTask = useCallback(async (taskId) => {
    const prevTasks = [...tasks];

    // Optimistically set task to DECLINED locally
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: PICKUP_TASK_STATUS.DECLINED } : t))
    );

    try {
      setError(null);
      const { error: updateError } = await updatePickupTask(taskId, {
        status: PICKUP_TASK_STATUS.DECLINED,
      });

      if (updateError) {
        setTasks(prevTasks);
        setError(updateError);
        return false;
      }
      return true;
    } catch (err) {
      setTasks(prevTasks);
      setError(err.message);
      return false;
    }
  }, [tasks]);



  const acceptMultipleTasks = useCallback(async (taskIds) => {
    const prevTasks = [...tasks];
    const prevOpenTasks = [...openTasks];

    // Optimistic UI updates
    setTasks((prev) => {
      let updated = [...prev];
      taskIds.forEach((id) => {
        const match = updated.find((t) => t.id === id);
        if (match) {
          updated = updated.map((t) => (t.id === id ? { ...t, status: PICKUP_TASK_STATUS.ACCEPTED } : t));
        } else {
          const openMatch = openTasks.find((t) => t.id === id);
          if (openMatch) {
            updated.unshift({ ...openMatch, status: PICKUP_TASK_STATUS.ACCEPTED, volunteerId });
          }
        }
      });
      return updated;
    });

    setOpenTasks((prev) => prev.filter((t) => !taskIds.includes(t.id)));

    try {
      setError(null);
      await Promise.all(
        taskIds.map((id) =>
          updatePickupTask(id, {
            status: PICKUP_TASK_STATUS.ACCEPTED,
            volunteerId,
          })
        )
      );
      return true;
    } catch (err) {
      setTasks(prevTasks);
      setOpenTasks(prevOpenTasks);
      setError(err.message);
      return false;
    }
  }, [volunteerId, tasks, openTasks]);

  return {
    tasks,
    openTasks,
    activeTasks,
    completedTasks,
    stats,
    loading,
    error,
    acceptTask,
    declineTask,
    fetchMore,
    hasMore,
    acceptMultipleTasks,
  };
};

export default useTasks;
