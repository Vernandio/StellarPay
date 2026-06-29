import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./config";

export const signUp = async (email: string, password: string, username: string) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  // Create user profile in Firestore
  await setDoc(doc(db, "users", cred.user.uid), {
    uid: cred.user.uid,
    email,
    username: username.toLowerCase(),
    displayName: username,
    createdAt: serverTimestamp(),
    stellarPublicKey: null, // Set after wallet creation in Firebase Function
  });
  return cred.user;
};

export const signIn = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const signOut = () => firebaseSignOut(auth);

export const subscribeToAuth = (cb: (user: User | null) => void) =>
  onAuthStateChanged(auth, cb);
