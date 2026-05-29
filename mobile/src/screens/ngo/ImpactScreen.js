import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import Colors from '../../constants/colors';
import { URGENCY } from '../../constants/urgency';
import { CATEGORY_ICONS, CATEGORY_LABELS } from '../../constants/categories';
import { DELIVERY_STATUS } from '../../constants/status';
import { useAuth } from '../../hooks/useAuth';
import { useNGO } from '../../hooks/useNGO';
import CapacityBar from '../../components/common/CapacityBar';
import { LoadingState, ErrorState } from '../../components/common/ScreenStates';

const ImpactScreen = () => {
  const { user } = useAuth();
  const { deliveries, requirements, loading, error } = useNGO(user?.uid);

  if (loading) {
    return <LoadingState message="Calculating impact analytics..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  // 1. Overall Delivery Stats
  const totalDeliveries = deliveries.length;
  const completedDeliveries = deliveries.filter((d) => d.status === DELIVERY_STATUS.DELIVERED).length;
  const activeDeliveries = totalDeliveries - completedDeliveries;
  const fulfillmentRate = totalDeliveries > 0 ? Math.round((completedDeliveries / totalDeliveries) * 100) : 0;

  // 2. Emergency Metrics
  const totalEmergencyNeeds = requirements.filter((r) => r.urgency === URGENCY.EMERGENCY).length;
  const activeEmergencyNeeds = requirements.filter((r) => r.urgency === URGENCY.EMERGENCY).length; // active posted

  // 3. Category distribution (Received Items)
  const categoryReceivedCounts = {};
  deliveries.forEach((d) => {
    if (d.status === DELIVERY_STATUS.DELIVERED) {
      const cat = d.donationCategory || 'other';
      categoryReceivedCounts[cat] = (categoryReceivedCounts[cat] || 0) + (d.quantity || 1);
    }
  });

  const categoryImpactList = Object.keys(categoryReceivedCounts).map((cat) => ({
    category: cat,
    count: categoryReceivedCounts[cat],
  })).sort((a, b) => b.count - a.count);

  const maxCategoryCount = categoryImpactList.length > 0 ? categoryImpactList[0].count : 1;

  // 4. Monthly Fulfillment Comparison
  // Aggregate deliveries by month (e.g. "May", "Apr", etc.)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyData = {};

  // Seed last 3 months just in case database is sparse
  const now = new Date();
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthlyData[monthNames[d.getMonth()]] = 0;
  }

  deliveries.forEach((d) => {
    if (d.status === DELIVERY_STATUS.DELIVERED) {
      const date = d.receivedAt?.toDate ? d.receivedAt.toDate() : (d.receivedAt ? new Date(d.receivedAt) : null);
      if (date) {
        const monthName = monthNames[date.getMonth()];
        monthlyData[monthName] = (monthlyData[monthName] || 0) + 1;
      }
    }
  });

  const monthComparisons = Object.keys(monthlyData).map((m) => ({
    month: m,
    count: monthlyData[m],
  })).reverse(); // show chronological

  const maxMonthCount = Math.max(...monthComparisons.map((m) => m.count), 1);

  // 5. General Impact Highlights
  const totalPackagesReceived = deliveries
    .filter((d) => d.status === DELIVERY_STATUS.DELIVERED)
    .reduce((sum, d) => sum + (d.quantity || 1), 0);

  // Lives touched formula: ~3 lives touched per completed package/donation
  const estimatedLivesTouched = totalPackagesReceived * 3;
  const uniqueVolunteersCount = new Set(deliveries.map((d) => d.volunteerId).filter(Boolean)).size;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headerTitle}>Impact Dashboard</Text>
        <Text style={styles.headerSubtitle}>
          Visualizing your NGO's distribution outcomes, emergency responses, and volunteer efforts.
        </Text>

        {/* Global Impact Grid */}
        <View style={styles.gridRow}>
          <View style={styles.impactGridCard}>
            <Text style={styles.impactIcon}>❤️</Text>
            <Text style={styles.impactValue}>{estimatedLivesTouched}</Text>
            <Text style={styles.impactLabel}>Lives Touched</Text>
          </View>
          <View style={styles.impactGridCard}>
            <Text style={styles.impactIcon}>📦</Text>
            <Text style={styles.impactValue}>{totalPackagesReceived}</Text>
            <Text style={styles.impactLabel}>Donations Distributed</Text>
          </View>
        </View>

        <View style={styles.gridRow}>
          <View style={styles.impactGridCard}>
            <Text style={styles.impactIcon}>🤝</Text>
            <Text style={styles.impactValue}>{uniqueVolunteersCount}</Text>
            <Text style={styles.impactLabel}>Volunteers Engaged</Text>
          </View>
          <View style={styles.impactGridCard}>
            <Text style={styles.impactIcon}>🎯</Text>
            <Text style={styles.impactValue}>{fulfillmentRate}%</Text>
            <Text style={styles.impactLabel}>Fulfillment Rate</Text>
          </View>
        </View>

        {/* Emergency Metrics */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>🚨 Emergency Metrics</Text>
          <View style={styles.emergencyRow}>
            <View style={styles.emergencyItem}>
              <Text style={[styles.emergencyValue, { color: Colors.errorAlert }]}>
                {totalEmergencyNeeds}
              </Text>
              <Text style={styles.emergencyLabel}>Total Emergency Supply Needs</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.emergencyItem}>
              <Text style={[styles.emergencyValue, { color: Colors.warningAlert }]}>
                {activeEmergencyNeeds}
              </Text>
              <Text style={styles.emergencyLabel}>Currently Awaiting Matching</Text>
            </View>
          </View>
        </View>

        {/* Category Breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>🍲 Supplies Distributed by Category</Text>
          {categoryImpactList.length === 0 ? (
            <Text style={styles.emptyText}>No distribution logs found yet. Deliveries will feed this graph.</Text>
          ) : (
            categoryImpactList.map((item) => (
              <View key={item.category} style={styles.breakdownRow}>
                <View style={styles.categoryInfo}>
                  <Text style={styles.catEmoji}>{CATEGORY_ICONS[item.category] || '📦'}</Text>
                  <Text style={styles.catName}>
                    {CATEGORY_LABELS[item.category] || item.category}
                  </Text>
                </View>
                <View style={styles.barContainer}>
                  <CapacityBar current={item.count} max={maxCategoryCount} />
                  <Text style={styles.countText}>{item.count} items</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Monthly Fulfillment Comparisons */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>📊 Monthly Distribution Growth</Text>
          <View style={styles.monthChartContainer}>
            {monthComparisons.map((item) => {
              const heightPercentage = maxMonthCount > 0 ? (item.count / maxMonthCount) * 100 : 0;
              return (
                <View key={item.month} style={styles.monthColumn}>
                  <View style={styles.columnBarTrack}>
                    <View
                      style={[
                        styles.columnBarFill,
                        { height: `${Math.max(heightPercentage, 8)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.monthLabel}>{item.month}</Text>
                  <Text style={styles.monthCount}>{item.count}</Text>
                </View>
              );
            })}
          </View>
        </View>
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
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.heading,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.paragraph,
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 20,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  impactGridCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  impactIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  impactValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.heading,
  },
  impactLabel: {
    fontSize: 11,
    color: Colors.paragraph,
    marginTop: 4,
    fontWeight: '600',
    textAlign: 'center',
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  cardHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.heading,
    marginBottom: 16,
  },
  emergencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emergencyItem: {
    flex: 1,
    alignItems: 'center',
  },
  emergencyValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  emergencyLabel: {
    fontSize: 11,
    color: Colors.paragraph,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 15,
  },
  divider: {
    width: 1,
    height: 48,
    backgroundColor: Colors.cardBorder,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 110,
    gap: 8,
  },
  catEmoji: {
    fontSize: 18,
  },
  catName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.heading,
  },
  barContainer: {
    flex: 1,
  },
  countText: {
    fontSize: 10,
    color: Colors.paragraph,
    marginTop: 2,
    fontWeight: '500',
  },
  monthChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 160,
    paddingTop: 20,
  },
  monthColumn: {
    alignItems: 'center',
    width: 50,
  },
  columnBarTrack: {
    width: 16,
    height: 100,
    backgroundColor: Colors.inputBackground,
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  columnBarFill: {
    backgroundColor: Colors.primaryButton,
    borderRadius: 8,
  },
  monthLabel: {
    fontSize: 11,
    color: Colors.paragraph,
    fontWeight: '700',
    marginTop: 8,
  },
  monthCount: {
    fontSize: 10,
    color: Colors.primaryButton,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.disabledText,
    textAlign: 'center',
    paddingVertical: 10,
  },
});

export default ImpactScreen;
