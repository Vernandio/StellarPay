import {
  doc, setDoc, updateDoc, collection, query, where,
  orderBy, limit, onSnapshot, serverTimestamp, Timestamp,
  getDocs, or, and,
} from "@firebase/firestore";
import { db } from "./config";

// ── Payment Request stored in Firestore ───────────────────────────────

export interface PaymentRequest {
  id: string;
  senderUid: string;          // Who is requesting money
  senderUsername: string;
  senderDisplayName: string;
  receiverUid: string;        // Who is being asked to pay
  receiverUsername: string;
  /** USD amount requested */
  amountUSD: string;
  message: string;
  status: "pending" | "paid" | "declined" | "canceled" | "claimed" | "refunded";
  requestedCurrency?: string; // Optional local display currency (e.g. "IDR")
  requestedAmount?: string;   // Optional local display amount (e.g. "90000")
  createdAt: Timestamp;
  txHash?: string;            // Filled when paid
  splitItems?: { name: string; price: number; qty: number }[];
  taxAmount?: string;
  serviceAmount?: string;
  tipsAmount?: string;
  discountAmount?: string;
  subtotalAmount?: string;
  onChainBillId?: number;     // Link to on-chain Soroban escrow session ID
  contractTxHash?: string;    // Transaction hash of the contract deployment
  escrowDeadline?: number;    // Unix seconds after which the escrow is refundable
  claimTxHash?: string;       // Filled when the organizer claims escrowed funds
  refundTxHash?: string;      // Filled when a participant refunds their share
}

/** Firestore rejects `undefined` field values — drop them before writing. */
const stripUndefined = <T extends Record<string, any>>(obj: T): T =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;

/**
 * Create a new payment request.
 */
export const createPaymentRequest = async (
  request: Omit<PaymentRequest, "id" | "createdAt" | "status">
): Promise<string> => {
  const requestRef = doc(collection(db, "requests"));
  const id = requestRef.id;

  await setDoc(requestRef, {
    ...stripUndefined(request),
    id,
    status: "pending",
    createdAt: serverTimestamp(),
  });

  return id;
};

/**
 * Update a payment request status (e.g. paid, declined, or canceled).
 */
export const updatePaymentRequest = async (
  requestId: string,
  update: {
    status: PaymentRequest["status"];
    txHash?: string;
    claimTxHash?: string;
    refundTxHash?: string;
  }
) => {
  await updateDoc(doc(db, "requests", requestId), stripUndefined(update));
};

/**
 * Subscribe to pending requests where the current user needs to pay (incoming requests).
 * Sorted by recency and filtered by status in-memory to be index-free, limited to 3 items.
 */
export const subscribeToPendingRequests = (
  uid: string,
  callback: (requests: PaymentRequest[]) => void
) => {
  const q = query(
    collection(db, "requests"),
    where("receiverUid", "==", uid)
  );

  return onSnapshot(q, (snap) => {
    const pending = snap.docs
      .map((d) => d.data() as PaymentRequest)
      .filter((r) => r.status === "pending");

    pending.sort((a, b) => {
      const timeA = a.createdAt?.seconds || Date.now() / 1000;
      const timeB = b.createdAt?.seconds || Date.now() / 1000;
      return timeB - timeA;
    });

    callback(pending.slice(0, 3));
  }, (err) => {
    console.error("subscribeToPendingRequests error:", err);
  });
};

/**
 * Get all requests sent by the current user.
 */
export const getSentRequests = async (senderUid: string): Promise<PaymentRequest[]> => {
  const q = query(
    collection(db, "requests"),
    where("senderUid", "==", senderUid)
  );
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => d.data() as PaymentRequest);
  list.sort((a, b) => {
    const timeA = a.createdAt?.seconds || Date.now() / 1000;
    const timeB = b.createdAt?.seconds || Date.now() / 1000;
    return timeB - timeA;
  });
  return list.slice(0, 20);
};

export const subscribeToAllUserRequests = (
  uid: string,
  callback: (requests: PaymentRequest[]) => void
) => {
  const qSent = query(
    collection(db, "requests"),
    where("senderUid", "==", uid)
  );

  const qReceived = query(
    collection(db, "requests"),
    where("receiverUid", "==", uid)
  );

  let sentList: PaymentRequest[] = [];
  let receivedList: PaymentRequest[] = [];

  const mergeAndCallback = () => {
    const combined = [...sentList, ...receivedList];
    combined.sort((a, b) => {
      const timeA = a.createdAt?.seconds || Date.now() / 1000;
      const timeB = b.createdAt?.seconds || Date.now() / 1000;
      return timeB - timeA;
    });
    callback(combined.slice(0, 50));
  };

  const unsubSent = onSnapshot(qSent, (snap) => {
    sentList = snap.docs.map((d) => d.data() as PaymentRequest);
    mergeAndCallback();
  }, (err) => {
    console.error("subscribeToAllUserRequests sent query error:", err);
  });

  const unsubReceived = onSnapshot(qReceived, (snap) => {
    receivedList = snap.docs.map((d) => d.data() as PaymentRequest);
    mergeAndCallback();
  }, (err) => {
    console.error("subscribeToAllUserRequests received query error:", err);
  });

  return () => {
    unsubSent();
    unsubReceived();
  };
};
