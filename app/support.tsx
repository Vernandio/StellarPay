import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn } from "react-native-reanimated";
import { Colors } from "../src/constants/colors";
import { Typography } from "../src/constants/typography";
import { Spacing } from "../src/constants/spacing";

const SUPPORT_EMAIL = "bantuidn@gmail.com";

const FAQ: { q: string; a: string }[] = [
  {
    q: "How long do transfers take?",
    a: "Most transfers arrive in just a few seconds — even when you're sending across borders.",
  },
  {
    q: "Do I pay any fees?",
    a: "No. Transfers are free — the amount you send is exactly the amount they receive.",
  },
  {
    q: "I forgot my PIN. What now?",
    a: "On the sign-in screen tap “Forgot PIN?” to receive an email reset code, then set a new 6-digit PIN.",
  },
  {
    q: "Is this real money?",
    a: "This is a demo build. Balances are for testing and hold no real-world value.",
  },
];

export default function SupportScreen() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const contact = (subject: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`).catch(() => {});
  };

  const toggle = (i: number) => {
    Haptics.selectionAsync();
    setOpenIndex(openIndex === i ? null : i);
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
        <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary }]}>Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg }} showsVerticalScrollIndicator={false}>
        {/* Contact card */}
        <View
          style={{
            backgroundColor: "#111111",
            borderRadius: 24,
            padding: Spacing.lg,
            marginBottom: Spacing.xl,
          }}
        >
          <Text style={[Typography.headingMedium, { color: Colors.white, marginBottom: Spacing.xs }]}>Need a hand?</Text>
          <Text style={[Typography.bodyMedium, { color: Colors.textSecondary, marginBottom: Spacing.lg }]}>Our team usually replies within a few hours.</Text>
          <Pressable
            onPress={() => contact("StellarPay Support Request")}
            style={{ backgroundColor: Colors.white, borderRadius: 9999, height: 52, flexDirection: "row", justifyContent: "center", alignItems: "center" }}
          >
            <Feather name="mail" size={18} color={Colors.textLightPrimary} style={{ marginRight: Spacing.sm }} />
            <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700" }]}>Email Support</Text>
          </Pressable>
        </View>

        {/* FAQ */}
        <Text style={[Typography.labelLarge, { color: Colors.textLightSecondary, marginBottom: Spacing.md, marginLeft: Spacing.xs }]}>Frequently asked</Text>
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
          {FAQ.map((item, idx) => {
            const open = openIndex === idx;
            return (
              <View
                key={idx}
                style={{
                  paddingVertical: Spacing.md,
                  borderBottomWidth: idx === FAQ.length - 1 ? 0 : 1,
                  borderBottomColor: Colors.borderLight,
                }}
              >
                <Pressable onPress={() => toggle(idx)} style={{ flexDirection: "row", alignItems: "center", minHeight: 32 }}>
                  <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "600", flex: 1, paddingRight: Spacing.md }]}>{item.q}</Text>
                  <Feather name={open ? "chevron-up" : "chevron-down"} size={20} color={Colors.textLightSecondary} />
                </Pressable>
                {open && (
                  <Animated.View entering={FadeIn.duration(150)}>
                    <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginTop: Spacing.sm }]}>{item.a}</Text>
                  </Animated.View>
                )}
              </View>
            );
          })}
        </View>

        <Pressable
          onPress={() => contact("StellarPay — Report a Problem")}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: Spacing.xl, paddingVertical: Spacing.md }}
        >
          <Feather name="flag" size={16} color={Colors.textLightSecondary} style={{ marginRight: Spacing.sm }} />
          <Text style={[Typography.labelLarge, { color: Colors.textLightSecondary, fontWeight: "600" }]}>Report a problem</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
