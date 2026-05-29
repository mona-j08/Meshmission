import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../../constants/colors';
import { URGENCY, URGENCY_LABELS } from '../../constants/urgency';

/**
 * UrgencyBadge — shows urgency level with an emoji icon and colored background.
 *
 * @param {string} urgency - A value from URGENCY constants
 * @param {object} [style] - Optional container style override
 */

const URGENCY_CONFIG = {
  [URGENCY.EMERGENCY]: {
    icon: '🚨',
    color: Colors.errorAlert,
  },
  [URGENCY.HIGH_PRIORITY]: {
    icon: '⚡',
    color: Colors.warningAlert,
  },
  [URGENCY.NORMAL]: {
    icon: '✓',
    color: Colors.successAlert,
  },
};

const UrgencyBadge = ({ urgency, style }) => {
  const config = URGENCY_CONFIG[urgency] || URGENCY_CONFIG[URGENCY.NORMAL];
  const label = URGENCY_LABELS[urgency] || 'Normal';

  return (
    <View style={[styles.badge, { backgroundColor: config.color }, style]}>
      <Text style={styles.icon}>{config.icon}</Text>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  icon: {
    fontSize: 12,
  },
  text: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
});

export default UrgencyBadge;
