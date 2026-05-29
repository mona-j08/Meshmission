import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { useNGO } from '../../hooks/useNGO';
import PrimaryButton from '../../components/common/PrimaryButton';
import AvailabilityPicker from '../../components/forms/AvailabilityPicker';
import { LoadingState } from '../../components/common/ScreenStates';
import { ROLES } from '../../constants/roles';

const NGOProfileScreen = () => {
  const { user, signOut, switchUserRole } = useAuth();
  const { profile, loading, saveProfile } = useNGO(user?.uid);
  const [switchingRole, setSwitchingRole] = useState(null);

  // Form states
  const [ngoName, setNgoName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [availability, setAvailability] = useState({
    start: '09:00',
    end: '17:00',
    days: ['mon', 'tue', 'wed', 'thu', 'fri'],
  });
  const [addresses, setAddresses] = useState(['']); // Location address array
  const [saveLoading, setSaveLoading] = useState(false);

  // Sync profile data to local state
  useEffect(() => {
    if (profile) {
      setNgoName(profile.ngoName || '');
      setRegistrationNumber(profile.registrationNumber || '');
      setContactPerson(profile.contactPerson || '');
      setPhone(profile.phone || '');
      setDescription(profile.description || '');
      if (profile.availability) {
        setAvailability(profile.availability);
      }
      if (profile.addresses && Array.isArray(profile.addresses)) {
        setAddresses(profile.addresses.length > 0 ? profile.addresses : ['']);
      }
    }
  }, [profile]);

  const handleAddAddress = () => {
    setAddresses([...addresses, '']);
  };

  const handleRemoveAddress = (index) => {
    if (addresses.length === 1) {
      setAddresses(['']);
      return;
    }
    const updated = [...addresses];
    updated.splice(index, 1);
    setAddresses(updated);
  };

  const handleAddressChange = (text, index) => {
    const updated = [...addresses];
    updated[index] = text;
    setAddresses(updated);
  };

  const handleSave = async () => {
    if (!ngoName.trim()) {
      Alert.alert('Validation Error', 'Please enter your NGO name.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Validation Error', 'Please enter a contact phone number.');
      return;
    }

    const filteredAddresses = addresses.map((a) => a.trim()).filter((a) => a.length > 0);
    if (filteredAddresses.length === 0) {
      Alert.alert('Validation Error', 'Please enter at least one address.');
      return;
    }

    setSaveLoading(true);
    try {
      const success = await saveProfile({
        ngoName: ngoName.trim(),
        registrationNumber: registrationNumber.trim(),
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        description: description.trim(),
        availability,
        addresses: filteredAddresses,
      });

      if (success) {
        Alert.alert('Success', 'NGO profile updated successfully.');
      } else {
        Alert.alert('Error', 'Failed to update profile. Please try again.');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Something went wrong.');
    } finally {
      setSaveLoading(false);
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
    return <LoadingState message="Loading NGO Profile..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.headerTitle}>Update NGO Profile</Text>
        <Text style={styles.headerSubtitle}>
          Keep your details up-to-date to let donors and volunteers match with you easily.
        </Text>

        {/* Basic Info */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>🏢 NGO Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>NGO Name *</Text>
            <TextInput
              style={styles.input}
              value={ngoName}
              onChangeText={setNgoName}
              placeholder="e.g. Hope for Humanity Foundation"
              placeholderTextColor={Colors.disabledText}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Registration Number (Optional)</Text>
            <TextInput
              style={styles.input}
              value={registrationNumber}
              onChangeText={setRegistrationNumber}
              placeholder="e.g. NGO-12345-AA"
              placeholderTextColor={Colors.disabledText}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Tell donors about your mission..."
              placeholderTextColor={Colors.disabledText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Contact Info */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>📞 Contact Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Contact Person</Text>
            <TextInput
              style={styles.input}
              value={contactPerson}
              onChangeText={setContactPerson}
              placeholder="e.g. John Doe"
              placeholderTextColor={Colors.disabledText}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="e.g. +91 9876543210"
              placeholderTextColor={Colors.disabledText}
            />
          </View>
        </View>

        {/* Location Addresses */}
        <View style={styles.card}>
          <View style={styles.addressHeaderRow}>
            <Text style={styles.cardHeader}>📍 Operating Addresses</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddAddress}>
              <Text style={styles.addButtonText}>+ Add Address</Text>
            </TouchableOpacity>
          </View>

          {addresses.map((address, index) => (
            <View key={index} style={styles.addressInputRow}>
              <View style={styles.addressInputContainer}>
                <TextInput
                  style={styles.input}
                  value={address}
                  onChangeText={(text) => handleAddressChange(text, index)}
                  placeholder={`Address / Distribution Center ${index + 1}`}
                  placeholderTextColor={Colors.disabledText}
                />
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveAddress(index)}
                activeOpacity={0.7}
              >
                <Text style={styles.removeButtonText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Availability */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>⏰ Operating Hours & Days</Text>
          <AvailabilityPicker value={availability} onChange={setAvailability} />
        </View>

        {/* Save Profile Button */}
        <PrimaryButton
          title={saveLoading ? 'Saving...' : 'Save Profile Changes'}
          onPress={handleSave}
          loading={saveLoading}
          style={styles.saveButton}
        />

        {/* Loader overlay for role transition */}
        {switchingRole && (
          <View style={styles.loaderOverlay}>
            <ActivityIndicator size="large" color={Colors.primaryButton} />
            <Text style={styles.loaderText}>Switching stack...</Text>
          </View>
        )}

        {/* Switch Role Card */}
        <View style={styles.roleCardContainer}>
          <Text style={styles.roleCardHeader}>🔄 Switch Account Role</Text>
          <Text style={styles.roleCardSubtitle}>
            Instantly toggle your active view. Your active requirements and deliveries will be preserved.
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
              onPress={() => handleSwitchRole(ROLES.VOLUNTEER, 'Volunteer Transporter')}
              activeOpacity={0.7}
            >
              <View style={styles.roleHeaderRow}>
                <Text style={styles.roleIcon}>🚲</Text>
                <View style={styles.roleTextContainer}>
                  <Text style={styles.roleLabel}>Volunteer Transporter</Text>
                  <Text style={styles.roleDesc}>Deliver goods to NGOs in need</Text>
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
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
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
  textArea: {
    height: 100,
  },
  addressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.icon,
  },
  addressInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  addressInputContainer: {
    flex: 1,
  },
  removeButton: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: 18,
  },
  saveButton: {
    marginTop: 10,
    height: 52,
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

export default NGOProfileScreen;
