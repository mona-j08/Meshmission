import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import Colors from '../../constants/colors';
import { DONATION_STATUS } from '../../constants/status';

/**
 * ProgressTimeline — shows the 5-step donation lifecycle.
 * Steps: Uploaded → Verified → Assigned → Picked Up → Delivered
 *
 * @param {string} currentStatus - A value from DONATION_STATUS
 * @param {object} [style] - Optional container style override
 */

const TIMELINE_STEPS = [
  { key: 'uploaded', label: 'Uploaded', statuses: [DONATION_STATUS.UPLOADED] },
  { key: 'verified', label: 'Verified', statuses: [DONATION_STATUS.PENDING, DONATION_STATUS.APPROVED] },
  { key: 'assigned', label: 'Assigned', statuses: [DONATION_STATUS.ASSIGNED, DONATION_STATUS.PICKED_UP] },
  { key: 'picked_up', label: 'Picked Up', statuses: [DONATION_STATUS.IN_TRANSIT] },
  { key: 'delivered', label: 'Delivered', statuses: [DONATION_STATUS.DELIVERED] },
];

const getStepIndex = (status) => {
  for (let i = TIMELINE_STEPS.length - 1; i >= 0; i--) {
    if (TIMELINE_STEPS[i].statuses.includes(status)) return i;
  }
  return 0;
};

const PulsingCircle = ({ size }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [scaleAnim]);

  return (
    <Animated.View
      style={[
        styles.circle,
        styles.currentCircle,
        { width: size, height: size, borderRadius: size / 2, transform: [{ scale: scaleAnim }] },
      ]}
    />
  );
};

const AnimatedLine = ({ isCompleted }) => {
  const heightAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isCompleted) {
      Animated.timing(heightAnim, {
        toValue: 28,
        duration: 500,
        useNativeDriver: false, // height cannot use native driver
      }).start();
    } else {
      Animated.timing(heightAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [isCompleted]);

  return (
    <View style={styles.lineBackground}>
      <Animated.View style={[styles.completedLine, { height: heightAnim }]} />
    </View>
  );
};

const ProgressTimeline = ({ currentStatus, style }) => {
  const currentIndex = getStepIndex(currentStatus);
  const isRejected = currentStatus === DONATION_STATUS.REJECTED;

  return (
    <View style={[styles.container, style]}>
      {TIMELINE_STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isPending = index > currentIndex;
        const isLast = index === TIMELINE_STEPS.length - 1;

        return (
          <View key={step.key} style={styles.stepRow}>
            <View style={styles.stepIndicator}>
              {isCurrent && !isRejected ? (
                <PulsingCircle size={20} />
              ) : (
                <View
                  style={[
                    styles.circle,
                    isCompleted && styles.completedCircle,
                    isCurrent && isRejected && styles.rejectedCircle,
                    isPending && styles.pendingCircle,
                  ]}
                >
                  {isCompleted ? (
                    <Text style={styles.checkmark}>✓</Text>
                  ) : null}
                  {isCurrent && isRejected ? (
                    <Text style={styles.checkmark}>✕</Text>
                  ) : null}
                </View>
              )}
              {!isLast ? (
                <AnimatedLine isCompleted={isCompleted} />
              ) : null}
            </View>
            <Text
              style={[
                styles.label,
                isCompleted && styles.completedLabel,
                isCurrent && styles.currentLabel,
                isPending && styles.pendingLabel,
              ]}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepIndicator: {
    alignItems: 'center',
    width: 24,
    marginRight: 12,
  },
  circle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedCircle: {
    backgroundColor: Colors.primaryButton,
  },
  currentCircle: {
    backgroundColor: Colors.primaryButton,
  },
  rejectedCircle: {
    backgroundColor: Colors.errorAlert,
  },
  pendingCircle: {
    backgroundColor: Colors.cardBorder,
  },
  checkmark: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  lineBackground: {
    width: 2,
    height: 28,
    backgroundColor: Colors.cardBorder,
  },
  completedLine: {
    width: 2,
    backgroundColor: Colors.primaryButton,
  },
  label: {
    fontSize: 13,
    marginTop: 0,
    lineHeight: 18,
  },
  completedLabel: {
    color: Colors.primaryButton,
    fontWeight: '600',
  },
  currentLabel: {
    color: Colors.heading,
    fontWeight: '700',
  },
  pendingLabel: {
    color: Colors.disabledText,
  },
});

export default ProgressTimeline;
