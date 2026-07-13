import { View, Text, TextInput, KeyboardAvoidingView, Platform, Keyboard, TouchableOpacity, ScrollView, Dimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState, useRef, useCallback, useEffect } from "react";
import * as Haptics from "expo-haptics";
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import { ActivityIndicator, Alert } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Colors } from "../src/constants/colors";
import { Typography } from "../src/constants/typography";
import { Spacing } from "../src/constants/spacing";
import { CURRENCIES, Currency } from "../src/constants/currencies";
import { useStellar } from "../src/hooks/useStellar";
import { useAuthStore } from "../src/store/authStore";
import { fetchExchangeRates, convertUSDTo, formatRateDisplay, ExchangeRates } from "../src/services/exchangeRates";
import { saveTransaction } from "../src/services/firebase/transactions";
import { createNotification } from "../src/services/firebase/notifications";
import { getUserByUsername } from "../src/services/firebase/firestore";
import { updatePaymentRequest } from "../src/services/firebase/requests";
import { PinVerifySheet, PinVerifySheetRef } from "../src/components/PinVerifySheet";

const { height } = Dimensions.get("window");

export default function SendScreen() {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { profile } = useAuthStore();

  const [amount, setAmount] = useState((params.amount as string) || "");
  const [message, setMessage] = useState("");
  const [receiveCurrency, setReceiveCurrency] = useState<Currency>(params.currencyCode ? CURRENCIES.find((c) => c.code === params.currencyCode) || CURRENCIES[0] : CURRENCIES[0]);
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [ratesLoading, setRatesLoading] = useState(true);

  const { send, isProcessing } = useStellar();

  const amountInputRef = useRef<TextInput>(null);
  const currencySheetRef = useRef<BottomSheetModal>(null);
  const pinSheetRef = useRef<PinVerifySheetRef>(null);

  // Fetch exchange rates on mount
  useEffect(() => {
    const loadRates = async () => {
      try {
        const fetchedRates = await fetchExchangeRates();
        setRates(fetchedRates);
      } catch (err) {
        console.warn("Failed to load rates:", err);
      } finally {
        setRatesLoading(false);
      }
    };
    loadRates();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!params.amount) {
        amountInputRef.current?.focus();
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [params.amount]);

  const handleAmountChange = (text: string) => {
    let cleaned = text.replace(/,/g, ".").replace(/[^0-9.]/g, ""); // treat "," (locale decimal key) as "."
    if (cleaned.split(".").length > 2) return; // reject a second decimal point
    cleaned = cleaned.replace(/^0+(?=\d)/, ""); // drop leading zeros ("05" → "5", keep "0.5")
    setAmount(cleaned);
  };

  /** Computed converted amount for display */
  const convertedAmount = (() => {
    if (!amount || !rates || parseFloat(amount) <= 0) return "0.00";
    const usdVal = parseFloat(amount);
    return convertUSDTo(usdVal, receiveCurrency.code as keyof ExchangeRates, rates);
  })();

  /** Rate display text */
  const rateText = rates ? formatRateDisplay(receiveCurrency.code as keyof ExchangeRates, rates) : "";

  const executeSend = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (!params.publicKey) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Recipient has not set up a wallet yet.");
      return;
    }

    try {
      // Always send USD amount on-chain
      const usdAmount = parseFloat(amount).toFixed(7);

      const txHash = await send(params.publicKey as string, usdAmount, "USDC", message, ((params.uid || params.id) as string) || undefined);

      // Save transaction record to Firestore
      try {
        const targetUid = (params.uid || params.id) as string;
        const recipientUsername = (params.handle as string)?.replace("@", "") || "";
        const receiverProfile = targetUid
          ? null // We already have the info from params
          : await getUserByUsername(recipientUsername);

        const receiverUid = targetUid || receiverProfile?.uid || "";
        const receiverUsername = recipientUsername || receiverProfile?.username || "";

        await saveTransaction({
          hash: txHash,
          senderUid: profile?.uid || "",
          senderUsername: profile?.username || "",
          senderDisplayName: profile?.displayName || "",
          receiverUid,
          receiverUsername,
          receiverDisplayName: (params.name as string) || "",
          amountUSD: usdAmount,
          displayCurrency: receiveCurrency.code,
          displayAmount: convertedAmount,
          memo: message,
          status: "completed",
        });

        // If this payment was initiated from a request, update the request status
        if (params.requestId) {
          await updatePaymentRequest(params.requestId as string, {
            status: "paid",
            txHash,
          });

          // Notify requester
          await createNotification({
            uid: receiverUid,
            title: "Request Paid",
            message: `${profile?.displayName || profile?.username} paid your request of $${parseFloat(usdAmount).toFixed(2)} USD`,
            type: "request_paid",
            referenceId: params.requestId as string,
          });
        } else {
          // Standard peer transfer - create standard payment notification for recipient
          await createNotification({
            uid: receiverUid,
            title: "Payment Received",
            message: `${profile?.displayName || profile?.username} sent you $${parseFloat(usdAmount).toFixed(2)} USD`,
            type: "payment_received",
            referenceId: txHash,
          });
        }
      } catch (firestoreErr) {
        // Don't block the success flow if Firestore write fails
        console.warn("Firestore write failed (non-blocking):", firestoreErr);
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({
        pathname: "/transfer-success",
        params: {
          amount: usdAmount,
          currency: "USD",
          displayCurrency: receiveCurrency.code,
          displayAmount: convertedAmount,
          name: params.name,
          hash: txHash,
        },
      });
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Transfer Failed", err.message || "Something went wrong.");
    }
  };

  const handleSend = () => {
    if (!amount || parseFloat(amount) <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    // Dismiss keyboard and remove focus from text inputs
    Keyboard.dismiss();
    amountInputRef.current?.blur();

    // Open PIN sheet before executing
    pinSheetRef.current?.present();
  };

  const renderBackdrop = useCallback((props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />, []);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.baseLight }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: Spacing.lg,
              height: 56,
            }}
          >
            <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, justifyContent: "center", alignItems: "flex-start" }}>
              <Feather name="chevron-left" size={28} color={Colors.textLightPrimary} />
            </TouchableOpacity>
            <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "700", fontSize: 18 }]}>Send Money</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 100 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Recipient Section */}
            <View style={{ marginTop: Spacing.lg, marginBottom: Spacing.xl }}>
              <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginBottom: Spacing.md }]}>To</Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: (params.color as string) || Colors.baseLight,
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: Spacing.md,
                  }}
                >
                  <Text style={[Typography.headingLarge, { color: Colors.white }]}>{params.avatar || "U"}</Text>
                </View>
                <View>
                  <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>{params.name || "Unknown User"}</Text>
                  <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>{params.handle || "@user"}</Text>
                </View>
              </View>
            </View>

            {/* Requester Notes (read-only) */}
            {params.memo ? (
              <View
                style={{
                  backgroundColor: "rgba(123, 97, 255, 0.06)",
                  borderRadius: 16,
                  padding: Spacing.lg,
                  marginBottom: Spacing.lg,
                  borderWidth: 1,
                  borderColor: "rgba(123, 97, 255, 0.15)",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.sm }}>
                  <Feather name="message-circle" size={16} color={Colors.primary} style={{ marginRight: Spacing.sm }} />
                  <Text style={[Typography.labelLarge, { color: Colors.primary, fontWeight: "700" }]}>Notes from Requester</Text>
                </View>
                <Text style={[Typography.bodyMedium, { color: Colors.textLightPrimary }]}>{params.memo}</Text>
              </View>
            ) : null}

            {/* Main Form Card */}
            <View
              style={{
                backgroundColor: Colors.white,
                borderRadius: 24,
                padding: Spacing.xl,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 12,
                elevation: 3,
              }}
            >
              {/* You Send (USD only) */}
              <Text style={[Typography.labelLarge, { color: Colors.textLightSecondary, fontWeight: "500", marginBottom: Spacing.xs }]}>You send</Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: Spacing.lg,
                }}
              >
                <TextInput
                  ref={amountInputRef}
                  value={amount}
                  onChangeText={handleAmountChange}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={Colors.textLightSecondary}
                  style={[Typography.displayLarge, { fontSize: 40, lineHeight: 52, color: Colors.textLightPrimary, flex: 1, minWidth: 0, height: 64, paddingVertical: 0 }]}
                  selectionColor={Colors.teal}
                />
                {/* USD is fixed — no selector */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: Colors.baseLight,
                    paddingHorizontal: Spacing.md,
                    paddingVertical: Spacing.sm,
                    borderRadius: 99,
                    marginLeft: Spacing.sm,
                  }}
                >
                  <Text style={{ fontSize: 16, marginRight: Spacing.xs }}>🇺🇸</Text>
                  <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "600" }]}>USD</Text>
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: Colors.borderLight, marginBottom: Spacing.lg }} />

              {/* They Receive (selectable currency) */}
              <Text style={[Typography.labelLarge, { color: Colors.textLightSecondary, fontWeight: "500", marginBottom: Spacing.xs }]}>They will receive</Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: Spacing.xs,
                }}
              >
                <Text style={[Typography.displayLarge, { fontSize: 32, lineHeight: 42, color: Colors.textLightPrimary, flex: 1 }]}>
                  {receiveCurrency.code === "USD" ? (amount ? parseFloat(amount).toFixed(2) : "0.00") : convertedAmount}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    Keyboard.dismiss();
                    currencySheetRef.current?.present();
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: Colors.baseLight,
                    paddingHorizontal: Spacing.md,
                    paddingVertical: Spacing.sm,
                    borderRadius: 99,
                    marginLeft: Spacing.sm,
                    minHeight: 44,
                  }}
                >
                  <Text style={{ fontSize: 16, marginRight: Spacing.xs }}>{receiveCurrency.flag}</Text>
                  <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "600", marginRight: Spacing.xs }]}>{receiveCurrency.code}</Text>
                  <Feather name="chevron-down" size={16} color={Colors.textLightPrimary} />
                </TouchableOpacity>
              </View>

              {/* Exchange Rate Info */}
              {receiveCurrency.code !== "USD" && rateText ? (
                <Animated.View entering={FadeIn.duration(300)} style={{ marginBottom: Spacing.lg }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: Colors.baseLight,
                      padding: Spacing.md,
                      borderRadius: 12,
                      marginTop: Spacing.sm,
                    }}
                  >
                    <Feather name="trending-up" size={16} color={Colors.teal} style={{ marginRight: Spacing.sm }} />
                    <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary, flex: 1 }]}>{rateText}</Text>
                    {ratesLoading && <ActivityIndicator size="small" color={Colors.textLightSecondary} />}
                  </View>
                </Animated.View>
              ) : (
                <View style={{ marginBottom: Spacing.lg }} />
              )}

              <View style={{ height: 1, backgroundColor: Colors.borderLight, marginBottom: Spacing.lg }} />

              {/* Message */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.sm }}>
                <Text style={[Typography.labelLarge, { color: Colors.textLightSecondary, fontWeight: "500" }]}>Message (optional)</Text>
                <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>{message.length}/120</Text>
              </View>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Dinner last night 🍽️"
                placeholderTextColor={Colors.textLightSecondary}
                maxLength={120}
                style={{ color: Colors.textLightPrimary, fontWeight: "500" }}
                selectionColor={Colors.teal}
              />
            </View>
          </ScrollView>

          {/* Bottom Action Bar */}
          <View
            style={{
              paddingHorizontal: Spacing.lg,
              paddingBottom: Math.max(insets.bottom, Spacing.lg),
              paddingTop: Spacing.md,
              backgroundColor: Colors.baseLight,
            }}
          >
            <TouchableOpacity
              onPress={handleSend}
              style={{
                backgroundColor: Colors.textLightPrimary,
                borderRadius: 24,
                paddingVertical: 18,
                alignItems: "center",
                opacity: (amount && parseFloat(amount) > 0) || isProcessing ? 1 : 0.5,
              }}
              disabled={!amount || parseFloat(amount) <= 0 || isProcessing}
            >
              {isProcessing ? <ActivityIndicator color={Colors.white} /> : <Text style={[Typography.labelLarge, { color: Colors.white, fontWeight: "700", fontSize: 16 }]}>Send</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Currency Bottom Sheet */}
      <BottomSheetModal
        ref={currencySheetRef}
        enableDynamicSizing={true}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: Colors.white, borderRadius: 24 }}
        handleIndicatorStyle={{ backgroundColor: Colors.border, width: 40 }}
      >
        <BottomSheetView style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl }}>
          <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, marginBottom: Spacing.lg, marginTop: Spacing.sm }]}>Recipient Currency</Text>
          <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary, marginBottom: Spacing.lg, marginTop: -Spacing.sm }]}>Select how the recipient sees the amount</Text>
          {CURRENCIES.map((c) => (
            <TouchableOpacity
              key={c.code}
              onPress={() => {
                setReceiveCurrency(c);
                Haptics.selectionAsync();
                currencySheetRef.current?.dismiss();
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: Spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: Colors.borderLight,
                minHeight: 56,
              }}
              activeOpacity={0.7}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: Colors.baseLight,
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: Spacing.md,
                }}
              >
                <Text style={{ fontSize: 20 }}>{c.flag}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "600" }]}>{c.code}</Text>
                <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>{c.name}</Text>
              </View>
              {rates && c.code !== "USD" && (
                <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary, marginRight: Spacing.sm }]}>
                  {new Intl.NumberFormat("en-US", {
                    minimumFractionDigits: (rates[c.code as keyof ExchangeRates] || 0) < 10 ? 4 : 0,
                    maximumFractionDigits: (rates[c.code as keyof ExchangeRates] || 0) < 10 ? 4 : 0,
                  }).format(rates[c.code as keyof ExchangeRates] || 0)}
                </Text>
              )}
              {receiveCurrency.code === c.code && <Feather name="check" size={24} color={Colors.teal} />}
            </TouchableOpacity>
          ))}
        </BottomSheetView>
      </BottomSheetModal>

      {/* PIN Verification Sheet */}
      <PinVerifySheet ref={pinSheetRef} onSuccess={executeSend} />
    </View>
  );
}
