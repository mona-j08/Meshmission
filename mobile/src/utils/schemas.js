/**
 * MeshMission — Document Schema Factory Functions
 *
 * Each factory returns a complete document shape with:
 *  - All required fields validated (throws on missing)
 *  - All optional fields defaulted to null
 *  - All array fields defaulted to []
 *  - Status fields imported from constants (never hardcoded)
 *  - serverTimestamp() for top-level timestamp fields
 */

import { serverTimestamp } from 'firebase/firestore';
import { DONATION_STATUS, VERIFICATION_STATUS, PICKUP_TASK_STATUS, DELIVERY_STATUS, NGO_REQUIREMENT_STATUS } from '../constants/status';

// ── Validation Helper ────────────────────────────────────────

const requireField = (value, fieldName, factoryName) => {
  if (value === undefined || value === null || value === '') {
    throw new Error(`[schemas:${factoryName}] Missing required field: ${fieldName}`);
  }
  return value;
};

// ── User Document ────────────────────────────────────────────

export const createUserDoc = ({ userId, email, role, name, phoneNumber = null }) => {
  requireField(userId, 'userId', 'createUserDoc');
  requireField(email, 'email', 'createUserDoc');
  requireField(role, 'role', 'createUserDoc');

  return {
    userId,
    email,
    role,
    name: name || null,
    phoneNumber,
    isActive: true,
    fcmToken: null,
    fcmTokenUpdatedAt: null,
    profileImageUrl: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
};

// ── Donation Document ────────────────────────────────────────

export const createDonationDoc = ({
  donorId,
  category,
  description,
  reason,
  quantity = 1,
  condition = null,
  location = null,
  images = [],
  urgencyLevel = 'normal',
  status = null,
  notes = null,
  pickupPreference = null,
  isRecurring = false,
  recurringFrequency = null,
}) => {
  requireField(donorId, 'donorId', 'createDonationDoc');
  requireField(category, 'category', 'createDonationDoc');

  // Accept either `description` or `reason` from the form
  const resolvedDescription = description || reason;
  requireField(resolvedDescription, 'description', 'createDonationDoc');

  return {
    donorId,
    category,
    description: resolvedDescription,
    quantity,
    condition,
    location,
    images,
    urgencyLevel,
    notes,
    pickupPreference,
    isRecurring,
    recurringFrequency,
    status: status || DONATION_STATUS.PENDING,
    verificationStatus: VERIFICATION_STATUS.PENDING,
    rejectionReason: null,
    matchedNgoId: null,
    matchedRequirementId: null,
    pickupTaskId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
};

// ── NGO Profile Document ─────────────────────────────────────

export const createNGOProfileDoc = ({
  ngoId,
  ngoName,
  contactPerson,
  email,
  phone = null,
  address = null,
  location = null,
  categoriesAccepted = [],
  description = null,
}) => {
  requireField(ngoId, 'ngoId', 'createNGOProfileDoc');
  requireField(ngoName, 'ngoName', 'createNGOProfileDoc');
  requireField(contactPerson, 'contactPerson', 'createNGOProfileDoc');
  requireField(email, 'email', 'createNGOProfileDoc');

  return {
    ngoId,
    ngoName,
    contactPerson,
    email,
    phone,
    address,
    location,
    categoriesAccepted,
    description,
    isVerified: false,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
};

// ── NGO Requirement Document ─────────────────────────────────

export const createNGORequirementDoc = ({
  ngoId,
  category,
  quantityNeeded,
  urgencyLevel = 'normal',
  description = null,
  deliveryDeadline = null,
  expiryDate = null,
  expirySensitive = false,
}) => {
  requireField(ngoId, 'ngoId', 'createNGORequirementDoc');
  requireField(category, 'category', 'createNGORequirementDoc');
  requireField(quantityNeeded, 'quantityNeeded', 'createNGORequirementDoc');

  return {
    ngoId,
    category,
    quantityNeeded,
    quantityFulfilled: 0,
    urgencyLevel,
    description,
    deliveryDeadline,
    expiryDate,
    expirySensitive,
    status: NGO_REQUIREMENT_STATUS.OPEN,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
};

// ── Volunteer Document ───────────────────────────────────────

export const createVolunteerDoc = ({
  volunteerId,
  name,
  phone = null,
  vehicleType = null,
  availability = [],
  availabilityTiming = null,
  location = null,
}) => {
  requireField(volunteerId, 'volunteerId', 'createVolunteerDoc');
  requireField(name, 'name', 'createVolunteerDoc');

  return {
    volunteerId,
    name,
    phone,
    vehicleType,
    availability,
    availabilityTiming,
    location,
    isActive: true,
    totalTasksCompleted: 0,
    rating: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
};

// ── Pickup Task Document ─────────────────────────────────────

export const createPickupTaskDoc = ({
  donationIds,
  donorId,
  volunteerId = null,
  status = null,
}) => {
  requireField(donationIds, 'donationIds', 'createPickupTaskDoc');
  requireField(donorId, 'donorId', 'createPickupTaskDoc');

  return {
    donationIds,
    donorId,
    volunteerId,
    status: status || (volunteerId ? PICKUP_TASK_STATUS.ASSIGNED : PICKUP_TASK_STATUS.OPEN),
    otp: null,
    otpExpiresAt: null,
    otpVerified: false,
    otpAttempts: 0,
    otpGenerationCount: 0,
    lastOtpGeneratedAt: null,
    scheduledDate: null,
    completedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
};

// ── Delivery Document ────────────────────────────────────────

export const createDeliveryDoc = ({
  volunteerId,
  ngoId,
  donationIds = [],
  items = [],
  collectionPointId = null,
  notes = null,
}) => {
  requireField(volunteerId, 'volunteerId', 'createDeliveryDoc');
  requireField(ngoId, 'ngoId', 'createDeliveryDoc');

  return {
    volunteerId,
    ngoId,
    donationIds,
    items,
    collectionPointId,
    notes,
    status: DELIVERY_STATUS.SCHEDULED,
    scheduledDate: null,
    deliveredAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
};

// ── Notification Document ────────────────────────────────────

export const createNotificationDoc = ({
  userId,
  title,
  body,
  type,
  data = {},
}) => {
  requireField(userId, 'userId', 'createNotificationDoc');
  requireField(title, 'title', 'createNotificationDoc');
  requireField(body, 'body', 'createNotificationDoc');
  requireField(type, 'type', 'createNotificationDoc');

  return {
    userId,
    title,
    body,
    type,
    read: false,
    data,
    createdAt: serverTimestamp(),
  };
};

// ── Collection Point Document ────────────────────────────────

export const createCollectionPointDoc = ({
  name,
  address,
  location = null,
  categoriesAccepted = [],
  operatingHours = null,
  contactPhone = null,
  capacity = null,
  currentOccupancy = 0,
}) => {
  requireField(name, 'name', 'createCollectionPointDoc');
  requireField(address, 'address', 'createCollectionPointDoc');

  return {
    name,
    address,
    location,
    categoriesAccepted,
    operatingHours,
    contactPhone,
    capacity,
    currentOccupancy,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
};
