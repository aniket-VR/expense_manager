// services/firebase.js
// ─────────────────────────────────────────────────────────
// Platform-aware Firebase initialisation.
//
// WHY THE PREVIOUS VERSION BROKE ON ANDROID
// ──────────────────────────────────────────
// The app worked on web because browsers use the default
// localStorage persistence that firebase/auth ships with.
// On Android/iOS the JS engine is Hermes, not V8, and
// firebase/auth's web persistence (localStorage) does not
// exist in the React Native environment.
//
// The fix has TWO parts that must work together:
//
// Part 1 — Platform split for persistence:
//   • Android/iOS → initializeAuth + getReactNativePersistence(AsyncStorage)
//   • Web         → getAuth()  (uses built-in indexedDB/localStorage)
//   getReactNativePersistence is imported from 'firebase/auth'
//   but it ONLY works inside a React Native JS environment.
//   Calling it on web throws because the AsyncStorage module
//   itself is a no-op shim that doesn't expose the interface
//   firebase/auth expects.
//
// Part 2 — Fast-Refresh guard:
//   Read getApps().length into isColdStart BEFORE calling
//   initializeApp() so we know whether Auth is already
//   registered on the native singleton. initializeAuth()
//   must only be called once per app lifetime.
// ─────────────────────────────────────────────────────────

import { Platform }           from 'react-native';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore }       from 'firebase/firestore';
import AsyncStorage           from '@react-native-async-storage/async-storage';

// ── Your Firebase config ──────────────────────────────────
// ⚠️  Replace every value below.
// Firebase Console → Project Settings → Your apps → SDK setup

const firebaseConfig = {
   apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
}

// ── Step 1: snapshot cold-start flag BEFORE initializeApp ──
// getApps() is empty only on the very first module evaluation
// (cold start). On Expo Fast Refresh the native Firebase
// singleton survives, so getApps() already has an entry.
const isColdStart = getApps().length === 0;

// ── Step 2: app (same on all platforms) ──────────────────
const app = isColdStart ? initializeApp(firebaseConfig) : getApp();

// ── Step 3: auth — platform-aware ────────────────────────
//
// Android / iOS (Hermes):
//   Must use initializeAuth + getReactNativePersistence so
//   login survives app restarts via AsyncStorage.
//   Only called on cold start to avoid "already registered" error.
//
// Web (V8 / browser):
//   getAuth() uses the built-in browser persistence
//   (IndexedDB → localStorage fallback). Never call
//   initializeAuth on web — it causes the registration error
//   in the browser's module cache.

let auth;

if (Platform.OS === 'web') {
  // Web: always safe to call getAuth(); it never double-registers
  auth = getAuth(app);
} else {
  // Native: use AsyncStorage persistence, but only initialise once
  auth = isColdStart
    ? initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      })
    : getAuth(app);
}

// ── Step 4: Firestore ─────────────────────────────────────
const db = getFirestore(app);

export { app, auth, db };
