import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import Colors from '../../constants/colors';
import { DONATION_STATUS, PICKUP_TASK_STATUS, DELIVERY_STATUS } from '../../constants/status';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '../../constants/categories';
import {
  getPickupTask,
  getDonationById,
  createDelivery,
  updateDonation,
  updatePickupTask,
} from '../../firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import PrimaryButton from '../../components/common/PrimaryButton';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { LoadingState, ErrorState } from '../../components/common/ScreenStates';

let MapView = null;
let Marker = null;
try {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
} catch (_e) {
  // react-native-maps not available
}

const VolunteerDeliveryScreen = ({ route, navigation }) => {
  const { taskId } = route.params;
  const selectedCollectionPoint = route.params?.selectedCollectionPoint || null;

  const { user } = useAuth();

  const [task, setTask] = useState(null);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [delivering, setDelivering] = useState(false);
  const [delivered, setDelivered] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [collectionPoint, setCollectionPoint] = useState(selectedCollectionPoint);

  // Update collection point if returned from selection screen
  useEffect(() => {
    if (selectedCollectionPoint) {
      setCollectionPoint(selectedCollectionPoint);
    }
  }, [selectedCollectionPoint]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch task
        const taskResult = await getPickupTask(taskId);
        if (taskResult.error) {
          setError(taskResult.error);
          setLoading(false);
          return;
        }
        setTask(taskResult.data);

        // Fetch donations
        const donationIds = taskResult.data?.donationIds || [];
        if (donationIds.length > 0) {
          const results = await Promise.all(
            donationIds.map((id) => getDonationById(id))
          );
          setDonations(results.filter((r) => r.data).map((r) => r.data));
        }
      } catch (err) {
        setError('Failed to load delivery details.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [taskId]);

  const deliverTo = collectionPoint || task?.ngo;
  const deliverToName = deliverTo?.name || 'Unknown';
  const deliverToAddress = deliverTo?.address || 'No address available';
  const deliverToHours = deliverTo?.operatingHours || task?.ngo?.operatingHours || null;
  const deliverToLat = deliverTo?.location?.lat || deliverTo?.lat;
  const deliverToLng = deliverTo?.location?.lng || deliverTo?.lng;
  const showMap = MapView && deliverToLat && deliverToLng;

  const handleMarkDelivered = () => {
    setShowConfirm(true);
  };

  const confirmDelivery = async () => {
    setShowConfirm(false);
    setDelivering(true);
    try {
      // 1. Create delivery doc
      const deliveryData = {
        taskId,
        volunteerId: user?.uid,
        donationIds: task?.donationIds || [],
        ngoId: task?.ngoId || task?.matchedNgoId || null,
        collectionPointId: collectionPoint?.id || null,
        deliveredTo: collectionPoint ? 'collection_point' : 'ngo',
        deliveryLocation: deliverTo?.location || null,
        status: DELIVERY_STATUS.DELIVERED,
      };
      const deliveryResult = await createDelivery(deliveryData);
      if (deliveryResult.error) {
        Alert.alert('Error', deliveryResult.error);
        setDelivering(false);
        return;
      }

      // 2. Update all donations to 'delivered'
      const donationIds = task?.donationIds || [];
      await Promise.all(
        donationIds.map((id) =>
          updateDonation(id, { status: DONATION_STATUS.DELIVERED })
        )
      );

      // 3. Update pickup task to 'completed'
      await updatePickupTask(taskId, { status: PICKUP_TASK_STATUS.COMPLETED });

      setDelivered(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to complete delivery. Please try again.');
    } finally {
      setDelivering(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading delivery details..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  // Success state
  if (delivered) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successCircle}>
          <Text style={styles.successCheckmark}>✓</Text>
        </View>
        <Text style={styles.successTitle}>Delivery Complete!</Text>
        <Text style={styles.successSubtitle}>
          Thank you for making a difference. The donation has been successfully
          delivered.
        </Text>
        <PrimaryButton
          title="Back to Home"
          onPress={() => navigation.popToTop()}
          style={styles.homeButton}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.screenTitle}>Delivery</Text>

      {/* Picked-up Items Summary */}
      <Text style={styles.sectionTitle}>Picked-up Items</Text>
      {donations.map((donation) => (
        <View key={donation.id} style={styles.itemCard}>
          <Text style={styles.itemCategory}>
            {CATEGORY_ICONS[donation.category] || '📦'}{' '}
            {CATEGORY_LABELS[donation.category] || donation.category}
          </Text>
          {donation.description && (
            <Text style={styles.itemDesc}>{donation.description}</Text>
          )}
          {donation.quantity && (
            <Text style={styles.itemQuantity}>Qty: {donation.quantity}</Text>
          )}
        </View>
      ))}

      {/* Deliver To Section */}
      <Text style={styles.sectionTitle}>
        {collectionPoint ? 'Collection Point' : 'Assigned NGO'}
      </Text>
      <View style={styles.ngoCard}>
        <Text style={styles.ngoName}>{deliverToName}</Text>
        <Text style={styles.ngoAddress}>{deliverToAddress}</Text>
        {deliverToHours && (
          <View style={styles.hoursRow}>
            <Text style={styles.hoursLabel}>🕐 Operating Hours:</Text>
            <Text style={styles.hoursValue}>{deliverToHours}</Text>
          </View>
        )}
      </View>

      {/* Map */}
      {showMap && (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: deliverToLat,
              longitude: deliverToLng,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            scrollEnabled={false}
          >
            <Marker
              coordinate={{ latitude: deliverToLat, longitude: deliverToLng }}
              title={deliverToName}
              description={deliverToAddress}
            />
          </MapView>
        </View>
      )}

      {/* Select Collection Point */}
      {!collectionPoint && (
        <PrimaryButton
          title="Select Collection Point Instead"
          onPress={() =>
            navigation.navigate('CollectionPointsMap', { taskId })
          }
          style={styles.cpButton}
        />
      )}

      {/* Mark as Delivered */}
      <PrimaryButton
        title={delivering ? 'Completing Delivery...' : 'Mark as Delivered'}
        onPress={handleMarkDelivered}
        disabled={delivering}
        style={styles.deliverButton}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={showConfirm}
        title="Confirm Delivery"
        message={`Are you sure you want to mark this delivery as completed to ${deliverToName}?`}
        confirmText="Confirm Delivery"
        cancelText="Cancel"
        onConfirm={confirmDelivery}
        onCancel={() => setShowConfirm(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mainBackground,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.heading,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.heading,
    marginBottom: 12,
    marginTop: 8,
  },
  itemCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 10,
  },
  itemCategory: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.heading,
    marginBottom: 4,
  },
  itemDesc: {
    fontSize: 13,
    color: Colors.paragraph,
    marginBottom: 2,
  },
  itemQuantity: {
    fontSize: 13,
    color: Colors.paragraph,
  },
  ngoCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 16,
  },
  ngoName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.heading,
    marginBottom: 6,
  },
  ngoAddress: {
    fontSize: 14,
    color: Colors.paragraph,
    marginBottom: 8,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  hoursLabel: {
    fontSize: 13,
    color: Colors.paragraph,
  },
  hoursValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.heading,
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
  cpButton: {
    marginBottom: 12,
  },
  deliverButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  // Success state
  successContainer: {
    flex: 1,
    backgroundColor: Colors.mainBackground,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  successCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.successAlert,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successCheckmark: {
    fontSize: 56,
    color: Colors.white,
    fontWeight: '700',
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.heading,
    marginBottom: 10,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 15,
    color: Colors.paragraph,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  homeButton: {
    width: '80%',
  },
});

export default VolunteerDeliveryScreen;
