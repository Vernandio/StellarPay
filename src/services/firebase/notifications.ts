import {
  doc, getDoc, setDoc, updateDoc, collection, query, where,
  orderBy, limit, onSnapshot, serverTimestamp, Timestamp,
  getDocs, writeBatch,
} from "@firebase/firestore";
import { db } from "./config";
import { NotificationPrefs, DEFAULT_NOTIFICATION_PREFS } from "./firestore";

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

/** Which `notificationPrefs` category gates each notification type. */
const CATEGORY_BY_TYPE: Record<AppNotification["type"], keyof NotificationPrefs> = {
  payment_received: "payments",
  payment_sent: "payments",
  request_received: "requests",
  request_paid: "requests",
  request_declined: "requests",
  security: "security",
};

/**
 * Create a notification for a user — but only if they haven't muted this
 * category in their notification settings. Recipients who never saved
 * preferences fall back to DEFAULT_NOTIFICATION_PREFS (payments/requests/
 * security on, marketing off), so this is opt-out, not opt-in.
 *
 * This is the single place every caller routes through, and it's also what
 * feeds useNotificationListener's local push — so gating here suppresses
 * both the in-app notification and the OS push consistently.
 *
 * Returns null (instead of an id) when the notification was suppressed by
 * the recipient's preferences.
 */
export const createNotification = async (
  notification: Omit<AppNotification, "id" | "createdAt" | "read">
): Promise<string | null> => {
  const category = CATEGORY_BY_TYPE[notification.type];
  const userSnap = await getDoc(doc(db, "users", notification.uid));
  const prefs: NotificationPrefs = userSnap.exists()
    ? { ...DEFAULT_NOTIFICATION_PREFS, ...(userSnap.data().notificationPrefs || {}) }
    : DEFAULT_NOTIFICATION_PREFS;

  if (!prefs[category]) return null;

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
