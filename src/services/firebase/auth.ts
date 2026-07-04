import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInWithCredential,
  linkWithCredential,
  GoogleAuthProvider,
  PhoneAuthProvider,
  EmailAuthProvider,
  User,
} from "@firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "@firebase/firestore";
import { auth, db } from "./config";

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
 * Called during signup after the user has entered their username.
 */
export const createGoogleUserProfile = async (
  user: User,
  username: string,
  phone: string | null
) => {
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    email: user.email,
    username: username.toLowerCase(),
    displayName: user.displayName || username,
    phone,
    stellarPublicKey: null,
    authProviders: user.providerData.map((p) => p.providerId),
    hasPin: false,
    createdAt: serverTimestamp(),
  });
};

// ── Phone Auth ────────────────────────────────────────────────────────

/**
 * Signs in using a phone verification credential.
 * The verificationId is obtained from the reCAPTCHA WebView,
 * and the OTP code is entered by the user.
 */
export const signInWithPhone = async (verificationId: string, otp: string) => {
  const credential = PhoneAuthProvider.credential(verificationId, otp);
  const result = await signInWithCredential(auth, credential);
  return result.user;
};

/**
 * Creates a Firestore profile for a phone-authenticated user.
 * Called during signup after the user has entered their username and email.
 */
export const createPhoneUserProfile = async (
  user: User,
  username: string,
  email: string
) => {
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    email,
    username: username.toLowerCase(),
    displayName: username,
    phone: user.phoneNumber,
    stellarPublicKey: null,
    authProviders: user.providerData.map((p) => p.providerId),
    hasPin: false,
    createdAt: serverTimestamp(),
  });
};

// ── Account Linking ───────────────────────────────────────────────────

/**
 * Links phone credentials to the currently signed-in user.
 * Used when a Google/email user verifies their phone number.
 */
export const linkPhoneToAccount = async (verificationId: string, otp: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("No user is currently signed in");

  const credential = PhoneAuthProvider.credential(verificationId, otp);
  const result = await linkWithCredential(currentUser, credential);
  return result.user;
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
 * A custom implementation of Firebase's ApplicationVerifier interface.
 * Bridges Firebase Auth with our React Native WebView reCAPTCHA Modal.
 */
class CustomApplicationVerifier {
  type = "recaptcha";
  private modalRef: { verify: () => Promise<string> } | null;

  constructor(modalRef: any) {
    this.modalRef = modalRef;
  }

  async verify(): Promise<string> {
    if (!this.modalRef || !this.modalRef.verify) {
      throw new Error("reCAPTCHA modal reference is not mounted or accessible");
    }
    return this.modalRef.verify();
  }

  // Required by Firebase Auth JS SDK internally
  _reset() {
    // Optional: add any logic to reset your custom modal state if necessary
  }

  clear() {
    // Optional: add any logic to clear your custom modal state if necessary
  }
}

/**
 * Triggers a real Firebase SMS verification to a phone number.
 * Returns a verificationId that must be verified using the code.
 */
export const sendPhoneVerificationCode = async (
  phoneNumber: string,
  recaptchaModalRef: any
): Promise<string> => {
  const phoneProvider = new PhoneAuthProvider(auth);
  const verifier = new CustomApplicationVerifier(recaptchaModalRef);
  const verificationId = await phoneProvider.verifyPhoneNumber(
    phoneNumber,
    verifier
  );
  return verificationId;
};
