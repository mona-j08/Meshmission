import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Colors from '../constants/colors';

// ── Placeholder screens (will be replaced with real implementations) ──
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

// Try importing real screens; fall back to placeholder
let DonorHomeScreen = Placeholder;
let DonationFormScreen = Placeholder;
let DonationDetailScreen = Placeholder;
let NotificationsScreen = Placeholder;
let DonorProfileScreen = Placeholder;
try { DonorHomeScreen = require('../screens/donor/DonorHomeScreen').default || Placeholder; } catch {}
try { DonationFormScreen = require('../screens/donor/DonationFormScreen').default || Placeholder; } catch {}
try { DonationDetailScreen = require('../screens/donor/DonationDetailScreen').default || Placeholder; } catch {}
try { NotificationsScreen = require('../screens/shared/NotificationsScreen').default || Placeholder; } catch {}
try { DonorProfileScreen = require('../screens/donor/DonorProfileScreen').default || Placeholder; } catch {}

let TaskChatScreen = Placeholder;
try { TaskChatScreen = require('../screens/shared/TaskChatScreen').default || Placeholder; } catch {}

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ── Bottom tabs ───────────────────────────────────────────────
const DonorTabs = () => (
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
      name="DonorHome"
      component={DonorHomeScreen}
      options={{
        tabBarLabel: 'Home',
        tabBarIcon: ({ focused }) => (
          <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>🏠</Text>
        ),
      }}
    />
    <Tab.Screen
      name="Donate"
      component={DonationFormScreen}
      options={{
        tabBarLabel: 'Donate',
        tabBarIcon: ({ focused }) => (
          <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>➕</Text>
        ),
      }}
    />
    <Tab.Screen
      name="Profile"
      component={DonorProfileScreen}
      options={{
        tabBarLabel: 'Profile',
        tabBarIcon: ({ focused }) => (
          <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>👤</Text>
        ),
      }}
    />
  </Tab.Navigator>
);

// ── Full stack with nested screens ────────────────────────────
const DonorStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: Colors.navbarBackground },
      headerTintColor: Colors.heading,
      headerTitleStyle: { fontWeight: '600' },
    }}
  >
    <Stack.Screen
      name="DonorTabs"
      component={DonorTabs}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="DonationDetail"
      component={DonationDetailScreen}
      options={{ title: 'Donation Details' }}
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

export default DonorStack;
