import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../constants/colors';
import { DELIVERY_STATUS } from '../../constants/status';
import { CATEGORY_ICONS, CATEGORY_LABELS } from '../../constants/categories';
import { useAuth } from '../../hooks/useAuth';
import { useNGO } from '../../hooks/useNGO';
import { subscribeToNotifications } from '../../firebase/firestore';
import NotificationBell from '../../components/common/NotificationBell';
import PrimaryButton from '../../components/common/PrimaryButton';
import { LoadingState, ErrorState } from '../../components/common/ScreenStates';
import StatusBadge from '../../components/badges/StatusBadge';

const NGOHomeScreen = ({ navigation }) => {
  const { user, signOut } = useAuth();
  const { profile, requirements, deliveries, assignedTasks, loading, error } = useNGO(user?.uid);
  const [unreadCount, setUnreadCount] = useState(0);

  // Real-time notifications count
  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = subscribeToNotifications(user.uid, (data) => {
      const unread = data.filter((n) => !n.read).length;
      setUnreadCount(unread);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  // Set navigation options for the Bell icon
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerRight}>
          <NotificationBell
            count={unreadCount}
            onPress={() => navigation.navigate('Notifications')}
          />
        </View>
      ),
    });
  }, [navigation, unreadCount]);

  if (loading) {
    return <LoadingState message="Loading NGO dashboard..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  // Derived stats
  const activeRequirements = requirements.length;
  
  // Tasks that are scheduled for this NGO but not yet completed
  const scheduledTasks = (assignedTasks || []).filter(t => t.status !== 'completed');

  const pendingDeliveriesCount = deliveries.filter(
    (d) => d.status !== DELIVERY_STATUS.DELIVERED
  ).length + scheduledTasks.length;

  const completedDeliveriesCount = deliveries.filter(
    (d) => d.status === DELIVERY_STATUS.DELIVERED
  ).length;

  // Combine active tasks and any non-delivered actual deliveries (if any exist)
  const recentDeliveries = [
    ...scheduledTasks.map(t => ({
      ...t,
      isTask: true,
      donationCategory: t.category,
      volunteerName: t.status === 'open' ? 'Awaiting Volunteer' : 'Assigned Volunteer',
    })),
    ...deliveries.filter((d) => d.status !== DELIVERY_STATUS.DELIVERED)
  ].slice(0, 3);

  const displayName = profile?.ngoName || profile?.name || user?.displayName || 'MeshMission NGO';

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (_err) {
      // Auth state listener handles navigation
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.greeting}>Welcome Back</Text>
          <Text style={styles.ngoName}>{displayName} 🏢</Text>
          {profile?.registrationNumber && (
            <Text style={styles.regNumber}>Reg: {profile.registrationNumber}</Text>
          )}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: Colors.primaryButton }]}>
              {activeRequirements}
            </Text>
            <Text style={styles.statLabel}>Active Needs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: Colors.warningAlert }]}>
              {pendingDeliveriesCount}
            </Text>
            <Text style={styles.statLabel}>Pending Deliveries</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: Colors.successAlert }]}>
              {completedDeliveriesCount}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>

        {/* Action Center Grid */}
        <Text style={styles.sectionTitle}>Action Center</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Requirements')}
            activeOpacity={0.7}
          >
            <Text style={styles.actionIcon}>📦</Text>
            <Text style={styles.actionTitle}>Manage Needs</Text>
            <Text style={styles.actionDesc}>List NGO requirements</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Deliveries')}
            activeOpacity={0.7}
          >
            <Text style={styles.actionIcon}>🚚</Text>
            <Text style={styles.actionTitle}>Deliveries</Text>
            <Text style={styles.actionDesc}>Track current arrivals</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Volunteers')}
            activeOpacity={0.7}
          >
            <Text style={styles.actionIcon}>🤝</Text>
            <Text style={styles.actionTitle}>Volunteers</Text>
            <Text style={styles.actionDesc}>Assigned transporters</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Impact')}
            activeOpacity={0.7}
          >
            <Text style={styles.actionIcon}>📈</Text>
            <Text style={styles.actionTitle}>Our Impact</Text>
            <Text style={styles.actionDesc}>Fulfillment metrics</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Pending Deliveries */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.sectionTitle}>Incoming Deliveries</Text>
            {deliveries.length > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate('Deliveries')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            )}
          </View>

          {recentDeliveries.length === 0 ? (
            <View style={styles.emptyRecent}>
              <Text style={styles.emptyRecentText}>📦 No incoming deliveries scheduled at the moment.</Text>
            </View>
          ) : (
            recentDeliveries.map((delivery) => (
              <TouchableOpacity
                key={delivery.id}
                style={styles.deliveryCard}
                onPress={() => navigation.navigate('Deliveries')}
                activeOpacity={0.7}
              >
                <View style={styles.deliveryRow}>
                  <View style={styles.deliveryInfo}>
                    <Text style={styles.deliveryCategory}>
                      {CATEGORY_ICONS[delivery.donationCategory] || '📦'}{' '}
                      {CATEGORY_LABELS[delivery.donationCategory] || delivery.donationCategory}
                    </Text>
                    <Text style={styles.deliverySubtitle}>
                      Qty: {delivery.quantity || 1} • Transporter:{' '}
                      {delivery.volunteerName || 'Assigned Volunteer'}
                    </Text>
                    {delivery.volunteerPhone && (
                      <Text style={styles.deliveryPhone}>📞 {delivery.volunteerPhone}</Text>
                    )}
                  </View>
                  <StatusBadge status={delivery.status} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Log Out */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
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
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  headerRight: {
    marginRight: 12,
  },
  welcomeSection: {
    marginBottom: 24,
    backgroundColor: Colors.primaryLight,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primaryMuted,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.icon,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  ngoName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.heading,
    marginTop: 4,
  },
  regNumber: {
    fontSize: 12,
    color: Colors.paragraph,
    marginTop: 6,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    color: Colors.paragraph,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.heading,
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  actionCard: {
    width: '48%',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.heading,
  },
  actionDesc: {
    fontSize: 11,
    color: Colors.paragraph,
    marginTop: 4,
  },
  recentSection: {
    marginBottom: 28,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primaryButton,
  },
  emptyRecent: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  emptyRecentText: {
    fontSize: 13,
    color: Colors.disabledText,
    textAlign: 'center',
  },
  deliveryCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  deliveryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deliveryInfo: {
    flex: 1,
    marginRight: 10,
  },
  deliveryCategory: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.heading,
  },
  deliverySubtitle: {
    fontSize: 12,
    color: Colors.paragraph,
    marginTop: 4,
  },
  deliveryPhone: {
    fontSize: 11,
    color: Colors.icon,
    marginTop: 2,
    fontWeight: '500',
  },
  logoutButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginBottom: 20,
  },
  logoutText: {
    fontSize: 15,
    color: Colors.errorAlert,
    fontWeight: '600',
  },
});

export default NGOHomeScreen;
