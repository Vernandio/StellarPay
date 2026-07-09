import React, { useState } from "react";
import { View, Text, Pressable, Switch, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Colors } from "../src/constants/colors";
import { Typography } from "../src/constants/typography";
import { Spacing } from "../src/constants/spacing";
import { useAuth } from "../src/hooks/useAuth";
import { useAuthStore } from "../src/store/authStore";
import {
  updateUserProfile,
  NotificationPrefs,
  DEFAULT_NOTIFICATION_PREFS,
} from "../src/services/firebase/firestore";

type Row = {
  key: keyof NotificationPrefs;
  icon: string;
  title: string;
  description: string;
};

const ROWS: Row[] = [
  { key: "payments", icon: "dollar-sign", title: "Payments", description: "When you send or receive money" },
  { key: "requests", icon: "users", title: "Money Requests", description: "New requests and their outcomes" },
  { key: "security", icon: "shield", title: "Security", description: "PIN changes and new sign-ins" },
  { key: "marketing", icon: "gift", title: "Product & Promos", description: "News, tips, and special offers" },
];

export default function NotificationSettingsScreen() {
  const { user, profile } = useAuth();
  const setProfile = useAuthStore((s) => s.setProfile);

  const [prefs, setPrefs] = useState<NotificationPrefs>(
    profile?.notificationPrefs ?? DEFAULT_NOTIFICATION_PREFS
  );

  const toggle = async (key: keyof NotificationPrefs, value: boolean) => {
    if (!user) return;
    Haptics.selectionAsync();

    const previous = prefs;
    const next = { ...prefs, [key]: value };
    setPrefs(next); // optimistic

    try {
      await updateUserProfile(user.uid, { notificationPrefs: next });
      if (profile) setProfile({ ...profile, notificationPrefs: next });
    } catch {
      // Roll back on failure so the switch reflects the persisted truth.
      setPrefs(previous);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.baseLight }} edges={["top", "bottom"]}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: Spacing.lg,
          height: 56,
          backgroundColor: Colors.baseLight,
          borderBottomWidth: 1,
          borderBottomColor: Colors.borderLight,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{ width: 40, height: 40, justifyContent: "center", alignItems: "flex-start" }}
        >
          <Feather name="arrow-left" size={22} color={Colors.textLightPrimary} />
        </Pressable>
        <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary }]}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg }} showsVerticalScrollIndicator={false}>
        <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginBottom: Spacing.lg, marginLeft: Spacing.xs }]}>
          Choose which push notifications you'd like to receive.
        </Text>

        <View
          style={{
            backgroundColor: Colors.white,
            borderRadius: 20,
            paddingHorizontal: Spacing.lg,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.03,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          {ROWS.map((row, idx) => (
            <View
              key={row.key}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: Spacing.md,
                borderBottomWidth: idx === ROWS.length - 1 ? 0 : 1,
                borderBottomColor: Colors.borderLight,
                minHeight: 56,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: Colors.baseLight,
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: Spacing.md,
                }}
              >
                <Feather name={row.icon as any} size={18} color={Colors.textLightPrimary} />
              </View>
              <View style={{ flex: 1, paddingRight: Spacing.md }}>
                <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "600" }]}>
                  {row.title}
                </Text>
                <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>
                  {row.description}
                </Text>
              </View>
              <Switch
                value={prefs[row.key]}
                onValueChange={(v) => toggle(row.key, v)}
                trackColor={{ false: Colors.borderLightStrong, true: Colors.primary }}
                thumbColor={Colors.white}
                ios_backgroundColor={Colors.borderLightStrong}
              />
            </View>
          ))}
        </View>

        <Text style={[Typography.bodySmall, { color: Colors.textLightMuted, marginTop: Spacing.lg, marginLeft: Spacing.xs }]}>
          Security alerts are recommended to help keep your account safe.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
