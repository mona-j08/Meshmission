/**
 * MeshMission Status Constants
 * NEVER hardcode status strings — always import from here.
 */

export const DONATION_STATUS = {
  UPLOADED: 'uploaded',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ASSIGNED: 'assigned',
  OTP_VERIFIED: 'otp_verified',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
};

export const DONATION_STATUS_FLOW = [
  DONATION_STATUS.UPLOADED,
  DONATION_STATUS.PENDING,
  DONATION_STATUS.APPROVED,
  DONATION_STATUS.ASSIGNED,
  DONATION_STATUS.OTP_VERIFIED,
  DONATION_STATUS.IN_TRANSIT,
  DONATION_STATUS.DELIVERED,
];

export const VERIFICATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  NEEDS_REVIEW: 'needs_review',
};

export const DONATION_CONDITION = {
  NEW: 'new',
  GOOD: 'good',
  MODERATE: 'moderate',
  DAMAGED: 'damaged',
};

export const CONDITION_LABELS = {
  [DONATION_CONDITION.NEW]: 'New',
  [DONATION_CONDITION.GOOD]: 'Good',
  [DONATION_CONDITION.MODERATE]: 'Moderate Use',
  [DONATION_CONDITION.DAMAGED]: 'Damaged',
};

export const NGO_REQUIREMENT_STATUS = {
  OPEN: 'open',
  PARTIALLY_FULFILLED: 'partially_fulfilled',
  FULFILLED: 'fulfilled',
};

export const PICKUP_TASK_STATUS = {
  OPEN: 'open',
  ASSIGNED: 'assigned',
  ACCEPTED: 'accepted',
  OTP_SENT: 'otp_sent',
  COMPLETED: 'completed',
  DECLINED: 'declined',
};

export const DELIVERY_STATUS = {
  SCHEDULED: 'scheduled',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
};

export const NOTIFICATION_TYPES = {
  APPROVAL: 'approval',
  REJECTION: 'rejection',
  ASSIGNMENT: 'assignment',
  OTP: 'otp',
  DELIVERY: 'delivery',
};
