import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  listenToUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../firebase/firestore';

/**
 * useNotifications — hook for real-time notifications with optimistic UI updates
 * @param {string} userId
 */
export const useNotifications = (userId) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Real-time subscription ──────────────────────────────────
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = listenToUserNotifications(
      userId,
      (data) => {
        setNotifications(data);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message || 'Failed to fetch notifications');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [userId]);

  // ── Derived count of unread notifications ────────────────────
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  // ── Mark single notification as read (Optimistic UI) ─────────
  const markRead = useCallback(async (notificationId) => {
    const prevNotifications = [...notifications];

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );

    try {
      setError(null);
      const { error: markError } = await markNotificationRead(notificationId);
      if (markError) {
        setNotifications(prevNotifications);
        setError(markError);
        return false;
      }
      return true;
    } catch (err) {
      setNotifications(prevNotifications);
      setError(err.message);
      return false;
    }
  }, [notifications]);

  // ── Mark all notifications as read (Optimistic UI) ───────────
  const markAllRead = useCallback(async () => {
    const prevNotifications = [...notifications];

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    try {
      setError(null);
      const { error: markError } = await markAllNotificationsRead(userId);
      if (markError) {
        setNotifications(prevNotifications);
        setError(markError);
        return false;
      }
      return true;
    } catch (err) {
      setNotifications(prevNotifications);
      setError(err.message);
      return false;
    }
  }, [userId, notifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markRead,
    markAllRead,
  };
};

export default useNotifications;
