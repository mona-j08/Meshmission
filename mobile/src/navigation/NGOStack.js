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
let NGOHomeScreen = Placeholder;
let RequirementsScreen = Placeholder;
let NGODeliveriesScreen = Placeholder;
let NGOProfileScreen = Placeholder;
let VolunteersScreen = Placeholder;
let ImpactScreen = Placeholder;
let NotificationsScreen = Placeholder;
try { NGOHomeScreen = require('../screens/ngo/NGOHomeScreen').default || Placeholder; } catch {}
try { RequirementsScreen = require('../screens/ngo/RequirementsScreen').default || Placeholder; } catch {}
try { NGODeliveriesScreen = require('../screens/ngo/NGODeliveriesScreen').default || Placeholder; } catch {}
try { NGOProfileScreen = require('../screens/ngo/NGOProfileScreen').default || Placeholder; } catch {}
try { VolunteersScreen = require('../screens/ngo/VolunteersScreen').default || Placeholder; } catch {}
try { ImpactScreen = require('../screens/ngo/ImpactScreen').default || Placeholder; } catch {}
try { NotificationsScreen = require('../screens/shared/NotificationsScreen').default || Placeholder; } catch {}

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ── Bottom tabs ───────────────────────────────────────────────
const NGOTabs = () => (
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
      name="NGOHome"
      component={NGOHomeScreen}
      options={{
        tabBarLabel: 'Home',
        tabBarIcon: ({ focused }) => (
          <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>🏠</Text>
        ),
      }}
    />
    <Tab.Screen
      name="Requirements"
      component={RequirementsScreen}
      options={{
        tabBarLabel: 'Requirements',
        tabBarIcon: ({ focused }) => (
          <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>📦</Text>
        ),
      }}
    />
    <Tab.Screen
      name="Deliveries"
      component={NGODeliveriesScreen}
      options={{
        tabBarLabel: 'Deliveries',
        tabBarIcon: ({ focused }) => (
          <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>🚚</Text>
        ),
      }}
    />
    <Tab.Screen
      name="NGOProfile"
      component={NGOProfileScreen}
      options={{
        tabBarLabel: 'Profile',
        tabBarIcon: ({ focused }) => (
          <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>🏢</Text>
        ),
      }}
    />
  </Tab.Navigator>
);

// ── Full stack ────────────────────────────────────────────────
const NGOStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: Colors.navbarBackground },
      headerTintColor: Colors.heading,
      headerTitleStyle: { fontWeight: '600' },
    }}
  >
    <Stack.Screen
      name="NGOTabs"
      component={NGOTabs}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="Volunteers"
      component={VolunteersScreen}
      options={{ title: 'Volunteers' }}
    />
    <Stack.Screen
      name="Impact"
      component={ImpactScreen}
      options={{ title: 'Impact Dashboard' }}
    />
    <Stack.Screen
      name="Notifications"
      component={NotificationsScreen}
      options={{ title: 'Notifications' }}
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

export default NGOStack;
