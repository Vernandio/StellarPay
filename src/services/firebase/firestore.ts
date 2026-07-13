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
  /** Dial code selected at signup, e.g. "+62". Stored alongside the full E.164 `phone`. */
  countryCode?: string | null;
  stellarPublicKey: string | null;
  avatarUrl?: string;
  authProviders?: string[];
  hasPin?: boolean;
  displayCurrencyCode?: string;
  notificationPrefs?: NotificationPrefs;
  createdAt: Timestamp;
}

/** Per-category notification toggles, persisted on the user profile. */
export interface NotificationPrefs {
  payments: boolean;   // received / sent payments
  requests: boolean;   // money requests + their outcomes
  security: boolean;   // PIN changes, new sign-ins
  marketing: boolean;  // product news & promos
}

/** Applied when a profile has never saved preferences. */
export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  payments: true,
  requests: true,
  security: true,
  marketing: false,
};

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

/**
 * Returns true if `username` is free to claim, or already belongs to
 * `currentUid` (so a user re-saving their own unchanged username passes).
 * Usernames are stored lowercase; the caller must normalize before calling.
 */
export const isUsernameAvailable = async (
  username: string,
  currentUid: string
): Promise<boolean> => {
  const existing = await getUserByUsername(username);
  return !existing || existing.uid === currentUid;
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
import type { TransactionRecord } from "./transactions";
import type { PaymentRequest } from "./requests";

/**
 * Suggested friends = people the user has reached out to money-wise:
 *   • people they've SENT money to (transactions where they are the sender), and
 *   • people they've REQUESTED money from (requests where they are the requester).
 * De-duplicated by username, ordered most-recent-interaction first. Open QR
 * requests (no specific recipient) and the user themselves are excluded.
 *
 * Queries are single-field equality (no orderBy) so they don't need a composite
 * index; recency ordering is done in memory.
 */
export const getSuggestedFriends = async (uid: string): Promise<Friend[]> => {
  const sentQ = query(collection(db, "transactions"), where("senderUid", "==", uid));
  const requestedQ = query(collection(db, "requests"), where("senderUid", "==", uid));

  const [sentSnap, requestedSnap] = await Promise.all([getDocs(sentQ), getDocs(requestedQ)]);

  type Candidate = { uid: string; username: string; displayName: string; at: number };
  const byUsername = new Map<string, Candidate>();

  const consider = (
    counterpartyUid: string,
    username: string | undefined,
    displayName: string | undefined,
    at: number
  ) => {
    // Skip open requests, self, and the synthetic "anchor" counterparty used
    // for Add Money / Withdraw transfers — it's not a real person to pay.
    if (!username || counterpartyUid === uid || counterpartyUid === "anchor") return;
    const key = username.toLowerCase();
    const name = displayName?.trim() || username;
    const existing = byUsername.get(key);
    if (!existing) {
      byUsername.set(key, { uid: counterpartyUid, username, displayName: name, at });
      return;
    }
    existing.at = Math.max(existing.at, at);
    if (!existing.uid && counterpartyUid) existing.uid = counterpartyUid;
    // Prefer a real display name over one that's just the handle.
    if (existing.displayName === existing.username && name !== username) {
      existing.displayName = name;
    }
  };

  const millis = (t: any): number => (t?.toMillis ? t.toMillis() : 0);

  sentSnap.docs.forEach((d) => {
    const t = d.data() as TransactionRecord;
    consider(t.receiverUid, t.receiverUsername, t.receiverDisplayName, millis(t.createdAt));
  });
  requestedSnap.docs.forEach((d) => {
    const r = d.data() as PaymentRequest;
    consider(r.receiverUid, r.receiverUsername, undefined, millis(r.createdAt));
  });

  return [...byUsername.values()]
    .sort((a, b) => b.at - a.at)
    .map((c) => ({
      id: c.uid || c.username,
      name: c.displayName,
      handle: `@${c.username}`,
      avatar: c.displayName.charAt(0).toUpperCase(),
      color: "#7B61FF",
    }));
};
