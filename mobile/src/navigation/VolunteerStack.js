import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Colors from '../constants/colors';

// ── Placeholder screen ────────────────────────────────────────
const Placeholder = ({ route }) => (
  <Text style={placeholderStyles.text}>{route.name}</Text>
);
const placeholderStyles = StyleSheet.create({
  text: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 18,
    color: Colors.paragraph,
    padding: 32,
  },
});

// Try importing real screens
let VolunteerHomeScreen = Placeholder;
let VolunteerTasksScreen = Placeholder;
let VolunteerProfileScreen = Placeholder;
let TaskDetailScreen = Placeholder;
let PickupConfirmScreen = Placeholder;
let DeliveryScreen = Placeholder;
let CollectionPointsMapScreen = Placeholder;
let NotificationsScreen = Placeholder;
try { VolunteerHomeScreen = require('../screens/volunteer/VolunteerHomeScreen').default || Placeholder; } catch {}
try { VolunteerTasksScreen = require('../screens/volunteer/VolunteerTasksScreen').default || Placeholder; } catch {}
try { VolunteerProfileScreen = require('../screens/volunteer/VolunteerProfileScreen').default || Placeholder; } catch {}
try { TaskDetailScreen = require('../screens/volunteer/VolunteerTaskDetailScreen').default || Placeholder; } catch {}
try { PickupConfirmScreen = require('../screens/volunteer/VolunteerPickupConfirmScreen').default || Placeholder; } catch {}
try { DeliveryScreen = require('../screens/volunteer/VolunteerDeliveryScreen').default || Placeholder; } catch {}
try { CollectionPointsMapScreen = require('../screens/volunteer/CollectionPointsMapScreen').default || Placeholder; } catch {}
try { NotificationsScreen = require('../screens/shared/NotificationsScreen').default || Placeholder; } catch {}

let TaskChatScreen = Placeholder;
try { TaskChatScreen = require('../screens/shared/TaskChatScreen').default || Placeholder; } catch {}

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ── Bottom tabs ───────────────────────────────────────────────
const VolunteerTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: Colors.primaryButton,
      tabBarInactiveTintColor: Colors.paragraph,
      tabBarStyle: styles.tabBar,
      tabBarLabelStyle: styles.tabLabel,
    }}
  >
    <Tab.Screen
      name="VolunteerHome"
      component={VolunteerHomeScreen}
      options={{
        tabBarLabel: 'Home',
        tabBarIcon: ({ focused }) => (
          <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>🏠</Text>
        ),
      }}
    />
    <Tab.Screen
      name="VolunteerTasks"
      component={VolunteerTasksScreen}
      options={{
        tabBarLabel: 'Tasks',
        tabBarIcon: ({ focused }) => (
          <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>📋</Text>
        ),
      }}
    />
    <Tab.Screen
      name="Profile"
      component={VolunteerProfileScreen}
      options={{
        tabBarLabel: 'Profile',
        tabBarIcon: ({ focused }) => (
          <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>👤</Text>
        ),
      }}
    />
  </Tab.Navigator>
);

// ── Full stack ────────────────────────────────────────────────
const VolunteerStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: Colors.navbarBackground },
      headerTintColor: Colors.heading,
      headerTitleStyle: { fontWeight: '600' },
    }}
  >
    <Stack.Screen
      name="VolunteerTabs"
      component={VolunteerTabs}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="VolunteerTaskDetail"
      component={TaskDetailScreen}
      options={{ title: 'Task Details' }}
    />
    <Stack.Screen
      name="VolunteerPickupConfirm"
      component={PickupConfirmScreen}
      options={{ title: 'Confirm Pickup' }}
    />
    <Stack.Screen
      name="VolunteerDelivery"
      component={DeliveryScreen}
      options={{ title: 'Delivery' }}
    />
    <Stack.Screen
      name="CollectionPointsMap"
      component={CollectionPointsMapScreen}
      options={{ title: 'Collection Points' }}
    />
    <Stack.Screen
      name="Notifications"
      component={NotificationsScreen}
      options={{ title: 'Notifications' }}
    />
    <Stack.Screen
      name="TaskChat"
      component={TaskChatScreen}
      options={{ title: 'Task Chat' }}
    />
  </Stack.Navigator>
);

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    borderTopColor: Colors.cardBorder,
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 8,
    paddingTop: 4,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  tabIcon: {
    fontSize: 20,
  },
  tabIconActive: {
    transform: [{ scale: 1.15 }],
  },
});

export default VolunteerStack;
