import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import Colors from '../../constants/colors';
import PrimaryButton from '../../components/common/PrimaryButton';

const { width } = Dimensions.get('window');

const ONBOARDING_DATA = {
  donor: [
    { title: 'Welcome Donor!', desc: 'Thank you for choosing to make a difference. MeshMission connects your donations directly to those in need.' },
    { title: 'Easy Upload', desc: 'Snap a few photos, describe the item, and we handle the rest.' },
    { title: 'Track Impact', desc: 'Watch your donation travel from your door to an NGO and see your real-world impact.' }
  ],
  volunteer: [
    { title: 'Welcome Volunteer!', desc: 'You are the engine of MeshMission. Your time and vehicle make zero-waste possible.' },
    { title: 'Flexible Tasks', desc: 'Pick up items when it suits your schedule. Accept or decline tasks freely.' },
    { title: 'Earn Badges', desc: 'Complete deliveries to earn badges, climb the leaderboard, and make a massive impact.' }
  ],
  ngo: [
    { title: 'Welcome NGO Partner!', desc: 'MeshMission helps you fulfill your community requirements efficiently.' },
    { title: 'Post Requirements', desc: 'Tell the network what your community needs: clothing, food, or emergency supplies.' },
    { title: 'Direct Deliveries', desc: 'Volunteers bring matched donations straight to your collection points.' }
  ]
};

const OnboardingScreen = () => {
  const { role, markOnboardingComplete } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  
  const slides = ONBOARDING_DATA[role] || ONBOARDING_DATA.donor;

  const completeOnboarding = async () => {
    await markOnboardingComplete();
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      completeOnboarding();
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.desc}>{item.desc}</Text>
          </View>
        )}
      />
      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, index) => (
            <View key={index} style={[styles.dot, currentIndex === index && styles.activeDot]} />
          ))}
        </View>
        <PrimaryButton 
          title={currentIndex === slides.length - 1 ? "Get Started" : "Next"} 
          onPress={handleNext} 
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.mainBackground },
  slide: { width, flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.heading, marginBottom: 16, textAlign: 'center' },
  desc: { fontSize: 16, color: Colors.paragraph, textAlign: 'center', lineHeight: 24 },
  footer: { padding: 32, paddingBottom: 48 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.cardBorder, marginHorizontal: 4 },
  activeDot: { backgroundColor: Colors.primaryButton, width: 16 }
});

export default OnboardingScreen;
