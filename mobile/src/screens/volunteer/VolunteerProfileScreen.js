import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { useVolunteer } from '../../hooks/useVolunteer';
import { getCurrentLocation, formatLocation } from '../../utils/locationHelper';
import PrimaryButton from '../../components/common/PrimaryButton';
import AvailabilityPicker from '../../components/forms/AvailabilityPicker';
import { LoadingState, ErrorState } from '../../components/common/ScreenStates';
import { ROLES } from '../../constants/roles';

const VEHICLE_OPTIONS = [
  { key: 'bike', icon: '🚲', label: 'Bike' },
  { key: 'car', icon: '🚗', label: 'Car' },
  { key: 'van', icon: '🚐', label: 'Van' },
];

const VolunteerProfileScreen = ({ navigation }) => {
  const { user, signOut, switchUserRole } = useAuth();
  const { profile, loading, error, saveProfile } = useVolunteer(user?.uid);

  const [name, setName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [location, setLocation] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [hasVehicle, setHasVehicle] = useState(false);
  const [vehicleType, setVehicleType] = useState(null);

  const [detectingLocation, setDetectingLocation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(null);
  
  const [email, setEmail] = useState('');

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setContactNumber(profile.contactNumber || '');
      setLocation(profile.location || null);
      setAvailability(profile.availability || []);
      setHasVehicle(profile.hasVehicle || false);
      setVehicleType(profile.vehicleType || null);
    }
    if (user) {
      setEmail(user.email || '');
    }
  }, [profile, user]);

  const handleDetectLocation = async () => {
    setDetectingLocation(true);
    try {
      const { location: loc, error: locError } = await getCurrentLocation();
      if (locError) {
        Alert.alert('Location Error', locError);
      } else if (loc) {
        setLocation(loc);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to detect location. Please try again.');
    } finally {
      setDetectingLocation(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Please enter your name.');
      return;
    }
    if (!contactNumber.trim()) {
      Alert.alert('Validation', 'Please enter your contact number.');
      return;
    }

    setSaving(true);
    setSaveSuccess(false);
    try {
      const data = {
        name: name.trim(),
        contactNumber: contactNumber.trim(),
        location,
        availability,
        hasVehicle,
        vehicleType: hasVehicle ? vehicleType : null,
      };
      const result = await saveProfile(data);
      if (result?.error) {
        Alert.alert('Error', result.error);
      } else {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (_err) {
            Alert.alert('Error', 'Failed to sign out. Please try again.');
          }
        },
      },
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

  if (loading) {
    return <LoadingState message="Loading your profile..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

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

        {/* Success Alert */}
        {saveSuccess && (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>✓ Profile saved successfully!</Text>
          </View>
        )}

        {/* Loader overlay for role transition */}
        {switchingRole && (
          <View style={styles.loaderOverlay}>
            <ActivityIndicator size="large" color={Colors.primaryButton} />
            <Text style={styles.loaderText}>Switching stack...</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardHeader}>👤 Volunteer Information</Text>

          {/* Name */}
          <View style={styles.fieldGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your full name"
            placeholderTextColor={Colors.disabledText}
            autoCapitalize="words"
          />
        </View>

        {/* Email */}
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

        {/* Contact Number */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Contact Number</Text>
          <TextInput
            style={styles.input}
            value={contactNumber}
            onChangeText={setContactNumber}
            placeholder="Enter your phone number"
            placeholderTextColor={Colors.disabledText}
            keyboardType="phone-pad"
          />
        </View>

        {/* Location */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Area / Location</Text>
          <View style={styles.locationRow}>
            <View style={styles.locationDisplay}>
              <Text
                style={[
                  styles.locationText,
                  !location && styles.locationPlaceholder,
                ]}
                numberOfLines={2}
              >
                {location ? formatLocation(location) : 'No location set'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.detectButton}
              onPress={handleDetectLocation}
              disabled={detectingLocation}
            >
              {detectingLocation ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.detectButtonText}>📍 Detect</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Availability */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Availability</Text>
          <AvailabilityPicker
            value={availability}
            onChange={setAvailability}
          />
        </View>

        {/* Vehicle Toggle */}
        <View style={styles.fieldGroup}>
          <View style={styles.switchRow}>
            <Text style={styles.label}>Do you have a vehicle?</Text>
            <Switch
              value={hasVehicle}
              onValueChange={setHasVehicle}
              trackColor={{
                false: Colors.disabledBackground,
                true: Colors.primaryMuted,
              }}
              thumbColor={hasVehicle ? Colors.primaryButton : Colors.white}
            />
          </View>
        </View>

        {/* Vehicle Type Cards */}
        {hasVehicle && (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Vehicle Type</Text>
            <View style={styles.vehicleCardsRow}>
              {VEHICLE_OPTIONS.map((option) => {
                const isSelected = vehicleType === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.vehicleCard,
                      isSelected && styles.vehicleCardSelected,
                    ]}
                    onPress={() => setVehicleType(option.key)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.vehicleCardIcon}>{option.icon}</Text>
                    <Text
                      style={[
                        styles.vehicleCardLabel,
                        isSelected && styles.vehicleCardLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

          {/* Save Button */}
          <PrimaryButton
            title={saving ? 'Saving...' : 'Save Profile'}
            onPress={handleSave}
            disabled={saving}
            style={styles.saveButton}
          />
        </View>

        {/* Switch Role Card */}
        <View style={styles.roleCardContainer}>
          <Text style={styles.roleCardHeader}>🔄 Switch Account Role</Text>
          <Text style={styles.roleCardSubtitle}>
            Instantly toggle your active view. Your active assignments and vehicles will be preserved.
          </Text>

          <View style={styles.roleOptionsContainer}>
            <TouchableOpacity
              style={styles.roleCard}
              onPress={() => handleSwitchRole(ROLES.DONOR, 'Donor')}
              activeOpacity={0.7}
            >
              <View style={styles.roleHeaderRow}>
                <Text style={styles.roleIcon}>🎁</Text>
                <View style={styles.roleTextContainer}>
                  <Text style={styles.roleLabel}>Donor</Text>
                  <Text style={styles.roleDesc}>Donate food, clothes, or other items</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.roleCard}
              onPress={() => handleSwitchRole(ROLES.NGO, 'NGO Representative')}
              activeOpacity={0.7}
            >
              <View style={styles.roleHeaderRow}>
                <Text style={styles.roleIcon}>🏢</Text>
                <View style={styles.roleTextContainer}>
                  <Text style={styles.roleLabel}>NGO Representative</Text>
                  <Text style={styles.roleDesc}>Receive donations & list requirements</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign Out */}
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
    backgroundColor: Colors.mainBackground,
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
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.heading,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.heading,
  },
  disabledInput: {
    backgroundColor: Colors.disabledBackground,
    color: Colors.disabledText,
    borderColor: Colors.cardBorder,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationDisplay: {
    flex: 1,
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  locationText: {
    fontSize: 14,
    color: Colors.heading,
  },
  locationPlaceholder: {
    color: Colors.disabledText,
  },
  detectButton: {
    backgroundColor: Colors.primaryButton,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detectButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleCardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  vehicleCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.cardBorder,
  },
  vehicleCardSelected: {
    borderColor: Colors.primaryButton,
    backgroundColor: Colors.primaryLight,
  },
  vehicleCardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  vehicleCardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.paragraph,
  },
  vehicleCardLabelSelected: {
    color: Colors.icon,
  },
  saveButton: {
    marginTop: 12,
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
  roleCardContainer: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  roleCardHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.heading,
    marginBottom: 8,
  },
  roleCardSubtitle: {
    fontSize: 12,
    color: Colors.paragraph,
    lineHeight: 18,
    marginBottom: 16,
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
    marginTop: 20,
  },
  logoutText: {
    fontSize: 15,
    color: Colors.errorAlert,
    fontWeight: '600',
  },
});

export default VolunteerProfileScreen;
