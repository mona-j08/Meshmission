import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import Colors from '../../constants/colors';
import { PICKUP_TASK_STATUS, DONATION_STATUS } from '../../constants/status';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '../../constants/categories';
import { getDonationById } from '../../firebase/firestore';
import { getGeneralArea, formatLocation } from '../../utils/locationHelper';
import { getInitials } from '../../utils/matchingHelper';
import PrimaryButton from '../../components/common/PrimaryButton';
import StatusBadge from '../../components/badges/StatusBadge';
import { LoadingState, ErrorState } from '../../components/common/ScreenStates';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

let MapView = null;
let Marker = null;
try {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
} catch (_e) {
  // react-native-maps not available — map will be hidden
}

const VolunteerTaskDetailScreen = ({ route, navigation }) => {
  const { task } = route.params;

  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const canSeeFullAddress =
    task.status === PICKUP_TASK_STATUS.ACCEPTED ||
    task.status === PICKUP_TASK_STATUS.OTP_SENT ||
    task.status === PICKUP_TASK_STATUS.COMPLETED;

  const canGenerateOTP =
    task.status === PICKUP_TASK_STATUS.ACCEPTED;

  useEffect(() => {
    const fetchDonations = async () => {
      setLoading(true);
      setError(null);
      try {
        const donationIds = task.donationIds || [];
        if (donationIds.length === 0) {
          setDonations([]);
          setLoading(false);
          return;
        }
        const results = await Promise.all(
          donationIds.map((id) => getDonationById(id))
        );
        const fetched = results
          .filter((r) => r.data)
          .map((r) => r.data);
        setDonations(fetched);
        const firstError = results.find((r) => r.error && !r.data);
        if (firstError && fetched.length === 0) {
          setError(firstError.error);
        }
      } catch (err) {
        setError('Failed to load donation details.');
      } finally {
        setLoading(false);
      }
    };
    fetchDonations();
  }, [task.donationIds]);

  const formatScheduledDate = (date) => {
    if (!date) return 'Not scheduled';
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <LoadingState message="Loading task details..." />;
  }

  if (error && donations.length === 0) {
    return <ErrorState message={error} />;
  }

  const donorLat = task.donorLocation?.lat;
  const donorLng = task.donorLocation?.lng;
  const showMap = MapView && canSeeFullAddress && donorLat && donorLng;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Task Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.initialsCircle}>
            <Text style={styles.initialsText}>
              {getInitials(task.donorName)}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.taskTitle}>Pickup Task</Text>
            <StatusBadge status={task.status} />
          </View>
        </View>

        <View style={styles.headerDetails}>
          <DetailRow
            label="Category"
            value={`${CATEGORY_ICONS[task.category] || '📦'} ${CATEGORY_LABELS[task.category] || task.category}`}
          />
          <DetailRow
            label="Scheduled"
            value={formatScheduledDate(task.scheduledDate)}
          />
          <DetailRow
            label="Location"
            value={
              canSeeFullAddress
                ? formatLocation(task.donorLocation)
                : getGeneralArea(task.donorLocation)
            }
          />
          {!canSeeFullAddress && (
            <Text style={styles.privacyNote}>
              Full address will be shown once you accept the task.
            </Text>
          )}
        </View>
      </View>

      {/* Map */}
      {showMap && (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: donorLat,
              longitude: donorLng,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            scrollEnabled={false}
          >
            <Marker
              coordinate={{ latitude: donorLat, longitude: donorLng }}
              title="Pickup Location"
              description={formatLocation(task.donorLocation)}
            />
          </MapView>
        </View>
      )}

      {/* Donation Items */}
      <Text style={styles.sectionTitle}>Items to Pick Up</Text>
      {donations.length === 0 ? (
        <View style={styles.emptyItems}>
          <Text style={styles.emptyItemsText}>No item details available.</Text>
        </View>
      ) : (
        donations.map((donation) => (
          <View key={donation.id} style={styles.donationCard}>
            <View style={styles.donationHeader}>
              <Text style={styles.donationCategory}>
                {CATEGORY_ICONS[donation.category] || '📦'}{' '}
                {CATEGORY_LABELS[donation.category] || donation.category}
              </Text>
              <StatusBadge status={donation.status} />
            </View>
            {donation.description && (
              <Text style={styles.donationDescription}>
                {donation.description}
              </Text>
            )}
            {donation.quantity && (
              <Text style={styles.donationQuantity}>
                Quantity: {donation.quantity}
              </Text>
            )}
            {/* Donation images */}
            {donation.images && donation.images.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.imagesScroll}
              >
                {donation.images.map((uri, index) => (
                  <Image
                    key={`${donation.id}-img-${index}`}
                    source={{ uri }}
                    style={styles.donationImage}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            )}
          </View>
        ))
      )}

      {/* Collection Point Info */}
      {task.collectionPoint && (
        <View style={styles.collectionPointCard}>
          <Text style={styles.sectionTitle}>Collection Point</Text>
          <Text style={styles.cpName}>{task.collectionPoint.name}</Text>
          <Text style={styles.cpAddress}>{task.collectionPoint.address}</Text>
        </View>
      )}

      {/* Generate OTP Button */}
      {canGenerateOTP && (
        <PrimaryButton
          title="I've Arrived — Generate OTP"
          onPress={() =>
            navigation.navigate('VolunteerOTP', { taskId: task.id })
          }
          style={styles.otpButton}
        />
      )}

      {/* Chat Button (FUNC-5) */}
      {(task.status === PICKUP_TASK_STATUS.ASSIGNED || task.status === PICKUP_TASK_STATUS.ACCEPTED || task.status === PICKUP_TASK_STATUS.OTP_SENT) && (
        <PrimaryButton
          title={`Chat with ${task.donorName || 'Donor'}`}
          onPress={() => navigation.navigate('TaskChat', { taskId: task.id, otherPartyName: task.donorName })}
          style={styles.chatButton}
          variant="secondary"
        />
      )}

      {/* Task Completed */}
      {task.status === PICKUP_TASK_STATUS.COMPLETED && (
        <View style={styles.completedBanner}>
          <Text style={styles.completedText}>✓ This task is complete</Text>
        </View>
      )}
    </ScrollView>
  );
};

const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mainBackground,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  initialsCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  initialsText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.icon,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.heading,
  },
  headerDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.paragraph,
    fontWeight: '500',
    minWidth: 80,
  },
  detailValue: {
    fontSize: 14,
    color: Colors.heading,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  privacyNote: {
    fontSize: 12,
    color: Colors.warningAlert,
    fontStyle: 'italic',
    marginTop: 4,
  },
  mapContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  map: {
    width: '100%',
    height: 200,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.heading,
    marginBottom: 12,
  },
  emptyItems: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 16,
  },
  emptyItemsText: {
    fontSize: 14,
    color: Colors.disabledText,
  },
  donationCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 12,
  },
  donationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  donationCategory: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.heading,
  },
  donationDescription: {
    fontSize: 14,
    color: Colors.paragraph,
    marginBottom: 6,
  },
  donationQuantity: {
    fontSize: 13,
    color: Colors.paragraph,
    marginBottom: 8,
  },
  imagesScroll: {
    marginTop: 8,
  },
  donationImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginRight: 10,
    backgroundColor: Colors.disabledBackground,
  },
  collectionPointCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginTop: 8,
    marginBottom: 16,
  },
  cpName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.heading,
    marginBottom: 4,
  },
  cpAddress: {
    fontSize: 14,
    color: Colors.paragraph,
  },
  otpButton: {
    marginTop: 20,
  },
  completedBanner: {
    backgroundColor: Colors.successAlert,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  completedText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  chatButton: {
    marginTop: 12,
    backgroundColor: Colors.mainBackground,
    borderWidth: 1,
    borderColor: Colors.primaryButton,
  },
});

export default VolunteerTaskDetailScreen;
