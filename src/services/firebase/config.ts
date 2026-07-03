// ── Firebase Config ──────────────────────────────────────────────────
// IMPORTANT: We import from @firebase/* internal packages directly,
// NOT from the `firebase` wrapper package. The `firebase` package's
// exports field has no "react-native" condition — so Metro resolves
// `firebase/auth` to the browser build, which does NOT call
// `registerAuth("ReactNative")`. By importing from `@firebase/auth`
// directly, Metro uses its package.json "react-native" field to
// resolve to `dist/rn/index.js`, which correctly registers the auth
// component before any auth operations.
// ─────────────────────────────────────────────────────────────────────

import { initializeApp, getApps, getApp } from "@firebase/app";
import {
  initializeAuth,
  // @ts-ignore
  getReactNativePersistence,
  getAuth,
} from "@firebase/auth";
import { getFirestore } from "@firebase/firestore";
import { getFunctions } from "@firebase/functions";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Prevent multiple initializations (important in Expo dev / Fast Refresh)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Auth with AsyncStorage persistence (required in React Native).
// Wrapped in try/catch to handle hot-reload re-initialization gracefully.
let auth: ReturnType<typeof initializeAuth>;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  // Already initialized (Fast Refresh / hot-reload)
  auth = getAuth(app) as ReturnType<typeof initializeAuth>;
}

export { auth };
export const db = getFirestore(app);
export const functions = getFunctions(app);

export default app;
