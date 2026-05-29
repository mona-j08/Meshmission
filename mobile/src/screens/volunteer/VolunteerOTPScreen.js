import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import Colors from '../../constants/colors';
import { generatePickupOTP, verifyPickupOTP } from '../../firebase/functions';
import PrimaryButton from '../../components/common/PrimaryButton';
import OTPInput from '../../components/forms/OTPInput';
import { LoadingState } from '../../components/common/ScreenStates';

const MAX_ATTEMPTS = 3;

const VolunteerOTPScreen = ({ route, navigation }) => {
  const { taskId } = route.params;

  const [otpGenerated, setOtpGenerated] = useState(false);
  const [otp, setOtp] = useState('');
  const [generating, setGenerating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);
  const [warningMessage, setWarningMessage] = useState(null);
  const [verified, setVerified] = useState(false);

  // Success animation
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const handleGenerateOTP = async () => {
    setGenerating(true);
    setErrorMessage(null);
    setWarningMessage(null);
    try {
      const { data, error } = await generatePickupOTP(taskId);
      if (error) {
        setErrorMessage(error);
      } else {
        setOtpGenerated(true);
        setAttempts(0);
        setOtp('');
      }
    } catch (err) {
      setErrorMessage('Failed to generate OTP. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const playSuccessAnimation = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Navigate to delivery after a brief pause
      setTimeout(() => {
        navigation.replace('VolunteerDelivery', { taskId });
      }, 1500);
    });
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit OTP.');
      return;
    }

    setVerifying(true);
    setErrorMessage(null);
    setWarningMessage(null);
    try {
      const { data, error } = await verifyPickupOTP(taskId, otp);
      if (error) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        // Check for expired OTP
        if (
          error.toLowerCase().includes('expired') ||
          error.toLowerCase().includes('expire')
        ) {
          setWarningMessage('OTP has expired. Please generate a new one.');
          setOtpGenerated(false);
          setOtp('');
          return;
        }

        if (newAttempts >= MAX_ATTEMPTS) {
          setErrorMessage(
            `Maximum attempts (${MAX_ATTEMPTS}) reached. Please generate a new OTP.`
          );
          setOtpGenerated(false);
          setOtp('');
          setAttempts(0);
        } else {
          setErrorMessage(
            `Incorrect OTP. Attempt ${newAttempts} of ${MAX_ATTEMPTS}.`
          );
          setOtp('');
        }
      } else {
        // Success
        setVerified(true);
        playSuccessAnimation();
      }
    } catch (err) {
      setErrorMessage('Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  // Verified success screen
  if (verified) {
    return (
      <View style={styles.successContainer}>
        <Animated.View
          style={[
            styles.successCircle,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <Text style={styles.successCheckmark}>✓</Text>
        </Animated.View>
        <Animated.Text style={[styles.successTitle, { opacity: opacityAnim }]}>
          OTP Verified!
        </Animated.Text>
        <Animated.Text style={[styles.successSubtitle, { opacity: opacityAnim }]}>
          Redirecting to delivery...
        </Animated.Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Pickup Verification</Text>
        <Text style={styles.subtitle}>
          {otpGenerated
            ? 'An OTP has been sent to the donor. Ask them for the code and enter it below.'
            : 'Generate an OTP to verify your pickup from the donor.'}
        </Text>

        {/* Error Alert */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        )}

        {/* Warning Alert */}
        {warningMessage && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningBannerText}>{warningMessage}</Text>
          </View>
        )}

        {!otpGenerated ? (
          /* Generate OTP */
          <View style={styles.generateSection}>
            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>🔐</Text>
              <Text style={styles.infoText}>
                The OTP will be sent to the donor via notification. You will NOT
                see the OTP — the donor will read it to you.
              </Text>
            </View>
            <PrimaryButton
              title={generating ? 'Generating...' : 'Generate OTP'}
              onPress={handleGenerateOTP}
              disabled={generating}
              style={styles.generateButton}
            />

            {/* Regenerate after expiry */}
            {warningMessage && (
              <PrimaryButton
                title="Regenerate OTP"
                onPress={handleGenerateOTP}
                disabled={generating}
                style={styles.regenerateButton}
              />
            )}
          </View>
        ) : (
          /* Verify OTP */
          <View style={styles.verifySection}>
            <View style={styles.otpSentBanner}>
              <Text style={styles.otpSentIcon}>📩</Text>
              <Text style={styles.otpSentText}>
                OTP sent to donor via notification
              </Text>
            </View>

            <Text style={styles.enterOtpLabel}>Enter OTP</Text>
            <OTPInput
              value={otp}
              onChange={setOtp}
              length={6}
            />

            {attempts > 0 && attempts < MAX_ATTEMPTS && (
              <Text style={styles.attemptText}>
                Attempts: {attempts} / {MAX_ATTEMPTS}
              </Text>
            )}

            <PrimaryButton
              title={verifying ? 'Verifying...' : 'Verify OTP'}
              onPress={handleVerifyOTP}
              disabled={verifying || otp.length !== 6}
              style={styles.verifyButton}
            />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mainBackground,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.heading,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.paragraph,
    lineHeight: 22,
    marginBottom: 24,
  },
  errorBanner: {
    backgroundColor: Colors.errorAlert,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  warningBanner: {
    backgroundColor: Colors.warningAlert,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  warningBannerText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  generateSection: {
    flex: 1,
    justifyContent: 'center',
  },
  infoCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 28,
  },
  infoIcon: {
    fontSize: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.icon,
    lineHeight: 20,
  },
  generateButton: {
    marginBottom: 12,
  },
  regenerateButton: {
    marginTop: 8,
  },
  verifySection: {
    flex: 1,
  },
  otpSentBanner: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 28,
  },
  otpSentIcon: {
    fontSize: 20,
  },
  otpSentText: {
    fontSize: 14,
    color: Colors.icon,
    fontWeight: '600',
  },
  enterOtpLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.heading,
    marginBottom: 14,
    textAlign: 'center',
  },
  attemptText: {
    fontSize: 13,
    color: Colors.warningAlert,
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '600',
  },
  verifyButton: {
    marginTop: 28,
  },
  // Success screen
  successContainer: {
    flex: 1,
    backgroundColor: Colors.mainBackground,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  successCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.successAlert,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successCheckmark: {
    fontSize: 56,
    color: Colors.white,
    fontWeight: '700',
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.heading,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 15,
    color: Colors.paragraph,
  },
});

export default VolunteerOTPScreen;
