import { View, Text, ScrollView, Pressable, ActivityIndicator, Image, Dimensions, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { FlashList } from "@shopify/flash-list";
import { Colors } from "../../src/constants/colors";
import { Typography } from "../../src/constants/typography";
import { Spacing } from "../../src/constants/spacing";
import { useWallet } from "../../src/hooks/useWallet";
import { useAuth } from "../../src/hooks/useAuth";
import { useStellar } from "../../src/hooks/useStellar";
import { formatAmount } from "../../src/utils/format";
import { CURRENCIES } from "../../src/constants/currencies";
import { useState, useRef, useCallback, useMemo } from "react";
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";

const { width } = Dimensions.get("window");

export default function WalletScreen() {
  const { publicKey, xlmBalance, usdcBalance, isLoadingBalance, refreshBalances } = useWallet();
  const { profile } = useAuth();
  const { initializeWallet, isProcessing, error: stellarError } = useStellar();
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);
  const currencySheetRef = useRef<BottomSheetModal>(null);

  const handleCurrencySelect = () => {
    currencySheetRef.current?.present();
  };

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    []
  );

  if (false) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={["top", "bottom"]}>
        <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: Spacing.lg }}>
          <Animated.View entering={FadeInDown.duration(300).springify()}>
            <View style={{ alignItems: "center", marginBottom: Spacing.xl }}>
              <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: Colors.primaryGlow, justifyContent: "center", alignItems: "center", marginBottom: Spacing.md }}>
                <Feather name="credit-card" size={32} color={Colors.primary} />
              </View>
              <Text style={[Typography.headingLarge, { color: Colors.textPrimary, textAlign: "center", marginBottom: Spacing.sm }]}>
                Activate Your Stellar Wallet
              </Text>
              <Text style={[Typography.bodyLarge, { color: Colors.textSecondary, textAlign: "center", paddingHorizontal: Spacing.md }]}>
                To start sending and receiving payments at the speed of light, initialize your gasless Stellar wallet.
              </Text>
            </View>
            <View style={{ backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 0.5, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.xl }}>
              {[
                { icon: "zap" as const, title: "Gasless Transactions", desc: "Protocol 13 fee-bumps sponsor network gas fees." },
                { icon: "refresh-cw" as const, title: "Programmatic Swapping", desc: "USDC automatically swaps to settle in local stablecoins." },
                { icon: "gift" as const, title: "Free Hackathon Assets", desc: "Immediately funded with 10,000 Testnet XLM to try transfers." },
              ].map((item, idx) => (
                <View key={idx} style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: idx === 2 ? 0 : Spacing.md }}>
                  <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.surface2, justifyContent: "center", alignItems: "center", marginRight: Spacing.md, marginTop: 2 }}>
                    <Feather name={item.icon} size={16} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.bodyMedium, { color: Colors.textPrimary, fontWeight: "600", marginBottom: 2 }]}>{item.title}</Text>
                    <Text style={[Typography.bodySmall, { color: Colors.textMuted }]}>{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
            {stellarError && (
              <Text style={[Typography.bodySmall, { color: Colors.danger, textAlign: "center", marginBottom: Spacing.md }]}>{stellarError}</Text>
            )}
            <Pressable
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                await initializeWallet();
              }}
              disabled={isProcessing}
              style={{
                height: 56, borderRadius: 9999, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center", flexDirection: "row",
                shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 4,
                opacity: isProcessing ? 0.7 : 1,
              }}
            >
              {isProcessing ? (
                <>
                  <ActivityIndicator size="small" color={Colors.white} style={{ marginRight: Spacing.sm }} />
                  <Text style={[Typography.labelLarge, { color: Colors.white }]}>Initializing Wallet...</Text>
                </>
              ) : (
                <>
                  <Text style={[Typography.labelLarge, { color: Colors.white }]}>Activate Wallet</Text>
                  <Feather name="arrow-right" size={16} color={Colors.white} style={{ marginLeft: Spacing.sm }} />
                </>
              )}
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  const balances = [
    { id: "usdc", name: "USDC", desc: "USD Coin (Stellar)", amount: usdcBalance, fiat: usdcBalance, icon: "dollar-sign", color: "#2775CA" },
    { id: "usdt", name: "USDT", desc: "Tether (Stellar)", amount: 420.50, fiat: 420.50, icon: "dollar-sign", color: "#26A17B" },
    { id: "xlm", name: "XLM", desc: "Stellar Lumens", amount: xlmBalance, fiat: 542.32, icon: "aperture", color: "#000000" },
  ];

  const activities = [
    { id: "1", title: "To Sarah", time: "Today, 9:20 AM", amount: "- $25.00", subAmount: "- 12.50 USDC", type: "send", avatar: require("../../assets/images/avatar.png") },
    { id: "2", title: "Starbucks", time: "Today, 8:45 AM", amount: "- $6.80", subAmount: "- 6.80 USDC", type: "merchant", icon: "coffee", color: "#00704A" },
    { id: "3", title: "Paid to Coffee House", time: "Yesterday, 6:32 PM", amount: "- $15.25", subAmount: "- 15.25 USDC", type: "merchant", icon: "coffee", color: "#D4B098" },
    { id: "4", title: "Swap USDC -> XLM", time: "Yesterday, 4:10 PM", amount: "+ 25.00 XLM", subAmount: "+ $24.80", type: "swap", icon: "refresh-cw", color: Colors.surface, iconColor: Colors.textLightPrimary, isPositive: true },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.baseLight }}>
      <LinearGradient
        colors={["#000000", "#111111", Colors.baseLight]}
        locations={[0, 0.6, 1]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 380 }}
      />

      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(300).delay(0)} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Feather name="aperture" size={24} color={Colors.white} style={{ marginRight: Spacing.sm }} />
              <Text style={[Typography.headingMedium, { color: Colors.white, fontWeight: "700" }]}>StellarPay</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Pressable onPress={() => router.push("/notifications")} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center", marginRight: Spacing.sm }}>
                <Feather name="bell" size={20} color={Colors.white} />
                <View style={{ position: "absolute", top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.white, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.15)" }} />
              </Pressable>
              <Image source={require("../../assets/images/avatar.png")} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface }} />
            </View>
          </Animated.View>

          {/* Greeting */}
          <Animated.View entering={FadeInDown.duration(300).delay(100)} style={{ paddingHorizontal: Spacing.lg, marginTop: Spacing.xl, marginBottom: Spacing.xl }}>
            <Text style={[Typography.bodyMedium, { color: Colors.textSecondary, marginBottom: Spacing.xs }]}>Good Morning,</Text>
            <Text style={[Typography.displayMedium, { color: Colors.white }]}>{profile?.displayName || "Alex"} 👋</Text>
          </Animated.View>

          {/* Balance Card */}
          <Animated.View entering={FadeInDown.duration(300).delay(200)} style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl }}>
            <View style={{ backgroundColor: Colors.surfaceLight, borderRadius: 24, padding: Spacing.xl, shadowColor: "#000", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.05, shadowRadius: 24, elevation: 8, overflow: "hidden" }}>
              <Image source={require("../../assets/images/card_map.png")} style={{ position: "absolute", top: 0, right: -40, width: 250, height: 250, opacity: 0.8 }} resizeMode="contain" />

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.sm }}>
                <Pressable onPress={handleCurrencySelect} style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.03)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99, alignSelf: "flex-start" }}>
                  <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginRight: 4 }]}>{currency.code} Balance</Text>
                  <Feather name="chevron-down" size={14} color={Colors.textLightSecondary} />
                </Pressable>
                <Pressable onPress={() => setIsBalanceHidden(!isBalanceHidden)} style={{ padding: 4, marginRight: Spacing.sm }}>
                  <Feather name={isBalanceHidden ? "eye-off" : "eye"} size={20} color={Colors.textLightSecondary} />
                </Pressable>
              </View>

              <Text style={[Typography.displayLarge, { color: Colors.textLightPrimary, marginBottom: Spacing.md }]}>
                {isBalanceHidden ? "****" : `${currency.symbol}${formatAmount(Number(usdcBalance) * currency.rate)}`}
              </Text>

              <View style={{ alignSelf: "flex-start", backgroundColor: Colors.baseLight, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: 99, flexDirection: "row", alignItems: "center", marginBottom: Spacing.xl }}>
                <Text style={[Typography.bodySmall, { color: Colors.textLightPrimary, fontWeight: "600", marginRight: Spacing.xs }]}>
                  {isBalanceHidden ? "≈ ****" : `≈ ${formatAmount(xlmBalance, "XLM", 4)} XLM`}
                </Text>
                <Feather name="chevron-right" size={14} color={Colors.textLightSecondary} />
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: Spacing.lg }}>
                {[
                  { icon: "plus", label: "Add Money", route: "/add-money" },
                  { icon: "send", label: "Send", route: "/pay-friends" },
                  { icon: "download", label: "Request", route: "/request-friends" },
                  { icon: "external-link", label: "Withdraw", route: "/withdraw" }
                ].map((action, i) => (
                  <Pressable 
                    key={i} 
                    style={{ alignItems: "center" }}
                    onPress={() => {
                      if (action.route) {
                        router.push(action.route as any);
                      }
                    }}
                  >
                    <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: Colors.baseLight, justifyContent: "center", alignItems: "center", marginBottom: Spacing.xs }}>
                      <Feather name={action.icon as any} size={20} color={Colors.textLightPrimary} />
                    </View>
                    <Text style={[Typography.bodySmall, { color: Colors.textLightPrimary, fontWeight: "600" }]}>{action.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Animated.View>

          {/* Quick Actions Grid */}
          <Animated.View entering={FadeInDown.duration(300).delay(300)} style={{ paddingHorizontal: Spacing.lg, flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.xl }}>
            {[
              { icon: "maximize", label: "Scan QR", sub: "Pay merchant", route: "/qr" },
              { icon: "wifi", label: "Tap to Pay", sub: "Instantly", route: "/pay-tap" },
              { icon: "repeat", label: "Swap", sub: "Exchange assets", route: "/swap" }
            ].map((action, i) => (
              <Pressable 
                key={i} 
                style={{ flex: 1, alignItems: "center", backgroundColor: Colors.surfaceLight, borderRadius: 16, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xs, marginHorizontal: i > 0 ? Spacing.xs : 0, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}
                onPress={() => {
                  if (action.route) {
                    router.push(action.route as any);
                  }
                }}
              >
                <Feather name={action.icon as any} size={24} color={Colors.textLightPrimary} style={{ marginBottom: Spacing.sm }} />
                <Text style={[Typography.labelSmall, { color: Colors.textLightPrimary, textAlign: "center", textTransform: "none", fontSize: 12, marginBottom: 2 }]}>{action.label}</Text>
                <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary, fontSize: 10, textAlign: "center" }]}>{action.sub}</Text>
              </Pressable>
            ))}
          </Animated.View>

          {/* My Balances */}
          <Animated.View entering={FadeInDown.duration(300).delay(400)} style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl }}>
            <View style={{ backgroundColor: Colors.surfaceLight, borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Spacing.lg, paddingBottom: Spacing.md }}>
                <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary, fontWeight: "700" }]}>My Balances</Text>
                {/* <Pressable style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginRight: 2 }]}>See all</Text>
                  <Feather name="chevron-right" size={16} color={Colors.textLightSecondary} />
                </Pressable> */}
              </View>
              <View style={{ minHeight: balances.length * 70 }}>
                <FlashList
                  data={balances}
                  renderItem={({ item, index }) => (
                    <Pressable style={{ flexDirection: "row", alignItems: "center", padding: Spacing.lg, borderBottomWidth: index === balances.length - 1 ? 0 : 1, borderBottomColor: Colors.borderLight }}>
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: item.color, justifyContent: "center", alignItems: "center", marginRight: Spacing.md }}>
                        <Feather name={item.icon as any} size={20} color={Colors.white} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[Typography.bodyLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>{item.name}</Text>
                        <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>{item.desc}</Text>
                      </View>
                      <View style={{ alignItems: "flex-end", marginRight: Spacing.sm }}>
                        <Text style={[Typography.bodyLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>
                          {isBalanceHidden ? "****" : formatAmount(item.amount)}
                        </Text>
                        <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>
                          {isBalanceHidden ? "****" : `$${formatAmount(item.fiat)}`}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={20} color={Colors.textLightSecondary} />
                    </Pressable>
                  )}
                  // @ts-ignore
                  estimatedItemSize={70}
                />
              </View>
            </View>
          </Animated.View>

          {/* Recent Activity */}
          <Animated.View entering={FadeInDown.duration(300).delay(500)} style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl }}>
            <View style={{ backgroundColor: Colors.surfaceLight, borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Spacing.lg, paddingBottom: Spacing.sm }}>
                <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary, fontWeight: "700" }]}>Recent Activity</Text>
                <Pressable onPress={() => router.push("/activity")} style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginRight: 2 }]}>See all</Text>
                  <Feather name="chevron-right" size={16} color={Colors.textLightSecondary} />
                </Pressable>
              </View>
              {activities.map((item, index) => (
                <Pressable key={item.id} style={{ flexDirection: "row", alignItems: "center", padding: Spacing.md, paddingHorizontal: Spacing.lg, borderBottomWidth: index === activities.length - 1 ? 0 : 1, borderBottomColor: Colors.borderLight }}>
                  {item.avatar ? (
                    <Image source={item.avatar} style={{ width: 40, height: 40, borderRadius: 20, marginRight: Spacing.md }} />
                  ) : (
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: item.color, justifyContent: "center", alignItems: "center", marginRight: Spacing.md, borderWidth: item.id === "4" ? 1 : 0, borderColor: Colors.borderLight }}>
                      <Feather name={item.icon as any} size={20} color={item.iconColor || Colors.white} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.bodyLarge, { color: Colors.textLightPrimary, fontWeight: "600", marginBottom: 2 }]}>{item.title}</Text>
                    <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>{item.time}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[Typography.bodyLarge, { color: item.isPositive ? Colors.teal : Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>{item.amount}</Text>
                    <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>{item.subAmount}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </Animated.View>


        </ScrollView>
      </SafeAreaView>

      <BottomSheetModal
        ref={currencySheetRef}
        enableDynamicSizing={true}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: Colors.white, borderRadius: 24 }}
        handleIndicatorStyle={{ backgroundColor: Colors.border, width: 40 }}
      >
        <BottomSheetView style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl }}>
          <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, marginBottom: Spacing.lg, marginTop: Spacing.sm }]}>Select Display Currency</Text>
          {CURRENCIES.map((c) => (
            <TouchableOpacity
              key={c.code}
              onPress={() => {
                setCurrency(c);
                Haptics.selectionAsync();
                currencySheetRef.current?.dismiss();
              }}
              style={{ flexDirection: "row", alignItems: "center", paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight }}
              activeOpacity={0.7}
            >
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.baseLight, justifyContent: "center", alignItems: "center", marginRight: Spacing.md }}>
                <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary }]}>{c.symbol}</Text>
              </View>
              <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, flex: 1 }]}>{c.code}</Text>
              {currency.code === c.code && <Feather name="check" size={24} color={"#111111"} />}
            </TouchableOpacity>
          ))}
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}
