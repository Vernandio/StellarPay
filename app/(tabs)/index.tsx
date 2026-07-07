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
import { useTransactions } from "../../src/hooks/useTransactions";
import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import { InteractiveAnchorModal } from "../../src/components/InteractiveAnchorModal";

const { width } = Dimensions.get("window");

export default function WalletScreen() {
  const { publicKey, xlmBalance, usdcBalance, isLoadingBalance, refreshBalances } = useWallet();
  const { user, profile } = useAuth();
  const { initializeWallet, isProcessing, error: stellarError } = useStellar();
  const { activities } = useTransactions();
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);
  const [isAnchorModalVisible, setIsAnchorModalVisible] = useState(false);
  const [anchorTxType, setAnchorTxType] = useState<"deposit" | "withdraw">("deposit");
  const currencySheetRef = useRef<BottomSheetModal>(null);

  const handleCurrencySelect = () => {
    currencySheetRef.current?.present();
  };

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    []
  );

  useEffect(() => {
    const checkWalletKeypair = async () => {
      if (!profile || !user || isProcessing) return;

      // Case 1: User has no registered public key at all
      if (!profile.stellarPublicKey) {
        console.log("No Stellar Wallet found for logged-in user. Automatically creating wallet...");
        await initializeWallet();
        return;
      }

      // Case 2: User has a registered public key, verify keypair integrity
      const { loadKeypairFromSecureStore } = require("../../src/services/stellar/wallet");
      const keypair = await loadKeypairFromSecureStore(user.uid);
      if (!keypair) {
        console.warn("Stellar keypair is missing locally and cannot be restored from backup. Regenerating a fresh wallet...");
        await initializeWallet();
        return;
      }

      // Case 3: Keypair exists but its public key doesn't match the registered one
      //         (this happens when a keypair was generated with a buggy Buffer/Hermes polyfill)
      if (keypair.publicKey() !== profile.stellarPublicKey) {
        console.warn(
          `Keypair public key mismatch! Local: ${keypair.publicKey()}, Profile: ${profile.stellarPublicKey}. Regenerating...`
        );
        await initializeWallet();
      }
    };

    checkWalletKeypair().catch((err) => {
      console.error("Wallet keypair validation failed:", err);
    });
  }, [profile, isProcessing]);

  if (isProcessing || (profile && !profile.stellarPublicKey)) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={["top", "bottom"]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: Spacing.xl }}>
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginBottom: Spacing.lg }} />
          <Text style={[Typography.headingLarge, { color: Colors.textPrimary, textAlign: "center", marginBottom: Spacing.sm }]}>
            Initializing Stellar Wallet...
          </Text>
          <Text style={[Typography.bodyLarge, { color: Colors.textSecondary, textAlign: "center", paddingHorizontal: Spacing.md }]}>
            Creating your gasless Stellar wallet and funding it with 10,000 Testnet XLM.
          </Text>
          {stellarError && (
            <Text style={[Typography.bodySmall, { color: Colors.danger, marginTop: Spacing.md, textAlign: "center" }]}>
              {stellarError}
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const balances = [
    { id: "usdc", name: "USDC", desc: "USD Coin (Stellar)", amount: usdcBalance, fiat: usdcBalance, icon: "dollar-sign", color: "#2775CA" },
    { id: "xlm", name: "XLM", desc: "Stellar Lumens", amount: xlmBalance, fiat: Number(xlmBalance) * 0.15, icon: "aperture", color: "#000000" },
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
                    onPress={async () => {
                      if (action.label === "Add Money") {
                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setAnchorTxType("deposit");
                        setIsAnchorModalVisible(true);
                      } else if (action.label === "Withdraw") {
                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setAnchorTxType("withdraw");
                        setIsAnchorModalVisible(true);
                      } else if (action.route) {
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
              {activities.slice(0, 4).map((item, index) => (
                <Pressable key={item.id} style={{ flexDirection: "row", alignItems: "center", padding: Spacing.md, paddingHorizontal: Spacing.lg, borderBottomWidth: index === Math.min(activities.length, 4) - 1 ? 0 : 1, borderBottomColor: Colors.borderLight }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: item.type === "swap" ? Colors.white : Colors.baseLight, justifyContent: "center", alignItems: "center", marginRight: Spacing.md, borderWidth: item.type === "swap" ? 1 : 0, borderColor: Colors.borderLight }}>
                    <Feather name={item.icon as any} size={20} color={item.type === "swap" ? Colors.textLightPrimary : Colors.textLightPrimary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.bodyLarge, { color: Colors.textLightPrimary, fontWeight: "600", marginBottom: 2 }]}>{item.title}</Text>
                    <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>{item.dateSection === "Today" || item.dateSection === "Yesterday" ? `${item.dateSection}, ` : ""}{item.time}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[Typography.bodyLarge, { color: item.isPositive ? Colors.teal : Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>{item.amountPrimary}</Text>
                    {item.amountSecondary && <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>{item.amountSecondary}</Text>}
                  </View>
                </Pressable>
              ))}
              {activities.length === 0 && (
                <View style={{ padding: Spacing.xl, alignItems: "center" }}>
                  <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>No recent activity</Text>
                </View>
              )}
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
      <InteractiveAnchorModal
        visible={isAnchorModalVisible}
        onClose={() => setIsAnchorModalVisible(false)}
        transactionType={anchorTxType}
        onSuccess={refreshBalances}
      />
    </View>
  );
}
