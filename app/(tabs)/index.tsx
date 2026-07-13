import { View, Text, ScrollView, Pressable, ActivityIndicator, Image, Dimensions, StyleSheet, TouchableOpacity, Alert, RefreshControl, Share, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { router, useNavigation } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { FlashList } from "@shopify/flash-list";
import { Colors } from "../../src/constants/colors";
import { Typography } from "../../src/constants/typography";
import { Spacing } from "../../src/constants/spacing";
import { useWallet } from "../../src/hooks/useWallet";
import { useAuth } from "../../src/hooks/useAuth";
import { useStellar } from "../../src/hooks/useStellar";
import { formatAmount } from "../../src/utils/format";
import { CURRENCIES, Currency, getCurrencyByCode } from "../../src/constants/currencies";
import { fetchExchangeRates, ExchangeRates, convertUSDTo } from "../../src/services/exchangeRates";
import { useTransactions, Activity } from "../../src/hooks/useTransactions";
import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { db } from "../../src/services/firebase/config";
import { doc as fsDoc, getDoc, updateDoc } from "firebase/firestore";
import { InteractiveAnchorModal } from "../../src/components/InteractiveAnchorModal";
import { PinVerifySheet, PinVerifySheetRef } from "../../src/components/PinVerifySheet";
import { subscribeToPendingRequests, updatePaymentRequest, PaymentRequest } from "../../src/services/firebase/requests";
import { saveTransaction } from "../../src/services/firebase/transactions";
import { createNotification } from "../../src/services/firebase/notifications";
import { getUserProfile } from "../../src/services/firebase/firestore";
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useAuthStore } from "../../src/store/authStore";

const { width } = Dimensions.get("window");

export default function Index() {
  const { profile } = useAuth();
  const { user } = useAuthStore();
  const { publicKey, xlmBalance, usdcBalance, isLoadingBalance, displayCurrencyCode, setDisplayCurrencyCode, refreshBalances } = useWallet();
  const { initializeWallet, send, isProcessing, error: stellarError } = useStellar();
  const { activities, isLoading: isTxLoading, fetchTransactions } = useTransactions();
  const currency = getCurrencyByCode(displayCurrencyCode);
  
  const detailSheetRef = useRef<BottomSheetModal>(null);
  const requestDetailSheetRef = useRef<BottomSheetModal>(null);
  const requestItemsSheetRef = useRef<BottomSheetModal>(null);
  const viewShotRef = useRef<any>(null);
  const [selectedTx, setSelectedTx] = useState<Activity | null>(null);

  const handleTxPress = (tx: Activity) => {
    Haptics.selectionAsync();
    setSelectedTx(tx);
    detailSheetRef.current?.present();
  };

  const handleRequestPress = (req: PaymentRequest) => {
    Haptics.selectionAsync();
    setSelectedRequest(req);
    requestDetailSheetRef.current?.present();
  };

  const handleShareReceipt = async () => {
    if (!selectedTx || !viewShotRef.current) return;
    try {
      const uri = await viewShotRef.current.capture();
      
      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = uri;
        link.download = `receipt-${selectedTx.hash || selectedTx.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share Receipt' });
    } catch (err) {
      console.warn('Share receipt failed:', err);
      try {
        const shareMessage = `StellarPay Receipt\n\n` +
          `Title: ${selectedTx.title}\n` +
          `Amount: ${selectedTx.amountPrimary}\n` +
          `Date: ${selectedTx.dateSection} ${selectedTx.time}\n` +
          `Status: Successful\n` +
          `Reference ID: ${selectedTx.hash || "N/A"}\n` +
          (selectedTx.memo ? `Note: ${selectedTx.memo}\n` : "");
        await Share.share({ message: shareMessage });
      } catch (fallbackErr) {
        console.warn('Fallback share failed:', fallbackErr);
      }
    }
  };
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);
  const [isAnchorModalVisible, setIsAnchorModalVisible] = useState(false);
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [pendingRequests, setPendingRequests] = useState<PaymentRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isRestoringWallet, setIsRestoringWallet] = useState(false);

  const pinSheetRef = useRef<PinVerifySheetRef>(null);
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState("Hello");

  useEffect(() => {
    const greetings = ["Hello", "Hola", "Bonjour", "Ciao", "Konnichiwa", "Aloha", "Namaste", "Sawasdee", "Apa Kabar", "Shalom", "Olá", "Guten Tag", "Yasou"];
    const randomIdx = Math.floor(Math.random() * greetings.length);
    setGreeting(greetings[randomIdx]);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshBalances(), fetchTransactions()]);
    setRefreshing(false);
  }, [refreshBalances, fetchTransactions]);

  // Refresh balances & transaction history whenever the screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      refreshBalances();
      fetchTransactions();
    });
    return unsubscribe;
  }, [navigation, refreshBalances, fetchTransactions]);

  // Subscribe to pending requests
  useEffect(() => {
    if (!user?.uid) {
      setPendingRequests([]);
      return;
    }
    const unsubscribe = subscribeToPendingRequests(user.uid, (reqs) => {
      setPendingRequests(reqs);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  // Fetch live exchange rates
  useEffect(() => {
    fetchExchangeRates().then(setRates).catch(console.warn);
  }, []);
  const [anchorTxType, setAnchorTxType] = useState<"deposit" | "withdraw">("deposit");
  const currencySheetRef = useRef<BottomSheetModal>(null);

  const handleCurrencySelect = () => {
    currencySheetRef.current?.present();
  };

  const renderBackdrop = useCallback((props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />, []);

  useEffect(() => {
    const checkWalletKeypair = async () => {
      if (!profile || !user || isProcessing || isRestoringWallet) return;

      const { loadKeypairFromSecureStore, storeKeypairSecurely, generateKeypair, fundTestnetAccount } = require("../../src/services/stellar/wallet");
      
      let keypair = await loadKeypairFromSecureStore(user.uid);
      
      const needsInitialization = !profile.stellarPublicKey;
      const needsRestoration = profile.stellarPublicKey && (!keypair || keypair.publicKey() !== profile.stellarPublicKey);

      if (needsInitialization) {
        console.log("No Stellar Wallet found for logged-in user. Automatically creating wallet...");
        await initializeWallet();
        return;
      }

      if (needsRestoration) {
        console.log("Local keypair is missing or mismatching. Attempting to restore or re-initialize...");
        setIsRestoringWallet(true);
        try {
          // Try to restore from firestore stellarPrivateKey
          const userDoc = await getDoc(fsDoc(db, "users", user.uid));
          const userData = userDoc.exists() ? userDoc.data() : null;

          if (userData && userData.stellarPrivateKey) {
            const { Keypair } = require("@stellar/stellar-sdk");
            const restoredKeypair = Keypair.fromSecret(userData.stellarPrivateKey);
            if (restoredKeypair.publicKey() === profile.stellarPublicKey) {
              await storeKeypairSecurely(user.uid, restoredKeypair);
              console.log("Successfully restored matching keypair from Firestore backup!");
              setIsRestoringWallet(false);
              return;
            }
          }
          
          // If restoration unavailable or mismatched, re-initialize a new working keypair
          console.log("Restoration unavailable or mismatch. Generating a new working keypair...");
          const newKeypair = await generateKeypair();
          await fundTestnetAccount(newKeypair.publicKey());
          await storeKeypairSecurely(user.uid, newKeypair);
          
          // Update Firestore
          await updateDoc(fsDoc(db, "users", user.uid), {
            stellarPublicKey: newKeypair.publicKey(),
            stellarPrivateKey: newKeypair.secret(),
            hasUSDCTrustline: false
          });
          console.log("Re-initialized new Stellar keypair successfully.");
        } catch (err) {
          console.error("Failed to restore or re-initialize wallet:", err);
        } finally {
          setIsRestoringWallet(false);
        }
      }
    };

    checkWalletKeypair().catch((err) => {
      console.error("Wallet keypair validation failed:", err);
    });
  }, [profile, isProcessing, isRestoringWallet]);

  const handlePayRequest = (req: PaymentRequest) => {
    setSelectedRequest(req);
    pinSheetRef.current?.present();
  };

  const handleExecutePayment = async () => {
    if (!selectedRequest || !user) return;
    setIsProcessingPayment(true);

    try {
      // Look up requester's public key
      const requester = await getUserProfile(selectedRequest.senderUid);
      if (!requester?.stellarPublicKey) {
        throw new Error("This person hasn't finished setting up their account yet.");
      }

      // Execute USDC payment on Stellar
      const txHash = await send(
        requester.stellarPublicKey,
        selectedRequest.amountUSD,
        "USDC",
        selectedRequest.message,
        selectedRequest.senderUid
      );

      // Update payment request status in Firestore
      await updatePaymentRequest(selectedRequest.id, {
        status: "paid",
        txHash,
      });

      // Save transaction record to Firestore for recipient & sender
      await saveTransaction({
        hash: txHash,
        senderUid: user.uid,
        senderUsername: profile?.username || "",
        receiverUid: selectedRequest.senderUid,
        receiverUsername: selectedRequest.senderUsername,
        amountUSD: selectedRequest.amountUSD,
        displayCurrency: "USD",
        displayAmount: selectedRequest.amountUSD,
        memo: selectedRequest.message,
        status: "completed",
      });

      // Notify the requester
      await createNotification({
        uid: selectedRequest.senderUid,
        title: "Request Paid",
        message: `${profile?.displayName || profile?.username} paid your request of $${parseFloat(selectedRequest.amountUSD).toFixed(2)} USD`,
        type: "request_paid",
        referenceId: selectedRequest.id,
      });

      // Notify the current user
      await createNotification({
        uid: user.uid,
        title: "Payment Sent",
        message: `You paid $${parseFloat(selectedRequest.amountUSD).toFixed(2)} USD to ${selectedRequest.senderDisplayName}`,
        type: "payment_sent",
        referenceId: txHash,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", `Paid $${parseFloat(selectedRequest.amountUSD).toFixed(2)} USD successfully.`);
      refreshBalances();
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Payment Failed", err.message || "Failed to pay request.");
    } finally {
      setIsProcessingPayment(false);
      setSelectedRequest(null);
    }
  };

  const handleDeclineRequest = async (req: PaymentRequest) => {
    if (!user) return;

    Alert.alert("Decline Request", `Are you sure you want to decline this request for $${parseFloat(req.amountUSD).toFixed(2)} USD from ${req.senderDisplayName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Decline",
        style: "destructive",
        onPress: async () => {
          try {
            await updatePaymentRequest(req.id, { status: "declined" });

            // Notify the requester
            await createNotification({
              uid: req.senderUid,
              title: "Request Declined",
              message: `${profile?.displayName || profile?.username} declined your request of $${parseFloat(req.amountUSD).toFixed(2)} USD`,
              type: "request_declined",
              referenceId: req.id,
            });

            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to decline request.");
          }
        },
      },
    ]);
  };

  const isSettingUp = !profile?.stellarPublicKey;
  if (isProcessing || isProcessingPayment || (profile && !profile.stellarPublicKey)) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={["top", "bottom"]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: Spacing.xl }}>
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginBottom: Spacing.lg }} />
          <Text style={[Typography.headingLarge, { color: Colors.textPrimary, textAlign: "center", marginBottom: Spacing.sm }]}>
            {isSettingUp ? "Setting up your account..." : "Processing Payment..."}
          </Text>
          <Text style={[Typography.bodyLarge, { color: Colors.textSecondary, textAlign: "center", paddingHorizontal: Spacing.md }]}>
            {isSettingUp ? "Getting your wallet ready. This only takes a moment." : "Submitting transaction to the Stellar network."}
          </Text>
          {stellarError && <Text style={[Typography.bodySmall, { color: Colors.danger, marginTop: Spacing.md, textAlign: "center" }]}>{stellarError}</Text>}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.baseLight }}>
      <LinearGradient colors={["#000000", "#111111", Colors.baseLight]} locations={[0, 0.6, 1]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 380 }} />

      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.white} />}
        >
          {/* Header */}
          <Animated.View
            entering={FadeInDown.duration(300).delay(0)}
            style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Feather name="aperture" size={24} color={Colors.white} style={{ marginRight: Spacing.sm }} />
              <Text style={[Typography.headingMedium, { color: Colors.white, fontWeight: "700" }]}>StellarPay</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Pressable
                onPress={() => router.push("/notifications")}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center", marginRight: Spacing.sm }}
              >
                <Feather name="bell" size={20} color={Colors.white} />
                <View
                  style={{ position: "absolute", top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.white, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.15)" }}
                />
              </Pressable>

              <Pressable
                onPress={() => router.push("/(tabs)/profile")}
                style={{ width: 40, height: 40, borderRadius: 20, overflow: "hidden", backgroundColor: Colors.surface, justifyContent: "center", alignItems: "center" }}
              >
                {profile?.avatarUrl ? (
                  <Image source={{ uri: profile.avatarUrl }} style={{ width: "100%", height: "100%" }} />
                ) : (
                  <Feather name="user" size={20} color={Colors.white} />
                )}
              </Pressable>
            </View>
          </Animated.View>

          {/* Greeting */}
          <Animated.View entering={FadeInDown.duration(300).delay(100)} style={{ paddingHorizontal: Spacing.lg, marginTop: Spacing.xl, marginBottom: Spacing.xl }}>
            <Text style={[Typography.bodyMedium, { color: Colors.textSecondary, marginBottom: Spacing.xs }]}>{greeting},</Text>
            <Text style={[Typography.displayMedium, { color: Colors.white }]}>{profile?.displayName || "Alex"}</Text>
          </Animated.View>

          {/* Balance Card */}
          <Animated.View entering={FadeInDown.duration(300).delay(200)} style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl }}>
            <View
              style={{
                backgroundColor: Colors.surfaceLight,
                borderRadius: 24,
                padding: Spacing.xl,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.05,
                shadowRadius: 24,
                elevation: 8,
                overflow: "hidden",
              }}
            >
              <Image source={require("../../assets/images/card_map.png")} style={{ position: "absolute", top: 0, right: -40, width: 250, height: 250, opacity: 0.8 }} resizeMode="contain" />

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.sm }}>
                <Pressable
                  onPress={handleCurrencySelect}
                  style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.03)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99, alignSelf: "flex-start" }}
                >
                  <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginRight: 4 }]}>{currency.code} Balance</Text>
                  <Feather name="chevron-down" size={14} color={Colors.textLightSecondary} />
                </Pressable>
                <Pressable onPress={() => setIsBalanceHidden(!isBalanceHidden)} style={{ padding: 4, marginRight: Spacing.sm }}>
                  <Feather name={isBalanceHidden ? "eye-off" : "eye"} size={20} color={Colors.textLightSecondary} />
                </Pressable>
              </View>

              <Text style={[Typography.displayLarge, { color: Colors.textLightPrimary, marginBottom: displayCurrencyCode !== "USD" ? Spacing.xs : Spacing.md }]}>
                {isBalanceHidden ? "****" : `${currency.symbol}${formatAmount(Number(usdcBalance) * (rates?.[currency.code as keyof ExchangeRates] ?? 1))}`}
              </Text>
              
              {displayCurrencyCode !== "USD" && !isBalanceHidden && (
                <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginBottom: Spacing.md }]}>
                  = ${formatAmount(Number(usdcBalance))} USD
                </Text>
              )}

              <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: Spacing.lg }}>
                {[
                  { icon: "plus", label: "Add Money", route: "" },
                  { icon: "send", label: "Send", route: "/pay?tab=Pay" },
                  { icon: "download", label: "Request", route: "/pay?tab=Request" },
                  { icon: "external-link", label: "Withdraw", route: "" },
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

          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <Animated.View entering={FadeInDown.duration(300).delay(350)} style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl }}>
              <View
                style={{
                  backgroundColor: Colors.surfaceLight,
                  borderRadius: 16,
                  overflow: "hidden",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.03,
                  shadowRadius: 8,
                  elevation: 2,
                  padding: Spacing.lg,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md }}>
                  <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary, fontWeight: "700" }]}>Pending Requests</Text>
                  <View style={{ backgroundColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 }}>
                    <Text style={[Typography.labelSmall, { color: Colors.white, fontWeight: "700" }]}>{pendingRequests.length}</Text>
                  </View>
                </View>
                <FlashList
                  data={pendingRequests}
                  // @ts-ignore
                  estimatedItemSize={90}
                  renderItem={({ item }) => {
                    const localAmount = rates ? convertUSDTo(parseFloat(item.amountUSD), currency.code as keyof ExchangeRates, rates) : item.amountUSD;
                    return (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingVertical: Spacing.md,
                          borderBottomWidth: pendingRequests.indexOf(item) === pendingRequests.length - 1 ? 0 : 1,
                          borderBottomColor: Colors.borderLight,
                        }}
                      >
                        <Pressable
                          onPress={() => handleRequestPress(item)}
                          style={{ flex: 1, flexDirection: "row", alignItems: "center" }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[Typography.bodyLarge, { color: Colors.textLightPrimary, fontWeight: "600" }]}>{item.senderDisplayName}</Text>
                            <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary, marginTop: 2 }]} numberOfLines={1}>
                              {item.message || "Requested money"}
                            </Text>
                          </View>
                          <View style={{ alignItems: "flex-end", marginRight: Spacing.md }}>
                            <Text style={[Typography.bodyLarge, { color: Colors.textLightPrimary, fontWeight: "700" }]}>
                              {currency.symbol}
                              {localAmount}
                            </Text>
                            {item.requestedCurrency && item.requestedCurrency !== currency.code ? (
                              <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>
                                {item.requestedCurrency}{" "}
                                {parseFloat(item.requestedAmount || "0").toLocaleString(undefined, {
                                  minimumFractionDigits: item.requestedCurrency === "VND" || item.requestedCurrency === "IDR" ? 0 : 2,
                                })}
                              </Text>
                            ) : currency.code !== "USD" ? (
                              <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>${parseFloat(item.amountUSD).toFixed(2)}</Text>
                            ) : null}
                          </View>
                        </Pressable>
                        <View style={{ flexDirection: "row", gap: Spacing.xs }}>
                          <TouchableOpacity
                            onPress={() => handleDeclineRequest(item)}
                            style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: Colors.borderLightStrong, justifyContent: "center", alignItems: "center" }}
                          >
                            <Feather name="x" size={16} color={Colors.danger} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handlePayRequest(item)}
                            style={{ width: 56, height: 36, borderRadius: 18, backgroundColor: Colors.textLightPrimary, justifyContent: "center", alignItems: "center" }}
                          >
                            <Text style={[Typography.labelSmall, { color: Colors.white, fontWeight: "700" }]}>Pay</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  }}
                />
              </View>
            </Animated.View>
          )}

          {/* Recent Activity */}
          <Animated.View entering={FadeInDown.duration(300).delay(500)} style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl }}>
            <View
              style={{
                backgroundColor: Colors.surfaceLight,
                borderRadius: 16,
                overflow: "hidden",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.03,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Spacing.lg, paddingBottom: Spacing.sm }}>
                <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary, fontWeight: "700" }]}>Recent Activity</Text>
                <Pressable onPress={() => router.push("/activity")} style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginRight: 2 }]}>See all</Text>
                  <Feather name="chevron-right" size={16} color={Colors.textLightSecondary} />
                </Pressable>
              </View>
              {activities.slice(0, 4).map((item, index) => (
                <Pressable
                  key={item.id}
                  onPress={() => handleTxPress(item)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: Spacing.md,
                    paddingHorizontal: Spacing.lg,
                    borderBottomWidth: index === Math.min(activities.length, 4) - 1 ? 0 : 1,
                    borderBottomColor: Colors.borderLight,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: item.type === "swap" ? Colors.white : Colors.baseLight,
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: Spacing.md,
                      borderWidth: item.type === "swap" ? 1 : 0,
                      borderColor: Colors.borderLight,
                    }}
                  >
                    <Feather name={item.icon as any} size={20} color={item.type === "swap" ? Colors.textLightPrimary : Colors.textLightPrimary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.bodyLarge, { color: Colors.textLightPrimary, fontWeight: "600", marginBottom: 2 }]}>{item.title}</Text>
                    <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>
                      {item.dateSection === "Today" || item.dateSection === "Yesterday" ? `${item.dateSection}, ` : ""}
                      {item.time}
                    </Text>
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
        enablePanDownToClose={true}
      >
        <BottomSheetView style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl }}>
          <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, marginBottom: Spacing.lg, marginTop: Spacing.sm }]}>Select Display Currency</Text>
          {CURRENCIES.map((c) => (
            <TouchableOpacity
              key={c.code}
              onPress={() => {
                setDisplayCurrencyCode(c.code);
                Haptics.selectionAsync();
                currencySheetRef.current?.dismiss();
              }}
              style={{ flexDirection: "row", alignItems: "center", paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, minHeight: 56 }}
              activeOpacity={0.7}
            >
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.baseLight, justifyContent: "center", alignItems: "center", marginRight: Spacing.md }}>
                <Text style={{ fontSize: 20 }}>{c.flag}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "600" }]}>{c.code}</Text>
                <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>{c.name}</Text>
              </View>
              {currency.code === c.code && <Feather name="check" size={24} color={Colors.teal} />}
            </TouchableOpacity>
          ))}
        </BottomSheetView>
      </BottomSheetModal>

      {/* Transaction Details Sheet */}
      <BottomSheetModal
        ref={detailSheetRef}
        enableDynamicSizing={true}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: Colors.white, borderRadius: 24 }}
        handleIndicatorStyle={{ backgroundColor: Colors.border, width: 40 }}
        enablePanDownToClose={true}
      >
        {selectedTx && (
          <BottomSheetView style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl }}>
            {/* Header */}
            <View style={{ alignItems: "center", marginTop: Spacing.sm, marginBottom: Spacing.lg }}>
              <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "700", fontSize: 20 }]}>
                Transaction Details
              </Text>
            </View>

            <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }} style={{ backgroundColor: Colors.white }}>
            {/* Main Receipt Info Card */}
            <View style={{ alignItems: "center", marginBottom: Spacing.xl }}>
              <View style={{
                width: 64, height: 64, borderRadius: 32,
                backgroundColor: selectedTx.isPositive ? "rgba(29, 185, 138, 0.1)" : Colors.baseLight,
                justifyContent: "center", alignItems: "center",
                marginBottom: Spacing.md
              }}>
                <Feather
                  name={selectedTx.icon}
                  size={28}
                  color={selectedTx.isPositive ? Colors.teal : Colors.textLightPrimary}
                />
              </View>
              
              <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "700", fontSize: 24, marginBottom: 2 }]}>
                {selectedTx.title}
              </Text>
              
              {/* Large display fiat amount (primary) */}
              <Text style={[Typography.displayLarge, { color: selectedTx.isPositive ? Colors.teal : Colors.textLightPrimary, fontWeight: "800", fontSize: 32, marginVertical: 6 }]}>
                {selectedTx.amountSecondary ? selectedTx.amountSecondary : selectedTx.amountPrimary}
              </Text>

              {/* Subtext blockchain stablecoin amount */}
              {selectedTx.amountSecondary && (
                <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginBottom: Spacing.md }]}>
                  {selectedTx.amountPrimary}
                </Text>
              )}

              {/* Success Badge */}
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(29, 185, 138, 0.1)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.teal, marginRight: 6 }} />
                <Text style={[Typography.labelSmall, { color: Colors.teal, fontWeight: "700", textTransform: "uppercase", fontSize: 11 }]}>
                  Successful
                </Text>
              </View>
            </View>

            {/* Transfer Details Panel */}
            <View style={{ backgroundColor: Colors.baseLight, borderRadius: 20, padding: Spacing.lg, marginBottom: Spacing.xl }}>
              <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.md }]}>
                Transfer Details
              </Text>

              {/* Transfer ID / Hash row */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md }}>
                <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>Transaction ID</Text>
                <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "600" }]}>
                  {selectedTx.hash ? `${selectedTx.hash.substring(0, 10)}...${selectedTx.hash.substring(selectedTx.hash.length - 10)}` : `#${selectedTx.id.substring(0, 8)}`}
                </Text>
              </View>

              {/* Transfer Date/Time row */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md }}>
                <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>Date & Time</Text>
                <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "600" }]}>
                  {selectedTx.dateSection} • {selectedTx.time}
                </Text>
              </View>

              {/* Transfer Fee row */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md }}>
                <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>Transfer Fee</Text>
                <Text style={[Typography.labelLarge, { color: Colors.teal, fontWeight: "700" }]}>Free</Text>
              </View>

              <View style={{ height: 1, backgroundColor: Colors.borderLightStrong, marginVertical: Spacing.xs, marginBottom: Spacing.md }} />

              {/* Note / Memo Row */}
              {selectedTx.memo ? (
                <View style={{ marginTop: Spacing.xs }}>
                  <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginBottom: 6 }]}>Notes</Text>
                  <View style={{ backgroundColor: Colors.white, borderRadius: 12, padding: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight }}>
                    <Text style={[Typography.bodyMedium, { color: Colors.textLightPrimary }]}>
                      {selectedTx.memo}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
            </ViewShot>

            {/* Action Buttons Row */}
            <View style={{ flexDirection: "row", gap: Spacing.md }}>
              <TouchableOpacity
                onPress={handleShareReceipt}
                style={{ flex: 1, height: 52, borderRadius: 26, borderWidth: 1, borderColor: Colors.borderLightStrong, justifyContent: "center", alignItems: "center", backgroundColor: Colors.white, flexDirection: "row" }}
              >
                <Feather name="share-2" size={16} color={Colors.textLightPrimary} style={{ marginRight: 8 }} />
                <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700" }]}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => detailSheetRef.current?.dismiss()}
                style={{ flex: 1, height: 52, borderRadius: 26, backgroundColor: "#111111", justifyContent: "center", alignItems: "center" }}
              >
                <Text style={[Typography.labelLarge, { color: Colors.white, fontWeight: "700" }]}>Done</Text>
              </TouchableOpacity>
            </View>
          </BottomSheetView>
        )}
      </BottomSheetModal>
      <InteractiveAnchorModal
        visible={isAnchorModalVisible}
        onClose={() => setIsAnchorModalVisible(false)}
        transactionType={anchorTxType}
        onSuccess={async () => {
          await Promise.all([refreshBalances(), fetchTransactions()]);
        }}
      />
      <PinVerifySheet ref={pinSheetRef} onSuccess={handleExecutePayment} />

      {/* Request Details Sheet */}
      <BottomSheetModal
        ref={requestDetailSheetRef}
        enableDynamicSizing={true}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: Colors.white, borderRadius: 24 }}
        handleIndicatorStyle={{ backgroundColor: Colors.border, width: 40 }}
        enablePanDownToClose={true}
      >
        {selectedRequest && (
          <BottomSheetView style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl }}>
            {/* Header */}
            <View style={{ alignItems: "center", marginTop: Spacing.sm, marginBottom: Spacing.lg }}>
              <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "700", fontSize: 20 }]}>
                Payment Request Details
              </Text>
            </View>

            {/* Main Info Card */}
            <View style={{ alignItems: "center", marginBottom: Spacing.xl }}>
              <View style={{
                width: 64, height: 64, borderRadius: 32,
                backgroundColor: "rgba(123, 97, 255, 0.1)",
                justifyContent: "center", alignItems: "center",
                marginBottom: Spacing.md
              }}>
                <Feather
                  name="download"
                  size={28}
                  color={Colors.primary}
                />
              </View>
              
              <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "700", fontSize: 24, marginBottom: 2 }]}>
                {selectedRequest.senderDisplayName}
              </Text>
              <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary, marginBottom: 6 }]}>
                @{selectedRequest.senderUsername}
              </Text>
              
              {/* Large display fiat amount */}
              <Text style={[Typography.displayLarge, { color: Colors.textLightPrimary, fontWeight: "800", fontSize: 32, marginVertical: 6 }]}>
                {selectedRequest.requestedCurrency && selectedRequest.requestedAmount
                  ? `${selectedRequest.requestedCurrency} ${selectedRequest.requestedAmount}`
                  : `${currency.symbol}${rates ? convertUSDTo(parseFloat(selectedRequest.amountUSD), currency.code as keyof ExchangeRates, rates) : selectedRequest.amountUSD}`}
              </Text>

              {currency.code !== "USD" && !selectedRequest.requestedCurrency && (
                <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginBottom: Spacing.md }]}>
                  = ${parseFloat(selectedRequest.amountUSD).toFixed(2)} USD
                </Text>
              )}
            </View>

            {/* Request info list */}
            <View style={{ backgroundColor: Colors.baseLight, borderRadius: 16, padding: Spacing.lg, marginBottom: Spacing.md }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md }}>
                <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>Status</Text>
                <View style={{ backgroundColor: "rgba(240, 165, 0, 0.1)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 }}>
                  <Text style={[Typography.labelSmall, { color: Colors.amber, fontWeight: "700" }]}>Pending</Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md }}>
                <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>Date</Text>
                <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700" }]}>
                  {selectedRequest.createdAt ? new Date(selectedRequest.createdAt.seconds * 1000).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : ""}
                </Text>
              </View>

              <View style={{ height: 1, backgroundColor: Colors.borderLightStrong, marginVertical: Spacing.xs, marginBottom: Spacing.md }} />

              {/* Message / Note Row */}
              <View style={{ marginTop: Spacing.xs }}>
                <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginBottom: 6 }]}>Note</Text>
                <View style={{ backgroundColor: Colors.white, borderRadius: 12, padding: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight }}>
                  <Text style={[Typography.bodyMedium, { color: Colors.textLightPrimary }]}>
                    {selectedRequest.message || "Requested money"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Detailed Split Items button link if present */}
            {selectedRequest.splitItems && selectedRequest.splitItems.length > 0 && (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  requestItemsSheetRef.current?.present();
                }}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: Colors.white,
                  borderRadius: 16,
                  padding: Spacing.md,
                  borderWidth: 1,
                  borderColor: Colors.borderLight,
                  marginBottom: Spacing.md
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{
                    width: 36, height: 36, borderRadius: 18,
                    backgroundColor: "rgba(123, 97, 255, 0.1)",
                    justifyContent: "center", alignItems: "center",
                    marginRight: Spacing.md
                  }}>
                    <Feather name="list" size={18} color={Colors.primary} />
                  </View>
                  <View>
                    <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700" }]}>
                      View Split Items
                    </Text>
                    <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary, fontSize: 11 }]}>
                      {selectedRequest.splitItems?.length} items assigned to you
                    </Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={20} color={Colors.textLightSecondary} />
              </Pressable>
            )}

            {/* Action Buttons Row */}
            <View style={{ flexDirection: "row", gap: Spacing.md }}>
              <TouchableOpacity
                onPress={() => {
                  requestDetailSheetRef.current?.dismiss();
                  handleDeclineRequest(selectedRequest);
                }}
                style={{ flex: 1, height: 52, borderRadius: 26, borderWidth: 1, borderColor: Colors.borderLightStrong, justifyContent: "center", alignItems: "center", backgroundColor: Colors.white, flexDirection: "row" }}
              >
                <Feather name="x" size={16} color={Colors.danger} style={{ marginRight: 8 }} />
                <Text style={[Typography.labelLarge, { color: Colors.danger, fontWeight: "700" }]}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  requestDetailSheetRef.current?.dismiss();
                  handlePayRequest(selectedRequest);
                }}
                style={{ flex: 1, height: 52, borderRadius: 26, backgroundColor: Colors.textLightPrimary, justifyContent: "center", alignItems: "center", flexDirection: "row" }}
              >
                <Feather name="check" size={16} color={Colors.white} style={{ marginRight: 8 }} />
                <Text style={[Typography.labelLarge, { color: Colors.white, fontWeight: "700" }]}>Pay Now</Text>
              </TouchableOpacity>
            </View>
          </BottomSheetView>
        )}
      </BottomSheetModal>

      {/* Split Items Details Sheet */}
      <BottomSheetModal
        ref={requestItemsSheetRef}
        snapPoints={["50%", "80%"]}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: Colors.white, borderRadius: 24 }}
        handleIndicatorStyle={{ backgroundColor: Colors.border, width: 40 }}
        enablePanDownToClose={true}
      >
        {selectedRequest && selectedRequest.splitItems && (
          <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl }}>
            {/* Header */}
            <View style={{ alignItems: "center", marginTop: Spacing.sm, marginBottom: Spacing.lg }}>
              <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "700", fontSize: 20 }]}>
                Split Items Breakdown
              </Text>
              <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary, marginTop: 4 }]}>
                Items assigned to you by @{selectedRequest.senderUsername}
              </Text>
            </View>

            {/* Items List */}
            <View style={{ backgroundColor: Colors.baseLight, borderRadius: 16, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, marginBottom: Spacing.md }}>
              {selectedRequest.splitItems?.map((item: any, idx: number) => (
                <View key={idx} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: Spacing.md, borderBottomWidth: idx === (selectedRequest.splitItems?.length || 0) - 1 ? 0 : 1, borderBottomColor: Colors.borderLight }}>
                  <Text style={[Typography.bodyMedium, { color: Colors.textLightPrimary, flex: 1, fontWeight: "500" }]}>
                    {item.qty}x {item.name}
                  </Text>
                  <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "600" }]}>
                    {selectedRequest.requestedCurrency || "USD"} {(item.price * item.qty).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Summary Panel */}
            <View style={{ backgroundColor: Colors.white, borderRadius: 16, padding: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight }}>
              {selectedRequest.subtotalAmount && (
                <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
                  <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>Subtotal</Text>
                  <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "600" }]}>
                    {selectedRequest.requestedCurrency || "USD"} {selectedRequest.subtotalAmount}
                  </Text>
                </View>
              )}

              {/* Proportional Fees/Tax */}
              {(parseFloat(selectedRequest.taxAmount || "0") > 0 ||
                parseFloat(selectedRequest.serviceAmount || "0") > 0 ||
                parseFloat(selectedRequest.tipsAmount || "0") > 0 ||
                parseFloat(selectedRequest.discountAmount || "0") > 0) && (
                <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
                  <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>Proportional Fees & Taxes</Text>
                  <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "600" }]}>
                    {selectedRequest.requestedCurrency || "USD"} {(
                      parseFloat(selectedRequest.taxAmount || "0") +
                      parseFloat(selectedRequest.serviceAmount || "0") +
                      parseFloat(selectedRequest.tipsAmount || "0") -
                      parseFloat(selectedRequest.discountAmount || "0")
                    ).toFixed(2)}
                  </Text>
                </View>
              )}

              <View style={{ height: 1, backgroundColor: Colors.borderLight, marginVertical: Spacing.sm }} />

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700" }]}>Total Due</Text>
                <Text style={[Typography.headingMedium, { color: Colors.teal, fontWeight: "800", fontSize: 20 }]}>
                  {selectedRequest.requestedCurrency || "USD"} {selectedRequest.requestedAmount}
                </Text>
              </View>
            </View>

            {/* Close button */}
            <TouchableOpacity
              onPress={() => {
                requestItemsSheetRef.current?.dismiss();
                requestDetailSheetRef.current?.present();
              }}
              style={{ backgroundColor: Colors.textLightPrimary, borderRadius: 24, paddingVertical: 14, alignItems: "center", marginTop: Spacing.xl }}
            >
              <Text style={[Typography.labelLarge, { color: Colors.white, fontWeight: "700" }]}>Go Back</Text>
            </TouchableOpacity>
          </BottomSheetScrollView>
        )}
      </BottomSheetModal>
    </View>
  );
}
