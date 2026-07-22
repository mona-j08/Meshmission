/**
 * DonationFormScreen.js — UPDATED
 *
 * Key changes:
 *  1. REGISTRATION GATE – If the donor has not completed registration,
 *     show DonorRegistrationScreen inline before the form.
 *  2. UNITS FIELD (was missing) – Now collected on Step 2 and saved.
 *  3. DESCRIPTION FIELD – Renamed from "Reason" to "Description" and
 *     saved as `description` (schema updated accordingly).
 *  4. PREFERRED PICKUP DATE – Date picker added to Step 3.
 *  5. PICKUP TIME – Time-of-day preference collected on Step 3.
 *  6. DONOR INFO DENORMALIZED – donorName, donorPhone, donorAddress are
 *     automatically attached to the donation doc from the stored profile.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/colors';
import { CATEGORY_LIST, CATEGORY_LABELS, CATEGORY_ICONS } from '../../constants/categories';
import { DONATION_CONDITION, CONDITION_LABELS } from '../../constants/status';
import { useAuth } from '../../hooks/useAuth';
import { useDonations } from '../../hooks/useDonations';
import { getCurrentLocation, formatLocation } from '../../utils/locationHelper';
import { checkDonorRegistered, getDonorInfo } from '../../firebase/firestore';
import ImagePickerComponent from '../../components/forms/ImagePickerComponent';
import PrimaryButton from '../../components/common/PrimaryButton';
import DonorRegistrationScreen from './DonorRegistrationScreen';

const MAX_IMAGES = 5;

const CONDITION_ICONS = {
  [DONATION_CONDITION.NEW]: 'sparkles',
  [DONATION_CONDITION.GOOD]: 'thumbs-up',
  [DONATION_CONDITION.MODERATE]: 'construct',
  [DONATION_CONDITION.DAMAGED]: 'alert-circle',
};

const PICKUP_TIME_OPTIONS = [
  'Morning (8am-12pm)',
  'Afternoon (12pm-4pm)',
  'Evening (4pm-8pm)',
  'Anytime',
];

// ── Simple date picker (selects future dates only) ──────────
const getTodayStr = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

const DonationFormScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { submitDonation } = useDonations(user?.uid);

  // ── Registration gate state ────────────────────────────────
  const [checkingReg, setCheckingReg]   = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [donorProfile, setDonorProfile] = useState(null);

  // Form state
  const [step, setStep]                         = useState(1);
  const [images, setImages]                     = useState([]);
  const [category, setCategory]                 = useState(null);
  const [condition, setCondition]               = useState(null);
  const [location, setLocation]                 = useState(null);
  const [locationText, setLocationText]         = useState('');
  const [description, setDescription]           = useState('');
  const [units, setUnits]                       = useState('1');
  const [notes, setNotes]                       = useState('');
  const [pickupPreference, setPickupPreference] = useState('');    // time-of-day
  const [preferredPickupDate, setPreferredPickupDate] = useState(''); // YYYY-MM-DD
  const [recurringFrequency, setRecurringFrequency]   = useState('None');

  // UI state
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [submitting, setSubmitting]               = useState(false);
  const [uploadProgress, setUploadProgress]       = useState(0);
  const [submitted, setSubmitted]                 = useState(false);
  const [errors, setErrors]                       = useState({});

  const progressAnim = useRef(new Animated.Value(0)).current;
  const scrollRef    = useRef(null);

  // ── Check registration on mount ───────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    (async () => {
      try {
        const registered = await checkDonorRegistered(user.uid);
        if (!cancelled) {
          setIsRegistered(registered);
          if (registered) {
            const info = await getDonorInfo(user.uid);
            if (!cancelled) setDonorProfile(info);
          }
        }
      } catch {
        if (!cancelled) setIsRegistered(false);
      } finally {
        if (!cancelled) setCheckingReg(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.uid]);

  // Called by DonorRegistrationScreen when done
  const handleRegistrationComplete = useCallback(async () => {
    setCheckingReg(true);
    try {
      const info = await getDonorInfo(user.uid);
      setDonorProfile(info);
      setIsRegistered(true);
    } catch {
      setIsRegistered(true);
    } finally {
      setCheckingReg(false);
    }
  }, [user?.uid]);

  // ── Progress animation ────────────────────────────────────
  const updateProgress = useCallback((progress) => {
    setUploadProgress(progress);
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [progressAnim]);

  // ── Location detect ───────────────────────────────────────
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

  // ── Validation ────────────────────────────────────────────
  const validateStep = useCallback(() => {
    const newErrors = {};
    if (step === 1) {
      if (!category)  newErrors.category  = 'Please select a category';
      if (!condition) newErrors.condition = 'Please select item condition';
    } else if (step === 2) {
      if (images.length === 0) newErrors.images = 'Please add at least one image';
      if (!description.trim()) newErrors.description = 'Please describe the donation item';
      const u = parseInt(units, 10);
      if (!units || isNaN(u) || u < 1) newErrors.units = 'Please enter a valid number of units (min 1)';
    } else if (step === 3) {
      if (!locationText.trim() && !location) newErrors.location = 'Please provide a pickup location';
      if (!pickupPreference) newErrors.pickupPreference = 'Please select a preferred pickup time';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }
    return true;
  }, [step, category, condition, images, description, units, location, locationText, pickupPreference]);

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

  // ── Submit ────────────────────────────────────────────────
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
        description: description.trim(),
        reason: description.trim(),        // backward-compat alias
        units: parseInt(units, 10) || 1,
        notes: notes.trim(),
        pickupPreference,
        preferredPickupDate: preferredPickupDate || null,
        pickupTime: pickupPreference || null,
        isRecurring: recurringFrequency !== 'None',
        recurringFrequency: recurringFrequency !== 'None' ? recurringFrequency : null,
        // Denormalized donor info from registered profile
        donorName:    donorProfile?.name    || null,
        donorPhone:   donorProfile?.phone   || null,
        donorAddress: donorProfile?.donorAddress || null,
      };

      const result = await submitDonation(donationData, images, (progress) => {
        updateProgress(progress);
      });

      if (!result || typeof result === 'object') {
        const errorMsg = (typeof result === 'object' && result?.error) || 'Failed to create donation. Please try again.';
        Alert.alert('Submission Failed', errorMsg);
        setSubmitting(false);
        return;
      }

      updateProgress(100);
      setSubmitted(true);
    } catch (err) {
      Alert.alert('Error', err.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }, [
    validateStep, images, category, condition, location, locationText,
    description, units, notes, pickupPreference, preferredPickupDate,
    recurringFrequency, donorProfile, submitDonation, updateProgress,
  ]);

  const handleGoBack = useCallback(() => navigation.goBack(), [navigation]);

  // ── Loading gate ──────────────────────────────────────────
  if (checkingReg) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primaryButton} />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Registration gate ─────────────────────────────────────
  if (!isRegistered) {
    return <DonorRegistrationScreen onComplete={handleRegistrationComplete} />;
  }

  // ── Success screen ────────────────────────────────────────
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

  // ── Donor info banner (shown when profile loaded) ─────────
  const renderDonorBanner = () => {
    if (!donorProfile) return null;
    return (
      <View style={styles.donorBanner}>
        <Ionicons name="person-circle-outline" size={18} color={Colors.primaryButton} />
        <Text style={styles.donorBannerText} numberOfLines={1}>
          Donating as {donorProfile.name}
          {donorProfile.donorAddress?.city ? ` · ${donorProfile.donorAddress.city}` : ''}
        </Text>
      </View>
    );
  };

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
          {/* Donor profile banner */}
          {renderDonorBanner()}

          {/* Wizard header */}
          <View style={styles.wizardHeader}>
            <Text style={styles.wizardStepText}>Step {step} of 3</Text>
            <View style={styles.wizardProgressBg}>
              <View style={[styles.wizardProgressFill, { width: `${(step / 3) * 100}%` }]} />
            </View>
          </View>

          {/* ── STEP 1: Category + Condition ──────────────────── */}
          {step === 1 && (
            <>
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
                        onPress={() => { setCategory(cat); setErrors(p => ({ ...p, category: null })); }}
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

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Condition</Text>
                <View style={styles.conditionGrid}>
                  {Object.values(DONATION_CONDITION).map((cond) => {
                    const isSelected = condition === cond;
                    return (
                      <TouchableOpacity
                        key={cond}
                        style={[styles.conditionCard, isSelected && styles.conditionCardSelected]}
                        onPress={() => { setCondition(cond); setErrors(p => ({ ...p, condition: null })); }}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={CONDITION_ICONS[cond]}
                          size={28}
                          color={isSelected ? Colors.white : Colors.icon}
                        />
                        <Text style={[styles.conditionLabel, isSelected && styles.conditionLabelSelected]}>
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

          {/* ── STEP 2: Photos + Description + Units + Notes ─── */}
          {step === 2 && (
            <>
              {/* Photos */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Photos</Text>
                <Text style={styles.sectionHint}>Add up to {MAX_IMAGES} photos of your donation</Text>
                <ImagePickerComponent
                  images={images}
                  onImagesChange={setImages}
                  maxImages={MAX_IMAGES}
                />
                {errors.images && <Text style={styles.errorText}>{errors.images}</Text>}
              </View>

              {/* Description (was "Reason") */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Description <Text style={styles.requiredStar}>*</Text>
                </Text>
                <Text style={styles.sectionHint}>Describe the item(s) you're donating</Text>
                <TextInput
                  style={[styles.textInput, styles.multilineInput, errors.description && styles.inputError]}
                  placeholder="e.g. 5 pairs of gently used school uniforms, sizes 8-12..."
                  placeholderTextColor={Colors.disabledText}
                  value={description}
                  onChangeText={(text) => { setDescription(text); setErrors(p => ({ ...p, description: null })); }}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
              </View>

              {/* Number of Units (NEW) */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Number of Units <Text style={styles.requiredStar}>*</Text>
                </Text>
                <Text style={styles.sectionHint}>How many individual items are you donating?</Text>
                <TextInput
                  style={[styles.textInput, errors.units && styles.inputError]}
                  placeholder="e.g. 5"
                  placeholderTextColor={Colors.disabledText}
                  value={units}
                  onChangeText={(v) => {
                    // Only allow digits
                    const clean = v.replace(/[^0-9]/g, '');
                    setUnits(clean);
                    setErrors(p => ({ ...p, units: null }));
                  }}
                  keyboardType="numeric"
                  maxLength={4}
                />
                {errors.units && <Text style={styles.errorText}>{errors.units}</Text>}
              </View>

              {/* Additional Notes */}
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

          {/* ── STEP 3: Location + Pickup Date + Time + Recurring ── */}
          {step === 3 && (
            <>
              {/* Pickup Location */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pickup Location</Text>
                {donorProfile?.donorAddress ? (
                  <View style={styles.profileAddressBox}>
                    <Ionicons name="home-outline" size={16} color={Colors.primaryButton} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.profileAddressLabel}>Your registered address:</Text>
                      <Text style={styles.profileAddressText}>
                        {[
                          donorProfile.donorAddress.street,
                          donorProfile.donorAddress.area,
                          donorProfile.donorAddress.city,
                          donorProfile.donorAddress.state,
                          donorProfile.donorAddress.pincode,
                        ].filter(Boolean).join(', ')}
                      </Text>
                    </View>
                  </View>
                ) : null}
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
                  <Text style={[styles.detectButtonText, detectingLocation && { color: Colors.disabledText }]}>
                    {detectingLocation ? 'Detecting...' : 'Auto-detect current location'}
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
                  placeholder="Or enter a different pickup address..."
                  placeholderTextColor={Colors.disabledText}
                  value={locationText}
                  onChangeText={(text) => { setLocationText(text); setErrors(p => ({ ...p, location: null })); }}
                />
                {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
              </View>

              {/* Preferred Pickup Date (NEW) */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Preferred Pickup Date{' '}
                  <Text style={styles.optionalLabel}>(optional)</Text>
                </Text>
                <Text style={styles.sectionHint}>When would you like us to pick this up?</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="YYYY-MM-DD  e.g. 2025-08-15"
                  placeholderTextColor={Colors.disabledText}
                  value={preferredPickupDate}
                  onChangeText={(v) => {
                    // Allow only digits and hyphens, max 10 chars
                    const clean = v.replace(/[^0-9-]/g, '').slice(0, 10);
                    setPreferredPickupDate(clean);
                  }}
                  keyboardType="numeric"
                  maxLength={10}
                />
                <Text style={styles.dateHint}>
                  📅 Leave blank to let the volunteer schedule at their convenience.
                </Text>
              </View>

              {/* Preferred Pickup Time */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Preferred Pickup Time <Text style={styles.requiredStar}>*</Text>
                </Text>
                <Text style={styles.sectionHint}>When is the best time for a volunteer to pick this up?</Text>
                <View style={styles.chipsWrap}>
                  {PICKUP_TIME_OPTIONS.map((pref) => {
                    const isSelected = pickupPreference === pref;
                    return (
                      <TouchableOpacity
                        key={pref}
                        style={[styles.chip, isSelected && styles.chipSelected, styles.chipWrapItem]}
                        onPress={() => { setPickupPreference(pref); setErrors(p => ({ ...p, pickupPreference: null })); }}
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

              {/* Recurring */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recurring Donation</Text>
                <Text style={styles.sectionHint}>Would you like to repeat this donation?</Text>
                <View style={styles.chipsContainer}>
                  {['None', 'Weekly', 'Monthly'].map((freq) => {
                    const isSelected = recurringFrequency === freq;
                    return (
                      <TouchableOpacity
                        key={freq}
                        style={[styles.chip, isSelected && styles.chipSelected]}
                        onPress={() => setRecurringFrequency(freq)}
                      >
                        <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>{freq}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </>
          )}

          {/* Upload progress */}
          {submitting && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressLabel}>Uploading... {uploadProgress}%</Text>
              <View style={styles.progressBar}>
                <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
              </View>
            </View>
          )}

          {/* Navigation buttons */}
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

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.mainBackground },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: Colors.paragraph, fontSize: 14 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },

  donorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryButton + '12',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    gap: 8,
  },
  donorBannerText: {
    flex: 1,
    fontSize: 13,
    color: Colors.primaryButton,
    fontWeight: '600',
  },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.heading, marginBottom: 8 },
  sectionHint: { fontSize: 13, color: Colors.paragraph, marginBottom: 12 },
  optionalLabel: { fontSize: 13, fontWeight: '400', color: Colors.disabledText },
  requiredStar: { color: Colors.errorAlert },
  dateHint: { fontSize: 11, color: Colors.disabledText, marginTop: 6 },

  profileAddressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.primaryButton + '10',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  profileAddressLabel: { fontSize: 11, color: Colors.primaryButton, fontWeight: '600' },
  profileAddressText: { fontSize: 13, color: Colors.heading, marginTop: 2, lineHeight: 18 },

  chipsContainer: { paddingVertical: 4, gap: 8, flexDirection: 'row' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipWrapItem: { marginBottom: 4 },
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
  chipSelected: { backgroundColor: Colors.primaryButton, borderColor: Colors.primaryButton },
  chipIcon: { fontSize: 18, marginRight: 6 },
  chipLabel: { fontSize: 13, fontWeight: '500', color: Colors.heading },
  chipLabelSelected: { color: Colors.white },

  conditionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
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
  conditionCardSelected: { backgroundColor: Colors.primaryButton, borderColor: Colors.primaryButton },
  conditionLabel: { fontSize: 13, fontWeight: '500', color: Colors.heading, marginTop: 8 },
  conditionLabelSelected: { color: Colors.white },

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
  detectButtonText: { fontSize: 13, fontWeight: '500', color: Colors.primaryButton, marginLeft: 6 },

  detectedAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successAlert + '12',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  detectedAddressText: { flex: 1, fontSize: 13, color: Colors.paragraph, marginLeft: 8 },

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
  multilineInput: { minHeight: 80, textAlignVertical: 'top' },
  inputError: { borderColor: Colors.errorAlert },

  progressContainer: { marginBottom: 20 },
  progressLabel: { fontSize: 13, fontWeight: '500', color: Colors.primaryButton, marginBottom: 8 },
  progressBar: { height: 8, backgroundColor: Colors.cardBorder, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primaryButton, borderRadius: 4 },

  errorText: { fontSize: 12, color: Colors.errorAlert, marginTop: 6 },

  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  successIconCircle: {
    width: 120, height: 120, borderRadius: 60,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  successTitle: { fontSize: 24, fontWeight: '700', color: Colors.heading, marginBottom: 12, textAlign: 'center' },
  successMessage: { fontSize: 15, color: Colors.paragraph, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  successButtonContainer: { width: '100%' },

  wizardHeader: { marginBottom: 24 },
  wizardStepText: { fontSize: 14, fontWeight: '600', color: Colors.primaryButton, marginBottom: 8 },
  wizardProgressBg: { height: 4, backgroundColor: Colors.cardBorder, borderRadius: 2 },
  wizardProgressFill: { height: '100%', backgroundColor: Colors.primaryButton, borderRadius: 2 },
  wizardNav: { flexDirection: 'row', marginTop: 16, alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { padding: 12 },
  backBtnText: { color: Colors.paragraph, fontWeight: '600', fontSize: 16 },
  nextBtnContainer: { flex: 1, marginLeft: 16 },
});

export default DonationFormScreen;
