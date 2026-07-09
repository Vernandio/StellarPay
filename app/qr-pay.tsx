import { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, KeyboardAvoidingView, Platform, Keyboard, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Colors } from "../src/constants/colors";
import { Typography } from "../src/constants/typography";
import { Spacing } from "../src/constants/spacing";
import { parseEMVCoQR, EMVCoQRData } from "../src/utils/emvco";
import { useWallet } from "../src/hooks/useWallet";
import { useAuthStore } from "../src/store/authStore";
import { fetchExchangeRates, ExchangeRates, convertToUSD } from "../src/services/exchangeRates";
import { PinVerifySheet, PinVerifySheetRef } from "../src/components/PinVerifySheet";
import { useStellar } from "../src/hooks/useStellar";
import { saveTransaction } from "../src/services/firebase/transactions";
import { createNotification } from "../src/services/firebase/notifications";
import { USDC_ASSET } from "../src/constants/stellar";

export default function QRPayScreen() {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { publicKey, usdcBalance, refreshBalances } = useWallet();
  const { profile, user } = useAuthStore();
  const { send, isProcessing } = useStellar();

  const [qrData, setQrData] = useState<EMVCoQRData | null>(null);
  const [localAmount, setLocalAmount] = useState("");
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [ratesLoading, setRatesLoading] = useState(true);

  const amountInputRef = useRef<TextInput>(null);
  const pinSheetRef = useRef<PinVerifySheetRef>(null);

  // Parse EMVCo QR code and load exchange rates
  useEffect(() => {
    if (params.qrPayload) {
      const parsed = parseEMVCoQR(params.qrPayload as string);
      if (parsed) {
        setQrData(parsed);
        if (parsed.amount) {
          setLocalAmount(parsed.amount);
        }
      } else {
        Alert.alert("Invalid QR", "Failed to parse QR code format.", [
          { text: "Go Back", onPress: () => router.back() }
        ]);
      }
    }

    const loadRates = async () => {
      try {
        const fetched = await fetchExchangeRates();
        setRates(fetched);
      } catch (err) {
        console.warn("Failed to load exchange rates:", err);
      } finally {
        setRatesLoading(false);
      }
    };

    loadRates();
  }, [params.qrPayload]);

  // Focus amount input if static QR (no pre-filled amount)
  useEffect(() => {
    if (qrData && !qrData.amount) {
      const timer = setTimeout(() => {
        amountInputRef.current?.focus();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [qrData]);

  const handleAmountChange = (text: string) => {
    const cleaned = text.replace(/,/g, ".").replace(/[^0-9.]/g, ""); // "," locale decimal key → "."
    if (cleaned.split(".").length > 2) return;
    setLocalAmount(cleaned);
  };

  /** Calculate required USD stablecoin amount from local amount */
  const usdAmount = (() => {
    if (!localAmount || !rates || !qrData) return "0.00";
    const amt = parseFloat(localAmount);
    if (isNaN(amt) || amt <= 0) return "0.00";
    return convertToUSD(amt, qrData.currencyCode as keyof ExchangeRates, rates);
  })();

  const handlePay = () => {
    const numericAmt = parseFloat(localAmount);
    if (isNaN(numericAmt) || numericAmt <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Invalid Amount", "Please enter a valid amount.");
      return;
    }

    const numericUsd = parseFloat(usdAmount);
    if (numericUsd > parseFloat(usdcBalance)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Insufficient Balance", "Your balance is not enough to cover this payment.");
      return;
    }

    // Dismiss keyboard before showing PIN verify sheet
    Keyboard.dismiss();
    amountInputRef.current?.blur();
    pinSheetRef.current?.present();
  };

  const executePayment = async () => {
    if (!qrData || !user || !publicKey) return;

    try {
      // Simulate sending payment to the merchant settlement pool address
      // For the hackathon sandbox, we use a predefined mock merchant account address
      // Send payment to the token issuer address (acts as developer testnet wallet / token burn) to actually decrease the user's balance
      const txHash = await send(
        USDC_ASSET.issuer,
        parseFloat(usdAmount).toFixed(7),
        "USDC",
        `QR Pay: ${qrData.merchantName}`
      );

      // Save transaction to Firestore
      try {
        await saveTransaction({
          hash: txHash,
          senderUid: user.uid,
          senderUsername: profile?.username || "",
          senderDisplayName: profile?.displayName || "",
          receiverUid: "merchant_" + qrData.acquirerName.toLowerCase(),
          receiverUsername: qrData.merchantName.toLowerCase().replace(/\s+/g, ""),
          receiverDisplayName: qrData.merchantName,
          amountUSD: parseFloat(usdAmount).toFixed(7),
          displayCurrency: qrData.currencyCode,
          displayAmount: localAmount,
          memo: `Merchant QR payment to ${qrData.merchantName}`,
          status: "completed",
        });

        // Trigger local notification
        await createNotification({
          uid: user.uid,
          title: "QR Payment Successful",
          message: `Paid ${qrData.currencyCode} ${new Intl.NumberFormat("en-US").format(parseFloat(localAmount))} ($${parseFloat(usdAmount).toFixed(2)} USD) to ${qrData.merchantName}`,
          type: "payment_sent",
          referenceId: txHash,
        });
      } catch (firestoreErr) {
        console.warn("Firestore logging failed (non-blocking):", firestoreErr);
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      router.replace({
        pathname: "/transfer-success",
        params: {
          amount: new Intl.NumberFormat("en-US").format(parseFloat(localAmount)),
          currency: qrData.currencyCode,
          name: qrData.merchantName,
          hash: txHash,
        },
      });
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Payment Failed", err.message || "Something went wrong.");
    }
  };

  if (!qrData) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.baseLight, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={Colors.textLightPrimary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.baseLight }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.lg, height: 56 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, justifyContent: "center", alignItems: "flex-start" }}>
              <Feather name="chevron-left" size={28} color={Colors.textLightPrimary} />
            </TouchableOpacity>
            <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "700", fontSize: 18 }]}>QR Payment</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 100 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            
            {/* Merchant Card */}
            <View style={{ backgroundColor: Colors.white, borderRadius: 24, padding: Spacing.xl, alignItems: "center", marginTop: Spacing.md, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 3 }}>
              
              <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: Spacing.xs }]}>
                Pembayaran QR Ke
              </Text>
              
              <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "700", fontSize: 24, textAlign: "center" }]}>
                {qrData.merchantName}
              </Text>
              
              <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginTop: Spacing.xs, textAlign: "center" }]}>
                {qrData.merchantCity} {qrData.postalCode ? `, ${qrData.postalCode}` : ""}, {qrData.countryCode}
              </Text>

              <View style={{ width: "100%", height: 1, backgroundColor: Colors.borderLight, marginVertical: Spacing.lg }} />

              {/* Merchant Account Details */}
              <View style={{ width: "100%", gap: Spacing.md }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>Merchant PAN</Text>
                  <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "600" }]}>
                    {qrData.merchantPan}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>Pengakuisisi</Text>
                  <Text style={[Typography.labelLarge, { color: Colors.primary, fontWeight: "700" }]}>
                    {qrData.acquirerName}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>No. Transaksi</Text>
                  <Text style={[Typography.bodyMedium, { color: Colors.textLightPrimary, fontWeight: "500" }]}>
                    {qrData.transactionId}
                  </Text>
                </View>
              </View>

              <View style={{ width: "100%", height: 1, backgroundColor: Colors.borderLight, marginVertical: Spacing.lg }} />

              {/* Input Amount Section */}
              <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: Spacing.sm }]}>
                Input Nominal ({qrData.currencyCode})
              </Text>

              {qrData.amount ? (
                // Dynamic QR: Amount is read-only
                <Text style={[Typography.displayLarge, { fontSize: 36, color: Colors.textLightPrimary, fontWeight: "700" }]}>
                  {qrData.currencyCode} {new Intl.NumberFormat("en-US").format(parseFloat(qrData.amount))}
                </Text>
              ) : (
                // Static QR: User inputs the amount
                <View style={{ flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: Colors.borderLightStrong, width: "100%", paddingVertical: Spacing.sm }}>
                  <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, marginRight: Spacing.sm }]}>
                    {qrData.currencyCode}
                  </Text>
                  <TextInput
                    ref={amountInputRef}
                    value={localAmount}
                    onChangeText={handleAmountChange}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={Colors.textLightSecondary}
                    style={[Typography.displayLarge, { fontSize: 36, color: Colors.textLightPrimary, flex: 1, padding: 0 }]}
                    selectionColor={Colors.teal}
                  />
                </View>
              )}

            </View>

            {/* Funding Source Card */}
            <View style={{ backgroundColor: Colors.white, borderRadius: 16, padding: Spacing.lg, marginTop: Spacing.lg, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}>
              <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: Spacing.sm }]}>
                Pilih Sumber Dana
              </Text>
              
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View>
                  <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700" }]}>
                    Dari Rekening:
                  </Text>
                  <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginTop: 2 }]}>
                    US Dollar Balance
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700" }]}>
                    ${parseFloat(usdcBalance).toFixed(2)} USD
                  </Text>
                  {localAmount && parseFloat(localAmount) > 0 && rates ? (
                    <Text style={[Typography.bodySmall, { color: Colors.teal, fontWeight: "600", marginTop: 2 }]}>
                      ≈ ${parseFloat(usdAmount).toFixed(2)} USD
                    </Text>
                  ) : null}
                </View>
              </View>

              {/* Conversion Rate Helper */}
              {rates && qrData.currencyCode !== "USD" && (
                <View style={{ backgroundColor: Colors.baseLight, borderRadius: 8, padding: Spacing.sm, marginTop: Spacing.md, flexDirection: "row", alignItems: "center" }}>
                  <Feather name="info" size={14} color={Colors.textLightSecondary} style={{ marginRight: Spacing.xs }} />
                  <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary, fontSize: 11 }]}>
                    Exchange Rate: 1 USD ≈ {new Intl.NumberFormat("en-US").format(rates[qrData.currencyCode as keyof ExchangeRates])} {qrData.currencyCode}
                  </Text>
                </View>
              )}
            </View>

          </ScrollView>

          {/* Action Bar */}
          <View style={{ flexDirection: "row", gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingBottom: Math.max(insets.bottom, Spacing.lg), paddingTop: Spacing.md, backgroundColor: Colors.baseLight }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                flex: 1,
                backgroundColor: Colors.white,
                borderWidth: 1,
                borderColor: Colors.borderLightStrong,
                borderRadius: 24,
                paddingVertical: 16,
                alignItems: "center",
                minHeight: 50,
                justifyContent: "center",
              }}
            >
              <Text style={[Typography.labelLarge, { color: Colors.textLightSecondary, fontWeight: "700" }]}>CANCEL</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePay}
              disabled={isProcessing || !localAmount || parseFloat(localAmount) <= 0}
              style={{
                flex: 1,
                backgroundColor: Colors.textLightPrimary,
                borderRadius: 24,
                paddingVertical: 16,
                alignItems: "center",
                opacity: !localAmount || parseFloat(localAmount) <= 0 || isProcessing ? 0.5 : 1,
                minHeight: 50,
                justifyContent: "center",
              }}
            >
              {isProcessing ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={[Typography.labelLarge, { color: Colors.white, fontWeight: "700" }]}>OK</Text>
              )}
            </TouchableOpacity>
          </View>

        </KeyboardAvoidingView>
      </SafeAreaView>

      <PinVerifySheet ref={pinSheetRef} onSuccess={executePayment} />
    </View>
  );
}
