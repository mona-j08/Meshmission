import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import Colors from '../../constants/colors';
import { ROLES, ROLE_LABELS } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';
import PrimaryButton from '../../components/common/PrimaryButton';

const ROLE_CARDS = [
  {
    role: ROLES.DONOR,
    label: ROLE_LABELS[ROLES.DONOR],
    icon: '🎁',
    desc: 'Donate spare clothes, food, medicine, and books to local families.',
  },
  {
    role: ROLES.VOLUNTEER,
    label: ROLE_LABELS[ROLES.VOLUNTEER],
    icon: '🚲',
    desc: 'Help coordinate picks ups, verify item conditions, and transport goods.',
  },
  {
    role: ROLES.NGO,
    label: ROLE_LABELS[ROLES.NGO],
    icon: '🏢',
    desc: 'List community demands, receive supplies, and track local impact.',
  },
];

export default function RegisterScreen({ navigation }) {
  const { register, loading, error: authError, setError } = useAuth();

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState(ROLES.DONOR);

  // Local state
  const [localError, setLocalError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleRegister = async () => {
    // Basic validation
    if (!name || !email || !phone || !password) {
      setLocalError('Please fill in all details.');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    setLocalError(null);
    setError(null);

    try {
      const { user, error } = await register(
        name,
        email,
        phone,
        password,
        selectedRole
      );
      if (error) {
        setLocalError(error);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setLocalError(err.message);
    }
  };

  const displayError = localError || authError;

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <Text style={styles.successEmoji}>🎉</Text>
          <Text style={styles.successTitle}>Registration Successful!</Text>
          <Text style={styles.successMessage}>
            Your MeshMission account has been created as a{' '}
            <Text style={styles.roleEmphasis}>
              {ROLE_LABELS[selectedRole]}
            </Text>
            . You can now log in and start your mission!
          </Text>
          <PrimaryButton
            title="Proceed to Sign In"
            onPress={() => navigation.navigate('Login')}
            style={styles.successButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          
          {/* Hero Header */}
          <View style={styles.heroHeader}>
            <Text style={styles.heroTitle}>Join MeshMission</Text>
            <Text style={styles.heroSubtitle}>Be part of the neighborhood support grid</Text>
          </View>

          {/* Form Content */}
          <View style={styles.formContainer}>
            {displayError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{displayError}</Text>
              </View>
            )}

            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputPrefix}>👤</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Jane Doe"
                placeholderTextColor={Colors.disabledText}
                value={name}
                onChangeText={setName}
                autoCorrect={false}
              />
            </View>

            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputPrefix}>✉️</Text>
              <TextInput
                style={styles.input}
                placeholder="jane@example.com"
                placeholderTextColor={Colors.disabledText}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputPrefix}>📞</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. +919876543210"
                placeholderTextColor={Colors.disabledText}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputPrefix}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="At least 6 characters"
                placeholderTextColor={Colors.disabledText}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Role Selection */}
            <Text style={styles.sectionTitle}>Choose Your Role</Text>
            <View style={styles.roleGrid}>
              {ROLE_CARDS.map((card) => {
                const isSelected = selectedRole === card.role;
                return (
                  <TouchableOpacity
                    key={card.role}
                    style={[
                      styles.roleCard,
                      isSelected && styles.roleCardSelected,
                    ]}
                    onPress={() => setSelectedRole(card.role)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.roleCardHeader}>
                      <Text style={styles.roleCardEmoji}>{card.icon}</Text>
                      <Text
                        style={[
                          styles.roleCardTitle,
                          isSelected && styles.roleCardTitleSelected,
                        ]}
                      >
                        {card.label}
                      </Text>
                    </View>
                    <Text style={styles.roleCardDesc}>{card.desc}</Text>
                    {isSelected && (
                      <View style={styles.selectedTick}>
                        <Text style={styles.selectedTickText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <PrimaryButton
              title="Create Account"
              onPress={handleRegister}
              loading={loading}
              style={styles.submitButton}
            />

            {/* Back to Login link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.footerLink}>Sign In</Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mainBackground,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  heroHeader: {
    backgroundColor: Colors.heroSection,
    paddingTop: Platform.OS === 'ios' ? 40 : 50,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.heading,
  },
  heroSubtitle: {
    fontSize: 14,
    color: Colors.paragraph,
    fontWeight: '500',
    marginTop: 4,
  },
  formContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  errorBox: {
    backgroundColor: Colors.errorAlert + '15',
    borderColor: Colors.errorAlert + '30',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: Colors.errorAlert,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.heading,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 16,
  },
  inputPrefix: {
    fontSize: 16,
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: Colors.heading,
    fontSize: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.heading,
    marginTop: 12,
    marginBottom: 12,
  },
  roleGrid: {
    gap: 12,
    marginBottom: 24,
  },
  roleCard: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    padding: 16,
    position: 'relative',
  },
  roleCardSelected: {
    borderColor: Colors.primaryButton,
    backgroundColor: Colors.primaryButton + '0A',
  },
  roleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  roleCardEmoji: {
    fontSize: 22,
    marginRight: 8,
  },
  roleCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.heading,
  },
  roleCardTitleSelected: {
    color: Colors.primaryButtonHover,
  },
  roleCardDesc: {
    fontSize: 13,
    color: Colors.paragraph,
    lineHeight: 18,
  },
  selectedTick: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: Colors.primaryButton,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedTickText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  submitButton: {
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: Colors.paragraph,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primaryButton,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: Colors.mainBackground,
  },
  successEmoji: {
    fontSize: 72,
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.successAlert,
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 15,
    color: Colors.paragraph,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  roleEmphasis: {
    fontWeight: '700',
    color: Colors.heading,
  },
  successButton: {
    width: '100%',
  },
});
