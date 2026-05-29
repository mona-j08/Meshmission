const { db, messaging, FieldValue } = require('../config');
const { COLLECTIONS } = require('../constants');

/**
 * Saves a notification doc to Firestore. Wrapped in try/catch to never crash the main execution loop.
 */
async function saveNotification(userId, title, body, type, data = {}) {
  try {
    const stringData = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    );

    await db.collection(COLLECTIONS.NOTIFICATIONS).add({
      userId,
      title,
      body,
      type,
      data: stringData,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error(`[notifyHelper:saveNotification] Error saving doc for user ${userId}:`, error.message);
  }
}

/**
 * Sends a high-priority FCM message to a user. Includes stale token cleanup.
 */
async function sendFCMToUser(userId, title, body, data = {}) {
  try {
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(userId).get();
    if (!userDoc.exists) {
      console.log(`[notifyHelper:sendFCMToUser] User ${userId} not found in Firestore.`);
      return;
    }

    const userData = userDoc.data();
    const fcmToken = userData.fcmToken;
    if (!fcmToken) {
      console.log(`[notifyHelper:sendFCMToUser] Silently skipping user ${userId} — no fcmToken registered.`);
      return;
    }

    const stringData = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    );

    try {
      await messaging.send({
        token: fcmToken,
        notification: { title, body },
        data: stringData,
        android: { priority: 'high' },
        apns: { payload: { aps: { 'content-available': 1 } } }
      });
      console.log(`[notifyHelper:sendFCMToUser] Successfully sent FCM message to user ${userId}.`);
    } catch (fcmError) {
      console.error(`[notifyHelper:sendFCMToUser] FCM send error for user ${userId}:`, fcmError.message);
      if (fcmError.code === 'messaging/registration-token-not-registered') {
        console.log(`[notifyHelper:sendFCMToUser] Stale token detected. Cleaning up FCM token for user ${userId}.`);
        await db.collection(COLLECTIONS.USERS).doc(userId).update({
          fcmToken: null,
          fcmTokenUpdatedAt: FieldValue.serverTimestamp(),
        });
      }
    }
  } catch (error) {
    console.error(`[notifyHelper:sendFCMToUser] General error for user ${userId}:`, error.message);
  }
}

/**
 * Fires FCM (non-blocking fire-and-forget) and saves the notification in Firestore.
 */
async function sendFCMAndSave(userId, title, body, type, data = {}) {
  // Fire and forget FCM message so it doesn't block Firestore write
  sendFCMToUser(userId, title, body, data);
  // Wait for Firestore write to complete
  await saveNotification(userId, title, body, type, data);
}

/**
 * Queries all users with role 'admin' and broadcasts alerts via Promise.allSettled.
 */
async function sendToAllAdmins(title, body, type, data = {}) {
  try {
    const adminsSnap = await db.collection(COLLECTIONS.USERS)
      .where('role', '==', 'admin')
      .get();

    if (adminsSnap.empty) {
      console.log('[notifyHelper:sendToAllAdmins] No admins found in database.');
      return;
    }

    const promises = adminsSnap.docs.map((docSnap) =>
      sendFCMAndSave(docSnap.id, title, body, type, data)
    );

    await Promise.allSettled(promises);
  } catch (error) {
    console.error('[notifyHelper:sendToAllAdmins] Broadcast failure:', error.message);
  }
}

/**
 * Queries all active volunteers and broadcasts FCM alerts via Promise.allSettled.
 */
async function sendToAllActiveVolunteers(title, body, type, data = {}) {
  try {
    const volunteersSnap = await db.collection(COLLECTIONS.VOLUNTEERS)
      .where('isActive', '==', true)
      .get();

    if (volunteersSnap.empty) {
      console.log('[notifyHelper:sendToAllActiveVolunteers] No active volunteers found.');
      return 0;
    }

    const promises = volunteersSnap.docs.map((docSnap) =>
      sendFCMToUser(docSnap.id, title, body, data)
    );

    const results = await Promise.allSettled(promises);
    const notifiedCount = results.filter((res) => res.status === 'fulfilled').length;
    return notifiedCount;
  } catch (error) {
    console.error('[notifyHelper:sendToAllActiveVolunteers] Broadcast failure:', error.message);
    return 0;
  }
}

module.exports = {
  saveNotification,
  sendFCMToUser,
  sendFCMAndSave,
  sendToAllAdmins,
  sendToAllActiveVolunteers,
};
