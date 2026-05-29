/**
 * MeshMission Urgency Constants
 */

export const URGENCY = {
  NORMAL: 'normal',
  HIGH_PRIORITY: 'high_priority',
  EMERGENCY: 'emergency',
};

/** Sort order: emergency first */
export const URGENCY_ORDER = [
  URGENCY.EMERGENCY,
  URGENCY.HIGH_PRIORITY,
  URGENCY.NORMAL,
];

export const URGENCY_LABELS = {
  [URGENCY.NORMAL]: 'Normal',
  [URGENCY.HIGH_PRIORITY]: 'High Priority',
  [URGENCY.EMERGENCY]: 'Emergency',
};
