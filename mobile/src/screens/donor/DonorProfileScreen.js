import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import Colors from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import PrimaryButton from '../../components/common/PrimaryButton';
import { ROLES } from '../../constants/roles';

const ROLE_OPTIONS = [
  { key: ROLES.VOLUNTEER, icon: '🚲', label: 'Volunteer Transporter', description: 'Deliver goods to NGOs in need' },
  { key: ROLES.NGO, icon: '🏢', label: 'NGO Representative', description: 'Receive donations & list requirements' },
];

const DonorProfileScreen = () => {
  const { user, signOut, switchUserRole } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(null);

  // Sync auth user details to form
  useEffect(() => {
    if (user) {
      setName(user.displayName || user.name || '');
      setEmail(user.email || '');
      setPhone(user.phoneNumber || user.phone || '');
    }
  }, [user]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter your name.');
      return;
    }

    setSaving(true);
    setSaveSuccess(false);
    try {
      // In a real app, we would update auth profile and Firestore user profile
      // Simulating profile update:
      setTimeout(() => {
        setSaving(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }, 800);
    } catch (err) {
      setSaving(false);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
          try {
            await signOut();
          } catch (_err) {
            Alert.alert('Error', 'Failed to sign out. Please try again.');
          }
        }
      }
    ]);
  };

  const handleSwitchRole = (targetRole, label) => {
    Alert.alert(
      'Switch Role',
      `Are you sure you want to switch your active role to ${label}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch',
          onPress: async () => {
            setSwitchingRole(targetRole);
            try {
              const result = await switchUserRole(targetRole);
              if (result?.error) {
                Alert.alert('Error', result.error);
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to switch role. Please try again.');
            } finally {
              setSwitchingRole(null);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.screenTitle}>Your Profile</Text>

          {/* Success Banner */}
          {saveSuccess && (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>✓ Profile updated successfully!</Text>
            </View>
          )}

          {/* Loader for role transition */}
          {switchingRole && (
            <View style={styles.loaderOverlay}>
              <ActivityIndicator size="large" color={Colors.primaryButton} />
              <Text style={styles.loaderText}>Switching stack...</Text>
            </View>
          )}

          {/* Profile Form */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>👤 Donor Information</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={Colors.disabledText}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={email}
                editable={false}
                placeholder="Email address"
                placeholderTextColor={Colors.disabledText}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Contact Phone</Text>
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={phone}
                editable={false}
                placeholder="Phone number"
                placeholderTextColor={Colors.disabledText}
              />
            </View>

            <PrimaryButton
              title={saving ? 'Updating...' : 'Save Profile'}
              onPress={handleSave}
              disabled={saving}
              style={styles.saveButton}
            />
          </View>

          {/* Role Switcher Cards */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>🔄 Switch Account Role</Text>
            <Text style={styles.cardSubtitle}>
              Instantly toggle your active view. Your active requirements or deliveries will be preserved.
            </Text>

            <View style={styles.roleOptionsContainer}>
              {ROLE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={styles.roleCard}
                  onPress={() => handleSwitchRole(option.key, option.label)}
                  activeOpacity={0.7}
                >
                  <View style={styles.roleHeaderRow}>
                    <Text style={styles.roleIcon}>{option.icon}</Text>
                    <View style={styles.roleTextContainer}>
                      <Text style={styles.roleLabel}>{option.label}</Text>
                      <Text style={styles.roleDesc}>{option.description}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.mainBackground,
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.heading,
    marginBottom: 20,
  },
  successBanner: {
    backgroundColor: Colors.successAlert,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  successText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 15,
    color: Colors.heading,
    fontWeight: '600',
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.heading,
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 12,
    color: Colors.paragraph,
    lineHeight: 18,
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.paragraph,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.heading,
  },
  disabledInput: {
    backgroundColor: Colors.disabledBackground,
    color: Colors.disabledText,
    borderColor: Colors.cardBorder,
  },
  saveButton: {
    marginTop: 8,
    height: 48,
  },
  roleOptionsContainer: {
    gap: 12,
  },
  roleCard: {
    backgroundColor: Colors.mainBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
  },
  roleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  roleIcon: {
    fontSize: 28,
  },
  roleTextContainer: {
    flex: 1,
  },
  roleLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.heading,
  },
  roleDesc: {
    fontSize: 11,
    color: Colors.paragraph,
    marginTop: 2,
  },
  logoutButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginTop: 10,
  },
  logoutText: {
    fontSize: 15,
    color: Colors.errorAlert,
    fontWeight: '600',
  },
});

export default DonorProfileScreen;
