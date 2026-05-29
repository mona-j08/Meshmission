/**
 * MeshMission — Server-Side Constants
 *
 * Cloud Functions cannot import directly from mobile source. This duplicate copy provides
 * isolated constant structures for server-side operations, queries, and triggers.
 */

const COLLECTIONS = {
  USERS: 'users',
  DONATIONS: 'donations',
  NGO_PROFILES: 'ngo_profiles',
  NGO_REQUIREMENTS: 'ngo_requirements',
  VOLUNTEERS: 'volunteers',
  PICKUP_TASKS: 'pickup_tasks',
  DELIVERIES: 'deliveries',
  COLLECTION_POINTS: 'collection_points',
  NOTIFICATIONS: 'notifications',
  IMPACT: 'impact',
  MATCHES: 'matches',
};

const DONATION_STATUS = {
  PENDING: 'pending',
  UPLOADED: 'uploaded',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  NEEDS_REVIEW: 'needs_review',
  ASSIGNED: 'assigned',
  OTP_VERIFIED: 'otp_verified',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
};

const TASK_STATUS = {
  OPEN: 'open',
  ASSIGNED: 'assigned',
  ACCEPTED: 'accepted',
  OTP_SENT: 'otp_sent',
  COMPLETED: 'completed',
  DECLINED: 'declined',
};

const DELIVERY_STATUS = {
  SCHEDULED: 'scheduled',
  DELIVERED: 'delivered',
};

const REQUIREMENT_STATUS = {
  OPEN: 'open',
  PARTIALLY_FULFILLED: 'partially_fulfilled',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
};

const URGENCY_WEIGHT = {
  emergency: 3,
  high_priority: 2,
  normal: 1,
};

const USER_ROLES = {
  DONOR: 'donor',
  VOLUNTEER: 'volunteer',
  NGO: 'ngo',
  ADMIN: 'admin',
};

const NOTIFICATION_TYPES = {
  NEW_DONATION: 'new_donation',
  APPROVAL: 'approval',
  REJECTION: 'rejection',
  ASSIGNMENT: 'assignment',
  OTP: 'otp',
  PICKUP_COMPLETE: 'pickup_complete',
  DELIVERY: 'delivery',
  EMERGENCY: 'emergency',
  TASK_DECLINED: 'task_declined',
};

module.exports = {
  COLLECTIONS,
  DONATION_STATUS,
  TASK_STATUS,
  DELIVERY_STATUS,
  REQUIREMENT_STATUS,
  URGENCY_WEIGHT,
  USER_ROLES,
  NOTIFICATION_TYPES,
};
