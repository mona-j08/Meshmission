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

export default DONATION_STATUS;
