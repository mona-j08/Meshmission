/**
 * MeshMission — Firebase Configuration
 *
 * BUG 1 FIX: Uses getApps()/getApp() guard to prevent
 *   "Firebase App named '[DEFAULT]' already exists" crash on hot reload.
 *
 * DEV MODE: Connects to Firebase Emulator Suite when __DEV__ is true.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// ── BUG 1 FIX: Prevent duplicate initialization on hot reload ──
const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

// ── Auth: Use React Native persistence (only on first init) ────
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  // If auth was already initialized (hot reload), just get it
  auth = getAuth(app);
}

export { auth };
export const db       = getFirestore(app);
export const storage  = getStorage(app);
export const functions = getFunctions(app);

// ── DEV MODE: Connect to Firebase Emulator Suite ───────────────
if (__DEV__) {
  // Uncomment below when running the emulator suite locally:
  // connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  // connectFirestoreEmulator(db, 'localhost', 8080);
  // connectStorageEmulator(storage, 'localhost', 9199);
  // connectFunctionsEmulator(functions, 'localhost', 5001);
  // console.log('🔧 Connected to Firebase Emulator Suite');

  console.log('🔥 Connected to Production Firebase');
}

export default app;
