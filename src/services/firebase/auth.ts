import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInWithCredential,
  linkWithCredential,
  GoogleAuthProvider,
  EmailAuthProvider,
  signInWithCustomToken,
  User,
} from "@firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "@firebase/firestore";
import { auth, db } from "./config";
import { apiClient } from "../api/client";

// ── Email / Password Auth ─────────────────────────────────────────────

export const signUp = async (email: string, password: string, username: string, phone: string | null = null) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  // Create user profile in Firestore
  await setDoc(doc(db, "users", cred.user.uid), {
    uid: cred.user.uid,
    email,
    username: username.toLowerCase(),
    displayName: username,
    phone,
    stellarPublicKey: null,
    authProviders: ["password"],
    hasPin: true,
    createdAt: serverTimestamp(),
  });
  return cred.user;
};

export const signIn = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const signOut = () => firebaseSignOut(auth);

export const subscribeToAuth = (cb: (user: User | null) => void) =>
  onAuthStateChanged(auth, cb);

// ── Google Sign-In ────────────────────────────────────────────────────

/**
 * Signs in with a Google ID token obtained from expo-auth-session.
 * If the user doesn't exist in Firestore yet, returns the user but does NOT
 * create a profile (the signup flow handles profile creation separately).
 */
export const signInWithGoogleToken = async (idToken: string) => {
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  return result.user;
};

/**
 * Creates a Firestore profile for a Google-authenticated user.
 * Called from the Google onboarding screen after the user picks a username,
 * confirms their name, enters a phone number, and sets a PIN.
 *
 * `displayName`/`email` are pre-filled from the Google account (user.displayName,
 * user.email) but Google never returns a phone number, so `phone` is whatever
 * the user typed during onboarding (E.164) alongside its dial `countryCode`.
 */
export const createGoogleUserProfile = async (
  user: User,
  username: string,
  displayName: string,
  phone: string | null,
  countryCode: string | null = null
) => {
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    email: user.email,
    username: username.toLowerCase(),
    displayName: displayName.trim() || user.displayName || username,
    phone: phone || user.phoneNumber,
    countryCode,
    stellarPublicKey: null,
    photoURL: user.photoURL || null,
    authProviders: user.providerData.map((p) => p.providerId),
    // Google users set a 6-digit PIN during onboarding, so the launch-time
    // PIN gate in app/index.tsx behaves the same as for email accounts.
    hasPin: true,
    createdAt: serverTimestamp(),
  });
};

/**
 * Signs in using an email OTP.
 * The backend verifies the OTP and returns a custom Firebase token.
 */
export const signInWithEmailOtp = async (email: string, otp: string) => {
  const result = await apiClient.post<{ customToken: string }>("/api/auth/verify-otp", { email, otp });
  const cred = await signInWithCustomToken(auth, result.customToken);
  return cred.user;
};

/**
 * Creates a Firestore profile for a phone-authenticated user.
 * Called during signup after the user has entered their username and email.
 */
export const createPhoneUserProfile = async (
  user: User,
  username: string,
  email: string,
  displayName: string,
  phone: string | null = null,
  countryCode: string | null = null
) => {
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    email,
    username: username.toLowerCase(),
    displayName: displayName.trim() || username,
    // This flow authenticates via email OTP, so user.phoneNumber is null —
    // persist the number the user typed at signup (E.164) and its dial code.
    phone: phone || user.phoneNumber,
    countryCode,
    stellarPublicKey: null,
    authProviders: user.providerData.map((p) => p.providerId),
    hasPin: false,
    createdAt: serverTimestamp(),
  });
};

/**
 * Verifies email OTP when a user adds a phone number to their account.
 */
export const verifyEmailOtpForLinking = async (email: string, otp: string) => {
  await apiClient.post("/api/auth/verify-otp", { email, otp });
  return true;
};

export const linkEmailToAccount = async (email: string, password: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("No user is currently signed in");

  const credential = EmailAuthProvider.credential(email, password);
  const result = await linkWithCredential(currentUser, credential);
  return result.user;
};

/**
 * Links Google credentials to the currently signed-in user.
 * Used when a phone user wants to add their Google account.
 */
export const linkGoogleToAccount = async (idToken: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("No user is currently signed in");

  const credential = GoogleAuthProvider.credential(idToken);
  const result = await linkWithCredential(currentUser, credential);
  return result.user;
};

// ── Profile Helpers ───────────────────────────────────────────────────

/**
 * Checks if a Firestore user profile exists for the given UID.
 */
export const checkUserProfileExists = async (uid: string): Promise<boolean> => {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists();
};

/**
 * Returns the list of auth providers linked to the current user.
 */
export const getLinkedProviders = (): string[] => {
  const currentUser = auth.currentUser;
  if (!currentUser) return [];
  return currentUser.providerData.map((p) => p.providerId);
};

/**
 * Triggers a 6-digit OTP email from the backend.
 * Returns the email string as the verificationId.
 */
export const sendEmailVerificationCode = async (
  email: string
): Promise<string> => {
  await apiClient.post("/api/auth/send-otp", { email });
  return email;
};
