import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "../src/constants/colors";
import { Typography } from "../src/constants/typography";
import { Spacing } from "../src/constants/spacing";

export default function TermsScreen() {
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
        <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary, fontWeight: "700" }]}>Terms of Service</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.xxl }} showsVerticalScrollIndicator={false}>
        <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, marginBottom: Spacing.sm, fontSize: 22 }]}>StellarPay User Agreement</Text>
        <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary, marginBottom: Spacing.lg }]}>Last updated: July 9, 2026</Text>

        <Text style={[Typography.bodyMedium, { color: Colors.textLightPrimary, lineHeight: 22, marginBottom: Spacing.md }]}>
          Welcome to StellarPay. Please read these Terms of Service carefully before accessing or using our application. By creating an account or using any part of the service, you agree to be bound by these terms.
        </Text>

        <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary, marginTop: Spacing.lg, marginBottom: Spacing.sm }]}>1. Use of Service</Text>
        <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, lineHeight: 22, marginBottom: Spacing.md }]}>
          StellarPay provides a digital interface utilizing decentralized blockchain protocols. You are responsible for maintaining the confidentiality of your PIN, keys, and security credentials. You agree not to use the app for any illegal or unauthorized purpose.
        </Text>

        <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary, marginTop: Spacing.lg, marginBottom: Spacing.sm }]}>2. Digital Assets & Transfers</Text>
        <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, lineHeight: 22, marginBottom: Spacing.md }]}>
          Transactions made on the Stellar blockchain network are permanent, final, and irreversible. StellarPay has no control over network delays, blockchain execution, or transaction fees associated with the underlying distributed network.
        </Text>

        <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary, marginTop: Spacing.lg, marginBottom: Spacing.sm }]}>3. Demo Version Limitation</Text>
        <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, lineHeight: 22, marginBottom: Spacing.md }]}>
          Please note that this version of StellarPay is a demo test build. All virtual balances, transactions, and rates are for simulation and demonstration purposes only and hold no real-world financial value.
        </Text>

        <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary, marginTop: Spacing.lg, marginBottom: Spacing.sm }]}>4. Limitation of Liability</Text>
        <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, lineHeight: 22, marginBottom: Spacing.md }]}>
          StellarPay is provided "as is" without warranties of any kind. Under no circumstances shall StellarPay, its developers, or affiliates be liable for any direct, indirect, incidental, or consequential damages resulting from your use of the application.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
