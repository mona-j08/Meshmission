import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import Colors from '../../constants/colors';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '../../constants/categories';
import { CONDITION_LABELS } from '../../constants/status';
import StatusBadge from '../badges/StatusBadge';

/**
 * DonationCard — displays a donation summary in a card layout.
 *
 * @param {object} donation - Donation object with: id, images[], category, condition, status, createdAt
 * @param {function} onPress - Called when the card is tapped
 * @param {object} [style] - Optional container style override
 */

const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const DonationCard = ({ donation, onPress, style }) => {
  const thumbnail = donation.images?.[0] || null;
  const categoryLabel = CATEGORY_LABELS[donation.category] || donation.category;
  const categoryIcon = CATEGORY_ICONS[donation.category] || '📦';
  const conditionLabel = CONDITION_LABELS[donation.condition] || donation.condition;

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Donation of ${categoryLabel}, status ${donation.status}`}
    >
      <View style={styles.row}>
        {thumbnail ? (
          <Image source={{ uri: thumbnail }} style={styles.thumbnail} />
        ) : (
          <View style={[styles.thumbnail, styles.placeholderImage]}>
            <Text style={styles.placeholderEmoji}>{categoryIcon}</Text>
          </View>
        )}

        <View style={styles.details}>
          <View style={styles.categoryTag}>
            <Text style={styles.categoryIcon}>{categoryIcon}</Text>
            <Text style={styles.categoryText}>{categoryLabel}</Text>
          </View>

          <Text style={styles.condition}>{conditionLabel}</Text>

          <Text style={styles.date}>{formatDate(donation.createdAt)}</Text>
        </View>

        <View style={styles.statusContainer}>
          <StatusBadge status={donation.status} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 12,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: Colors.mainBackground,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  placeholderEmoji: {
    fontSize: 28,
  },
  details: {
    flex: 1,
    marginLeft: 12,
    gap: 4,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryButton,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  categoryIcon: {
    fontSize: 12,
  },
  categoryText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
  condition: {
    fontSize: 13,
    color: Colors.paragraph,
  },
  date: {
    fontSize: 11,
    color: Colors.disabledText,
  },
  statusContainer: {
    marginLeft: 8,
  },
});

export default DonationCard;
