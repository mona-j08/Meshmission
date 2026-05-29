import React from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import Colors from '../../constants/colors';

/**
 * LoadingState — centered spinner with an optional message.
 *
 * @param {string} [message='Loading…'] - Loading message
 */
export const LoadingState = ({ message = 'Loading…' }) => (
  <View style={styles.container}>
    <ActivityIndicator size="large" color={Colors.primaryButton} />
    <Text style={styles.loadingText}>{message}</Text>
  </View>
);

/**
 * ErrorState — error icon, message, and a retry button.
 *
 * @param {string} [message='Something went wrong'] - Error message
 * @param {function} [onRetry] - Called when Retry button is pressed
 */
export const ErrorState = ({ message = 'Something went wrong', onRetry }) => (
  <View style={styles.container}>
    <Text style={styles.errorIcon}>⚠️</Text>
    <Text style={styles.errorMessage}>{message}</Text>
    {onRetry ? (
      <TouchableOpacity
        style={styles.retryButton}
        onPress={onRetry}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Retry"
      >
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

/**
 * EmptyState — icon, title, and description for empty lists.
 *
 * @param {string} [icon='📭'] - Emoji icon
 * @param {string} title - Heading text
 * @param {string} [description] - Supporting description
 */
export const EmptyState = ({ icon = '📭', title, description }) => (
  <View style={styles.container}>
    <Text style={styles.emptyIcon}>{icon}</Text>
    <Text style={styles.emptyTitle}>{title}</Text>
    {description ? (
      <Text style={styles.emptyDescription}>{description}</Text>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },

  // Loading
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.paragraph,
  },

  // Error
  errorIcon: {
    fontSize: 40,
    marginBottom: 12,
    color: Colors.errorAlert,
  },
  errorMessage: {
    fontSize: 15,
    color: Colors.errorAlert,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: Colors.primaryButton,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },

  // Empty
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.paragraph,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyDescription: {
    fontSize: 13,
    color: Colors.paragraph,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});
