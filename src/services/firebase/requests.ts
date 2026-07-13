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
  status: "pending" | "paid" | "declined";
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
}

/**
 * Create a new payment request.
 */
export const createPaymentRequest = async (
  request: Omit<PaymentRequest, "id" | "createdAt" | "status">
): Promise<string> => {
  const requestRef = doc(collection(db, "requests"));
  const id = requestRef.id;

  await setDoc(requestRef, {
    ...request,
    id,
    status: "pending",
    createdAt: serverTimestamp(),
  });

  return id;
};

/**
 * Update a payment request status (e.g. paid or declined).
 */
export const updatePaymentRequest = async (
  requestId: string,
  update: { status: "paid" | "declined"; txHash?: string }
) => {
  await updateDoc(doc(db, "requests", requestId), update);
};

/**
 * Subscribe to pending requests where the current user needs to pay.
 */
export const subscribeToPendingRequests = (
  uid: string,
  callback: (requests: PaymentRequest[]) => void
) => {
  const q = query(
    collection(db, "requests"),
    and(
      where("status", "==", "pending"),
      or(
        where("receiverUid", "==", uid),
        where("senderUid", "==", uid)
      )
    ),
    orderBy("createdAt", "desc"),
    limit(20)
  );

  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data() as PaymentRequest));
  });
};

/**
 * Get all requests sent by the current user.
 */
export const getSentRequests = async (senderUid: string): Promise<PaymentRequest[]> => {
  const q = query(
    collection(db, "requests"),
    where("senderUid", "==", senderUid),
    orderBy("createdAt", "desc"),
    limit(20)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as PaymentRequest);
};

/**
 * Subscribe to all payment requests involving the user (sent or received).
 */
export const subscribeToAllUserRequests = (
  uid: string,
  callback: (requests: PaymentRequest[]) => void
) => {
  const q = query(
    collection(db, "requests"),
    or(
      where("senderUid", "==", uid),
      where("receiverUid", "==", uid)
    ),
    orderBy("createdAt", "desc"),
    limit(50)
  );

  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data() as PaymentRequest));
  });
};
