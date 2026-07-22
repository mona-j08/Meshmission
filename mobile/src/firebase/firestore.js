/**
 * MeshMission — Firestore Service
 *
 * This file is completely rewritten to support 50+ operations with strict schema mapping,
 * backward-compatible aliases, PII stripping, transactional updates, and strict error handling.
 */

import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  writeBatch,
  runTransaction,
  startAfter,
} from 'firebase/firestore';
import { db } from './config';
import { COLLECTIONS } from '../constants/collections';
import {
  DONATION_STATUS,
  VERIFICATION_STATUS,
  PICKUP_TASK_STATUS,
  DELIVERY_STATUS,
  NGO_REQUIREMENT_STATUS,
} from '../constants/status';
import { URGENCY_WEIGHT } from '../constants/urgency';
import {
  createUserDoc,
  createDonationDoc,
  createNGOProfileDoc,
  createNGORequirementDoc,
  createVolunteerDoc,
  createPickupTaskDoc,
  createDeliveryDoc,
  createNotificationDoc,
  createCollectionPointDoc,
} from '../utils/schemas';
import { triggerMatchingEngine, notifyDonorRejection } from './functions';

// ── PRIVACY HELPER ───────────────────────────────────────────

/**
 * Strips precise donor address/coordinates for tasks that are not accepted yet.
 * Volunteers only see the general area until they officially accept.
 */
const stripPrivacyForUnacceptedTasks = (tasks) => {
  return tasks.map((task) => {
    const isAccepted =
      task.status === PICKUP_TASK_STATUS.ACCEPTED ||
      task.status === PICKUP_TASK_STATUS.PICKED_UP ||
      task.status === PICKUP_TASK_STATUS.COMPLETED;

    if (!isAccepted) {
      const stripped = { ...task };
      // Mask full GPS location
      if (stripped.donorLocation) {
        if (typeof stripped.donorLocation === 'object') {
          stripped.donorLocation = {
            area: stripped.donorLocation.area || stripped.donorLocation.city || 'Unknown area',
            lat: null,
            lng: null,
          };
        } else {
          stripped.donorLocation = 'Location masked for privacy';
        }
      }
      // Mask donor phone number until accepted
      stripped.donorPhone = null;
      // Mask precise donor address until accepted – keep only city/area
      if (stripped.donorAddress && typeof stripped.donorAddress === 'object') {
        stripped.donorAddress = {
          city: stripped.donorAddress.city || null,
          state: stripped.donorAddress.state || null,
        };
      }
      // Mask receiver phone number until accepted
      stripped.receiverPhone = null;
      return stripped;
    }
    return task;
  });
};

// ── USER OPERATIONS ──────────────────────────────────────────

export const createUserProfile = async (userId, userData) => {
  try {
    const docData = createUserDoc({ userId, ...userData });
    await setDoc(doc(db, COLLECTIONS.USERS, userId), docData, { merge: true });
    return { error: null };
  } catch (error) {
    throw new Error(`[firestore:createUserProfile] ${error.message}`);
  }
};

export const getUserProfile = async (userId) => {
  try {
    const docSnap = await getDoc(doc(db, COLLECTIONS.USERS, userId));
    if (docSnap.exists()) {
      return { data: { id: docSnap.id, ...docSnap.data() }, error: null };
    }
    throw new Error(`User ${userId} not found`);
  } catch (error) {
    throw new Error(`[firestore:getUserProfile] ${error.message}`);
  }
};

export const updateUserProfile = async (userId, updates) => {
  try {
    await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error) {
    throw new Error(`[firestore:updateUserProfile] ${error.message}`);
  }
};

export const updateFCMToken = async (userId, token) => {
  try {
    await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
      fcmToken: token,
      fcmTokenUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error) {
    throw new Error(`[firestore:updateFCMToken] ${error.message}`);
  }
};

export const updateFcmToken = updateFCMToken;

// ── DONOR REGISTRATION OPERATIONS ────────────────────────────

/**
 * Save/update donor registration details on the user profile.
 * Marks donorRegistered: true and stores address + phone + donorId.
 */
export const saveDonorRegistration = async (userId, { name, phone, street, area, city, state, pincode, donorId }) => {
  try {
    const updates = {
      name,
      donorPhone: phone,
      donorAddress: { street: street || '', area: area || '', city, state, pincode },
      donorRegistered: true,
      donorId: donorId || null,
      updatedAt: serverTimestamp(),
    };
    await updateDoc(doc(db, COLLECTIONS.USERS, userId), updates);
    return { error: null };
  } catch (error) {
    throw new Error(`[firestore:saveDonorRegistration] ${error.message}`);
  }
};

/**
 * Returns true if the user has already completed donor registration.
 */
export const checkDonorRegistered = async (userId) => {
  try {
    const docSnap = await getDoc(doc(db, COLLECTIONS.USERS, userId));
    if (docSnap.exists()) {
      return !!docSnap.data().donorRegistered;
    }
    return false;
  } catch (error) {
    return false;
  }
};

/**
 * Fetch donor info (name, phone, donorAddress, donorId) from users collection.
 * Returns null if not found.
 */
export const getDonorInfo = async (userId) => {
  try {
    const docSnap = await getDoc(doc(db, COLLECTIONS.USERS, userId));
    if (docSnap.exists()) {
      const d = docSnap.data();
      return {
        name: d.name || d.displayName || null,
        phone: d.donorPhone || d.phoneNumber || d.phone || null,
        donorAddress: d.donorAddress || null,
        donorId: d.donorId || null,
        email: d.email || null,
      };
    }
    return null;
  } catch (error) {
    console.warn('[firestore:getDonorInfo]', error.message);
    return null;
  }
};

// ── NOTIFICATION CREATION ─────────────────────────────────────

/**
 * Create a notification document for a user.
 * type: 'approval' | 'rejection' | 'assignment' | 'pickup_confirmed' | 'delivery'
 */
export const createNotification = async (userId, { title, body, type, data = {} }) => {
  try {
    const docData = createNotificationDoc({ userId, title, body, type, data });
    await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), docData);
    return { error: null };
  } catch (error) {
    // Non-critical — log and continue
    console.warn('[firestore:createNotification]', error.message);
    return { error: error.message };
  }
};

export const getAllUsers = async (roleFilter = null) => {
  try {
    let q = collection(db, COLLECTIONS.USERS);
    if (roleFilter) {
      q = query(q, where('role', '==', roleFilter));
    }
    q = query(q, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return { data: snap.docs.map((d) => ({ id: d.id, ...d.data() })), error: null };
  } catch (error) {
    throw new Error(`[firestore:getAllUsers] ${error.message}`);
  }
};

export const listenToUserProfile = (userId, callback, onError) => {
  return onSnapshot(
    doc(db, COLLECTIONS.USERS, userId),
    (snap) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...snap.data() });
      } else {
        callback(null);
      }
    },
    (error) => {
      if (onError) onError(new Error(`[firestore:listenToUserProfile] ${error.message}`));
    }
  );
};

export const deactivateUser = async (userId) => {
  try {
    await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
      isActive: false,
      deactivatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error) {
    throw new Error(`[firestore:deactivateUser] ${error.message}`);
  }
};

// ── DONATION OPERATIONS ──────────────────────────────────────

export const createDonation = async (donationData) => {
  try {
    const docData = createDonationDoc(donationData);
    const docRef = await addDoc(collection(db, COLLECTIONS.DONATIONS), docData);
    return { id: docRef.id, error: null };
  } catch (error) {
    throw new Error(`[firestore:createDonation] ${error.message}`);
  }
};

export const getDonationById = async (donationId) => {
  try {
    const docSnap = await getDoc(doc(db, COLLECTIONS.DONATIONS, donationId));
    if (docSnap.exists()) {
      return { data: { id: docSnap.id, ...docSnap.data() }, error: null };
    }
    return { data: null, error: 'Donation not found' };
  } catch (error) {
    throw new Error(`[firestore:getDonationById] ${error.message}`);
  }
};

export const updateDonation = async (donationId, updates) => {
  try {
    await updateDoc(doc(db, COLLECTIONS.DONATIONS, donationId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error) {
    throw new Error(`[firestore:updateDonation] ${error.message}`);
  }
};

export const getPendingDonations = async () => {
  try {
    const q = query(
      collection(db, COLLECTIONS.DONATIONS),
      where('status', 'in', [DONATION_STATUS.UPLOADED, DONATION_STATUS.PENDING]),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return { data: snap.docs.map((d) => ({ id: d.id, ...d.data() })), error: null };
  } catch (error) {
    throw new Error(`[firestore:getPendingDonations] ${error.message}`);
  }
};

export const listenToPendingDonations = (callback, onError) => {
  const q = query(
    collection(db, COLLECTIONS.DONATIONS),
    where('status', 'in', [DONATION_STATUS.UPLOADED, DONATION_STATUS.PENDING]),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    (error) => {
      if (onError) onError(new Error(`[firestore:listenToPendingDonations] ${error.message}`));
    }
  );
};

export const updateDonationStatus = async (donationId, status, rejectionReason = null) => {
  try {
    const updates = { status, updatedAt: serverTimestamp() };
    if (rejectionReason) {
      updates.rejectionReason = rejectionReason;
    }
    await updateDoc(doc(db, COLLECTIONS.DONATIONS, donationId), updates);
    return { error: null };
  } catch (error) {
    throw new Error(`[firestore:updateDonationStatus] ${error.message}`);
  }
};

export const approveDonation = async (donationId) => {
  try {
    await updateDoc(doc(db, COLLECTIONS.DONATIONS, donationId), {
      status: DONATION_STATUS.APPROVED,
      verificationStatus: VERIFICATION_STATUS.APPROVED,
      updatedAt: serverTimestamp(),
    });
    // Non-critical: Cloud Functions may not be deployed
    try {
      await triggerMatchingEngine(donationId);
    } catch (matchErr) {
      console.warn('[firestore:approveDonation] Matching engine unavailable:', matchErr.message);
    }
    return { error: null };
  } catch (error) {
    throw new Error(`[firestore:approveDonation] ${error.message}`);
  }
};

export const rejectDonation = async (donationId, reason) => {
  try {
    await updateDoc(doc(db, COLLECTIONS.DONATIONS, donationId), {
      status: DONATION_STATUS.REJECTED,
      verificationStatus: VERIFICATION_STATUS.REJECTED,
      rejectionReason: reason,
      updatedAt: serverTimestamp(),
    });
    // Non-critical: Cloud Functions may not be deployed
    try {
      await notifyDonorRejection(donationId, reason);
    } catch (notifyErr) {
      console.warn('[firestore:rejectDonation] Notification unavailable:', notifyErr.message);
    }
    return { error: null };
  } catch (error) {
    throw new Error(`[firestore:rejectDonation] ${error.message}`);
  }
};

export const markNeedsReview = async (donationId) => {
  try {
    await updateDoc(doc(db, COLLECTIONS.DONATIONS, donationId), {
      status: DONATION_STATUS.NEEDS_REVIEW,
      verificationStatus: VERIFICATION_STATUS.NEEDS_REVIEW,
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error) {
    throw new Error(`[firestore:markNeedsReview] ${error.message}`);
  }
};

export const getApprovedUnassignedDonations = async () => {
  try {
    const q = query(
      collection(db, COLLECTIONS.DONATIONS),
      where('status', '==', DONATION_STATUS.APPROVED),
      where('pickupTaskId', '==', null),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return { data: snap.docs.map((d) => ({ id: d.id, ...d.data() })), error: null };
  } catch (error) {
    throw new Error(`[firestore:getApprovedUnassignedDonations] ${error.message}`);
  }
};

export const listenToDonorDonations = (donorId, callback, onError) => {
  const q = query(
    collection(db, COLLECTIONS.DONATIONS),
    where('donorId', '==', donorId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    (error) => {
      if (onError) onError(new Error(`[firestore:listenToDonorDonations] ${error.message}`));
    }
  );
};

export const subscribeToDonorDonations = listenToDonorDonations;

export const getDonorDonationsPaginated = async (donorId, pageSize = 10, lastDoc = null) => {
  let q = query(
    collection(db, COLLECTIONS.DONATIONS),
    where('donorId', '==', donorId),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );

  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }

  try {
    const snapshot = await getDocs(q);
    const donations = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
    return { data: donations, lastDoc: newLastDoc, error: null };
  } catch (error) {
    throw new Error(`[firestore:getDonorDonationsPaginated] ${error.message}`);
  }
};

// ── NGO PROFILES ─────────────────────────────────────────────

export const createOrUpdateNGOProfile = async (ngoId, profileData) => {
  try {
    const docData = createNGOProfileDoc({ ngoId, ...profileData });
    await setDoc(doc(db, COLLECTIONS.NGO_PROFILES, ngoId), docData, { merge: true });
    return { error: null };
  } catch (error) {
    throw new Error(`[firestore:createOrUpdateNGOProfile] ${error.message}`);
  }
};

export const createNGOProfile = createOrUpdateNGOProfile;

export const getNGOProfile = async (ngoId) => {
  try {
    const docSnap = await getDoc(doc(db, COLLECTIONS.NGO_PROFILES, ngoId));
    if (docSnap.exists()) {
      return { data: { id: docSnap.id, ...docSnap.data() }, error: null };
    }
    return { data: null, error: 'NGO profile not found' };
  } catch (error) {
    throw new Error(`[firestore:getNGOProfile] ${error.message}`);
  }
};

export const updateNGOProfile = async (ngoId, updates) => {
  try {
    await updateDoc(doc(db, COLLECTIONS.NGO_PROFILES, ngoId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error) {
    throw new Error(`[firestore:updateNGOProfile] ${error.message}`);
  }
};

export const getAllNGOs = async () => {
  try {
    const q = query(collection(db, COLLECTIONS.NGO_PROFILES), where('isActive', '==', true));
    const snap = await getDocs(q);
    return { data: snap.docs.map((d) => ({ id: d.id, ...d.data() })), error: null };
  } catch (error) {
    throw new Error(`[firestore:getAllNGOs] ${error.message}`);
  }
};

export const listenToNGOProfile = (ngoId, callback, onError) => {
  return onSnapshot(
    doc(db, COLLECTIONS.NGO_PROFILES, ngoId),
    (snap) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...snap.data() });
      } else {
        callback(null);
      }
    },
    (error) => {
      if (onError) onError(new Error(`[firestore:listenToNGOProfile] ${error.message}`));
    }
  );
};

// ── NGO REQUIREMENTS ─────────────────────────────────────────

export const createRequirement = async (reqData) => {
  try {
    const docData = createNGORequirementDoc(reqData);
    const docRef = await addDoc(collection(db, COLLECTIONS.NGO_REQUIREMENTS), docData);
    return { id: docRef.id, error: null };
  } catch (error) {
    throw new Error(`[firestore:createRequirement] ${error.message}`);
  }
};

export const updateRequirement = async (reqId, updates) => {
  try {
    await updateDoc(doc(db, COLLECTIONS.NGO_REQUIREMENTS, reqId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error) {
    throw new Error(`[firestore:updateRequirement] ${error.message}`);
  }
};

export const deleteRequirement = async (reqId) => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.NGO_REQUIREMENTS, reqId));
    return { error: null };
  } catch (error) {
    throw new Error(`[firestore:deleteRequirement] ${error.message}`);
  }
};

export const getNGORequirements = async (ngoId) => {
  try {
    const q = query(
      collection(db, COLLECTIONS.NGO_REQUIREMENTS),
      where('ngoId', '==', ngoId),
      where('status', '==', NGO_REQUIREMENT_STATUS.OPEN)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => {
      const weightA = URGENCY_WEIGHT[a.urgencyLevel] || 0;
      const weightB = URGENCY_WEIGHT[b.urgencyLevel] || 0;
      return weightB - weightA;
    });
    return { data: list, error: null };
  } catch (error) {
    throw new Error(`[firestore:getNGORequirements] ${error.message}`);
  }
};

export const listenToNGORequirements = (ngoId, callback, onError) => {
  const q = query(
    collection(db, COLLECTIONS.NGO_REQUIREMENTS),
    where('ngoId', '==', ngoId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => {
        const weightA = URGENCY_WEIGHT[a.urgencyLevel] || 0;
        const weightB = URGENCY_WEIGHT[b.urgencyLevel] || 0;
        return weightB - weightA;
      });
      callback(list);
    },
    (error) => {
      if (onError) onError(new Error(`[firestore:listenToNGORequirements] ${error.message}`));
    }
  );
};

export const subscribeToNGORequirements = listenToNGORequirements;

export const getAllOpenRequirements = async () => {
  try {
    const q = query(
      collection(db, COLLECTIONS.NGO_REQUIREMENTS),
      where('status', '==', NGO_REQUIREMENT_STATUS.OPEN)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => {
      const weightA = URGENCY_WEIGHT[a.urgencyLevel] || 0;
      const weightB = URGENCY_WEIGHT[b.urgencyLevel] || 0;
      return weightB - weightA;
    });
    return { data: list, error: null };
  } catch (error) {
    throw new Error(`[firestore:getAllOpenRequirements] ${error.message}`);
  }
};

// ── VOLUNTEER OPERATIONS ─────────────────────────────────────

export const createVolunteerProfile = async (volunteerId, data) => {
  try {
    const docData = createVolunteerDoc({ volunteerId, ...data });
    await setDoc(doc(db, COLLECTIONS.VOLUNTEERS, volunteerId), docData, { merge: true });
    return { error: null };
  } catch (error) {
    throw new Error(`[firestore:createVolunteerProfile] ${error.message}`);
  }
};

export const getVolunteerProfile = async (volunteerId) => {
  try {
    const docSnap = await getDoc(doc(db, COLLECTIONS.VOLUNTEERS, volunteerId));
    if (docSnap.exists()) {
      return { data: { id: docSnap.id, ...docSnap.data() }, error: null };
    }
    return { data: null, error: 'Volunteer profile not found' };
  } catch (error) {
    throw new Error(`[firestore:getVolunteerProfile] ${error.message}`);
  }
};

export const updateVolunteerProfile = async (volunteerId, updates) => {
  try {
    await updateDoc(doc(db, COLLECTIONS.VOLUNTEERS, volunteerId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error) {
    throw new Error(`[firestore:updateVolunteerProfile] ${error.message}`);
  }
};

export const getAllVolunteers = async () => {
  try {
    const q = query(collection(db, COLLECTIONS.VOLUNTEERS), orderBy('name', 'asc'));
    const snap = await getDocs(q);
    return { data: snap.docs.map((d) => ({ id: d.id, ...d.data() })), error: null };
  } catch (error) {
    throw new Error(`[firestore:getAllVolunteers] ${error.message}`);
  }
};

export const getAvailableVolunteers = async () => {
  try {
    const q = query(
      collection(db, COLLECTIONS.VOLUNTEERS),
      where('isActive', '==', true)
    );
    const snap = await getDocs(q);
    return { data: snap.docs.map((d) => ({ id: d.id, ...d.data() })), error: null };
  } catch (error) {
    throw new Error(`[firestore:getAvailableVolunteers] ${error.message}`);
  }
};

export const listenToVolunteerProfile = (volunteerId, callback, onError) => {
  return onSnapshot(
    doc(db, COLLECTIONS.VOLUNTEERS, volunteerId),
    (snap) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...snap.data() });
      } else {
        callback(null);
      }
    },
    (error) => {
      if (onError) onError(new Error(`[firestore:listenToVolunteerProfile] ${error.message}`));
    }
  );
};

export const incrementVolunteerTaskCount = async (volunteerId) => {
  try {
    await updateDoc(doc(db, COLLECTIONS.VOLUNTEERS, volunteerId), {
      totalTasksCompleted: increment(1),
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error) {
    throw new Error(`[firestore:incrementVolunteerTaskCount] ${error.message}`);
  }
};

// ── PICKUP TASKS ─────────────────────────────────────────────

export const createPickupTask = async (taskData) => {
  try {
    const docData = createPickupTaskDoc(taskData);
    const docRef = await addDoc(collection(db, COLLECTIONS.PICKUP_TASKS), docData);
    return { id: docRef.id, error: null };
  } catch (error) {
    throw new Error(`[firestore:createPickupTask] ${error.message}`);
  }
};

export const subscribeToVolunteerTasks = (volunteerId, callback, onError) => {
  const q = query(
    collection(db, COLLECTIONS.PICKUP_TASKS),
    where('volunteerId', '==', volunteerId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(stripPrivacyForUnacceptedTasks(list));
    },
    (error) => {
      if (onError) onError(new Error(`[firestore:subscribeToVolunteerTasks] ${error.message}`));
    }
  );
};

export const listenToVolunteerTasks = subscribeToVolunteerTasks;

export const subscribeToOpenTasks = (callback, onError) => {
  const q = query(
    collection(db, COLLECTIONS.PICKUP_TASKS),
    where('status', '==', PICKUP_TASK_STATUS.OPEN),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(stripPrivacyForUnacceptedTasks(list));
    },
    (error) => {
      if (onError) onError(new Error(`[firestore:subscribeToOpenTasks] ${error.message}`));
    }
  );
};

export const listenToOpenTasks = subscribeToOpenTasks;

export const getVolunteerTasksPaginated = async (volunteerId, pageSize = 10, lastDoc = null) => {
  try {
    let q = query(
      collection(db, COLLECTIONS.PICKUP_TASKS),
      where('volunteerId', '==', volunteerId),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    const snap = await getDocs(q);
    const rawTasks = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const tasks = stripPrivacyForUnacceptedTasks(rawTasks);
    const nextLastDoc = snap.docs[snap.docs.length - 1] || null;
    return { data: tasks, lastDoc: nextLastDoc, error: null };
  } catch (error) {
    throw new Error(`[firestore:getVolunteerTasksPaginated] ${error.message}`);
  }
};

export const updatePickupTask = async (taskId, updates) => {
  try {
    await updateDoc(doc(db, COLLECTIONS.PICKUP_TASKS, taskId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error) {
    throw new Error(`[firestore:updatePickupTask] ${error.message}`);
  }
};

export const getPickupTask = async (taskId) => {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.PICKUP_TASKS, taskId));
    if (snap.exists()) {
      return { data: { id: snap.id, ...snap.data() }, error: null };
    }
    return { data: null, error: 'Pickup task not found' };
  } catch (error) {
    throw new Error(`[firestore:getPickupTask] ${error.message}`);
  }
};

export const acceptTask = async (taskId, volunteerId) => {
  try {
    await updateDoc(doc(db, COLLECTIONS.PICKUP_TASKS, taskId), {
      status: PICKUP_TASK_STATUS.ACCEPTED,
      volunteerId,
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error) {
    throw new Error(`[firestore:acceptTask] ${error.message}`);
  }
};

export const declineTask = async (taskId) => {
  try {
    await updateDoc(doc(db, COLLECTIONS.PICKUP_TASKS, taskId), {
      status: PICKUP_TASK_STATUS.DECLINED,
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error) {
    throw new Error(`[firestore:declineTask] ${error.message}`);
  }
};

// ── DELIVERIES ───────────────────────────────────────────────

export const createDelivery = async (deliveryData) => {
  try {
    const docData = createDeliveryDoc(deliveryData);
    const docRef = await addDoc(collection(db, COLLECTIONS.DELIVERIES), docData);
    return { id: docRef.id, error: null };
  } catch (error) {
    throw new Error(`[firestore:createDelivery] ${error.message}`);
  }
};

export const getDelivery = async (deliveryId) => {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.DELIVERIES, deliveryId));
    if (snap.exists()) {
      return { data: { id: snap.id, ...snap.data() }, error: null };
    }
    return { data: null, error: 'Delivery not found' };
  } catch (error) {
    throw new Error(`[firestore:getDelivery] ${error.message}`);
  }
};

export const getVolunteerDeliveries = async (volunteerId) => {
  try {
    const q = query(
      collection(db, COLLECTIONS.DELIVERIES),
      where('volunteerId', '==', volunteerId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return { data: snap.docs.map((d) => ({ id: d.id, ...d.data() })), error: null };
  } catch (error) {
    throw new Error(`[firestore:getVolunteerDeliveries] ${error.message}`);
  }
};

export const subscribeToNGOTasks = (ngoId, callback, onError) => {
  const q = query(
    collection(db, COLLECTIONS.PICKUP_TASKS),
    where('matchedNgoId', '==', ngoId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    (error) => {
      if (onError) onError(new Error(`[firestore:subscribeToNGOTasks] ${error.message}`));
    }
  );
};

export const subscribeToNGODeliveries = (ngoId, callback, onError) => {
  const q = query(
    collection(db, COLLECTIONS.DELIVERIES),
    where('ngoId', '==', ngoId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    (error) => {
      if (onError) onError(new Error(`[firestore:subscribeToNGODeliveries] ${error.message}`));
    }
  );
};

export const listenToNGODeliveries = subscribeToNGODeliveries;

export const updateDelivery = async (deliveryId, updates) => {
  try {
    await updateDoc(doc(db, COLLECTIONS.DELIVERIES, deliveryId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error) {
    throw new Error(`[firestore:updateDelivery] ${error.message}`);
  }
};

export const confirmDelivery = async (deliveryId) => {
  try {
    await runTransaction(db, async (transaction) => {
      const delRef = doc(db, COLLECTIONS.DELIVERIES, deliveryId);
      const delSnap = await transaction.get(delRef);
      if (!delSnap.exists()) {
        throw new Error('Delivery not found');
      }

      const delData = delSnap.data();
      transaction.update(delRef, {
        status: DELIVERY_STATUS.DELIVERED,
        deliveredAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (delData.donationIds && Array.isArray(delData.donationIds)) {
        for (const donationId of delData.donationIds) {
          const donRef = doc(db, COLLECTIONS.DONATIONS, donationId);
          transaction.update(donRef, {
            status: DONATION_STATUS.DELIVERED,
            updatedAt: serverTimestamp(),
          });
        }
      }
    });
    return { error: null };
  } catch (error) {
    throw new Error(`[firestore:confirmDelivery] ${error.message}`);
  }
};

// ── COLLECTION POINTS ────────────────────────────────────────

export const createCollectionPoint = async (pointData) => {
  try {
    const docData = createCollectionPointDoc(pointData);
    const docRef = await addDoc(collection(db, COLLECTIONS.COLLECTION_POINTS), docData);
    return { id: docRef.id, error: null };
  } catch (error) {
    throw new Error(`[firestore:createCollectionPoint] ${error.message}`);
  }
};

export const getAllCollectionPoints = async () => {
  try {
    const q = query(
      collection(db, COLLECTIONS.COLLECTION_POINTS),
      where('isActive', '==', true)
    );
    const snap = await getDocs(q);
    return { data: snap.docs.map((d) => ({ id: d.id, ...d.data() })), error: null };
  } catch (error) {
    throw new Error(`[firestore:getAllCollectionPoints] ${error.message}`);
  }
};

export const getCollectionPoints = getAllCollectionPoints;

export const updateCollectionPointLoad = async (pointId, currentLoad) => {
  try {
    await updateDoc(doc(db, COLLECTIONS.COLLECTION_POINTS, pointId), {
      currentOccupancy: currentLoad,
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error) {
    throw new Error(`[firestore:updateCollectionPointLoad] ${error.message}`);
  }
};

export const updateCollectionPoint = async (pointId, data) => {
  try {
    await updateDoc(doc(db, COLLECTIONS.COLLECTION_POINTS, pointId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error) {
    throw new Error(`[firestore:updateCollectionPoint] ${error.message}`);
  }
};

export const deactivateCollectionPoint = async (pointId) => {
  try {
    await updateDoc(doc(db, COLLECTIONS.COLLECTION_POINTS, pointId), {
      isActive: false,
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error) {
    throw new Error(`[firestore:deactivateCollectionPoint] ${error.message}`);
  }
};

// ── NOTIFICATIONS ────────────────────────────────────────────

export const subscribeToNotifications = (userId, callback, onError) => {
  const q = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    (error) => {
      if (onError) onError(new Error(`[firestore:subscribeToNotifications] ${error.message}`));
    }
  );
};

export const listenToUserNotifications = subscribeToNotifications;

export const getUserNotifications = async (userId) => {
  try {
    const q = query(
      collection(db, COLLECTIONS.NOTIFICATIONS),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return { data: snap.docs.map((d) => ({ id: d.id, ...d.data() })), error: null };
  } catch (error) {
    throw new Error(`[firestore:getUserNotifications] ${error.message}`);
  }
};

export const markNotificationRead = async (notificationId) => {
  try {
    await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notificationId), {
      read: true,
    });
    return { error: null };
  } catch (error) {
    throw new Error(`[firestore:markNotificationRead] ${error.message}`);
  }
};

export const markAllNotificationsRead = async (userId) => {
  try {
    const q = query(
      collection(db, COLLECTIONS.NOTIFICATIONS),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach((docSnap) => {
      batch.update(docSnap.ref, { read: true });
    });
    await batch.commit();
    return { error: null };
  } catch (error) {
    throw new Error(`[firestore:markAllNotificationsRead] ${error.message}`);
  }
};

export const getUnreadCount = async (userId) => {
  try {
    const q = query(
      collection(db, COLLECTIONS.NOTIFICATIONS),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    const snap = await getDocs(q);
    return { data: snap.size, error: null };
  } catch (error) {
    throw new Error(`[firestore:getUnreadCount] ${error.message}`);
  }
};

// ── IMPACT ───────────────────────────────────────────────────

export const getGlobalImpact = async () => {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.IMPACT, 'global'));
    if (snap.exists()) {
      return { data: snap.data(), error: null };
    }
    return { data: null, error: null };
  } catch (error) {
    throw new Error(`[firestore:getGlobalImpact] ${error.message}`);
  }
};

export const getImpactStats = getGlobalImpact;

export const getDonorImpact = async (donorId) => {
  try {
    const q = query(
      collection(db, COLLECTIONS.DONATIONS),
      where('donorId', '==', donorId),
      where('status', '==', DONATION_STATUS.DELIVERED)
    );
    const snap = await getDocs(q);
    return { data: { count: snap.size }, error: null };
  } catch (error) {
    throw new Error(`[firestore:getDonorImpact] ${error.message}`);
  }
};

export const getNGOImpact = async (ngoId) => {
  try {
    const q = query(
      collection(db, COLLECTIONS.DELIVERIES),
      where('ngoId', '==', ngoId),
      where('status', '==', DELIVERY_STATUS.DELIVERED)
    );
    const snap = await getDocs(q);
    return { data: { count: snap.size }, error: null };
  } catch (error) {
    throw new Error(`[firestore:getNGOImpact] ${error.message}`);
  }
};

export const listenToGlobalImpact = (callback, onError) => {
  return onSnapshot(
    doc(db, COLLECTIONS.IMPACT, 'global'),
    (snap) => {
      if (snap.exists()) {
        callback(snap.data());
      } else {
        callback(null);
      }
    },
    (error) => {
      if (onError) onError(new Error(`[firestore:listenToGlobalImpact] ${error.message}`));
    }
  );
};
