import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import Colors from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { subscribeToNotifications, markNotificationRead, deleteDoc, doc } from '../../firebase/firestore';
import { db } from '../../firebase/config';
import { LoadingState, EmptyState } from '../../components/common/ScreenStates';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TYPE_ICONS = {
  approval: '✅',
  rejection: '❌',
  assignment: '📋',
  otp: '🔑',
  delivery: '🚚',
};

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return 'Just now';
  
  // Handle Firestore Timestamp or millisecond numbers
  const date = timestamp.toMillis ? timestamp.toDate() : new Date(timestamp);
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export default function NotificationsScreen({ navigation }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    // Real-time subscription to notifications
    const unsubscribe = subscribeToNotifications(user.uid, (data) => {
      setNotifications(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleNotificationPress = useCallback(async (item) => {
    if (!item.read) {
      // Mark as read in Firestore
      await markNotificationRead(item.id);
    }

    // Optional: If the notification has a related entity (e.g. donationId or taskId), we could navigate to details!
    if (item.type === 'assignment' && item.taskId) {
      navigation.navigate('VolunteerTaskDetail', { taskId: item.taskId });
    } else if ((item.type === 'approval' || item.type === 'rejection') && item.donationId) {
      navigation.navigate('DonationDetail', { donationId: item.donationId });
    }
  }, [navigation]);

  if (loading) {
    return <LoadingState message="Fetching your notifications..." />;
  }

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.warn('Failed to delete notification', error);
    }
  };

  const renderItem = ({ item }) => {
    const isUnread = !item.read;
    const icon = TYPE_ICONS[item.type] || '🔔';

    return (
      <SwipeableNotificationItem 
        item={item} 
        icon={icon} 
        isUnread={isUnread} 
        onPress={() => handleNotificationPress(item)} 
        onDelete={() => handleDelete(item.id)} 
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={() => (
          <EmptyState
            icon="notifications-off-outline"
            title="All quiet here"
            message="No notifications to show right now. We'll alert you when there is an update!"
          />
        )}
      />
    </SafeAreaView>
  );
}

const SwipeableNotificationItem = ({ item, icon, isUnread, onPress, onDelete }) => {
  const pan = React.useRef(new Animated.ValueXY()).current;
  const itemHeight = React.useRef(new Animated.Value(1)).current; // For collapse animation
  const SWIPE_THRESHOLD = -SCREEN_WIDTH * 0.3;

  const panResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only claim the responder if horizontal swipe is stronger than vertical
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow swiping left
        if (gestureState.dx < 0) {
          pan.setValue({ x: gestureState.dx, y: 0 });
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < SWIPE_THRESHOLD) {
          // Swipe left past threshold: animate out and delete
          Animated.sequence([
            Animated.timing(pan, {
              toValue: { x: -SCREEN_WIDTH, y: 0 },
              duration: 200,
              useNativeDriver: false,
            }),
            Animated.timing(itemHeight, {
              toValue: 0,
              duration: 200,
              useNativeDriver: false,
            })
          ]).start(() => {
            onDelete();
          });
        } else {
          // Swipe back to original position
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 5,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  // We use max height to animate collapse smoothly
  const animatedHeight = itemHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 150]
  });
  const animatedOpacity = itemHeight;

  return (
    <Animated.View style={[styles.swipeContainer, { maxHeight: animatedHeight, opacity: animatedOpacity }]}>
      {/* Background delete action */}
      <View style={styles.deleteActionBg}>
        <Ionicons name="trash-outline" size={24} color={Colors.white} />
        <Text style={styles.deleteText}>Delete</Text>
      </View>
      
      {/* Foreground swipable item */}
      <Animated.View
        style={{
          transform: [{ translateX: pan.x }]
        }}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={[
            styles.notificationItem,
            isUnread && styles.unreadItem,
          ]}
          onPress={onPress}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{icon}</Text>
          </View>
          <View style={styles.textContainer}>
            <View style={styles.headerRow}>
              <Text style={[styles.title, isUnread && styles.unreadText]}>
                {item.title}
              </Text>
              {isUnread && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.time}>{formatTimeAgo(item.createdAt)}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mainBackground,
  },
  listContent: {
    flexGrow: 1,
    paddingVertical: 8,
  },
  swipeContainer: {
    overflow: 'hidden',
  },
  deleteActionBg: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    right: 16,
    left: 16,
    backgroundColor: Colors.errorAlert,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 20,
  },
  deleteText: {
    color: Colors.white,
    fontWeight: '600',
    marginLeft: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  unreadItem: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primaryMuted,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.mainBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 22,
  },
  textContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.heading,
    flex: 1,
  },
  unreadText: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primaryButton,
    marginLeft: 8,
  },
  body: {
    fontSize: 13,
    color: Colors.paragraph,
    lineHeight: 18,
    marginBottom: 6,
  },
  time: {
    fontSize: 11,
    color: Colors.disabledText,
    fontWeight: '500',
  },
});
