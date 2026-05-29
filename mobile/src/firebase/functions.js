/**
 * MeshMission — Cloud Functions Service
 *
 * This file wraps HTTPS callable functions with custom timeout logic, strict Firebase
 * error-code-to-human-friendly-message mapping, and formatted console errors.
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from './config';

// ── ERROR CODE MAPPER ────────────────────────────────────────

const MAP_ERROR_CODES = {
  'unauthenticated': 'You must be signed in to perform this operation.',
  'permission-denied': 'You do not have permission to perform this action.',
  'not-found': 'The requested server resource was not found.',
  'already-exists': 'This resource already exists on the server.',
  'invalid-argument': 'One or more input arguments are invalid.',
  'failed-precondition': 'Operation failed: condition checks were not met.',
  'resource-exhausted': 'Rate limit or resource quota exceeded. Please try again later.',
  'deadline-exceeded': 'The request timed out. Please check your network connection.',
  'unavailable': 'The server is currently unavailable. Please try again later.',
};

const mapFirebaseError = (error) => {
  const code = error.code;
  return MAP_ERROR_CODES[code] || error.message || 'An unexpected backend error occurred.';
};

// ── GENERIC WRAPPER ──────────────────────────────────────────

/**
 * Executes a Cloud Function call with an enforce 15s timeout and mapped errors
 */
export const callFunction = async (fnName, data = {}, timeoutMs = 15000) => {
  const fn = httpsCallable(functions, fnName);

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => {
      const err = new Error('deadline-exceeded');
      err.code = 'deadline-exceeded';
      reject(err);
    }, timeoutMs)
  );

  try {
    const result = await Promise.race([fn(data), timeoutPromise]);
    return { data: result.data, error: null };
  } catch (error) {
    const mappedMsg = mapFirebaseError(error);
    console.error(`[functions:${fnName}] Execution failed:`, error.message);
    return { data: null, error: mappedMsg };
  }
};

// ── EXPORTED SERVICE CALLS ───────────────────────────────────

/**
 * Set user custom claims role in Firebase Auth
 */
export const setUserRole = async (userId, role) => {
  return await callFunction('setUserRole', { userId, role });
};

/**
 * Generate pickup OTP (called by volunteer)
 */
export const generatePickupOTP = async (taskId) => {
  return await callFunction('generatePickupOTP', { taskId });
};

/**
 * Verify pickup OTP (called by volunteer)
 */
export const verifyPickupOTP = async (taskId, otp) => {
  return await callFunction('verifyPickupOTP', { taskId, otp });
};

/**
 * Notify donor of donation verification approval
 */
export const notifyDonorApproval = async (donationId) => {
  return await callFunction('notifyDonorApproval', { donationId });
};

/**
 * Notify donor of donation rejection
 */
export const notifyDonorRejection = async (donationId, reason) => {
  return await callFunction('notifyDonorRejection', { donationId, reason });
};

/**
 * Manually trigger matching engine for approved donation
 */
export const triggerMatchingEngine = async (donationId) => {
  return await callFunction('triggerMatchingEngine', { donationId });
};

/**
 * Send emergency alert push notification for a requirement
 */
export const sendEmergencyAlert = async (requirementId) => {
  return await callFunction('sendEmergencyAlert', { requirementId });
};

/**
 * Notify volunteer they have been assigned to a task
 */
export const notifyVolunteerAssigned = async (taskId) => {
  return await callFunction('notifyVolunteerAssigned', { taskId });
};
