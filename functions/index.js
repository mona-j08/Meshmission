/**
 * MeshMission — Firebase Cloud Functions
 *
 * This file is completely rewritten to secure, optimize, and streamline MeshMission's
 * server-side triggers, scheduler, callable verification, and impact analytics.
 */

const { onCall, HttpsError, onRequest } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { z } = require('zod');
const crypto = require('crypto');

const { db, auth, FieldValue, Timestamp } = require('./src/config');
const {
  COLLECTIONS,
  DONATION_STATUS,
  TASK_STATUS,
  DELIVERY_STATUS,
  REQUIREMENT_STATUS,
  USER_ROLES,
  NOTIFICATION_TYPES,
} = require('./src/constants');
const {
  sendFCMAndSave,
  sendToAllAdmins,
  sendToAllActiveVolunteers,
  sendFCMToUser,
} = require('./src/helpers/notifyHelper');
const { runMatchingEngine } = require('./src/helpers/matchingEngine');

// ── INPUT VALIDATION SCHEMAS ─────────────────────────────────

const SetUserRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum([USER_ROLES.DONOR, USER_ROLES.VOLUNTEER, USER_ROLES.NGO, USER_ROLES.ADMIN]),
});

const GenerateOTPSchema = z.object({
  taskId: z.string().min(1),
});

const VerifyOTPSchema = z.object({
  taskId: z.string().min(1),
  otp: z.string().length(6).regex(/^\d+$/),
});

// ── TEMPORARY CUSTOM CLAIM BOOTSTRAPPER ─────────────────────────

exports.tempSetAdmin = onRequest(async (req, res) => {
  try {
    const user = await auth.getUserByEmail('kamachisundar073@gmail.com');
    await auth.setCustomUserClaims(user.uid, { role: 'admin' });
    await db.collection(COLLECTIONS.USERS).doc(user.uid).set({
      userId: user.uid,
      role: 'admin',
      name: 'System Admin',
      email: user.email,
      isActive: true,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    res.status(200).send(`Successfully set 'admin' custom claim for ${user.email} (UID: ${user.uid}). You can now safely delete the tempSetAdmin block from index.js!`);
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
});

// ── CALLABLE ENDPOINTS ───────────────────────────────────────

/**
 * Set user role custom claims and Firestore profile status.
 */
exports.setUserRole = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated.');
  }

  const parsed = SetUserRoleSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', 'Invalid arguments: ' + parsed.error.message);
  }
  const { userId, role } = parsed.data;

  try {
    const userRef = db.collection(COLLECTIONS.USERS).doc(userId);
    const userSnap = await userRef.get();
    const existingRole = userSnap.exists ? userSnap.data().role : null;

    const callerUid = request.auth.uid;
    const isCallerAdmin = request.auth.token.role === 'admin';
    const isSelfFirstRegistration = (callerUid === userId && !existingRole);

    // Security check: must be admin or self during first registration
    if (!isCallerAdmin && !isSelfFirstRegistration) {
      throw new HttpsError('permission-denied', 'Unauthorized. Only admins can manage roles.');
    }

    // Set custom claims
    await auth.setCustomUserClaims(userId, { role });

    // Update Firestore User Document
    await userRef.set({
      role,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return { success: true };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error('[setUserRole] Failed:', error.message);
    throw new HttpsError('internal', error.message);
  }
});

/**
 * Generates an OTP when volunteer arrives at donor drop-off location.
 * Secure: OTP value is saved strictly in DB and notified ONLY to donor FCM.
 */
exports.generatePickupOTP = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated.');
  }

  const parsed = GenerateOTPSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', 'Invalid taskId.');
  }
  const { taskId } = parsed.data;

  try {
    const taskRef = db.collection(COLLECTIONS.PICKUP_TASKS).doc(taskId);
    const taskSnap = await taskRef.get();
    if (!taskSnap.exists) {
      throw new HttpsError('not-found', 'Task not found.');
    }

    const taskData = taskSnap.data();

    // Security check: must be the assigned volunteer
    if (taskData.volunteerId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Unauthorized. Task is not assigned to you.');
    }

    // Task must be in accepted status
    if (taskData.status !== TASK_STATUS.ACCEPTED) {
      throw new HttpsError('failed-precondition', 'Task must be accepted before generating OTP.');
    }

    // Rate-limiting check: max 3 per hour
    const now = Date.now();
    const lastGeneratedAt = taskData.lastOtpGeneratedAt ? taskData.lastOtpGeneratedAt.toDate().getTime() : 0;
    let count = taskData.otpGenerationCount || 0;

    if (now - lastGeneratedAt < 3600000) {
      if (count >= 3) {
        throw new HttpsError('resource-exhausted', 'Maximum OTP generations reached for this hour. Please try again later.');
      }
      count += 1;
    } else {
      count = 1;
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Valid 10 mins

    // Write OTP to DB (Secure: Admin write only)
    await taskRef.update({
      otp,
      otpExpiresAt: Timestamp.fromDate(expiresAt),
      otpAttempts: 0,
      otpGenerationCount: count,
      lastOtpGeneratedAt: FieldValue.serverTimestamp(),
      status: TASK_STATUS.OTP_SENT,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Notify Donor FCM with the OTP (Secure: Not returned to caller client)
    await sendFCMAndSave(
      taskData.donorId,
      'Pickup Verification Code',
      `Your one-time code is: ${otp} — valid 10 min`,
      NOTIFICATION_TYPES.OTP,
      { taskId }
    );

    return { success: true };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error('[generatePickupOTP] Failed:', error.message);
    throw new HttpsError('internal', error.message);
  }
});

/**
 * Verifies OTP entered by volunteer. Locks task on 3 invalid attempts.
 */
exports.verifyPickupOTP = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated.');
  }

  const parsed = VerifyOTPSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', 'Invalid inputs.');
  }
  const { taskId, otp } = parsed.data;

  try {
    const taskRef = db.collection(COLLECTIONS.PICKUP_TASKS).doc(taskId);
    const taskSnap = await taskRef.get();
    if (!taskSnap.exists) {
      throw new HttpsError('not-found', 'Task not found.');
    }

    const taskData = taskSnap.data();

    // Security check: must be the assigned volunteer
    if (taskData.volunteerId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Unauthorized. Task is not assigned to you.');
    }

    // Lockout check
    const attempts = (taskData.otpAttempts || 0) + 1;
    if (attempts > 3 || taskData.status === 'locked') {
      await taskRef.update({ status: 'locked', otpAttempts: attempts });
      await sendToAllAdmins(
        '🚨 Task Locked — OTP Attempts Exceeded',
        `Task ${taskId} has been locked after 3 failed OTP attempts.`,
        NOTIFICATION_TYPES.ASSIGNMENT,
        { taskId }
      );
      throw new HttpsError('resource-exhausted', 'Maximum OTP attempts exceeded. Task locked.');
    }

    if (!taskData.otp) {
      throw new HttpsError('failed-precondition', 'OTP not yet generated for this task.');
    }

    // Expiry check
    const expiresAt = taskData.otpExpiresAt ? taskData.otpExpiresAt.toDate() : new Date(0);
    if (expiresAt < new Date()) {
      throw new HttpsError('deadline-exceeded', 'OTP expired. Please generate a new one.');
    }

    // Verification check
    if (otp !== taskData.otp) {
      await taskRef.update({ otpAttempts: attempts });
      const remaining = 3 - attempts;
      if (remaining === 0) {
        await taskRef.update({ status: 'locked' });
        await sendToAllAdmins(
          '🚨 Task Locked — OTP Attempts Exceeded',
          `Task ${taskId} has been locked after 3 failed OTP attempts.`,
          NOTIFICATION_TYPES.ASSIGNMENT,
          { taskId }
        );
        throw new HttpsError('resource-exhausted', 'Maximum OTP attempts exceeded. Task locked.');
      }
      throw new HttpsError('invalid-argument', `Wrong OTP. ${remaining} attempt(s) left.`);
    }

    // SUCCESS TRANSITION — Batch write updates
    const batch = db.batch();

    batch.update(taskRef, {
      otpVerified: true,
      status: TASK_STATUS.COMPLETED,
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const donationIds = taskData.donationIds || [];
    for (const donationId of donationIds) {
      const donRef = db.collection(COLLECTIONS.DONATIONS).doc(donationId);
      batch.update(donRef, {
        status: DONATION_STATUS.OTP_VERIFIED,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    // Notify Donor
    await sendFCMAndSave(
      taskData.donorId,
      'Item Picked Up ✅',
      'Your donation has been collected by the volunteer.',
      NOTIFICATION_TYPES.PICKUP_COMPLETE,
      { taskId }
    );

    return { success: true, verified: true };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error('[verifyPickupOTP] Failed:', error.message);
    throw new HttpsError('internal', error.message);
  }
});

/**
 * Admin proxy to trigger requirement alerts to all active volunteers.
 */
exports.sendEmergencyAlert = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated.');
  }

  // Security check: caller must have admin role
  if (request.auth.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only administrators can broadcast emergency alerts.');
  }

  const { requirementId } = request.data;
  if (!requirementId) {
    throw new HttpsError('invalid-argument', 'Missing requirementId.');
  }

  try {
    const reqSnap = await db.collection(COLLECTIONS.NGO_REQUIREMENTS).doc(requirementId).get();
    if (!reqSnap.exists) {
      throw new HttpsError('not-found', 'Requirement not found.');
    }
    const reqData = reqSnap.data();

    const ngoSnap = await db.collection(COLLECTIONS.NGO_PROFILES).doc(reqData.ngoId).get();
    const ngoName = ngoSnap.exists ? ngoSnap.data().ngoName : 'An NGO';

    const count = await sendToAllActiveVolunteers(
      '🚨 Emergency community Need',
      `${ngoName} urgently needs ${reqData.category} items.`,
      NOTIFICATION_TYPES.EMERGENCY,
      { requirementId }
    );

    return { success: true, count };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error('[sendEmergencyAlert] Failed:', error.message);
    throw new HttpsError('internal', error.message);
  }
});

/**
 * Proxy callable for admin to notify donor of donation approval.
 */
exports.notifyDonorApproval = onCall(async (request) => {
  if (!request.auth || request.auth.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Unauthorized access.');
  }

  const { donationId } = request.data;
  try {
    const donSnap = await db.collection(COLLECTIONS.DONATIONS).doc(donationId).get();
    if (!donSnap.exists) throw new HttpsError('not-found', 'Donation not found.');
    const donData = donSnap.data();

    await sendFCMAndSave(
      donData.donorId,
      '🎉 Donation Approved!',
      `Your ${donData.category} item has been verified.`,
      NOTIFICATION_TYPES.APPROVAL,
      { donationId }
    );
    return { success: true };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error.message);
  }
});

/**
 * Proxy callable for admin to notify donor of donation rejection.
 */
exports.notifyDonorRejection = onCall(async (request) => {
  if (!request.auth || request.auth.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Unauthorized access.');
  }

  const { donationId, reason } = request.data;
  try {
    const donSnap = await db.collection(COLLECTIONS.DONATIONS).doc(donationId).get();
    if (!donSnap.exists) throw new HttpsError('not-found', 'Donation not found.');
    const donData = donSnap.data();

    await sendFCMAndSave(
      donData.donorId,
      'Donation Update',
      `Not approved. Reason: ${reason}`,
      NOTIFICATION_TYPES.REJECTION,
      { donationId, reason }
    );
    return { success: true };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error.message);
  }
});

/**
 * Proxy callable to manually execute the matching engine for a donation.
 */
exports.triggerMatchingEngine = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated.');
  }

  const { donationId } = request.data;
  try {
    const match = await runMatchingEngine(donationId);
    return { success: true, match };
  } catch (error) {
    throw new HttpsError('internal', error.message);
  }
});

/**
 * Proxy callable to notify volunteer of a newly assigned pickup task.
 */
exports.notifyVolunteerAssigned = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated.');
  }

  const { taskId } = request.data;
  try {
    const taskSnap = await db.collection(COLLECTIONS.PICKUP_TASKS).doc(taskId).get();
    if (!taskSnap.exists) throw new HttpsError('not-found', 'Task not found.');
    const taskData = taskSnap.data();

    await sendFCMAndSave(
      taskData.volunteerId,
      'New Pickup Task Assigned 📋',
      'A volunteer task has been assigned to you.',
      NOTIFICATION_TYPES.ASSIGNMENT,
      { taskId }
    );
    return { success: true };
  } catch (error) {
    throw new HttpsError('internal', error.message);
  }
});

// ── FIRESTORE TRIGGERS ───────────────────────────────────────

/**
 * Trigger: onCreate on donations/{donationId}
 * Notifies all admins when a new donation is submitted for verification.
 */
exports.onDonationCreated = onDocumentCreated('donations/{donationId}', async (event) => {
  const donation = event.data.data();
  const donationId = event.params.donationId;

  try {
    await sendToAllAdmins(
      '📦 New Donation Submitted',
      `A new donation of category ${donation.category} is pending verification.`,
      NOTIFICATION_TYPES.NEW_DONATION,
      { donationId }
    );
  } catch (error) {
    console.error('[triggers:onDonationCreated] Error:', error.message);
  }
});

/**
 * Trigger: onUpdate on donations/{donationId}
 * Detects status changes and updates donor alerts + matches NGOs + tracks global impact.
 */
exports.onDonationStatusChanged = onDocumentUpdated('donations/{donationId}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  const donationId = event.params.donationId;

  // Loop Protection: Exit if status has not changed
  if (before.status === after.status) return null;

  try {
    const category = after.category;
    const donorId = after.donorId;

    if (before.status === DONATION_STATUS.PENDING && after.status === DONATION_STATUS.APPROVED) {
      try {
        await runMatchingEngine(donationId);
      } catch (matchErr) {
        console.error('[triggers:onDonationStatusChanged] Match failed:', matchErr.message);
      }
      await sendFCMAndSave(
        donorId,
        '🎉 Donation Approved!',
        `Your ${category} item has been verified.`,
        NOTIFICATION_TYPES.APPROVAL,
        { donationId }
      );
    } else if (before.status === DONATION_STATUS.PENDING && after.status === DONATION_STATUS.REJECTED) {
      const reason = after.rejectionReason || 'No reason provided';
      await sendFCMAndSave(
        donorId,
        'Donation Update',
        `Not approved. Reason: ${reason}`,
        NOTIFICATION_TYPES.REJECTION,
        { donationId, reason }
      );
    } else if (after.status === DONATION_STATUS.ASSIGNED) {
      await sendFCMAndSave(
        donorId,
        '🙌 Volunteer Assigned',
        'A volunteer will collect your donation soon.',
        NOTIFICATION_TYPES.ASSIGNMENT,
        { donationId }
      );
    } else if (after.status === DONATION_STATUS.IN_TRANSIT) {
      await sendFCMAndSave(
        donorId,
        '🚗 Item In Transit',
        'Your donation is on its way to the NGO.',
        NOTIFICATION_TYPES.IN_TRANSIT,
        { donationId }
      );
    } else if (after.status === DONATION_STATUS.DELIVERED) {
      await updateImpactStats(after, donationId);
      await sendFCMAndSave(
        donorId,
        '✨ You Made an Impact!',
        `Your ${category} item reached those who need it.`,
        NOTIFICATION_TYPES.DELIVERY,
        { donationId }
      );
    }
  } catch (error) {
    console.error('[triggers:onDonationStatusChanged] Error:', error.message);
  }
});

/**
 * Trigger: onUpdate on pickup_tasks/{taskId}
 * Detects status changes and updates donor of assignments / decline notifications.
 */
exports.onTaskStatusChanged = onDocumentUpdated('pickup_tasks/{taskId}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  const taskId = event.params.taskId;

  // Loop Protection: Exit if status did not change
  if (before.status === after.status) return null;

  try {
    if (after.status === TASK_STATUS.ACCEPTED) {
      await sendFCMAndSave(
        after.donorId,
        '🚗 Volunteer On The Way!',
        'Your pickup has been confirmed by the volunteer.',
        NOTIFICATION_TYPES.ASSIGNMENT,
        { taskId }
      );
    } else if (after.status === TASK_STATUS.DECLINED) {
      await sendToAllAdmins(
        '⚠️ Task Declined',
        'A pickup task was declined and needs reassignment.',
        NOTIFICATION_TYPES.TASK_DECLINED,
        { taskId }
      );
    }
  } catch (error) {
    console.error('[triggers:onTaskStatusChanged] Error:', error.message);
  }
});

/**
 * Trigger: onUpdate on deliveries/{deliveryId}
 * Detects status changes and notifies NGO on completion.
 */
exports.onDeliveryStatusChanged = onDocumentUpdated('deliveries/{deliveryId}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  const deliveryId = event.params.deliveryId;

  // Loop Protection: Exit if status did not change
  if (before.status === after.status) return null;

  try {
    if (after.status === DELIVERY_STATUS.DELIVERED) {
      await sendFCMAndSave(
        after.ngoId,
        '✅ Delivery Confirmed',
        `${after.items?.length || 0} items received successfully.`,
        NOTIFICATION_TYPES.DELIVERY,
        { deliveryId }
      );
    }
  } catch (error) {
    console.error('[triggers:onDeliveryStatusChanged] Error:', error.message);
  }
});

/**
 * Scheduler: auto-expires requirements past deadline daily.
 */
exports.expireNGORequirements = onSchedule('every day 00:00', async () => {
  try {
    const now = new Date();
    const requirementsSnap = await db.collection(COLLECTIONS.NGO_REQUIREMENTS)
      .where('status', 'in', [REQUIREMENT_STATUS.OPEN, REQUIREMENT_STATUS.PARTIALLY_FULFILLED])
      .get();

    if (requirementsSnap.empty) return;

    let expiredCount = 0;
    const batch = db.batch();

    requirementsSnap.forEach((docSnap) => {
      const req = docSnap.data();
      if (req.expirySensitive && req.expiryDate) {
        const expiry = req.expiryDate.toDate ? req.expiryDate.toDate() : new Date(req.expiryDate);
        if (now > expiry) {
          batch.update(docSnap.ref, {
            status: REQUIREMENT_STATUS.EXPIRED,
            updatedAt: FieldValue.serverTimestamp(),
          });
          expiredCount++;
        }
      }
    });

    if (expiredCount > 0) {
      await batch.commit();
      console.log(`[expireNGORequirements] Successfully auto-expired ${expiredCount} community requirements.`);
    }
  } catch (error) {
    console.error('[expireNGORequirements] Failed:', error.message);
  }
});

// ── INTERNAL IMPACT TRACKING HELPER ──────────────────────────

/**
 * Increments global and donor impact delivery counts via FieldValue.increment
 */
async function updateImpactStats(donation, donationId) {
  try {
    const monthKey = new Date().toISOString().slice(0, 7);
    const globalRef = db.collection(COLLECTIONS.IMPACT).doc('global');
    const donorRef = db.collection(COLLECTIONS.IMPACT)
      .doc('donors')
      .collection(donation.donorId)
      .doc('stats');

    const inc = FieldValue.increment;

    await Promise.allSettled([
      globalRef.set({
        totalItemsDelivered: inc(1),
        [`itemsByCategory.${donation.category}`]: inc(1),
        [`itemsByMonth.${monthKey}`]: inc(1),
        estimatedWasteReducedKg: inc(0.5),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true }),

      donorRef.set({
        totalDonated: inc(1),
        [`byCategory.${donation.category}`]: inc(1),
        lastDonationAt: FieldValue.serverTimestamp(),
      }, { merge: true }),
    ]);

    console.log(`[updateImpactStats] Successfully updated impact counts for donation: ${donationId}`);
  } catch (error) {
    console.error('[updateImpactStats] Failure:', error.message);
  }
}
