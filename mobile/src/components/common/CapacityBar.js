import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../../constants/colors';

/**
 * CapacityBar — horizontal bar showing current capacity as a percentage.
 * Color changes based on utilization thresholds.
 *
 * @param {number} current - Current capacity value (0–100 range by default)
 * @param {number} [max=100] - Maximum capacity value
 * @param {object} [style] - Optional container style override
 */

const getBarColor = (percentage) => {
  if (percentage > 85) return Colors.errorAlert;
  if (percentage > 60) return Colors.warningAlert;
  return Colors.successAlert;
};

const CapacityBar = ({ current = 0, max = 100, style }) => {
  const percentage = max > 0 ? Math.min(Math.round((current / max) * 100), 100) : 0;
  const barColor = getBarColor(percentage);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.barBackground}>
        <View
          style={[
            styles.barFill,
            { width: `${percentage}%`, backgroundColor: barColor },
          ]}
        />
      </View>
      <Text style={[styles.percentText, { color: barColor }]}>
        {percentage}%
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barBackground: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.cardBorder,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentText: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'right',
  },
});

export default CapacityBar;
