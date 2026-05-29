import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../../constants/colors';
import { DONATION_STATUS, PICKUP_TASK_STATUS } from '../../constants/status';

/**
 * StatusBadge — renders a small rounded badge with status text.
 * Color is determined by the status value.
 *
 * @param {string} status - A value from DONATION_STATUS or PICKUP_TASK_STATUS
 * @param {object} [style] - Optional container style override
 */

const STATUS_COLOR_MAP = {
  // Donation statuses
  [DONATION_STATUS.PENDING]: Colors.warningAlert,
  [DONATION_STATUS.UPLOADED]: Colors.warningAlert,
  [DONATION_STATUS.APPROVED]: Colors.successAlert,
  [DONATION_STATUS.DELIVERED]: Colors.successAlert,
  [DONATION_STATUS.REJECTED]: Colors.errorAlert,
  [DONATION_STATUS.ASSIGNED]: Colors.primaryButton,
  [DONATION_STATUS.IN_TRANSIT]: Colors.primaryButton,
  [DONATION_STATUS.OTP_VERIFIED]: Colors.primaryButton,

  // Pickup task statuses
  [PICKUP_TASK_STATUS.ASSIGNED]: Colors.primaryButton,
  [PICKUP_TASK_STATUS.ACCEPTED]: Colors.primaryButton,
  [PICKUP_TASK_STATUS.OTP_SENT]: Colors.warningAlert,
  [PICKUP_TASK_STATUS.COMPLETED]: Colors.successAlert,
  [PICKUP_TASK_STATUS.DECLINED]: Colors.errorAlert,

  // Verification-style
  needs_review: Colors.warningAlert,
};

const STATUS_LABEL_MAP = {
  [DONATION_STATUS.PENDING]: 'Pending',
  [DONATION_STATUS.UPLOADED]: 'Uploaded',
  [DONATION_STATUS.APPROVED]: 'Approved',
  [DONATION_STATUS.DELIVERED]: 'Delivered',
  [DONATION_STATUS.REJECTED]: 'Rejected',
  [DONATION_STATUS.ASSIGNED]: 'Assigned',
  [DONATION_STATUS.IN_TRANSIT]: 'In Transit',
  [DONATION_STATUS.OTP_VERIFIED]: 'OTP Verified',

  [PICKUP_TASK_STATUS.ASSIGNED]: 'Assigned',
  [PICKUP_TASK_STATUS.ACCEPTED]: 'Accepted',
  [PICKUP_TASK_STATUS.OTP_SENT]: 'OTP Sent',
  [PICKUP_TASK_STATUS.COMPLETED]: 'Completed',
  [PICKUP_TASK_STATUS.DECLINED]: 'Declined',

  needs_review: 'Needs Review',
};

const StatusBadge = ({ status, style }) => {
  const backgroundColor = STATUS_COLOR_MAP[status] || Colors.cardBorder;
  const label = STATUS_LABEL_MAP[status] || status || 'Unknown';

  return (
    <View style={[styles.badge, { backgroundColor }, style]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  text: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
});

export default StatusBadge;
