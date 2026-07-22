/**
 * DonorRegistrationScreen.js
 *
 * Mandatory one-time registration screen for donors.
 * Shown the first time a donor tries to access the donation form.
 * Collects: Full Name, Mobile Number, Address, Area, City, State, Pincode.
 * Saves to the user's Firestore profile and marks donorRegistered: true.
 * Generates a unique Donor ID (DON-XXXXXXXX).
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import PrimaryButton from '../../components/common/PrimaryButton';
import { saveDonorRegistration } from '../../firebase/firestore';

// ── Helper: Generate unique Donor ID ──────────────────────────
const generateDonorId = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'DON-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// ── Validation helper ─────────────────────────────────────────
const isValidPhone = (phone) => /^[6-9]\d{9}$/.test(phone.replace(/\s/g, ''));

// ── Component ─────────────────────────────────────────────────
export default function DonorRegistrationScreen({ onComplete }) {
  const { user } = useAuth();

  const [name, setName]         = useState(user?.displayName || '');
  const [phone, setPhone]       = useState(user?.phoneNumber || '');
  const [street, setStreet]     = useState('');
  const [area, setArea]         = useState('');
  const [city, setCity]         = useState('');
  const [state, setState]       = useState('');
  const [pincode, setPincode]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState({});

  const validate = () => {
    const errs = {};
    if (!name.trim())             errs.name    = 'Full name is required.';
    if (!phone.trim())            errs.phone   = 'Mobile number is required.';
    else if (!isValidPhone(phone)) errs.phone  = 'Enter a valid 10-digit Indian mobile number.';
    if (!city.trim())             errs.city    = 'City is required.';
    if (!state.trim())            errs.state   = 'State is required.';
    if (!pincode.trim())          errs.pincode = 'Pincode is required.';
    else if (!/^\d{6}$/.test(pincode.trim())) errs.pincode = 'Enter a valid 6-digit pincode.';
    return errs;
  };

  const handleSubmit = useCallback(async () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const donorId = generateDonorId();
      await saveDonorRegistration(user.uid, {
        name: name.trim(),
        phone: phone.trim(),
        street: street.trim(),
        area: area.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        donorId,
      });
      if (onComplete) onComplete();
    } catch (err) {
      Alert.alert('Registration Failed', err.message || 'Could not save your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [name, phone, street, area, city, state, pincode, user, onComplete]);

  const Field = ({ label, required, error, children }) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      {children}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerBox}>
            <Text style={styles.emoji}>📋</Text>
            <Text style={styles.title}>Donor Registration</Text>
            <Text style={styles.subtitle}>
              Complete your profile once. Your details will be reused for future donations
              — you won't need to re-enter them every time.
            </Text>
          </View>

          {/* ── Personal Info ─────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>👤 Personal Information</Text>

            <Field label="Full Name" required error={errors.name}>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                value={name}
                onChangeText={(v) => { setName(v); setErrors(p => ({ ...p, name: null })); }}
                placeholder="e.g. Ramesh Kumar"
                placeholderTextColor={Colors.disabledText}
                autoCapitalize="words"
              />
            </Field>

            <Field label="Mobile Number" required error={errors.phone}>
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                value={phone}
                onChangeText={(v) => { setPhone(v); setErrors(p => ({ ...p, phone: null })); }}
                placeholder="e.g. 9876543210"
                placeholderTextColor={Colors.disabledText}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </Field>
          </View>

          {/* ── Address ───────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>🏠 Pickup Address</Text>
            <Text style={styles.sectionSubtitle}>
              This address will be used as the default pickup location for your donations.
            </Text>

            <Field label="Street / House No." error={errors.street}>
              <TextInput
                style={[styles.input, errors.street && styles.inputError]}
                value={street}
                onChangeText={(v) => { setStreet(v); setErrors(p => ({ ...p, street: null })); }}
                placeholder="e.g. Plot 12, MG Road"
                placeholderTextColor={Colors.disabledText}
              />
            </Field>

            <Field label="Area / Locality" error={errors.area}>
              <TextInput
                style={[styles.input, errors.area && styles.inputError]}
                value={area}
                onChangeText={(v) => { setArea(v); setErrors(p => ({ ...p, area: null })); }}
                placeholder="e.g. Banjara Hills"
                placeholderTextColor={Colors.disabledText}
              />
            </Field>

            <Field label="City" required error={errors.city}>
              <TextInput
                style={[styles.input, errors.city && styles.inputError]}
                value={city}
                onChangeText={(v) => { setCity(v); setErrors(p => ({ ...p, city: null })); }}
                placeholder="e.g. Hyderabad"
                placeholderTextColor={Colors.disabledText}
              />
            </Field>

            <Field label="State" required error={errors.state}>
              <TextInput
                style={[styles.input, errors.state && styles.inputError]}
                value={state}
                onChangeText={(v) => { setState(v); setErrors(p => ({ ...p, state: null })); }}
                placeholder="e.g. Telangana"
                placeholderTextColor={Colors.disabledText}
              />
            </Field>

            <Field label="Pincode" required error={errors.pincode}>
              <TextInput
                style={[styles.input, errors.pincode && styles.inputError]}
                value={pincode}
                onChangeText={(v) => { setPincode(v); setErrors(p => ({ ...p, pincode: null })); }}
                placeholder="e.g. 500034"
                placeholderTextColor={Colors.disabledText}
                keyboardType="numeric"
                maxLength={6}
              />
            </Field>
          </View>

          {/* Submit */}
          <PrimaryButton
            title={loading ? 'Saving Profile...' : 'Complete Registration'}
            onPress={handleSubmit}
            disabled={loading}
          />

          {loading && (
            <ActivityIndicator
              style={{ marginTop: 16 }}
              color={Colors.primaryButton}
            />
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.mainBackground,
  },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    padding: 20,
    paddingBottom: 40,
  },

  headerBox: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  emoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.heading,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.paragraph,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },

  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.heading,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.paragraph,
    lineHeight: 17,
    marginBottom: 16,
  },

  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.paragraph,
    marginBottom: 6,
  },
  required: {
    color: Colors.errorAlert,
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
  inputError: {
    borderColor: Colors.errorAlert,
  },
  errorText: {
    color: Colors.errorAlert,
    fontSize: 12,
    marginTop: 4,
  },
});
