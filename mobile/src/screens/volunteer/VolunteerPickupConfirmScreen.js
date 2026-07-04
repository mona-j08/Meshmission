import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Alert,
  Image,
  TextInput,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Colors from '../../constants/colors';
import { updatePickupTask } from '../../firebase/firestore';
import { PICKUP_TASK_STATUS } from '../../constants/status';
import PrimaryButton from '../../components/common/PrimaryButton';

const VolunteerPickupConfirmScreen = ({ route, navigation }) => {
  const { taskId, task } = route.params;

  const [photo, setPhoto] = useState(null);
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Success animation
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const handleTakePhoto = async () => {
    setErrorMessage(null);

    // Request camera permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera Permission Required',
        'Please allow camera access to take a photo of the pickup.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhoto(result.assets[0]);
      }
    } catch (err) {
      setErrorMessage('Failed to open camera. Please try again.');
    }
  };

  const handleChooseFromGallery = async () => {
    setErrorMessage(null);

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Gallery Permission Required',
        'Please allow gallery access to select a photo.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhoto(result.assets[0]);
      }
    } catch (err) {
      setErrorMessage('Failed to open gallery. Please try again.');
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
      setTimeout(() => {
        navigation.replace('VolunteerDelivery', { taskId });
      }, 1500);
    });
  };

  const handleConfirmPickup = async () => {
    if (!photo) {
      setErrorMessage('Please take a photo of the pickup as proof.');
      return;
    }

    setConfirming(true);
    setErrorMessage(null);

    try {
      // Build the pickup proof data
      const pickupProofData = {
        status: PICKUP_TASK_STATUS.PICKED_UP,
        pickupConfirmedAt: new Date().toISOString(),
        pickupProofImage: photo.base64
          ? `data:image/jpeg;base64,${photo.base64.substring(0, 200)}...`
          : photo.uri,
        pickupNote: note.trim() || null,
        updatedAt: new Date().toISOString(),
      };

      // Update the task in Firestore
      const result = await updatePickupTask(taskId, pickupProofData);
      if (result && result.error) {
        setErrorMessage(result.error);
        setConfirming(false);
        return;
      }

      setConfirmed(true);
      playSuccessAnimation();
    } catch (err) {
      console.error('Pickup confirmation failed:', err);
      setErrorMessage('Failed to confirm pickup. Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────
  if (confirmed) {
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
          Pickup Confirmed!
        </Animated.Text>
        <Animated.Text style={[styles.successSubtitle, { opacity: opacityAnim }]}>
          Redirecting to delivery...
        </Animated.Text>
      </View>
    );
  }

  // ── Main screen ─────────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Pickup Confirmation</Text>
      <Text style={styles.subtitle}>
        Take a photo of the handover as proof of pickup, then confirm below.
      </Text>

      {/* Error Alert */}
      {errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
        </View>
      )}

      {/* Task Summary */}
      {task && (
        <View style={styles.taskSummary}>
          <Text style={styles.summaryLabel}>📦 {task.category || 'Donation'}</Text>
          {task.donorName && (
            <Text style={styles.summaryDetail}>From: {task.donorName}</Text>
          )}
          {task.description && (
            <Text style={styles.summaryDetail}>{task.description}</Text>
          )}
        </View>
      )}

      {/* Photo Section */}
      <View style={styles.photoSection}>
        <Text style={styles.sectionTitle}>📸 Photo Proof</Text>

        {photo ? (
          <View style={styles.photoPreview}>
            <Image source={{ uri: photo.uri }} style={styles.photoImage} />
            <View style={styles.photoActions}>
              <PrimaryButton
                title="📷 Retake Photo"
                onPress={handleTakePhoto}
                style={styles.retakeBtn}
              />
            </View>
          </View>
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderIcon}>📷</Text>
            <Text style={styles.photoPlaceholderText}>
              Take a photo of the items being handed over
            </Text>
            <PrimaryButton
              title="📷 Take Photo"
              onPress={handleTakePhoto}
              style={styles.photoBtn}
            />
            <PrimaryButton
              title="🖼️ Choose from Gallery"
              onPress={handleChooseFromGallery}
              style={styles.galleryBtn}
            />
          </View>
        )}
      </View>

      {/* Notes Section */}
      <View style={styles.notesSection}>
        <Text style={styles.sectionTitle}>📝 Pickup Notes (optional)</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="e.g. Picked up 2 bags of clothes from front door"
          placeholderTextColor={Colors.disabledText}
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Confirm Button */}
      <PrimaryButton
        title={confirming ? 'Confirming...' : '✅ Confirm Pickup'}
        onPress={handleConfirmPickup}
        disabled={confirming || !photo}
        style={[styles.confirmBtn, !photo && styles.confirmBtnDisabled]}
      />

      {!photo && (
        <Text style={styles.hintText}>
          Please take a photo before confirming the pickup
        </Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mainBackground,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
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
  // Task summary
  taskSummary: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  summaryLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.heading,
    marginBottom: 4,
  },
  summaryDetail: {
    fontSize: 13,
    color: Colors.paragraph,
    marginTop: 2,
  },
  // Photo section
  photoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.heading,
    marginBottom: 12,
  },
  photoPlaceholder: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.cardBorder,
    borderStyle: 'dashed',
  },
  photoPlaceholderIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  photoPlaceholderText: {
    fontSize: 14,
    color: Colors.paragraph,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  photoBtn: {
    width: '100%',
    marginBottom: 10,
  },
  galleryBtn: {
    width: '100%',
    backgroundColor: Colors.cardBorder,
  },
  photoPreview: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  photoImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  photoActions: {
    padding: 12,
    backgroundColor: Colors.cardBackground,
  },
  retakeBtn: {
    backgroundColor: Colors.cardBorder,
  },
  // Notes
  notesSection: {
    marginBottom: 24,
  },
  notesInput: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: Colors.heading,
    minHeight: 80,
    lineHeight: 20,
  },
  // Confirm button
  confirmBtn: {
    marginBottom: 8,
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  hintText: {
    fontSize: 12,
    color: Colors.disabledText,
    textAlign: 'center',
    marginTop: 4,
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

export default VolunteerPickupConfirmScreen;
