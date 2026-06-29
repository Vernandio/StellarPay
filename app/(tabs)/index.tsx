import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Colors } from "../../src/constants/colors";
import { Typography } from "../../src/constants/typography";
import { Spacing } from "../../src/constants/spacing";
import { useWallet } from "../../src/hooks/useWallet";
import { useAuth } from "../../src/hooks/useAuth";
import { formatAmount } from "../../src/utils/format";

export default function WalletScreen() {
  const { xlmBalance, usdcBalance, isLoadingBalance, refreshBalances } = useWallet();
  const { profile } = useAuth();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(280).delay(0)}>
          <Text style={[Typography.headingLarge, { color: Colors.textPrimary, marginBottom: Spacing.xs }]}>
            Welcome back{profile?.displayName ? `, ${profile.displayName}` : ""}
          </Text>
          <Text style={[Typography.bodyMedium, { color: Colors.textMuted, marginBottom: Spacing.lg }]}>
            Your stellar wallet
          </Text>
        </Animated.View>

        {/* Balance Card */}
        <Animated.View entering={FadeInDown.duration(280).delay(100)}>
          <View style={{
            backgroundColor: Colors.surface,
            borderRadius: 16,
            borderWidth: 0.5,
            borderColor: Colors.border,
            padding: Spacing.lg,
            marginBottom: Spacing.lg,
            shadowColor: Colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 16,
            elevation: 4,
          }}>
            <Text style={[Typography.labelSmall, { color: Colors.textMuted, marginBottom: Spacing.sm }]}>
              TOTAL BALANCE
            </Text>
            <Text style={[Typography.amount, { color: Colors.textPrimary, marginBottom: Spacing.md }]}>
              ${formatAmount(usdcBalance)}
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View>
                <Text style={[Typography.bodySmall, { color: Colors.textMuted }]}>USDC</Text>
                <Text style={[Typography.headingMedium, { color: Colors.textPrimary }]}>{formatAmount(usdcBalance)}</Text>
              </View>
              <View>
                <Text style={[Typography.bodySmall, { color: Colors.textMuted }]}>XLM</Text>
                <Text style={[Typography.headingMedium, { color: Colors.textPrimary }]}>{formatAmount(xlmBalance, "XLM", 4)}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.duration(280).delay(200)}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.xl }}>
            {[
              { icon: "send" as const, label: "Send", onPress: () => router.push("/(tabs)/pay") },
              { icon: "download" as const, label: "Receive", onPress: () => router.push("/modals/receive") },
              { icon: "maximize" as const, label: "Scan", onPress: () => router.push("/modals/qr-scan") },
            ].map((action, i) => (
              <Pressable
                key={action.label}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  action.onPress();
                }}
                style={{
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: Spacing.md,
                  marginHorizontal: Spacing.xs,
                  backgroundColor: Colors.surface,
                  borderRadius: 16,
                  borderWidth: 0.5,
                  borderColor: Colors.border,
                }}
              >
                <View style={{
                  width: 48,
                  height: 48,
                  borderRadius: 9999,
                  backgroundColor: Colors.surface2,
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: Spacing.sm,
                }}>
                  <Feather name={action.icon} size={24} color={Colors.primary} />
                </View>
                <Text style={[Typography.labelLarge, { color: Colors.textPrimary }]}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Recent Activity Header */}
        <Animated.View entering={FadeInDown.duration(280).delay(300)}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md }}>
            <Text style={[Typography.headingMedium, { color: Colors.textPrimary }]}>Recent Activity</Text>
            <Pressable onPress={() => router.push("/(tabs)/activity")}>
              <Text style={[Typography.bodySmall, { color: Colors.primary }]}>See All</Text>
            </Pressable>
          </View>

          {/* Empty State */}
          <View style={{
            alignItems: "center",
            paddingVertical: Spacing.xxl,
          }}>
            <Feather name="inbox" size={48} color={Colors.teal} style={{ marginBottom: Spacing.md }} />
            <Text style={[Typography.headingMedium, { color: Colors.textPrimary, marginBottom: Spacing.sm }]}>
              No transactions yet
            </Text>
            <Text style={[Typography.bodyMedium, { color: Colors.textMuted, textAlign: "center" }]}>
              Send your first payment to get started
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
