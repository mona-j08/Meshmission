import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../constants/colors';
import { DELIVERY_STATUS } from '../../constants/status';
import { CATEGORY_ICONS, CATEGORY_LABELS } from '../../constants/categories';
import { useAuth } from '../../hooks/useAuth';
import { useNGO } from '../../hooks/useNGO';
import StatusBadge from '../../components/badges/StatusBadge';
import PrimaryButton from '../../components/common/PrimaryButton';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { LoadingState, ErrorState, EmptyState } from '../../components/common/ScreenStates';

const NGODeliveriesScreen = () => {
  const { user } = useAuth();
  const { deliveries, loading, error, confirmDelivery } = useNGO(user?.uid);
  const [activeTab, setActiveTab] = useState('scheduled'); // 'scheduled' | 'completed'
  
  // Confirmation states
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [deliveryToConfirm, setDeliveryToConfirm] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Filter deliveries based on status
  const scheduledDeliveries = deliveries.filter(
    (d) => d.status !== DELIVERY_STATUS.DELIVERED
  );
  const completedDeliveries = deliveries.filter(
    (d) => d.status === DELIVERY_STATUS.DELIVERED
  );

  const handleConfirmPress = (delivery) => {
    setDeliveryToConfirm(delivery);
    setConfirmModalVisible(true);
  };

  const handleConfirmReceipt = async () => {
    if (!deliveryToConfirm) return;
    setConfirmLoading(true);
    try {
      const success = await confirmDelivery(deliveryToConfirm.id);
      if (success) {
        Alert.alert('Receipt Confirmed', 'The package has been verified and marked as received.');
      } else {
        Alert.alert('Error', 'Failed to confirm receipt. Please try again.');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Something went wrong.');
    } finally {
      setConfirmLoading(false);
      setConfirmModalVisible(false);
      setDeliveryToConfirm(null);
    }
  };

  const handleCall = (phoneNumber) => {
    if (!phoneNumber) return;
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      // Quiet fail on simulators
    });
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderDeliveryCard = ({ item }) => {
    const isCompleted = item.status === DELIVERY_STATUS.DELIVERED;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryIcon}>{CATEGORY_ICONS[item.donationCategory] || '📦'}</Text>
            <View>
              <Text style={styles.cardTitle}>
                {CATEGORY_LABELS[item.donationCategory] || item.donationCategory} Donation
              </Text>
              <Text style={styles.quantityText}>Quantity: {item.quantity || 1}</Text>
            </View>
          </View>
          <StatusBadge status={item.status} />
        </View>

        <View style={styles.detailsBox}>
          {/* Volunteer Info */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Volunteer Transporter:</Text>
            <Text style={styles.detailValue}>{item.volunteerName || 'Assigned Volunteer'}</Text>
          </View>

          {item.volunteerPhone ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Contact Phone:</Text>
              <TouchableOpacity onPress={() => handleCall(item.volunteerPhone)}>
                <Text style={[styles.detailValue, styles.linkText]}>📞 {item.volunteerPhone}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Vehicle */}
          {item.vehicleType ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Vehicle Details:</Text>
              <Text style={styles.detailValue}>{item.vehicleType.toUpperCase()}</Text>
            </View>
          ) : null}

          {/* Timestamps */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Assigned Date:</Text>
            <Text style={styles.detailValue}>{formatDate(item.createdAt)}</Text>
          </View>

          {isCompleted && item.receivedAt ? (
            <View style={[styles.detailRow, styles.receivedRow]}>
              <Text style={styles.receivedLabel}>Received At NGO:</Text>
              <Text style={styles.receivedValue}>{formatDate(item.receivedAt)}</Text>
            </View>
          ) : null}
        </View>

        {/* Action Button */}
        {!isCompleted ? (
          <PrimaryButton
            title="Confirm Package Received"
            onPress={() => handleConfirmPress(item)}
            style={styles.confirmBtn}
          />
        ) : (
          <View style={styles.completedBanner}>
            <Text style={styles.completedBannerText}>✓ Package Handed Over & Logged</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return <LoadingState message="Loading deliveries..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  const currentData = activeTab === 'scheduled' ? scheduledDeliveries : completedDeliveries;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Navigation Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'scheduled' && styles.tabActive]}
            onPress={() => setActiveTab('scheduled')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'scheduled' && styles.tabTextActive,
              ]}
            >
              Scheduled ({scheduledDeliveries.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'completed' && styles.tabActive]}
            onPress={() => setActiveTab('completed')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'completed' && styles.tabTextActive,
              ]}
            >
              Completed ({completedDeliveries.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* FlatList for Deliveries */}
        <FlatList
          data={currentData}
          keyExtractor={(item) => item.id}
          renderItem={renderDeliveryCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              message={
                activeTab === 'scheduled'
                  ? 'No incoming deliveries scheduled. As soon as a volunteer initiates a transfer, it will appear here!'
                  : 'You have not confirmed receipt of any deliveries yet.'
              }
            />
          }
        />

        {/* Confirmation Modal */}
        <ConfirmationModal
          visible={confirmModalVisible}
          title="Confirm Package Receipt?"
          message={`Are you sure you have received the donation of '${
            deliveryToConfirm
              ? CATEGORY_LABELS[deliveryToConfirm.donationCategory] || deliveryToConfirm.donationCategory
              : ''
          }'? This will mark the transfer complete and notify the donor and volunteer.`}
          confirmText="Yes, Received"
          cancelText="Cancel"
          onConfirm={handleConfirmReceipt}
          onCancel={() => setConfirmModalVisible(false)}
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
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.navbarBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: Colors.transparent,
  },
  tabActive: {
    borderBottomColor: Colors.primaryButton,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.paragraph,
  },
  tabTextActive: {
    color: Colors.primaryButton,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 40,
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
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  categoryIcon: {
    fontSize: 26,
    backgroundColor: Colors.inputBackground,
    padding: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.heading,
  },
  quantityText: {
    fontSize: 12,
    color: Colors.paragraph,
    marginTop: 2,
    fontWeight: '500',
  },
  detailsBox: {
    backgroundColor: Colors.inputBackground,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.paragraph,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    color: Colors.heading,
    fontWeight: '600',
  },
  linkText: {
    color: Colors.icon,
    textDecorationLine: 'underline',
  },
  receivedRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    paddingTop: 10,
    marginTop: 2,
  },
  receivedLabel: {
    fontSize: 13,
    color: Colors.successAlert,
    fontWeight: '600',
  },
  receivedValue: {
    fontSize: 13,
    color: Colors.successAlert,
    fontWeight: '700',
  },
  confirmBtn: {
    height: 48,
  },
  completedBanner: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.successAlert,
  },
  completedBannerText: {
    fontSize: 14,
    color: Colors.successAlert,
    fontWeight: '700',
  },
});

export default NGODeliveriesScreen;
