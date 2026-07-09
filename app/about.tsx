import React from "react";
import { View, Text, Pressable, ScrollView, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Constants from "expo-constants";
import { Colors } from "../src/constants/colors";
import { Typography } from "../src/constants/typography";
import { Spacing } from "../src/constants/spacing";

const VERSION = Constants.expoConfig?.version ?? "1.0.0";

const LINKS: { icon: string; title: string; route: string }[] = [
  { icon: "file-text", title: "Terms of Service", route: "/terms" },
  { icon: "lock", title: "Privacy Policy", route: "/privacy" },
];

export default function AboutScreen() {
  const open = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as any);
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
        <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, justifyContent: "center", alignItems: "flex-start" }}>
          <Feather name="arrow-left" size={22} color={Colors.textLightPrimary} />
        </Pressable>
        <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary }]}>About</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg, alignItems: "center" }} showsVerticalScrollIndicator={false}>
        {/* App identity */}
        <View
          style={{
            width: 88, height: 88, borderRadius: 24, backgroundColor: "#111111",
            justifyContent: "center", alignItems: "center", marginTop: Spacing.lg, marginBottom: Spacing.lg,
            shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 6,
          }}
        >
          <Feather name="send" size={38} color={Colors.white} />
        </View>
        <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, marginBottom: 2 }]}>StellarPay</Text>
        <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginBottom: Spacing.xl }]}>Version {VERSION}</Text>

        <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, textAlign: "center", marginBottom: Spacing.xl, paddingHorizontal: Spacing.md, lineHeight: 22 }]}>
          Fast, borderless payments. Send money as easily as a message — with no fees and no waiting.
        </Text>

        {/* Demo notice */}
        <View
          style={{
            flexDirection: "row", alignItems: "center",
            backgroundColor: "#FFF7E6", borderColor: "#F0A50033", borderWidth: 1,
            borderRadius: 16, padding: Spacing.md, marginBottom: Spacing.xl, width: "100%",
          }}
        >
          <Feather name="alert-triangle" size={18} color={Colors.amber} style={{ marginRight: Spacing.md }} />
          <Text style={[Typography.bodySmall, { color: "#8A6D1A", flex: 1 }]}>
            Demo mode — balances are for testing and hold no real-world value.
          </Text>
        </View>

        {/* Links */}
        <View
          style={{
            backgroundColor: Colors.white, borderRadius: 20, paddingHorizontal: Spacing.lg, width: "100%",
            shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2,
          }}
        >
          {LINKS.map((l, idx) => (
            <Pressable
              key={l.title}
              onPress={() => open(l.route)}
              style={{
                flexDirection: "row", alignItems: "center", paddingVertical: Spacing.md, minHeight: 52,
                borderBottomWidth: idx === LINKS.length - 1 ? 0 : 1, borderBottomColor: Colors.borderLight,
              }}
            >
              <Feather name={l.icon as any} size={20} color={Colors.textLightPrimary} style={{ marginRight: Spacing.md }} />
              <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "600", flex: 1 }]}>{l.title}</Text>
              <Feather name="external-link" size={16} color={Colors.textLightSecondary} />
            </Pressable>
          ))}
        </View>

        <Text style={[Typography.bodySmall, { color: Colors.textLightMuted, marginTop: Spacing.xxl }]}>
          © {new Date().getFullYear()} StellarPay
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
