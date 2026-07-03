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
