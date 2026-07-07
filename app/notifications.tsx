import React, { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "../src/constants/colors";
import { Typography } from "../src/constants/typography";
import { Spacing } from "../src/constants/spacing";
import { FlashList } from "@shopify/flash-list";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAuthStore } from "../src/store/authStore";
import {
  subscribeToNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  AppNotification,
} from "../src/services/firebase/notifications";

/** Map notification type to icon */
const getIcon = (type: AppNotification["type"]): string => {
  switch (type) {
    case "payment_received": return "download";
    case "payment_sent": return "upload";
    case "request_received": return "users";
    case "request_paid": return "check-circle";
    case "request_declined": return "x-circle";
    case "security": return "shield";
    default: return "bell";
  }
};

/** Format Firestore Timestamp to relative time */
const formatTime = (timestamp: any): string => {
  if (!timestamp?.toDate) return "Just now";
  const date = timestamp.toDate();
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
};

export default function NotificationsScreen() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToNotifications(user.uid, (notifs) => {
      setNotifications(notifs);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleMarkAllRead = async () => {
    if (!user?.uid) return;
    await markAllNotificationsRead(user.uid);
  };

  const handleNotificationPress = async (notif: AppNotification) => {
    if (!notif.read) {
      await markNotificationRead(notif.id);
    }
    // Could navigate to relevant screen based on type
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.baseLight }} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.lg, height: 56, backgroundColor: Colors.baseLight, borderBottomWidth: 1, borderBottomColor: Colors.borderLight }}>
        <Pressable onPress={() => router.back()} style={{ width: 44, height: 44, justifyContent: "center", alignItems: "flex-start" }}>
          <Feather name="chevron-left" size={28} color={Colors.textLightPrimary} />
        </Pressable>
        <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "700", fontSize: 18 }]}>Notifications</Text>
        <Pressable onPress={handleMarkAllRead} style={{ width: 44, height: 44, justifyContent: "center", alignItems: "flex-end" }}>
          <Feather name="check-circle" size={20} color={Colors.textLightSecondary} />
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>
        {notifications.length === 0 ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: Spacing.xxl }}>
            <Feather name="bell-off" size={48} color={Colors.textLightMuted} style={{ marginBottom: Spacing.lg }} />
            <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary, fontWeight: "600", marginBottom: Spacing.sm }]}>No notifications yet</Text>
            <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, textAlign: "center" }]}>
              You'll be notified when you receive payments or requests.
            </Text>
          </View>
        ) : (
          <FlashList
            data={notifications}
            keyExtractor={(item) => item.id}
            // @ts-ignore
            estimatedItemSize={85}
            contentContainerStyle={{ padding: Spacing.lg }}
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInDown.duration(300).delay(index * 50)}>
                <Pressable
                  onPress={() => handleNotificationPress(item)}
                  style={{
                    flexDirection: "row",
                    backgroundColor: item.read ? Colors.white : "#F0F9FF",
                    padding: Spacing.lg,
                    borderRadius: 16,
                    marginBottom: Spacing.md,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.03,
                    shadowRadius: 8,
                    elevation: 2,
                    borderWidth: 1,
                    borderColor: item.read ? Colors.borderLight : "#BFE4FF",
                    minHeight: 44,
                  }}
                >
                  <View style={{
                    width: 48, height: 48, borderRadius: 24,
                    backgroundColor: item.read ? Colors.baseLight : Colors.white,
                    justifyContent: "center", alignItems: "center",
                    marginRight: Spacing.md,
                  }}>
                    <Feather name={getIcon(item.type) as any} size={20} color={Colors.textLightPrimary} />
                  </View>
                  <View style={{ flex: 1, justifyContent: "center" }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                      <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700" }]}>{item.title}</Text>
                      {!item.read && (
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary }} />
                      )}
                    </View>
                    <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginBottom: Spacing.xs }]}>{item.message}</Text>
                    <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, fontSize: 11 }]}>{formatTime(item.createdAt)}</Text>
                  </View>
                </Pressable>
              </Animated.View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
