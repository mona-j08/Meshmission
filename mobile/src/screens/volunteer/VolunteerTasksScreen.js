import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../constants/colors';
import { PICKUP_TASK_STATUS } from '../../constants/status';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '../../constants/categories';
import { useAuth } from '../../hooks/useAuth';
import { useTasks } from '../../hooks/useTasks';
import { getInitials } from '../../utils/matchingHelper';
import { getGeneralArea } from '../../utils/locationHelper';
import TaskCard from '../../components/cards/TaskCard';
import PrimaryButton from '../../components/common/PrimaryButton';
import StatusBadge from '../../components/badges/StatusBadge';
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from '../../components/common/ScreenStates';

const FILTER_TABS = [
  { key: 'available', label: 'Available' },
  { key: 'my_tasks', label: 'My Tasks' },
  { key: PICKUP_TASK_STATUS.COMPLETED, label: 'Completed' },
];

const VolunteerTasksScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { tasks, openTasks, loading, error, acceptTask, declineTask, acceptMultipleTasks } = useTasks(user?.uid);
  const [activeFilter, setActiveFilter] = useState('available');
  const [actionLoading, setActionLoading] = useState(null);
  
  // FUNC-2: Multiple selection
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());

  const filteredTasks = activeFilter === 'available' 
    ? openTasks 
    : activeFilter === 'my_tasks'
      ? tasks.filter(t => t.status !== PICKUP_TASK_STATUS.COMPLETED && t.status !== PICKUP_TASK_STATUS.DECLINED)
      : tasks.filter(t => t.status === activeFilter);

  const handleAccept = async (taskId) => {
    setActionLoading(taskId);
    try {
      const result = await acceptTask(taskId);
      if (result?.error) {
        Alert.alert('Error', result.error);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to accept task. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = (taskId) => {
    Alert.alert(
      'Decline Task',
      'Are you sure you want to decline this pickup task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(taskId);
            try {
              const result = await declineTask(taskId);
              if (result?.error) {
                Alert.alert('Error', result.error);
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to decline task.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleTaskPress = (task) => {
    if (isMultiSelectMode && (task.status === PICKUP_TASK_STATUS.ASSIGNED || task.status === PICKUP_TASK_STATUS.OPEN)) {
      toggleTaskSelection(task.id);
      return;
    }
    if (task.status !== PICKUP_TASK_STATUS.ASSIGNED && task.status !== PICKUP_TASK_STATUS.OPEN) {
      navigation.navigate('VolunteerTaskDetail', { taskId: task.id, task });
    }
  };

  const toggleTaskSelection = (id) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAcceptMultiple = async () => {
    if (selectedTaskIds.size === 0) return;
    setActionLoading('multiple');
    try {
      const result = await acceptMultipleTasks(Array.from(selectedTaskIds));
      if (!result) {
        Alert.alert('Error', 'Failed to accept selected tasks.');
      } else {
        setIsMultiSelectMode(false);
        setSelectedTaskIds(new Set());
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to accept tasks.');
    } finally {
      setActionLoading(null);
    }
  };

  // Resolves the best date label for a task: scheduled date > preferred > TBD
  const resolveDateLabel = (task) => {
    if (task.scheduledDate) {
      const d = task.scheduledDate?.toDate ? task.scheduledDate.toDate() : new Date(task.scheduledDate);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    if (task.preferredPickupDate) {
      return `Preferred: ${task.preferredPickupDate}`;
    }
    return 'Pickup date TBD';
  };

  const renderTaskItem = useCallback(
    ({ item }) => {
      const isSelected = selectedTaskIds.has(item.id);
      return (
      <TouchableOpacity
        style={[
          styles.taskCardWrapper, 
          isMultiSelectMode && (item.status === PICKUP_TASK_STATUS.ASSIGNED || item.status === PICKUP_TASK_STATUS.OPEN) && isSelected && styles.taskCardSelected
        ]}
        onPress={() => handleTaskPress(item)}
        activeOpacity={(item.status === PICKUP_TASK_STATUS.ASSIGNED || item.status === PICKUP_TASK_STATUS.OPEN) && !isMultiSelectMode ? 1 : 0.7}
        disabled={(item.status === PICKUP_TASK_STATUS.ASSIGNED || item.status === PICKUP_TASK_STATUS.OPEN) && !isMultiSelectMode}
      >
        <TaskCard
          task={item}
          donorInitials={getInitials(item.donorName)}
          categoryLabel={CATEGORY_LABELS[item.category] || item.category}
          categoryIcon={CATEGORY_ICONS[item.category] || '📦'}
          generalArea={getGeneralArea(item.donorLocation)}
          scheduledDate={resolveDateLabel(item)}
          statusBadge={<StatusBadge status={item.status} />}
        />
        { (item.status === PICKUP_TASK_STATUS.ASSIGNED || item.status === PICKUP_TASK_STATUS.OPEN) && !isMultiSelectMode && (
          <View style={styles.actionButtons}>
            {item.status === PICKUP_TASK_STATUS.ASSIGNED && (
              <TouchableOpacity
                style={styles.declineButton}
                onPress={() => handleDecline(item.id)}
                disabled={actionLoading === item.id}
              >
                <Text style={styles.declineButtonText}>Decline</Text>
              </TouchableOpacity>
            )}
            <PrimaryButton
              title={actionLoading === item.id ? 'Accepting...' : 'Accept'}
              onPress={() => handleAccept(item.id)}
              disabled={actionLoading === item.id}
              style={styles.acceptButton}
            />
          </View>
        )}
      </TouchableOpacity>
    )},
    [actionLoading, isMultiSelectMode, selectedTaskIds]
  );

  if (loading) {
    return <LoadingState message="Loading your tasks..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <View style={styles.filterRow}>
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterTab, isActive && styles.filterTabActive]}
              onPress={() => setActiveFilter(tab.key)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  isActive && styles.filterTabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
        </View>
        
        {/* Multi-Select Toggle */}
        {(activeFilter === 'available' || activeFilter === 'my_tasks') && filteredTasks.some(t => t.status === PICKUP_TASK_STATUS.OPEN || t.status === PICKUP_TASK_STATUS.ASSIGNED) && (
          <TouchableOpacity 
            style={styles.multiSelectToggle}
            onPress={() => {
              setIsMultiSelectMode(!isMultiSelectMode);
              setSelectedTaskIds(new Set());
            }}
          >
            <Text style={styles.multiSelectText}>
              {isMultiSelectMode ? 'Cancel Selection' : 'Bundle Tasks'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Task List */}
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        renderItem={renderTaskItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            message={
              activeFilter === 'all'
                ? 'No tasks assigned yet. Check back soon!'
                : `No ${activeFilter} tasks.`
            }
          />
        }
      />

      {isMultiSelectMode && (
        <View style={styles.floatingAction}>
          <PrimaryButton 
            title={actionLoading === 'multiple' ? 'Accepting...' : `Accept Selected (${selectedTaskIds.size})`}
            onPress={handleAcceptMultiple}
            disabled={selectedTaskIds.size === 0 || actionLoading === 'multiple'}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mainBackground,
  },
  filterContainer: {
    backgroundColor: Colors.navbarBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
  },
  filterTabActive: {
    backgroundColor: Colors.primaryButton,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.paragraph,
  },
  filterTabTextActive: {
    color: Colors.white,
  },
  multiSelectToggle: {
    alignSelf: 'center',
    paddingBottom: 12,
  },
  multiSelectText: {
    color: Colors.primaryButton,
    fontWeight: '700',
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  taskCardWrapper: {
    marginBottom: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  taskCardSelected: {
    borderColor: Colors.primaryButton,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 10,
  },
  declineButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.errorAlert,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.errorAlert,
  },
  acceptButton: {
    flex: 1,
  },
  floatingAction: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
});

export default VolunteerTasksScreen;
