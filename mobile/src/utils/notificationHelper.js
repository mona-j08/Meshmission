import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { updateUserProfile } from '../firebase/firestore';

/**
 * Configure notification handling
 */
export const configureNotifications = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
};

/**
 * Register for push notifications and save FCM token
 * @param {string} userId - Current user ID
 */
export const registerForPushNotifications = async (userId) => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return { token: null, error: 'Push notification permission denied' };
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    // Save token to user profile
    if (userId && token) {
      await updateUserProfile(userId, { fcmToken: token });
    }

    // Set up Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    return { token, error: null };
  } catch (error) {
    return { token: null, error: error.message };
  }
};

/**
 * Add notification response listener
 * @param {function} handler - Callback when notification is tapped
 * @returns {Subscription}
 */
export const addNotificationResponseListener = (handler) => {
  return Notifications.addNotificationResponseReceivedListener(handler);
};

/**
 * Add notification received listener
 * @param {function} handler - Callback when notification arrives
 * @returns {Subscription}
 */
export const addNotificationReceivedListener = (handler) => {
  return Notifications.addNotificationReceivedListener(handler);
};
