import {
  doc, setDoc, collection, query, where, orderBy, limit,
  onSnapshot, serverTimestamp, Timestamp, getDocs, or,
} from "@firebase/firestore";
import { db } from "./config";

// ── Transaction record stored in Firestore ────────────────────────────

export interface TransactionRecord {
  hash: string;               // Stellar transaction hash (used as doc ID)
  senderUid: string;
  senderUsername: string;
  senderDisplayName?: string;
  receiverUid: string;
  receiverUsername: string;
  receiverDisplayName?: string;
  /** USD amount transferred on-chain */
  amountUSD: string;
  /** Display currency selected by sender (e.g. "IDR") */
  displayCurrency: string;
  /** Converted display amount (e.g. "817500") */
  displayAmount: string;
  memo: string;
  status: "completed" | "failed";
  /**
   * True for a participant's payment INTO the split-bill escrow contract.
   * The named receiver (organizer) hasn't received these funds yet — their
   * feed shows a single "+" row only when they claim from the escrow.
   */
  escrowShare?: boolean;
  createdAt: Timestamp;
}

/**
 * Save a completed transaction to Firestore.
 * Uses the Stellar transaction hash as the document ID for idempotency.
 */
export const saveTransaction = async (tx: Omit<TransactionRecord, "createdAt">) => {
  await setDoc(doc(db, "transactions", tx.hash), {
    ...tx,
    createdAt: serverTimestamp(),
  });
};

/**
 * Subscribe to transactions for a given user (both sent and received).
 * Returns an unsubscribe function.
 */
export const subscribeToUserTransactions = (
  uid: string,
  callback: (txs: TransactionRecord[]) => void
) => {
  const q = query(
    collection(db, "transactions"),
    or(
      where("senderUid", "==", uid),
      where("receiverUid", "==", uid)
    ),
    orderBy("createdAt", "desc"),
    limit(50)
  );

  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data() as TransactionRecord));
  });
};

/**
 * Get recent transactions for a user (one-time fetch).
 * Resolves sender and receiver logs in parallel to prevent index requirement errors.
 */
export const getRecentTransactions = async (uid: string): Promise<TransactionRecord[]> => {
  const qSender = query(
    collection(db, "transactions"),
    where("senderUid", "==", uid)
  );
  const qReceiver = query(
    collection(db, "transactions"),
    where("receiverUid", "==", uid)
  );

  const [snapSender, snapReceiver] = await Promise.all([
    getDocs(qSender),
    getDocs(qReceiver)
  ]);

  const txs = [
    ...snapSender.docs.map((d) => d.data() as TransactionRecord),
    ...snapReceiver.docs.map((d) => d.data() as TransactionRecord)
  ];

  // Sort by createdAt descending in memory
  return txs.sort((a, b) => {
    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return timeB - timeA;
  }).slice(0, 20);
};
