import React, { useState } from 'react';
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
import { useAuth } from '../../hooks/useAuth';
import PrimaryButton from '../../components/common/PrimaryButton';

export default function LoginScreen({ navigation }) {
  const { login, loading: authLoading, error: authError, setError } = useAuth();

  // Email auth states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Local loading & UI errors
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  const handleEmailLogin = async () => {
    if (!email || !password) {
      setLocalError('Please fill in both email and password.');
      return;
    }

    setLocalError(null);
    setError(null);
    setLocalLoading(true);

    try {
      const { user, error } = await login(email, password);
      if (error) {
        setLocalError(error);
      }
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setLocalLoading(false);
    }
  };

  const displayError = localError || authError;
  const isLoading = localLoading || authLoading;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <Text style={styles.logoEmoji}>🕸️</Text>
            <Text style={styles.appName}>MeshMission</Text>
            <Text style={styles.tagline}>Connected Communities, Direct Impact</Text>
          </View>

          {/* Form Container */}
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Sign In</Text>

            {displayError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{displayError}</Text>
              </View>
            )}

            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputPrefix}>✉️</Text>
              <TextInput
                style={styles.input}
                placeholder="name@example.com"
                placeholderTextColor={Colors.disabledText}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputPrefix}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor={Colors.disabledText}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.showHideText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>

            <PrimaryButton
              title="Sign In"
              onPress={handleEmailLogin}
              loading={isLoading}
              style={styles.actionButton}
            />
          </View>

          {/* Bottom Link to Register */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>New to MeshMission? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.footerLink}>Create an Account</Text>
            </TouchableOpacity>
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
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  heroSection: {
    backgroundColor: Colors.heroSection,
    paddingTop: Platform.OS === 'ios' ? 40 : 60,
    paddingBottom: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  logoEmoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.heading,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: Colors.paragraph,
    fontWeight: '500',
    marginTop: 4,
  },
  formContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    flex: 1,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.heading,
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.heading,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 16,
  },
  inputPrefix: {
    fontSize: 18,
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: Colors.heading,
    fontSize: 15,
  },
  showHideText: {
    color: Colors.primaryButton,
    fontWeight: '600',
    fontSize: 13,
    paddingLeft: 8,
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
  actionButton: {
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 24,
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
});
