import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Linking,
  SafeAreaView,
} from 'react-native';
import Colors from '../../constants/colors';
import { DELIVERY_STATUS } from '../../constants/status';
import { useAuth } from '../../hooks/useAuth';
import { useNGO } from '../../hooks/useNGO';
import { LoadingState, ErrorState, EmptyState } from '../../components/common/ScreenStates';

const VEHICLE_CONFIG = {
  bike: { icon: '🚲', label: 'Bike' },
  car: { icon: '🚗', label: 'Car' },
  van: { icon: '🚐', label: 'Van' },
};

const VolunteersScreen = () => {
  const { user } = useAuth();
  const { deliveries, loading, error } = useNGO(user?.uid);

  // Aggregate unique volunteers from deliveries
  const activeVolunteersMap = {};
  deliveries.forEach((d) => {
    if (d.volunteerId && d.volunteerName) {
      if (!activeVolunteersMap[d.volunteerId]) {
        activeVolunteersMap[d.volunteerId] = {
          id: d.volunteerId,
          name: d.volunteerName,
          phone: d.volunteerPhone || '',
          vehicleType: d.vehicleType || '',
          deliveriesCount: 0,
          activeDeliveriesCount: 0,
        };
      }
      activeVolunteersMap[d.volunteerId].deliveriesCount += 1;
      if (d.status !== DELIVERY_STATUS.DELIVERED) {
        activeVolunteersMap[d.volunteerId].activeDeliveriesCount += 1;
      }
    }
  });

  const uniqueVolunteers = Object.values(activeVolunteersMap);

  const handleCall = (phoneNumber) => {
    if (!phoneNumber) return;
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      // Quiet fail if dialing is not supported (e.g. simulator)
    });
  };

  const renderVolunteerCard = ({ item }) => {
    const vehicle = VEHICLE_CONFIG[item.vehicleType.toLowerCase()] || { icon: '📦', label: item.vehicleType || 'Transport' };

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.name ? item.name.charAt(0).toUpperCase() : 'V'}
            </Text>
          </View>
          <View style={styles.volunteerDetails}>
            <Text style={styles.volunteerName}>{item.name}</Text>
            <View style={styles.vehicleBadge}>
              <Text style={styles.vehicleIcon}>{vehicle.icon}</Text>
              <Text style={styles.vehicleLabel}>{vehicle.label}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{item.activeDeliveriesCount}</Text>
              <Text style={styles.statLabel}>Active Shipments</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{item.deliveriesCount}</Text>
              <Text style={styles.statLabel}>Total Shipments</Text>
            </View>
          </View>
        </View>

        {item.phone ? (
          <TouchableOpacity
            style={styles.callButton}
            onPress={() => handleCall(item.phone)}
            activeOpacity={0.7}
          >
            <Text style={styles.callButtonText}>📞 Call Volunteer ({item.phone})</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.noContact}>
            <Text style={styles.noContactText}>No phone number listed</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return <LoadingState message="Loading assigned volunteers..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <FlatList
          data={uniqueVolunteers}
          keyExtractor={(item) => item.id}
          renderItem={renderVolunteerCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Assigned Volunteers</Text>
              <Text style={styles.headerSubtitle}>
                These volunteers are handling pickup and delivery of donations for your NGO.
              </Text>
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              message="No volunteers have been assigned to your deliveries yet. When an admin matches a volunteer to a donation, they will appear here."
            />
          }
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.mainBackground,
  },
  container: {
    flex: 1,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.heading,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.paragraph,
    marginTop: 6,
    lineHeight: 20,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primaryMuted,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.icon,
  },
  volunteerDetails: {
    flex: 1,
    gap: 4,
  },
  volunteerName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.heading,
  },
  vehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.inputBackground,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 4,
  },
  vehicleIcon: {
    fontSize: 12,
  },
  vehicleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.paragraph,
  },
  cardBody: {
    backgroundColor: Colors.inputBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primaryButton,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.paragraph,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.cardBorder,
  },
  callButton: {
    backgroundColor: Colors.primaryButton,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  callButtonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  noContact: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  noContactText: {
    fontSize: 13,
    color: Colors.disabledText,
    fontStyle: 'italic',
  },
});

export default VolunteersScreen;
