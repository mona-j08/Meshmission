import React, { useState, useRef, useCallback } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import Colors from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import PrimaryButton from '../../components/common/PrimaryButton';
import OTPInput from '../../components/forms/OTPInput';

export default function LoginScreen({ navigation }) {
  const { login, sendOTP, verifyOTP, loading: authLoading, error: authError, setError } = useAuth();

  // Mode: 'phone' or 'email'
  const [loginMode, setLoginMode] = useState('phone');
  
  // Phone auth states
  const [phoneNumber, setPhoneNumber] = useState('+91');
  const [verificationId, setVerificationId] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  
  // Email auth states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Local loading & UI errors
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  const recaptchaVerifier = useRef(null);

  const handleSendOTP = async () => {
    if (!phoneNumber || phoneNumber.trim().length < 10) {
      setLocalError('Please enter a valid phone number with country code.');
      return;
    }
    
    setLocalError(null);
    setError(null);
    setLocalLoading(true);

    try {
      const { verificationId: verId, error } = await sendOTP(
        phoneNumber,
        recaptchaVerifier.current
      );
      if (error) {
        setLocalError(error);
      } else {
        setVerificationId(verId);
      }
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length < 6) {
      setLocalError('Please enter the 6-digit verification code.');
      return;
    }

    setLocalError(null);
    setError(null);
    setLocalLoading(true);

    try {
      const { user, error } = await verifyOTP(verificationId, otpCode);
      if (error) {
        setLocalError(error);
      }
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setLocalLoading(false);
    }
  };

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

  const toggleLoginMode = () => {
    setLoginMode(loginMode === 'phone' ? 'email' : 'phone');
    setLocalError(null);
    setError(null);
    setVerificationId(null);
    setOtpCode('');
  };

  const displayError = localError || authError;
  const isLoading = localLoading || authLoading;

  return (
    <SafeAreaView style={styles.container}>
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={require('../../firebase/config').firebaseConfig}
        attemptInvisibleVerification={false}
      />
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
            <Text style={styles.formTitle}>
              {loginMode === 'phone' ? (verificationId ? 'Enter Verification Code' : 'Sign In with Phone') : 'Sign In with Email'}
            </Text>

            {displayError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{displayError}</Text>
              </View>
            )}

            {loginMode === 'phone' ? (
              // Phone Authentication Mode
              !verificationId ? (
                // Step 1: Send OTP
                <View>
                  <Text style={styles.label}>Mobile Number</Text>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputPrefix}>📞</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. +919876543210"
                      placeholderTextColor={Colors.disabledText}
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      keyboardType="phone-pad"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  <Text style={styles.hintText}>
                    Make sure to include your country code (e.g. +91 for India).
                  </Text>
                  
                  <PrimaryButton
                    title="Send Verification Code"
                    onPress={handleSendOTP}
                    loading={isLoading}
                    style={styles.actionButton}
                  />
                </View>
              ) : (
                // Step 2: Verify OTP
                <View>
                  <Text style={styles.label}>Enter 6-Digit OTP sent to {phoneNumber}</Text>
                  <View style={styles.otpWrapper}>
                    <OTPInput
                      length={6}
                      value={otpCode}
                      onChange={setOtpCode}
                      error={!!displayError}
                    />
                  </View>

                  <View style={styles.otpActions}>
                    <TouchableOpacity onPress={() => setVerificationId(null)} disabled={isLoading}>
                      <Text style={styles.otpBackText}>← Change Phone Number</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSendOTP} disabled={isLoading}>
                      <Text style={styles.otpResendText}>Resend OTP</Text>
                    </TouchableOpacity>
                  </View>

                  <PrimaryButton
                    title="Verify & Sign In"
                    onPress={handleVerifyOTP}
                    loading={isLoading}
                    style={styles.actionButton}
                  />
                </View>
              )
            ) : (
              // Email Authentication Mode
              <View>
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
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <PrimaryButton
                  title="Sign In"
                  onPress={handleEmailLogin}
                  loading={isLoading}
                  style={styles.actionButton}
                />
              </View>
            )}

            {/* Toggle Login Mode */}
            <TouchableOpacity onPress={toggleLoginMode} style={styles.toggleModeButton}>
              <Text style={styles.toggleModeText}>
                {loginMode === 'phone' ? 'Switch to Email Sign In' : 'Switch to Phone OTP Sign In'}
              </Text>
            </TouchableOpacity>
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
  hintText: {
    fontSize: 12,
    color: Colors.paragraph,
    marginTop: -8,
    marginBottom: 20,
    lineHeight: 16,
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
  otpWrapper: {
    alignItems: 'center',
    marginVertical: 16,
  },
  otpActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  otpBackText: {
    color: Colors.primaryButton,
    fontWeight: '600',
    fontSize: 13,
  },
  otpResendText: {
    color: Colors.primaryButton,
    fontWeight: '600',
    fontSize: 13,
  },
  actionButton: {
    marginTop: 8,
  },
  toggleModeButton: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 8,
  },
  toggleModeText: {
    color: Colors.primaryButton,
    fontSize: 14,
    fontWeight: '600',
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
