import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/colors';
import { DONATION_STATUS } from '../../constants/status';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '../../constants/categories';
import { CONDITION_LABELS } from '../../constants/status';
import { formatLocation } from '../../utils/locationHelper';
import { getDonationById } from '../../firebase/firestore';
import ProgressTimeline from '../../components/common/ProgressTimeline';
import PrimaryButton from '../../components/common/PrimaryButton';
import { LoadingState, ErrorState } from '../../components/common/ScreenStates';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = 280;

const DonationDetailScreen = ({ route, navigation }) => {
  const { donationId, donation: routeDonation } = route.params || {};
  const [donation, setDonation] = useState(routeDonation || null);
  const [loading, setLoading] = useState(!routeDonation);
  const [error, setError] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (routeDonation) return;
    const fetchDonation = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await getDonationById(donationId);
        if (fetchError) {
          setError(fetchError);
        } else {
          setDonation(data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDonation();
  }, [donationId, routeDonation]);

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveImageIndex(viewableItems[0].index ?? 0);
    }
  }, []);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  if (loading) {
    return <LoadingState message="Loading donation details..." />;
  }

  if (error || !donation) {
    return <ErrorState message={error || 'Donation not found'} />;
  }

  const images = donation.images || donation.imageUrls || [];
  const isRejected = donation.status === DONATION_STATUS.REJECTED;
  const createdDate = donation.createdAt?.toDate?.()
    ? donation.createdAt.toDate().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : donation.createdAt || 'N/A';

  const renderImageItem = ({ item }) => (
    <Image
      source={{ uri: item }}
      style={styles.galleryImage}
      resizeMode="cover"
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.flex}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Image Gallery */}
        {images.length > 0 ? (
          <View style={styles.galleryContainer}>
            <FlatList
              ref={flatListRef}
              data={images}
              keyExtractor={(_, index) => `img-${index}`}
              renderItem={renderImageItem}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              getItemLayout={(_, index) => ({
                length: SCREEN_WIDTH,
                offset: SCREEN_WIDTH * index,
                index,
              })}
            />
            {images.length > 1 && (
              <View style={styles.pagination}>
                {images.map((_, index) => (
                  <View
                    key={`dot-${index}`}
                    style={[
                      styles.dot,
                      index === activeImageIndex && styles.dotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noImageContainer}>
            <Ionicons name="image-outline" size={48} color={Colors.disabledText} />
            <Text style={styles.noImageText}>No images available</Text>
          </View>
        )}

        {/* Details Section */}
        <View style={styles.detailsContainer}>
          {/* Category */}
          <View style={styles.categoryRow}>
            <Text style={styles.categoryIcon}>
              {CATEGORY_ICONS[donation.category] || '📦'}
            </Text>
            <Text style={styles.categoryLabel}>
              {CATEGORY_LABELS[donation.category] || donation.category}
            </Text>
          </View>

          {/* Info Grid */}
          <View style={styles.infoSection}>
            <InfoRow
              icon="construct-outline"
              label="Condition"
              value={CONDITION_LABELS[donation.condition] || donation.condition}
            />
            <InfoRow
              icon="calendar-outline"
              label="Date Submitted"
              value={createdDate}
            />
            {donation.reason ? (
              <InfoRow
                icon="chatbubble-outline"
                label="Reason"
                value={donation.reason}
              />
            ) : null}
            {donation.notes ? (
              <InfoRow
                icon="document-text-outline"
                label="Notes"
                value={donation.notes}
              />
            ) : null}
          </View>

          {/* Location */}
          {donation.location && (
            <View style={styles.locationSection}>
              <View style={styles.locationHeader}>
                <Ionicons name="location-outline" size={18} color={Colors.icon} />
                <Text style={styles.locationTitle}>Pickup Location</Text>
              </View>
              <Text style={styles.locationAddress}>
                {formatLocation(donation.location)}
              </Text>
            </View>
          )}

          {/* Progress Timeline */}
          <View style={styles.timelineSection}>
            <Text style={styles.sectionTitle}>Donation Progress</Text>
            <ProgressTimeline currentStatus={donation.status} />
          </View>

          {/* Chat Button (FUNC-5) */}
          {donation.pickupTaskId && (donation.status === DONATION_STATUS.ASSIGNED || donation.status === 'otp_sent') && (
            <PrimaryButton
              title="Chat with Volunteer"
              onPress={() => navigation.navigate('TaskChat', { taskId: donation.pickupTaskId, otherPartyName: 'Volunteer' })}
              style={styles.chatButton}
              variant="secondary"
            />
          )}

          {/* Impact Receipt (FUNC-6) */}
          {donation.status === DONATION_STATUS.DELIVERED && (
            <View style={styles.receiptBox}>
              <View style={styles.receiptHeader}>
                <Text style={styles.receiptTitle}>🌟 Impact Receipt</Text>
              </View>
              <Text style={styles.receiptText}>
                Thank you for your generous donation! Your {CATEGORY_LABELS[donation.category] || donation.category} has been successfully delivered to an NGO in need.
              </Text>
              <Text style={styles.receiptSubtext}>
                Date: {new Date().toLocaleDateString()}
                {'\n'}ID: {donation.id}
              </Text>
              <PrimaryButton
                title="Share Impact"
                onPress={() => alert('Sharing coming soon!')}
                style={styles.shareButton}
                variant="primary"
              />
            </View>
          )}

          {/* Rejection Reason */}
          {isRejected && donation.rejectionReason && (
            <View style={styles.rejectionBox}>
              <View style={styles.rejectionHeader}>
                <Ionicons name="close-circle" size={20} color={Colors.errorAlert} />
                <Text style={styles.rejectionTitle}>Rejection Reason</Text>
              </View>
              <Text style={styles.rejectionMessage}>
                {donation.rejectionReason}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoRowLeft}>
      <Ionicons name={icon} size={18} color={Colors.icon} />
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
    <Text style={styles.infoValue} numberOfLines={3}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.mainBackground,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  // Gallery
  galleryContainer: {
    position: 'relative',
  },
  galleryImage: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    backgroundColor: Colors.cardBorder,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.white + '80',
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: Colors.white,
    width: 24,
    borderRadius: 4,
  },
  noImageContainer: {
    height: IMAGE_HEIGHT,
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    fontSize: 14,
    color: Colors.disabledText,
    marginTop: 8,
  },
  // Details
  detailsContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  categoryIcon: {
    fontSize: 28,
    marginRight: 10,
  },
  categoryLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.heading,
  },
  // Info
  infoSection: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.4,
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.paragraph,
    marginLeft: 8,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.heading,
    flex: 0.6,
    textAlign: 'right',
  },
  // Location
  locationSection: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 16,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.heading,
    marginLeft: 6,
  },
  locationAddress: {
    fontSize: 14,
    color: Colors.paragraph,
    lineHeight: 20,
  },
  // Timeline
  timelineSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.heading,
    marginBottom: 12,
  },
  // Rejection
  rejectionBox: {
    backgroundColor: Colors.errorAlert + '12',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.errorAlert + '40',
    padding: 16,
    marginBottom: 16,
  },
  rejectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rejectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.errorAlert,
    marginLeft: 8,
  },
  rejectionMessage: {
    fontSize: 14,
    color: Colors.heading,
    lineHeight: 20,
  },
  chatButton: {
    marginBottom: 16,
    backgroundColor: Colors.mainBackground,
    borderWidth: 1,
    borderColor: Colors.primaryButton,
  },
  // Receipt
  receiptBox: {
    backgroundColor: Colors.heroSection,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.successAlert + '40',
  },
  receiptHeader: {
    marginBottom: 12,
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.icon,
  },
  receiptText: {
    fontSize: 15,
    color: Colors.heading,
    lineHeight: 22,
    marginBottom: 12,
  },
  receiptSubtext: {
    fontSize: 12,
    color: Colors.paragraph,
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 16,
  },
  shareButton: {
    marginTop: 8,
  },
});

export default DonationDetailScreen;
