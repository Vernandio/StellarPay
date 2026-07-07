import { View, Text, TextInput, KeyboardAvoidingView, Platform, Keyboard, TouchableOpacity, ScrollView, Dimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState, useRef, useCallback, useEffect } from "react";
import * as Haptics from "expo-haptics";
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import { ActivityIndicator, Alert } from "react-native";
import { Colors } from "../src/constants/colors";
import { Typography } from "../src/constants/typography";
import { Spacing } from "../src/constants/spacing";
import { CURRENCIES } from "../src/constants/currencies";
import { useStellar } from "../src/hooks/useStellar";

const { height } = Dimensions.get("window");

export default function SendScreen() {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const [receiveCurrency, setReceiveCurrency] = useState(CURRENCIES[1] || CURRENCIES[0]);
  const [activeSelector, setActiveSelector] = useState<"send" | "receive">("send");
  
  const { send, isProcessing } = useStellar();
  
  const amountInputRef = useRef<TextInput>(null);
  const currencySheetRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      amountInputRef.current?.focus();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const handleAmountChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, "");
    if (cleaned.split(".").length > 2) return;
    setAmount(cleaned);
  };

  const handleSend = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    
    if (!params.publicKey) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Recipient has not set up a Stellar wallet yet.");
      return;
    }
    
    try {
      // Assuming currency.code can be mapped, or default to USDC
      const asset = currency.code === "USDC" ? "USDC" : "XLM"; 
      
      const txHash = await send(params.publicKey as string, amount, asset, message);
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({
        pathname: "/transfer-success",
        params: {
          amount,
          currency: currency.code,
          name: params.name,
          hash: txHash
        }
      });
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Transfer Failed", err.message || "Something went wrong.");
    }
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
    ),
    []
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.lg, height: 56 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, justifyContent: "center", alignItems: "flex-start" }}>
              <Feather name="chevron-left" size={28} color={Colors.textLightPrimary} />
            </TouchableOpacity>
            <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "700", fontSize: 18 }]}>Send Money</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView 
            contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 100 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Recipient Section */}
            <View style={{ marginTop: Spacing.lg, marginBottom: Spacing.xl }}>
              <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginBottom: Spacing.md }]}>To</Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: (params.color as string) || Colors.baseLight, justifyContent: "center", alignItems: "center", marginRight: Spacing.md }}>
                  <Text style={[Typography.headingLarge, { color: Colors.white }]}>{params.avatar || "U"}</Text>
                </View>
                <View>
                  <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>{params.name || "Unknown User"}</Text>
                  <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>{params.handle || "@user"}</Text>
                </View>
              </View>
            </View>

            {/* Main Form Card */}
            <View style={{ backgroundColor: Colors.white, borderRadius: 24, padding: Spacing.xl, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 }}>
              
              {/* You Send */}
              <Text style={[Typography.labelLarge, { color: Colors.textLightSecondary, fontWeight: "500", marginBottom: Spacing.xs }]}>You send</Text>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.lg }}>
                <TextInput
                  ref={amountInputRef}
                  value={amount}
                  onChangeText={handleAmountChange}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={Colors.textLightSecondary}
                  style={[Typography.displayLarge, { fontSize: 40, lineHeight: 48, color: Colors.textLightPrimary, flex: 1, height: 56 }]}
                  selectionColor={Colors.teal}
                />
                <TouchableOpacity 
                  onPress={() => {
                    Keyboard.dismiss();
                    setActiveSelector("send");
                    currencySheetRef.current?.present();
                  }}
                  style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#F2F4F7", paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: 99, marginLeft: Spacing.sm }}
                >
                  <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "600", marginRight: 4 }]}>{currency.code}</Text>
                  <Feather name="chevron-down" size={16} color={Colors.textLightPrimary} />
                </TouchableOpacity>
              </View>

              <View style={{ height: 1, backgroundColor: Colors.borderLight, marginBottom: Spacing.lg }} />

              {/* They Receive */}
              <Text style={[Typography.labelLarge, { color: Colors.textLightSecondary, fontWeight: "500", marginBottom: Spacing.xs }]}>They will receive</Text>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.xs }}>
                <Text style={[Typography.displayLarge, { fontSize: 32, lineHeight: 40, color: Colors.textLightPrimary, flex: 1 }]}>{amount ? parseFloat(amount).toFixed(2) : "0.00"}</Text>
                <TouchableOpacity 
                  onPress={() => {
                    Keyboard.dismiss();
                    setActiveSelector("receive");
                    currencySheetRef.current?.present();
                  }}
                  style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#F2F4F7", paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: 99, marginLeft: Spacing.sm }}
                >
                  <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "600", marginRight: 4 }]}>{receiveCurrency.code}</Text>
                  <Feather name="chevron-down" size={16} color={Colors.textLightPrimary} />
                </TouchableOpacity>
              </View>
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
                style={[Typography.bodyLarge, { color: Colors.textLightPrimary, fontWeight: "500" }]}
                selectionColor={Colors.teal}
              />
            </View>

          </ScrollView>

          {/* Bottom Action Bar */}
          <View style={{ paddingHorizontal: Spacing.lg, paddingBottom: Math.max(insets.bottom, Spacing.lg), paddingTop: Spacing.md, backgroundColor: "#F8F9FA" }}>
            <TouchableOpacity
              onPress={handleSend}
              style={{
                backgroundColor: "#111111",
                borderRadius: 24,
                paddingVertical: 18,
                alignItems: "center",
                opacity: (amount && parseFloat(amount) > 0) || isProcessing ? 1 : 0.5,
              }}
              disabled={!amount || parseFloat(amount) <= 0 || isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={[Typography.labelLarge, { color: Colors.white, fontWeight: "700", fontSize: 16 }]}>Send</Text>
              )}
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
          <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, marginBottom: Spacing.lg, marginTop: Spacing.sm }]}>Select Currency</Text>
          {CURRENCIES.map((c) => (
            <TouchableOpacity
              key={c.code}
              onPress={() => {
                if (activeSelector === "send") {
                  setCurrency(c);
                } else {
                  setReceiveCurrency(c);
                }
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
              {((activeSelector === "send" && currency.code === c.code) || (activeSelector === "receive" && receiveCurrency.code === c.code)) && (
                <Feather name="check" size={24} color={"#111111"} />
              )}
            </TouchableOpacity>
          ))}
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}
