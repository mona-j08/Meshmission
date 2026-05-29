import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Colors from '../../constants/colors';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '../../constants/categories';
import CapacityBar from '../common/CapacityBar';

/**
 * CollectionPointCard — displays a collection point with capacity and accepted types.
 *
 * @param {object} point - Collection point object with: id, name, address, currentCapacity, maxCapacity, acceptedTypes[], operatingHours
 * @param {function} onPress - Called when the card is tapped
 * @param {object} [style] - Optional container style override
 */

const CollectionPointCard = ({ point, onPress, style }) => {
  const capacityPercent = point.maxCapacity
    ? Math.round((point.currentCapacity / point.maxCapacity) * 100)
    : 0;

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Collection point ${point.name}`}
    >
      <Text style={styles.name} numberOfLines={1}>
        {point.name}
      </Text>

      <Text style={styles.address} numberOfLines={2}>
        📍 {point.address || 'No address provided'}
      </Text>

      <View style={styles.capacitySection}>
        <Text style={styles.sectionLabel}>Capacity</Text>
        <CapacityBar current={capacityPercent} />
      </View>

      {point.acceptedTypes?.length > 0 ? (
        <View style={styles.typesSection}>
          <Text style={styles.sectionLabel}>Accepts</Text>
          <View style={styles.chipRow}>
            {point.acceptedTypes.map((type) => (
              <View key={type} style={styles.chip}>
                <Text style={styles.chipText}>
                  {CATEGORY_ICONS[type] || '📦'} {CATEGORY_LABELS[type] || type}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {point.operatingHours ? (
        <View style={styles.timingSection}>
          <Text style={styles.timingLabel}>🕐 {point.operatingHours}</Text>
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
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.heading,
    marginBottom: 4,
  },
  address: {
    fontSize: 13,
    color: Colors.paragraph,
    marginBottom: 10,
  },
  capacitySection: {
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.disabledText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  typesSection: {
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primaryButton,
  },
  timingSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    paddingTop: 8,
  },
  timingLabel: {
    fontSize: 12,
    color: Colors.paragraph,
  },
});

export default CollectionPointCard;
