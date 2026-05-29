import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { ROLES } from '../constants/roles';
import Colors from '../constants/colors';
import AuthStack from './AuthStack';
import DonorStack from './DonorStack';
import VolunteerStack from './VolunteerStack';
import NGOStack from './NGOStack';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import CompleteProfileScreen from '../screens/auth/CompleteProfileScreen';

/**
 * Root navigator — switches between auth and role-based stacks.
 */
const AppNavigator = () => {
  const { user, role, userProfile, loading, signOut } = useAuth();

  // ── Loading splash ──────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primaryButton} />
        <Text style={styles.loadingText}>Loading MeshMission…</Text>
      </View>
    );
  }

  // ── Not authenticated ───────────────────────────────────────
  if (!user) {
    return (
      <NavigationContainer>
        <AuthStack />
      </NavigationContainer>
    );
  }

  // ── Admin — no mobile access ────────────────────────────────
  if (role === ROLES.ADMIN) {
    return (
      <View style={styles.center}>
        <Text style={styles.adminIcon}>🖥️</Text>
        <Text style={styles.adminTitle}>Admin Access</Text>
        <Text style={styles.adminMessage}>
          Please use the admin web panel to manage MeshMission.
        </Text>
        <TouchableOpacity 
          style={styles.stuckLogoutButton} 
          onPress={async () => {
            try {
              await signOut();
            } catch (err) {
              console.error('Sign out failed:', err);
            }
          }}
        >
          <Text style={styles.stuckLogoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Onboarding check ────────────────────────────────────────
  if (role && userProfile && !userProfile.onboardingComplete) {
    return (
      <NavigationContainer>
        <OnboardingScreen />
      </NavigationContainer>
    );
  }

  // ── Role-based stacks ──────────────────────────────────────
  const getStack = () => {
    switch (role) {
      case ROLES.DONOR:
        return <DonorStack />;
      case ROLES.VOLUNTEER:
        return <VolunteerStack />;
      case ROLES.NGO:
        return <NGOStack />;
      default:
        // Role not yet set (e.g. new phone login) — show CompleteProfileScreen
        return <CompleteProfileScreen />;
    }
  };

  return <NavigationContainer>{getStack()}</NavigationContainer>;
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.mainBackground,
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.paragraph,
  },
  adminIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  adminTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.heading,
    marginBottom: 8,
  },
  adminMessage: {
    fontSize: 15,
    color: Colors.paragraph,
    textAlign: 'center',
    lineHeight: 22,
  },
  stuckLogoutButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  stuckLogoutText: {
    color: Colors.errorAlert,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default AppNavigator;
