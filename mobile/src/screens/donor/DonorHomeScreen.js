import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/colors';
import { DONATION_STATUS } from '../../constants/status';
import { useAuth } from '../../hooks/useAuth';
import { useDonations } from '../../hooks/useDonations';
import { subscribeToNotifications } from '../../firebase/firestore';
import DonationCard from '../../components/cards/DonationCard';
import PrimaryButton from '../../components/common/PrimaryButton';
import NotificationBell from '../../components/common/NotificationBell';
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from '../../components/common/ScreenStates';

const STAT_CARDS = [
  { key: 'total', label: 'Total Donations', icon: 'gift-outline', color: Colors.primaryButton },
  { key: 'pending', label: 'Pending', icon: 'time-outline', color: Colors.warningAlert },
  { key: 'approved', label: 'Approved', icon: 'checkmark-circle-outline', color: Colors.successAlert },
  { key: 'delivered', label: 'Delivered', icon: 'rocket-outline', color: Colors.icon },
];

const StatCard = ({ label, value, icon, color }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIconContainer, { backgroundColor: color + '18' }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const DonorHomeScreen = ({ navigation }) => {
  const { user, signOut } = useAuth();
  const { donations, stats, loading, error } = useDonations(user?.uid);
  const [refreshing, setRefreshing] = React.useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = subscribeToNotifications(user.uid, (data) => {
      const unread = data.filter((n) => !n.read).length;
      setUnreadCount(unread);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerRight}>
          <NotificationBell
            count={unreadCount}
            onPress={() => navigation.navigate('Notifications')}
          />
          <TouchableOpacity onPress={handleLogout} style={styles.headerButton}>
            <Ionicons name="log-out-outline" size={24} color={Colors.heading} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, unreadCount, handleLogout]);

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
    } catch (_err) {
      // signOut handles errors internally
    }
  }, [signOut]);

  const handleDonationPress = useCallback(
    (donation) => {
      navigation.navigate('DonationDetail', { donationId: donation.id, donation });
    },
    [navigation]
  );

  const handleNewDonation = useCallback(() => {
    navigation.navigate('Donate');
  }, [navigation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // The hook uses real-time subscription, so a brief delay simulates refresh
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const getStatValue = useCallback(
    (key) => {
      if (!stats) return 0;
      switch (key) {
        case 'total':
          return stats.total ?? donations.length;
        case 'pending':
          return stats.pending ?? donations.filter((d) => d.status === DONATION_STATUS.PENDING || d.status === DONATION_STATUS.UPLOADED).length;
        case 'approved':
          return stats.approved ?? donations.filter((d) => d.status === DONATION_STATUS.APPROVED).length;
        case 'delivered':
          return stats.delivered ?? donations.filter((d) => d.status === DONATION_STATUS.DELIVERED).length;
        default:
          return 0;
      }
    },
    [stats, donations]
  );

  if (loading && !refreshing) {
    return <LoadingState message="Loading your donations..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  const renderHeader = () => (
    <View style={styles.headerContent}>
      <Text style={styles.welcomeText}>
        Hello, {user?.displayName || user?.name || 'Donor'}!
      </Text>
      <Text style={styles.subtitle}>Your donation dashboard</Text>

      <View style={styles.statsGrid}>
        {STAT_CARDS.map((card) => (
          <StatCard
            key={card.key}
            label={card.label}
            value={getStatValue(card.key)}
            icon={card.icon}
            color={card.color}
          />
        ))}
      </View>

      <View style={styles.donateButtonContainer}>
        <PrimaryButton
          title="+ Donate an Item"
          onPress={handleNewDonation}
        />
      </View>

      {donations.length > 0 && (
        <Text style={styles.sectionTitle}>Past Donations</Text>
      )}
    </View>
  );

  const renderEmpty = () => (
    <EmptyState
      icon="gift-outline"
      title="No donations yet"
      message="Start making a difference by donating items you no longer need."
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={donations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DonationCard
            donation={item}
            onPress={() => handleDonationPress(item)}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primaryButton}
            colors={[Colors.primaryButton]}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mainBackground,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 8,
  },
  headerButton: {
    padding: 6,
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.heading,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.paragraph,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.heading,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.paragraph,
    textAlign: 'center',
  },
  donateButtonContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.heading,
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 32,
  },
});

export default DonorHomeScreen;
