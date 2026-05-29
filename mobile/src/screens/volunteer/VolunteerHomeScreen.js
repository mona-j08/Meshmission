import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Colors from '../../constants/colors';
import { PICKUP_TASK_STATUS } from '../../constants/status';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '../../constants/categories';
import { useAuth } from '../../hooks/useAuth';
import { useVolunteer } from '../../hooks/useVolunteer';
import { useTasks } from '../../hooks/useTasks';
import { getGeneralArea } from '../../utils/locationHelper';
import { subscribeToNotifications } from '../../firebase/firestore';
import PrimaryButton from '../../components/common/PrimaryButton';
import NotificationBell from '../../components/common/NotificationBell';
import { LoadingState, ErrorState } from '../../components/common/ScreenStates';
import StatusBadge from '../../components/badges/StatusBadge';

const VEHICLE_ICONS = {
  bike: '🚲',
  car: '🚗',
  van: '🚐',
};

const VEHICLE_LABELS = {
  bike: 'Bike',
  car: 'Car',
  van: 'Van',
};

const VolunteerHomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const {
    profile,
    loading: profileLoading,
    error: profileError,
  } = useVolunteer(user?.uid);
  const {
    tasks,
    stats,
    loading: tasksLoading,
    error: tasksError,
  } = useTasks(user?.uid);

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = subscribeToNotifications(user.uid, (data) => {
      const unread = data.filter((n) => !n.read).length;
      setUnreadCount(unread);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const loading = profileLoading || tasksLoading;
  const error = profileError || tasksError;

  const recentTasks = tasks ? tasks.slice(0, 3) : [];

  const displayName = profile?.name || user?.displayName || 'Volunteer';
  
  // FUNC-7: Volunteer Badge Logic
  const getBadge = (completedCount) => {
    if (!completedCount) return { name: 'Bronze', icon: '🥉', color: '#CD7F32' };
    if (completedCount >= 50) return { name: 'Hero', icon: '🦸', color: '#8B5CF6' };
    if (completedCount >= 20) return { name: 'Gold', icon: '🥇', color: '#F59E0B' };
    if (completedCount >= 5) return { name: 'Silver', icon: '🥈', color: '#9CA3AF' };
    return { name: 'Bronze', icon: '🥉', color: '#CD7F32' };
  };
  
  const volunteerBadge = getBadge(profile?.stats?.totalCompleted || stats?.completedThisWeek || 0);

  React.useLayoutEffect(() => {
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
    return <LoadingState message="Loading your dashboard..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <View style={styles.welcomeHeader}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{displayName} 👋</Text>
          </View>
          <View style={[styles.badgeContainer, { backgroundColor: volunteerBadge.color + '20' }]}>
            <Text style={styles.badgeIcon}>{volunteerBadge.icon}</Text>
            <Text style={[styles.badgeName, { color: volunteerBadge.color }]}>{volunteerBadge.name}</Text>
          </View>
        </View>
      </View>

      {/* Vehicle Badge */}
      {profile?.hasVehicle && profile?.vehicleType && (
        <View style={styles.vehicleBadge}>
          <Text style={styles.vehicleIcon}>
            {VEHICLE_ICONS[profile.vehicleType] || '🚗'}
          </Text>
          <Text style={styles.vehicleText}>
            {VEHICLE_LABELS[profile.vehicleType] || profile.vehicleType} Available
          </Text>
        </View>
      )}

      {/* Stats Section */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.todaysPickups ?? 0}</Text>
          <Text style={styles.statLabel}>Today's Pickups</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.completedThisWeek ?? 0}</Text>
          <Text style={styles.statLabel}>Completed This Week</Text>
        </View>
      </View>

      {/* View My Tasks Button */}
      <PrimaryButton
        title="View My Tasks"
        onPress={() => navigation.navigate('VolunteerTasks')}
        style={styles.tasksButton}
      />

      {/* Recent Tasks */}
      <View style={styles.recentSection}>
        <Text style={styles.sectionTitle}>Recent Tasks</Text>
        {recentTasks.length === 0 ? (
          <View style={styles.emptyRecent}>
            <Text style={styles.emptyRecentText}>
              No tasks yet. New assignments will appear here.
            </Text>
          </View>
        ) : (
          recentTasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={styles.recentTaskCard}
              onPress={() => {
                if (task.status !== PICKUP_TASK_STATUS.ASSIGNED) {
                  navigation.navigate('VolunteerTaskDetail', { task });
                }
              }}
              activeOpacity={0.7}
            >
              <View style={styles.recentTaskRow}>
                <View style={styles.recentTaskInfo}>
                  <Text style={styles.recentTaskCategory}>
                    {CATEGORY_ICONS[task.category] || '📦'}{' '}
                    {CATEGORY_LABELS[task.category] || task.category}
                  </Text>
                  <Text style={styles.recentTaskArea}>
                    {getGeneralArea(task.donorLocation)}
                  </Text>
                </View>
                <StatusBadge status={task.status} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.mainBackground,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  headerRight: {
    marginRight: 12,
  },
  welcomeSection: {
    marginBottom: 16,
  },
  greeting: {
    fontSize: 16,
    color: Colors.paragraph,
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userName: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.heading,
    marginTop: 2,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  badgeIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  badgeName: {
    fontSize: 13,
    fontWeight: '700',
  },
  vehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  vehicleIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  vehicleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.icon,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.primaryButton,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.paragraph,
    marginTop: 6,
    textAlign: 'center',
  },
  tasksButton: {
    marginBottom: 28,
  },
  recentSection: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.heading,
    marginBottom: 12,
  },
  emptyRecent: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  emptyRecentText: {
    fontSize: 14,
    color: Colors.disabledText,
    textAlign: 'center',
  },
  recentTaskCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  recentTaskRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentTaskInfo: {
    flex: 1,
    marginRight: 12,
  },
  recentTaskCategory: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.heading,
    marginBottom: 4,
  },
  recentTaskArea: {
    fontSize: 13,
    color: Colors.paragraph,
  },
});

export default VolunteerHomeScreen;
