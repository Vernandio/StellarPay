import React, { useState, useRef, useCallback, useEffect } from "react";
import { View, Text, ScrollView, Pressable, TextInput, TouchableOpacity, Keyboard, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { Colors } from "../../src/constants/colors";
import { Typography } from "../../src/constants/typography";
import { Spacing } from "../../src/constants/spacing";
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useAuthStore } from "../../src/store/authStore";
import { CURRENCIES, Currency } from "../../src/constants/currencies";
import QRCode from "react-native-qrcode-svg";
import { fetchExchangeRates, ExchangeRates } from "../../src/services/exchangeRates";
import { createPaymentRequest } from "../../src/services/firebase/requests";
import { useWallet } from "../../src/hooks/useWallet";
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import ViewShot from 'react-native-view-shot';

export default function PayScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<"Pay" | "Request" | "Split">((params.tab as "Pay" | "Request" | "Split") || "Pay");
  const { profile } = useAuthStore();
  const requestQRSheetRef = useRef<BottomSheetModal>(null);
  const qrRef = useRef<any>(null);
  const qrViewShotRef = useRef<any>(null);
  const currencySheetRef = useRef<BottomSheetModal>(null);
  const { usdcBalance } = useWallet();

  const [requestAmount, setRequestAmount] = useState("");
  const [requestNotes, setRequestNotes] = useState("");
  const [requestId, setRequestId] = useState("");
  const [qrGenerated, setQrGenerated] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [requestCurrency, setRequestCurrency] = useState<Currency>(CURRENCIES[0]);
  const [rates, setRates] = useState<ExchangeRates | null>(null);

  useEffect(() => {
    fetchExchangeRates().then(setRates).catch(console.warn);
  }, []);

  const handleShowRequestQR = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRequestAmount("");
    setRequestNotes("");
    setRequestId("");
    setQrGenerated(false);
    setRequestCurrency(CURRENCIES[0]);
    requestQRSheetRef.current?.present();
  };

  const handleGenerateRequestQR = async () => {
    if (!requestAmount || parseFloat(requestAmount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount.");
      return;
    }

    setQrLoading(true);
    try {
      const localRates = rates || { USD: 1, IDR: 16350, PHP: 56.2, VND: 25450, SGD: 1.34, MYR: 4.72 };
      const rateToUse = localRates[requestCurrency.code as keyof ExchangeRates] || 1;
      const usdAmountVal = (parseFloat(requestAmount) / rateToUse).toFixed(2);

      // Create payment request
      const reqId = await createPaymentRequest({
        senderUid: profile?.uid || "",
        senderUsername: profile?.username || "",
        senderDisplayName: profile?.displayName || profile?.username || "",
        receiverUid: "",
        receiverUsername: "",
        amountUSD: usdAmountVal,
        requestedCurrency: requestCurrency.code,
        requestedAmount: requestAmount,
        message: requestNotes || "",
      });

      setRequestId(reqId);
      setQrGenerated(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      console.error("QR Generate Err:", err);
      Alert.alert("Error", "Failed to generate request QR code.");
    } finally {
      setQrLoading(false);
    }
  };

  const getQRImageUri = async (): Promise<string | null> => {
    if (!qrViewShotRef.current) return null;
    try {
      const uri = await qrViewShotRef.current.capture();
      return uri;
    } catch (err) {
      console.warn("Capture QR failed:", err);
      return null;
    }
  };

  const handleShareQR = async () => {
    const uri = await getQRImageUri();
    if (!uri) return;
    try {
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share Request QR' });
    } catch (err) {
      console.warn('Share QR failed:', err);
    }
  };

  const handleSaveQR = async () => {
    const uri = await getQRImageUri();
    if (!uri) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow photo library access to save QR codes.');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved!', 'QR code saved to your photo library.');
    } catch (err) {
      console.warn('Save QR failed:', err);
    }
  };

  const renderBackdrop = useCallback((props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />, []);

  const qrValue = `stellarpay:request?id=${requestId}`;

  React.useEffect(() => {
    if (params.tab) {
      setActiveTab(params.tab as "Pay" | "Request" | "Split");
    }
  }, [params.tab]);

  const handleTabPress = (tab: "Pay" | "Request" | "Split") => {
    Haptics.selectionAsync();
    setActiveTab(tab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "Pay":
        return (
          <Animated.View entering={FadeInDown.duration(300)}>
            {/* PAY TO */}
            <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.md }]}>Pay To</Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: Spacing.lg }}>
              {[
                { icon: "user", title: "Friends", sub: "By username", route: "/pay-friends" },
                { icon: "wifi", title: "Tap to Pay", sub: "Near field", route: "/pay-tap" },
              ].map((item, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => {
                    Haptics.selectionAsync();
                    router.push(item.route as any);
                  }}
                  style={{
                    width: "48%",
                    backgroundColor: Colors.white,
                    borderRadius: 16,
                    paddingHorizontal: Spacing.sm,
                    paddingVertical: Spacing.lg,
                    alignItems: "center",
                    marginBottom: Spacing.md,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.03,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.baseLight, justifyContent: "center", alignItems: "center", marginBottom: Spacing.sm }}>
                    <Feather name={item.icon as any} size={24} color={Colors.textLightPrimary} />
                  </View>
                  <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2, textAlign: "center" }]}>{item.title}</Text>
                  <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary, fontSize: 11, textAlign: "center" }]}>{item.sub}</Text>
                </Pressable>
              ))}
            </View>

            {/* YOU WILL PAY WITH */}
            <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.md }]}>You will pay with</Text>

            <Pressable
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: Colors.white,
                borderRadius: 16,
                padding: Spacing.lg,
                marginBottom: Spacing.xl,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.03,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.textLightPrimary, justifyContent: "center", alignItems: "center", marginRight: Spacing.md }}>
                <Text style={{ color: Colors.white, fontWeight: "bold", fontSize: 18 }}>$</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>US Dollar</Text>
                <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>Cash balance</Text>
              </View>
              <View style={{ alignItems: "flex-end", marginRight: Spacing.sm }}>
                <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>
                  {parseFloat(usdcBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
                <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>
                  ≈ ${parseFloat(usdcBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={Colors.textLightSecondary} />
            </Pressable>

            {/* QUICK ACTIONS */}
            <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.md }]}>Quick Actions</Text>

            <View
              style={{
                backgroundColor: Colors.white,
                borderRadius: 16,
                paddingHorizontal: Spacing.lg,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.03,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              {[
                { icon: "maximize", title: "Scan QR", sub: "Pay a merchant", route: "/qr" },
                { icon: "grid", title: "Show my QR", sub: "Let others scan to pay", route: "/qr" },
              ].map((item, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => {
                    if (item.route) router.push(item.route as any);
                  }}
                  style={{ flexDirection: "row", alignItems: "center", paddingVertical: Spacing.lg, borderBottomWidth: idx === 1 ? 0 : 1, borderBottomColor: Colors.borderLight }}
                >
                  <Feather name={item.icon as any} size={24} color={Colors.textLightPrimary} style={{ marginRight: Spacing.md }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>{item.title}</Text>
                    <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>{item.sub}</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={Colors.textLightSecondary} />
                </Pressable>
              ))}
            </View>
          </Animated.View>
        );

      case "Request":
        return (
          <Animated.View entering={FadeInDown.duration(300)}>
            <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.md }]}>Request From</Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: Spacing.lg }}>
              {[
                { icon: "user", title: "Friends", sub: "Search username", route: "/request-friends" },
              ].map((item, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => {
                    Haptics.selectionAsync();
                    router.push(item.route as any);
                  }}
                  style={{
                    width: "100%",
                    backgroundColor: Colors.white,
                    borderRadius: 16,
                    padding: Spacing.lg,
                    alignItems: "center",
                    marginBottom: Spacing.md,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.03,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.baseLight, justifyContent: "center", alignItems: "center", marginBottom: Spacing.sm }}>
                    <Feather name={item.icon as any} size={24} color={Colors.textLightPrimary} />
                  </View>
                  <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>{item.title}</Text>
                  <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary, fontSize: 11 }]}>{item.sub}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.md }]}>My Payment QR</Text>
            <Pressable
              onPress={handleShowRequestQR}
              style={{
                backgroundColor: Colors.white,
                borderRadius: 16,
                padding: Spacing.xl,
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.03,
                shadowRadius: 8,
                elevation: 2,
                marginBottom: Spacing.xl,
              }}
            >
              <View
                style={{
                  width: 160,
                  height: 160,
                  backgroundColor: Colors.white,
                  borderWidth: 2,
                  borderColor: Colors.borderLight,
                  borderStyle: "dashed",
                  borderRadius: 16,
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: Spacing.lg,
                }}
              >
                <Feather name="grid" size={64} color={Colors.textLightPrimary} />
              </View>
              <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 4 }]}>Show QR Code</Text>
              <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>Let others pay exactly what you ask</Text>
            </Pressable>
          </Animated.View>
        );

      case "Split":
        return (
          <Animated.View entering={FadeInDown.duration(300)}>
            <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.md }]}>Split a Bill</Text>

            <Pressable
              style={{
                backgroundColor: Colors.white,
                borderRadius: 16,
                padding: Spacing.lg,
                flexDirection: "row",
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.03,
                shadowRadius: 8,
                elevation: 2,
                marginBottom: Spacing.lg,
              }}
              onPress={() => {
                Haptics.selectionAsync();
                router.push("/split-bill");
              }}
            >
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.baseLight, justifyContent: "center", alignItems: "center", marginRight: Spacing.md }}>
                <Feather name="users" size={24} color={Colors.textLightPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>Create a Group</Text>
                <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>Split expenses with roommates or friends</Text>
              </View>
              <Feather name="chevron-right" size={20} color={Colors.textLightSecondary} />
            </Pressable>
          </Animated.View>
        );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.baseLight }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.xs }}>
          <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "700", fontSize: 28 }]}>Pay</Text>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              router.push("/(tabs)/activity");
            }}
          >
            <Feather name="clock" size={22} color={Colors.textLightPrimary} />
          </Pressable>
        </View>
        <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginBottom: Spacing.xl }]}>Fast. Secure. Borderless.</Text>

        {/* Segmented Control */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: Colors.white,
            borderRadius: 99,
            padding: 6,
            marginBottom: Spacing.xl,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          <Pressable
            onPress={() => handleTabPress("Pay")}
            style={{
              flex: 1,
              backgroundColor: activeTab === "Pay" ? "#111111" : "transparent",
              borderRadius: 99,
              paddingVertical: 14,
              alignItems: "center",
              shadowColor: activeTab === "Pay" ? "#000" : "transparent",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
            }}
          >
            <Text style={[Typography.labelLarge, { color: activeTab === "Pay" ? Colors.white : Colors.textLightSecondary, fontWeight: "700" }]}>Pay</Text>
          </Pressable>
          <Pressable
            onPress={() => handleTabPress("Request")}
            style={{
              flex: 1,
              backgroundColor: activeTab === "Request" ? "#111111" : "transparent",
              borderRadius: 99,
              paddingVertical: 14,
              alignItems: "center",
              shadowColor: activeTab === "Request" ? "#000" : "transparent",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
            }}
          >
            <Text style={[Typography.labelLarge, { color: activeTab === "Request" ? Colors.white : Colors.textLightSecondary, fontWeight: "700" }]}>Request</Text>
          </Pressable>
          <Pressable
            onPress={() => handleTabPress("Split")}
            style={{
              flex: 1,
              backgroundColor: activeTab === "Split" ? "#111111" : "transparent",
              borderRadius: 99,
              paddingVertical: 14,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              shadowColor: activeTab === "Split" ? "#000" : "transparent",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
            }}
          >
            <Feather name="maximize" size={14} color={activeTab === "Split" ? Colors.white : Colors.textLightSecondary} style={{ marginRight: 6 }} />
            <Text style={[Typography.labelLarge, { color: activeTab === "Split" ? Colors.white : Colors.textLightSecondary, fontWeight: "700" }]}>Split</Text>
          </Pressable>
        </View>

        {renderContent()}
      </ScrollView>

      {/* Request QR Sheet */}
      <BottomSheetModal
        ref={requestQRSheetRef}
        enableDynamicSizing={true}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: Colors.white, borderRadius: 24 }}
        handleIndicatorStyle={{ backgroundColor: Colors.border, width: 40 }}
        enablePanDownToClose={true}
      >
        <BottomSheetView style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, alignItems: "center" }}>
          {!qrGenerated ? (
            <View style={{ width: "100%", alignItems: "center" }}>
              <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, marginTop: Spacing.sm, fontWeight: "700" }]}>Set Request Details</Text>
              <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginTop: Spacing.xs, textAlign: "center" }]}>Specify an amount and notes to generate a request QR code</Text>

              {/* Amount and Currency Selector Row */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginVertical: Spacing.lg, width: "100%" }}>
                <BottomSheetTextInput
                  value={requestAmount}
                  onChangeText={(text) => setRequestAmount(text.replace(/,/g, ".").replace(/[^0-9.]/g, ""))}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor={Colors.textLightMuted}
                  style={[Typography.displayLarge, { fontSize: 36, color: Colors.textLightPrimary, textAlign: "right", marginRight: Spacing.sm, minWidth: 100, height: 60 }]}
                />
                <TouchableOpacity
                  onPress={() => {
                    Keyboard.dismiss();
                    currencySheetRef.current?.present();
                  }}
                  style={{ flexDirection: "row", alignItems: "center", backgroundColor: Colors.baseLight, paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: 99 }}
                >
                  <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "600", marginRight: 4 }]}>{requestCurrency.code}</Text>
                  <Feather name="chevron-down" size={16} color={Colors.textLightPrimary} />
                </TouchableOpacity>
              </View>

              {/* Dynamic USD conversion subtext */}
              {requestCurrency.code !== "USD" && requestAmount && parseFloat(requestAmount) > 0
                ? (() => {
                    const amountNum = parseFloat(requestAmount);
                    if (isNaN(amountNum)) return null;
                    const localRates = rates || { USD: 1, IDR: 16350, PHP: 56.2, VND: 25450, SGD: 1.34, MYR: 4.72 };
                    const rateToUse = localRates[requestCurrency.code as keyof ExchangeRates] || 1;
                    const usdVal = (amountNum / rateToUse).toFixed(2);
                    return <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginTop: -Spacing.sm, marginBottom: Spacing.lg }]}>≈ ${usdVal} USD</Text>;
                  })()
                : null}

              {/* Notes Input Field */}
              <View style={{ width: "100%", backgroundColor: Colors.baseLight, borderRadius: 16, paddingHorizontal: Spacing.md, paddingVertical: 2, marginBottom: Spacing.xl }}>
                <BottomSheetTextInput
                  value={requestNotes}
                  onChangeText={setRequestNotes}
                  placeholder="Add notes / reason (e.g. Lunch split)"
                  placeholderTextColor={Colors.textLightSecondary}
                  style={{ color: Colors.textLightPrimary, minHeight: 48, width: "100%" }}
                />
              </View>

              <TouchableOpacity
                onPress={handleGenerateRequestQR}
                disabled={qrLoading}
                style={{ width: "100%", height: 52, borderRadius: 26, backgroundColor: "#111111", justifyContent: "center", alignItems: "center" }}
              >
                <Text style={[Typography.labelLarge, { color: Colors.white, fontWeight: "700" }]}>{qrLoading ? "Generating..." : "Generate QR Code"}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ width: "100%", alignItems: "center" }}>
              <ViewShot ref={qrViewShotRef} options={{ format: 'png', quality: 1 }} style={{ backgroundColor: Colors.white, alignItems: "center", width: "100%", paddingVertical: Spacing.md }}>
              <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, marginTop: Spacing.sm, fontWeight: "700" }]}>Request Payment QR</Text>
              <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginTop: Spacing.xs, textAlign: "center", marginBottom: Spacing.lg }]}>Scan this QR to pay instantly</Text>

              {/* QR Code Container */}
              <View
                style={{
                  padding: Spacing.xl,
                  backgroundColor: Colors.white,
                  borderRadius: 24,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.05,
                  shadowRadius: 16,
                  elevation: 4,
                  marginBottom: Spacing.xl,
                }}
              >
                <QRCode value={qrValue} size={180} color={Colors.textLightPrimary} backgroundColor={Colors.white} getRef={(ref: any) => (qrRef.current = ref)} />
              </View>

              <Text style={[Typography.bodyMedium, { color: Colors.textLightPrimary, fontWeight: "600", marginBottom: Spacing.xs }]}>@{profile?.username}</Text>

              <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary, textAlign: "center", paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg }]}>
                Requested:{" "}
                <Text style={{ fontWeight: "700", color: Colors.textLightPrimary }}>
                  {requestCurrency.symbol}
                  {parseFloat(requestAmount).toLocaleString(undefined, { minimumFractionDigits: requestCurrency.code === "VND" || requestCurrency.code === "IDR" ? 0 : 2 })} {requestCurrency.code}
                </Text>
                {requestNotes ? ` for "${requestNotes}"` : ""}
              </Text>
            </ViewShot>

              <View style={{ flexDirection: "row", gap: Spacing.sm, width: "100%" }}>
                <TouchableOpacity
                  onPress={handleShareQR}
                  style={{
                    flex: 1,
                    height: 52,
                    borderRadius: 26,
                    borderWidth: 1,
                    borderColor: Colors.borderLightStrong,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: Colors.white,
                    flexDirection: "row",
                  }}
                >
                  <Feather name="share-2" size={16} color={Colors.textLightPrimary} style={{ marginRight: 6 }} />
                  <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700" }]}>Share</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSaveQR}
                  style={{
                    flex: 1,
                    height: 52,
                    borderRadius: 26,
                    borderWidth: 1,
                    borderColor: Colors.borderLightStrong,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: Colors.white,
                    flexDirection: "row",
                  }}
                >
                  <Feather name="download" size={16} color={Colors.textLightPrimary} style={{ marginRight: 6 }} />
                  <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700" }]}>Save</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    requestQRSheetRef.current?.dismiss();
                  }}
                  style={{ flex: 1, height: 52, borderRadius: 26, backgroundColor: "#111111", justifyContent: "center", alignItems: "center" }}
                >
                  <Text style={[Typography.labelLarge, { color: Colors.white, fontWeight: "700" }]}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </BottomSheetView>
      </BottomSheetModal>

      {/* Currency Sheet */}
      <BottomSheetModal
        ref={currencySheetRef}
        enableDynamicSizing={true}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: Colors.white, borderRadius: 24 }}
        handleIndicatorStyle={{ backgroundColor: Colors.border, width: 40 }}
        enablePanDownToClose={true}
      >
        <BottomSheetView style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl }}>
          <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, marginBottom: Spacing.lg, marginTop: Spacing.sm }]}>Select Request Currency</Text>
          {CURRENCIES.map((c) => (
            <TouchableOpacity
              key={c.code}
              onPress={() => {
                setRequestCurrency(c);
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
              {requestCurrency.code === c.code && <Feather name="check" size={24} color={Colors.teal} />}
            </TouchableOpacity>
          ))}
        </BottomSheetView>
      </BottomSheetModal>
    </SafeAreaView>
  );
}
