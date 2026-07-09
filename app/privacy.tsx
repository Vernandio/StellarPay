import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "../src/constants/colors";
import { Typography } from "../src/constants/typography";
import { Spacing } from "../src/constants/spacing";

export default function PrivacyScreen() {
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
        <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, justifyContent: "center", alignItems: "flex-start" }}>
          <Feather name="arrow-left" size={22} color={Colors.textLightPrimary} />
        </TouchableOpacity>
        <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary, fontWeight: "700" }]}>Privacy Policy</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.xxl }} showsVerticalScrollIndicator={false}>
        <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, marginBottom: Spacing.sm, fontSize: 22 }]}>StellarPay Privacy Policy</Text>
        <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary, marginBottom: Spacing.lg }]}>Last updated: July 9, 2026</Text>

        <Text style={[Typography.bodyMedium, { color: Colors.textLightPrimary, lineHeight: 22, marginBottom: Spacing.md }]}>
          Your privacy is important to us. This Privacy Policy explains how StellarPay collects, uses, and safeguards your information when you use our mobile application.
        </Text>

        <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary, marginTop: Spacing.lg, marginBottom: Spacing.sm }]}>1. Information We Collect</Text>
        <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, lineHeight: 22, marginBottom: Spacing.md }]}>
          We collect your email, username, display name, public key, and transaction records stored on Firestore to provide app functionality. We do NOT collect or store your private key or PIN on our servers. Your private key remains securely stored locally on your device.
        </Text>

        <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary, marginTop: Spacing.lg, marginBottom: Spacing.sm }]}>2. How We Use Information</Text>
        <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, lineHeight: 22, marginBottom: Spacing.md }]}>
          Your information is used solely to facilitate transfers, display user profiles for P2P lookups, resolve usernames, and send transaction status notifications. We never sell or share your data with third parties.
        </Text>

        <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary, marginTop: Spacing.lg, marginBottom: Spacing.sm }]}>3. Blockchain Public Ledger</Text>
        <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, lineHeight: 22, marginBottom: Spacing.md }]}>
          Please be aware that all transactions executed on the Stellar blockchain network are public and published permanently to a shared ledger. This information includes transaction hashes, public addresses, and transaction amounts.
        </Text>

        <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary, marginTop: Spacing.lg, marginBottom: Spacing.sm }]}>4. Security</Text>
        <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, lineHeight: 22, marginBottom: Spacing.md }]}>
          We utilize standard security mechanisms (encryption, Firestore security rules, Firebase Auth) to safeguard your data. However, you are solely responsible for securing your mobile device and PIN.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
