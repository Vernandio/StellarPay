import {
  doc, setDoc, updateDoc, collection, query, where,
  orderBy, limit, onSnapshot, serverTimestamp, Timestamp,
  getDocs, writeBatch,
} from "@firebase/firestore";
import { db } from "./config";

// ── Notification stored in Firestore ──────────────────────────────────

export interface AppNotification {
  id: string;
  uid: string;                // Recipient user ID
  title: string;
  message: string;
  type: "payment_received" | "payment_sent" | "request_received" | "request_paid" | "request_declined" | "security";
  /** Reference ID (transaction hash or request ID) */
  referenceId?: string;
  read: boolean;
  createdAt: Timestamp;
}

/**
 * Create a notification for a user.
 */
export const createNotification = async (
  notification: Omit<AppNotification, "id" | "createdAt" | "read">
): Promise<string> => {
  const notifRef = doc(collection(db, "notifications"));
  const id = notifRef.id;

  await setDoc(notifRef, {
    ...notification,
    id,
    read: false,
    createdAt: serverTimestamp(),
  });

  return id;
};

/**
 * Subscribe to notifications for the current user.
 * Returns an unsubscribe function.
 */
export const subscribeToNotifications = (
  uid: string,
  callback: (notifications: AppNotification[]) => void
) => {
  const q = query(
    collection(db, "notifications"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(50)
  );

  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data() as AppNotification));
  });
};

/**
 * Mark a single notification as read.
 */
export const markNotificationRead = async (notificationId: string) => {
  await updateDoc(doc(db, "notifications", notificationId), { read: true });
};

/**
 * Mark all notifications as read for a user.
 */
export const markAllNotificationsRead = async (uid: string) => {
  const q = query(
    collection(db, "notifications"),
    where("uid", "==", uid),
    where("read", "==", false)
  );
  const snap = await getDocs(q);

  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
};

/**
 * Get unread notification count for badge display.
 */
export const getUnreadCount = async (uid: string): Promise<number> => {
  const q = query(
    collection(db, "notifications"),
    where("uid", "==", uid),
    where("read", "==", false)
  );
  const snap = await getDocs(q);
  return snap.size;
};
