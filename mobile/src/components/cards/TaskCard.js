import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Colors from '../../constants/colors';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '../../constants/categories';
import { PICKUP_TASK_STATUS } from '../../constants/status';
import { getInitials } from '../../utils/matchingHelper';
import { getGeneralArea } from '../../utils/locationHelper';
import StatusBadge from '../badges/StatusBadge';

/**
 * TaskCard — displays a pickup task summary for volunteers.
 * Shows donor initials (NOT full name) and general area (NOT full address) for privacy.
 *
 * @param {object} task - Task object with: id, donorName, category, pickupLocation, scheduledDate, status, vehicleRequired
 * @param {function} onPress - Called when the card is tapped
 * @param {function} [onAccept] - Called when Accept button is pressed
 * @param {function} [onDecline] - Called when Decline button is pressed
 * @param {object} [style] - Optional container style override
 */

const formatDate = (timestamp) => {
  if (!timestamp) return 'No date set';
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const TaskCard = ({ task, onPress, onAccept, onDecline, style }) => {
  const initials = getInitials(task.donorName);
  const categoryLabel = CATEGORY_LABELS[task.category] || task.category;
  const categoryIcon = CATEGORY_ICONS[task.category] || '📦';
  const area = getGeneralArea(task.pickupLocation);
  const isAssigned = task.status === PICKUP_TASK_STATUS.ASSIGNED;

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Pickup task for ${categoryLabel} in ${area}`}
    >
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <View style={styles.headerInfo}>
          <View style={styles.categoryRow}>
            <Text style={styles.categoryEmoji}>{categoryIcon}</Text>
            <Text style={styles.categoryLabel}>{categoryLabel}</Text>
          </View>
          <Text style={styles.area} numberOfLines={1}>
            📍 {area}
          </Text>
        </View>

        <StatusBadge status={task.status} />
      </View>

      <View style={styles.meta}>
        <Text style={styles.date}>🗓 {formatDate(task.scheduledDate)}</Text>

        {task.vehicleRequired ? (
          <View style={styles.vehicleBadge}>
            <Text style={styles.vehicleText}>🚗 Vehicle</Text>
          </View>
        ) : null}
      </View>

      {isAssigned && (onAccept || onDecline) ? (
        <View style={styles.actions}>
          {onDecline ? (
            <TouchableOpacity
              style={styles.declineButton}
              onPress={onDecline}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Decline task"
            >
              <Text style={styles.declineText}>Decline</Text>
            </TouchableOpacity>
          ) : null}

          {onAccept ? (
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={onAccept}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Accept task"
            >
              <Text style={styles.acceptText}>Accept</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 14,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primaryButton,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
    gap: 2,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryEmoji: {
    fontSize: 14,
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.heading,
  },
  area: {
    fontSize: 12,
    color: Colors.paragraph,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 12,
  },
  date: {
    fontSize: 12,
    color: Colors.paragraph,
  },
  vehicleBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  vehicleText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primaryButton,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    paddingTop: 12,
  },
  declineButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.errorAlert,
    backgroundColor: Colors.white,
  },
  declineText: {
    color: Colors.errorAlert,
    fontSize: 13,
    fontWeight: '600',
  },
  acceptButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.primaryButton,
  },
  acceptText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
});

export default TaskCard;
