import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { useAuthStore } from "../store/authStore";
import { subscribeToNotifications } from "../services/firebase/notifications";

// Configure notification behavior when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const useNotificationListener = () => {
  const { user } = useAuthStore();
  const isInitialized = useRef(false);
  const mountTime = useRef(Date.now());
  const processedNotifs = useRef<Set<string>>(new Set());

  // 1. Request permissions on mount
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== "granted") {
          console.log("Notification permission not granted");
        }
      } catch (err) {
        console.warn("Failed to get notification permissions:", err);
      }
    };

    requestPermissions();
  }, []);

  // 2. Subscribe to Firestore notifications
  useEffect(() => {
    if (!user?.uid) return;

    // Reset tracking on user change
    processedNotifs.current.clear();
    mountTime.current = Date.now();

    const unsubscribe = subscribeToNotifications(user.uid, (notifs) => {
      // Skip the initial callback run so we don't alert old notifications
      if (!isInitialized.current) {
        notifs.forEach((n) => processedNotifs.current.add(n.id));
        isInitialized.current = true;
        return;
      }

      // Check for any newly added notifications
      notifs.forEach(async (notif) => {
        // If we haven't seen this notification yet and it's unread
        if (!processedNotifs.current.has(notif.id)) {
          processedNotifs.current.add(notif.id);

          // Only trigger if notification was created after mount or has no timestamp yet (optimistic local updates)
          const notifTime = notif.createdAt?.toDate ? notif.createdAt.toDate().getTime() : Date.now();
          if (notifTime >= mountTime.current - 5000 && !notif.read) {
            try {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: notif.title,
                  body: notif.message,
                  sound: true,
                },
                trigger: null, // immediate
              });
            } catch (err) {
              console.warn("Failed to schedule local notification:", err);
            }
          }
        }
      });
    });

    return () => {
      unsubscribe();
      isInitialized.current = false;
    };
  }, [user?.uid]);
};
