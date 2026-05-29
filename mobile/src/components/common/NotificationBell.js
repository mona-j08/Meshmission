import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Colors from '../../constants/colors';

/**
 * NotificationBell — bell icon with an unread count badge.
 *
 * @param {number} [count=0] - Number of unread notifications
 * @param {function} onPress - Called when the bell is tapped
 * @param {object} [style] - Optional container style override
 */

const NotificationBell = ({ count = 0, onPress, style }) => {
  const displayCount = count > 99 ? '99+' : String(count);

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={
        count > 0
          ? `Notifications, ${count} unread`
          : 'Notifications, none unread'
      }
    >
      <Text style={styles.bellIcon}>🔔</Text>
      {count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{displayCount}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellIcon: {
    fontSize: 24,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: Colors.errorAlert,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
});

export default NotificationBell;
