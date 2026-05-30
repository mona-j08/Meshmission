import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/colors';
import { CATEGORY_LIST, CATEGORY_LABELS, CATEGORY_ICONS } from '../../constants/categories';
import { DONATION_CONDITION, CONDITION_LABELS } from '../../constants/status';
import { useAuth } from '../../hooks/useAuth';
import { useDonations } from '../../hooks/useDonations';
import { getCurrentLocation, formatLocation } from '../../utils/locationHelper';
import ImagePickerComponent from '../../components/forms/ImagePickerComponent';
import PrimaryButton from '../../components/common/PrimaryButton';

const MAX_IMAGES = 5;

const CONDITION_ICONS = {
  [DONATION_CONDITION.NEW]: 'sparkles',
  [DONATION_CONDITION.GOOD]: 'thumbs-up',
  [DONATION_CONDITION.MODERATE]: 'construct',
  [DONATION_CONDITION.DAMAGED]: 'alert-circle',
};

const DonationFormScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { submitDonation } = useDonations(user?.uid);

  // Form state
  const [step, setStep] = useState(1);
  const [images, setImages] = useState([]);
  const [category, setCategory] = useState(null);
  const [condition, setCondition] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationText, setLocationText] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [pickupPreference, setPickupPreference] = useState(''); // FUNC-1
  const [recurringFrequency, setRecurringFrequency] = useState('None'); // FUNC-8

  // UI state
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  const progressAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef(null);

  const updateProgress = useCallback(
    (progress) => {
      setUploadProgress(progress);
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 200,
        useNativeDriver: false,
      }).start();
    },
    [progressAnim]
  );

  const handleDetectLocation = useCallback(async () => {
    setDetectingLocation(true);
    setErrors((prev) => ({ ...prev, location: null }));
    try {
      const { location: loc, error } = await getCurrentLocation();
      if (error) {
        setErrors((prev) => ({ ...prev, location: error }));
      } else if (loc) {
        setLocation(loc);
        setLocationText(loc.address || formatLocation(loc));
      }
    } catch (err) {
      setErrors((prev) => ({ ...prev, location: err.message }));
    } finally {
      setDetectingLocation(false);
    }
  }, []);

  const validateStep = useCallback(() => {
    const newErrors = {};
    let isValid = true;

    if (step === 1) {
      if (!category) newErrors.category = 'Please select a category';
      if (!condition) newErrors.condition = 'Please select item condition';
    } else if (step === 2) {
      if (images.length === 0) newErrors.images = 'Please add at least one image';
      if (!reason.trim()) newErrors.reason = 'Please provide a reason for donating';
    } else if (step === 3) {
      if (!locationText.trim() && !location) newErrors.location = 'Please provide a pickup location';
      if (!pickupPreference) newErrors.pickupPreference = 'Please select a preferred pickup time';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      isValid = false;
    }
    return isValid;
  }, [step, category, condition, images, reason, location, locationText, pickupPreference]);

  const handleNextStep = () => {
    if (validateStep()) {
      setErrors({});
      setStep(s => s + 1);
    } else {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const handlePrevStep = () => {
    setErrors({});
    setStep(s => s - 1);
  };

  const handleSubmit = useCallback(async () => {
    if (!validateStep()) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    setSubmitting(true);
    updateProgress(0);

    try {
      const donationData = {
        images,
        category,
        condition,
        location: location || { address: locationText.trim() },
        reason: reason.trim(),
        notes: notes.trim(),
        pickupPreference, // FUNC-1
        isRecurring: recurringFrequency !== 'None', // FUNC-8
        recurringFrequency: recurringFrequency !== 'None' ? recurringFrequency : null,
      };

      const result = await submitDonation(donationData, images, (progress) => {
        updateProgress(progress);
      });

      if (!result || result?.error) {
        Alert.alert('Submission Failed', result?.error || 'Failed to create donation. Please try again.');
        setSubmitting(false);
        return;
      }

      updateProgress(100);
      setSubmitted(true);
    } catch (err) {
      Alert.alert('Error', err.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }, [validateStep, images, category, condition, location, locationText, reason, notes, pickupPreference, recurringFrequency, submitDonation, updateProgress]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // ─── Success Screen ────────────────────────────────
  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={[styles.successIconCircle, { backgroundColor: Colors.successAlert + '20' }]}>
            <Ionicons name="checkmark-circle" size={80} color={Colors.successAlert} />
          </View>
          <Text style={styles.successTitle}>Donation Submitted!</Text>
          <Text style={styles.successMessage}>
            Thank you for your generous donation. Our team will review it shortly.
          </Text>
          <View style={styles.successButtonContainer}>
            <PrimaryButton title="Back to Home" onPress={handleGoBack} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.wizardHeader}>
            <Text style={styles.wizardStepText}>Step {step} of 3</Text>
            <View style={styles.wizardProgressBg}>
              <View style={[styles.wizardProgressFill, { width: `${(step / 3) * 100}%` }]} />
            </View>
          </View>

          {step === 1 && (
            <>
              {/* SECTION 2 — Category (Now Step 1) */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Category</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsContainer}
                >
                  {CATEGORY_LIST.map((cat) => {
                    const isSelected = category === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.chip, isSelected && styles.chipSelected]}
                        onPress={() => {
                          setCategory(cat);
                          setErrors((prev) => ({ ...prev, category: null }));
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.chipIcon}>{CATEGORY_ICONS[cat]}</Text>
                        <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
                          {CATEGORY_LABELS[cat]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
              </View>

              {/* SECTION 3 — Condition (Now Step 1) */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Condition</Text>
                <View style={styles.conditionGrid}>
                  {Object.values(DONATION_CONDITION).map((cond) => {
                    const isSelected = condition === cond;
                    return (
                      <TouchableOpacity
                        key={cond}
                        style={[styles.conditionCard, isSelected && styles.conditionCardSelected]}
                        onPress={() => {
                          setCondition(cond);
                          setErrors((prev) => ({ ...prev, condition: null }));
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={CONDITION_ICONS[cond]}
                          size={28}
                          color={isSelected ? Colors.white : Colors.icon}
                        />
                        <Text
                          style={[
                            styles.conditionLabel,
                            isSelected && styles.conditionLabelSelected,
                          ]}
                        >
                          {CONDITION_LABELS[cond]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {errors.condition && <Text style={styles.errorText}>{errors.condition}</Text>}
              </View>
            </>
          )}

          {step === 2 && (
            <>
              {/* SECTION 1 — Images (Now Step 2) */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Photos</Text>
                <Text style={styles.sectionHint}>
                  Add up to {MAX_IMAGES} photos of your donation
                </Text>
                <ImagePickerComponent
                  images={images}
                  onImagesChange={setImages}
                  maxImages={MAX_IMAGES}
                />
                {errors.images && <Text style={styles.errorText}>{errors.images}</Text>}
              </View>

              {/* SECTION 5 — Reason (Now Step 2) */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Reason for Donating</Text>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  placeholder="Why are you donating this item?"
                  placeholderTextColor={Colors.disabledText}
                  value={reason}
                  onChangeText={(text) => {
                    setReason(text);
                    setErrors((prev) => ({ ...prev, reason: null }));
                  }}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                {errors.reason && <Text style={styles.errorText}>{errors.reason}</Text>}
              </View>

              {/* SECTION 6 — Notes (Now Step 2) */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Additional Notes{' '}
                  <Text style={styles.optionalLabel}>(optional)</Text>
                </Text>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  placeholder="Any special handling instructions?"
                  placeholderTextColor={Colors.disabledText}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </>
          )}

          {step === 3 && (
            <>
              {/* SECTION 4 — Location (Now Step 3) */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pickup Location</Text>
                <TouchableOpacity
                  style={styles.detectButton}
                  onPress={handleDetectLocation}
                  disabled={detectingLocation}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="navigate-outline"
                    size={18}
                    color={detectingLocation ? Colors.disabledText : Colors.primaryButton}
                  />
                  <Text
                    style={[
                      styles.detectButtonText,
                      detectingLocation && { color: Colors.disabledText },
                    ]}
                  >
                    {detectingLocation ? 'Detecting...' : 'Auto-detect my location'}
                  </Text>
                </TouchableOpacity>

                {location && (
                  <View style={styles.detectedAddress}>
                    <Ionicons name="location" size={16} color={Colors.successAlert} />
                    <Text style={styles.detectedAddressText} numberOfLines={2}>
                      {formatLocation(location)}
                    </Text>
                  </View>
                )}

                <TextInput
                  style={styles.textInput}
                  placeholder="Or enter address manually..."
                  placeholderTextColor={Colors.disabledText}
                  value={locationText}
                  onChangeText={(text) => {
                    setLocationText(text);
                    setErrors((prev) => ({ ...prev, location: null }));
                  }}
                  multiline={false}
                />
                {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
              </View>

              {/* FUNC-1: Pickup Preferences */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pickup Preference</Text>
                <Text style={styles.sectionHint}>When is the best time for a volunteer to pick this up?</Text>
                <View style={styles.chipsContainer}>
                  {['Morning (8am-12pm)', 'Afternoon (12pm-4pm)', 'Evening (4pm-8pm)', 'Anytime'].map((pref) => {
                    const isSelected = pickupPreference === pref;
                    return (
                      <TouchableOpacity
                        key={pref}
                        style={[styles.chip, isSelected && styles.chipSelected, { marginBottom: 8 }]}
                        onPress={() => {
                          setPickupPreference(pref);
                          setErrors((prev) => ({ ...prev, pickupPreference: null }));
                        }}
                      >
                        <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
                          {pref}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {errors.pickupPreference && <Text style={styles.errorText}>{errors.pickupPreference}</Text>}
              </View>

              {/* FUNC-8: Recurring Donations */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recurring Donation</Text>
                <Text style={styles.sectionHint}>Would you like to automatically repeat this donation?</Text>
                <View style={styles.chipsContainer}>
                  {['None', 'Weekly', 'Monthly'].map((freq) => {
                    const isSelected = recurringFrequency === freq;
                    return (
                      <TouchableOpacity
                        key={freq}
                        style={[styles.chip, isSelected && styles.chipSelected, { marginBottom: 8 }]}
                        onPress={() => setRecurringFrequency(freq)}
                      >
                        <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
                          {freq}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </>
          )}

          {/* Upload Progress */}
          {submitting && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressLabel}>
                Uploading... {uploadProgress}%
              </Text>
              <View style={styles.progressBar}>
                <Animated.View
                  style={[styles.progressFill, { width: progressWidth }]}
                />
              </View>
            </View>
          )}

          {/* Nav Buttons */}
          <View style={styles.wizardNav}>
            {step > 1 && (
              <TouchableOpacity style={styles.backBtn} onPress={handlePrevStep} disabled={submitting}>
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
            )}
            <View style={styles.nextBtnContainer}>
              <PrimaryButton
                title={step < 3 ? 'Next' : (submitting ? 'Submitting...' : 'Submit Donation')}
                onPress={step < 3 ? handleNextStep : handleSubmit}
                disabled={submitting}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.mainBackground,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.heading,
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 13,
    color: Colors.paragraph,
    marginBottom: 12,
  },
  optionalLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.disabledText,
  },
  // Chips
  chipsContainer: {
    paddingVertical: 4,
    gap: 8,
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: Colors.primaryButton,
    borderColor: Colors.primaryButton,
  },
  chipIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.heading,
  },
  chipLabelSelected: {
    color: Colors.white,
  },
  // Condition
  conditionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  conditionCard: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 10,
  },
  conditionCardSelected: {
    backgroundColor: Colors.primaryButton,
    borderColor: Colors.primaryButton,
  },
  conditionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.heading,
    marginTop: 8,
  },
  conditionLabelSelected: {
    color: Colors.white,
  },
  // Location
  detectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  detectButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.primaryButton,
    marginLeft: 6,
  },
  detectedAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successAlert + '12',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  detectedAddressText: {
    flex: 1,
    fontSize: 13,
    color: Colors.paragraph,
    marginLeft: 8,
  },
  // Inputs
  textInput: {
    backgroundColor: Colors.inputBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.heading,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  // Progress
  progressContainer: {
    marginBottom: 20,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.primaryButton,
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.cardBorder,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primaryButton,
    borderRadius: 4,
  },
  // Submit
  submitContainer: {
    marginTop: 8,
  },
  // Errors
  errorText: {
    fontSize: 12,
    color: Colors.errorAlert,
    marginTop: 6,
  },
  // Success
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  successIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.heading,
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
  successButtonContainer: {
    width: '100%',
  },
  // Wizard
  wizardHeader: {
    marginBottom: 24,
  },
  wizardStepText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primaryButton,
    marginBottom: 8,
  },
  wizardProgressBg: {
    height: 4,
    backgroundColor: Colors.cardBorder,
    borderRadius: 2,
  },
  wizardProgressFill: {
    height: '100%',
    backgroundColor: Colors.primaryButton,
    borderRadius: 2,
  },
  wizardNav: {
    flexDirection: 'row',
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    padding: 12,
  },
  backBtnText: {
    color: Colors.paragraph,
    fontWeight: '600',
    fontSize: 16,
  },
  nextBtnContainer: {
    flex: 1,
    marginLeft: 16,
  },
});

export default DonationFormScreen;
