/**
 * MeshMission — Firebase Auth Service
 *
 * This file is completely rewritten to support a transactional 6-step registration flow
 * with rollback cleanup on failure, token refreshes on login, custom role retrieval,
 * and comprehensive password resets.
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';
import { COLLECTIONS } from '../constants/collections';
import { setUserRole } from './functions';
import {
  createUserProfile,
  createVolunteerProfile,
  createOrUpdateNGOProfile,
} from './firestore';

/**
 * Sign in with email and password
 * Forces an ID token refresh to ensure custom claims are synced immediately on login.
 */
export const loginWithEmail = async (email, password) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const user = result.user;
    
    // Force refresh token so the app has the latest custom claims (roles)
    await user.getIdToken(true);

    return { user, error: null };
  } catch (error) {
    throw new Error(`[auth:loginWithEmail] ${error.message}`);
  }
};

/**
 * Register with email and password
 * Execute a transactional 6-step registration flow.
 * If any step fails, the Firebase Auth user is automatically deleted to prevent orphaned auth accounts.
 */
export const registerWithEmail = async (email, password, role = 'donor', name = '', phone = '') => {
  let user = null;
  try {
    // Step 1: Create Firebase Auth User
    const result = await createUserWithEmailAndPassword(auth, email, password);
    user = result.user;

    // Step 2: Create global User profile doc in Firestore
    const { error: userProfileError } = await createUserProfile(user.uid, {
      email,
      role,
      name,
      phoneNumber: phone,
    });
    if (userProfileError) throw new Error(userProfileError);

    // Step 3: Set role custom claims via Cloud Function
    const { error: claimsError } = await setUserRole(user.uid, role);
    if (claimsError) throw new Error(`Custom claims failed: ${claimsError}`);

    // Step 4: Create role-specific Firestore profile
    if (role === 'volunteer') {
      const { error: volError } = await createVolunteerProfile(user.uid, {
        name,
        phone,
      });
      if (volError) throw new Error(volError);
    } else if (role === 'ngo') {
      const { error: ngoError } = await createOrUpdateNGOProfile(user.uid, {
        ngoName: name,
        contactPerson: name,
        email,
        phone,
      });
      if (ngoError) throw new Error(ngoError);
    }

    // Step 5: Force refresh token to reflect custom claims locally
    await user.getIdToken(true);

    // Step 6: Success — Return user
    return { user, error: null };
  } catch (error) {
    // Cleanup/Rollback on failure: delete auth account if created
    if (user) {
      try {
        await user.delete();
      } catch (cleanupError) {
        console.warn('[auth:registerWithEmail] Cleanup failed for user:', user.uid, cleanupError.message);
      }
    }
    throw new Error(`[auth:registerWithEmail] ${error.message}`);
  }
};

/**
 * Sign out
 */
export const logout = async () => {
  try {
    await signOut(auth);
    return { error: null };
  } catch (error) {
    throw new Error(`[auth:logout] ${error.message}`);
  }
};

/**
 * Auth state listener
 */
export const subscribeToAuthState = (callback) => {
  return onAuthStateChanged(auth, callback);
};

export const onAuthStateChange = subscribeToAuthState;

/**
 * Get current authenticated user
 */
export const getCurrentUser = () => auth.currentUser;

/**
 * Retrieve user's role from current ID token custom claims
 */
export const getCurrentUserRole = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return null;
    const tokenResult = await user.getIdTokenResult(true);
    return tokenResult.claims?.role || null;
  } catch (error) {
    throw new Error(`[auth:getCurrentUserRole] ${error.message}`);
  }
};

/**
 * Force refresh the ID token
 */
export const forceTokenRefresh = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken(true);
  } catch (error) {
    throw new Error(`[auth:forceTokenRefresh] ${error.message}`);
  }
};

/**
 * Retrieve full ID token result with claims
 */
export const getIdTokenResult = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return { claims: null, error: 'No user signed in' };
    const tokenResult = await user.getIdTokenResult(true);
    return { claims: tokenResult.claims, error: null };
  } catch (error) {
    throw new Error(`[auth:getIdTokenResult] ${error.message}`);
  }
};

/**
 * Send password reset email
 */
export const sendPasswordReset = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { error: null };
  } catch (error) {
    throw new Error(`[auth:sendPasswordReset] ${error.message}`);
  }
};

/**
 * Update FCM token in global User profile doc
 */
export const updateFcmToken = async (userId, fcmToken) => {
  try {
    if (!userId || !fcmToken) return;
    await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
      fcmToken,
      fcmTokenUpdatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn(`[auth:updateFcmToken] ${error.message}`);
  }
};
