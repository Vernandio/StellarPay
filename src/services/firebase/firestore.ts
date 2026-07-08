import {
  doc, getDoc, setDoc, updateDoc, collection,
  query, where, getDocs, orderBy, limit,
  onSnapshot, serverTimestamp, Timestamp,
} from "@firebase/firestore";
import { db } from "./config";

// ── Firestore schema types ────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  email: string | null;
  username: string;
  displayName: string;
  phone: string | null;
  stellarPublicKey: string | null;
  authProviders?: string[];
  hasPin?: boolean;
  createdAt: Timestamp;
}

export interface WalletData {
  uid: string;
  stellarPublicKey: string;
  xlmBalance: string;        // cached from Horizon, always re-fetch for accuracy
  usdcBalance: string;       // cached
  lastSyncedAt: Timestamp;
}

export interface TransactionCache {
  id: string;                // Stellar transaction hash
  uid: string;
  type: "send" | "receive" | "swap";
  amount: string;
  asset: "XLM" | "USDC";
  counterpartyUsername: string | null;
  counterpartyAddress: string;
  memo: string | null;
  createdAt: Timestamp;
  stellarTxHash: string;
}

// ── Collections ───────────────────────────────────────────────────────

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
};

export const getUserByUsername = async (username: string): Promise<UserProfile | null> => {
  const q = query(collection(db, "users"), where("username", "==", username.toLowerCase()), limit(1));
  const snap = await getDocs(q);
  return snap.empty ? null : (snap.docs[0].data() as UserProfile);
};

export const getUserByPhone = async (phone: string): Promise<UserProfile | null> => {
  const q = query(collection(db, "users"), where("phone", "==", phone.trim()), limit(1));
  const snap = await getDocs(q);
  return snap.empty ? null : (snap.docs[0].data() as UserProfile);
};

export const getUserByPublicKey = async (publicKey: string): Promise<UserProfile | null> => {
  const q = query(collection(db, "users"), where("stellarPublicKey", "==", publicKey.trim()), limit(1));
  const snap = await getDocs(q);
  return snap.empty ? null : (snap.docs[0].data() as UserProfile);
};

export const searchUser = async (queryStr: string): Promise<UserProfile | null> => {
  const cleanQuery = queryStr.trim().toLowerCase();
  if (!cleanQuery) return null;

  // Try username
  const cleanUsername = cleanQuery.replace("@", "");
  let q = query(collection(db, "users"), where("username", "==", cleanUsername), limit(1));
  let snap = await getDocs(q);
  if (!snap.empty) return snap.docs[0].data() as UserProfile;

  // Try phone (removing common formatting: space, dash, parentheses, plus sign)
  const cleanPhone = cleanQuery.replace(/[\s\-\(\)\+]/g, "");
  // We can match both the exact input and with a leading "+" if the database phone has one
  q = query(collection(db, "users"), where("phone", "==", cleanQuery), limit(1));
  snap = await getDocs(q);
  if (!snap.empty) return snap.docs[0].data() as UserProfile;

  q = query(collection(db, "users"), where("phone", "==", "+" + cleanPhone), limit(1));
  snap = await getDocs(q);
  if (!snap.empty) return snap.docs[0].data() as UserProfile;

  q = query(collection(db, "users"), where("phone", "==", cleanPhone), limit(1));
  snap = await getDocs(q);
  if (!snap.empty) return snap.docs[0].data() as UserProfile;

  // Try email
  q = query(collection(db, "users"), where("email", "==", cleanQuery), limit(1));
  snap = await getDocs(q);
  if (!snap.empty) return snap.docs[0].data() as UserProfile;

  return null;
};

export const getWallet = async (uid: string): Promise<WalletData | null> => {
  const snap = await getDoc(doc(db, "wallets", uid));
  return snap.exists() ? (snap.data() as WalletData) : null;
};

export const updateWalletCache = (uid: string, data: Partial<WalletData>) =>
  updateDoc(doc(db, "wallets", uid), { ...data, lastSyncedAt: serverTimestamp() });

export const updateUserProfile = (uid: string, data: Partial<UserProfile>) =>
  updateDoc(doc(db, "users", uid), data);

export const createWalletCache = (uid: string, publicKey: string) =>
  setDoc(doc(db, "wallets", uid), {
    uid,
    stellarPublicKey: publicKey,
    xlmBalance: "10000.0000000",
    usdcBalance: "0.00",
    lastSyncedAt: serverTimestamp(),
  });

export const subscribeToTransactions = (
  uid: string,
  cb: (txs: TransactionCache[]) => void
) => {
  const q = query(
    collection(db, "transactions"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => d.data() as TransactionCache))
  );
};

import { Friend } from "../../types";

export const getSuggestedFriends = async (uid: string): Promise<Friend[]> => {
  const q = query(
    collection(db, "transactions"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(200)
  );
  
  const snap = await getDocs(q);
  const txs = snap.docs.map(d => d.data() as TransactionCache);
  
  const sentTo = new Set<string>();
  const receivedFrom = new Set<string>();
  
  for (const tx of txs) {
    if (tx.counterpartyUsername) {
      if (tx.type === "send") sentTo.add(tx.counterpartyUsername.toLowerCase());
      if (tx.type === "receive") receivedFrom.add(tx.counterpartyUsername.toLowerCase());
    }
  }
  
  const mutualFriends = [...sentTo].filter(username => receivedFrom.has(username));
  const friends: Friend[] = [];
  
  for (const username of mutualFriends.slice(0, 10)) {
    const profile = await getUserByUsername(username);
    if (profile) {
      friends.push({
        id: profile.uid,
        name: profile.displayName || profile.username,
        handle: `@${profile.username}`,
        avatar: (profile.displayName || profile.username).charAt(0).toUpperCase(),
        color: "#7B61FF",
      });
    }
  }
  
  return friends;
};
