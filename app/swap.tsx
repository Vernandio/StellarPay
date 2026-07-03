import { View, Text, TextInput, KeyboardAvoidingView, Platform, Keyboard, TouchableOpacity, ScrollView, Dimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState, useRef, useEffect } from "react";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from "react-native-reanimated";
import { Colors } from "../src/constants/colors";
import { Typography } from "../src/constants/typography";
import { Spacing } from "../src/constants/spacing";
import { useWallet } from "../src/hooks/useWallet";

const { height } = Dimensions.get("window");

export default function SwapScreen() {
  const insets = useSafeAreaInsets();
  const { xlmBalance, usdcBalance } = useWallet();
  
  const [payAmount, setPayAmount] = useState("");
  const [isXlmToUsdc, setIsXlmToUsdc] = useState(true);
  
  const amountInputRef = useRef<TextInput>(null);
  const rotation = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      amountInputRef.current?.focus();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Mock rate for UI
  const xlmToUsdcRate = 0.1245;
  const usdcToXlmRate = 1 / xlmToUsdcRate;
  
  const currentRate = isXlmToUsdc ? xlmToUsdcRate : usdcToXlmRate;
  
  const payCurrency = isXlmToUsdc ? "XLM" : "USDC";
  const receiveCurrency = isXlmToUsdc ? "USDC" : "XLM";
  const payBalance = isXlmToUsdc ? xlmBalance : usdcBalance;

  const receiveAmount = payAmount ? (parseFloat(payAmount) * currentRate).toFixed(isXlmToUsdc ? 2 : 4) : "0.00";

  const handleAmountChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, "");
    if (cleaned.split(".").length > 2) return;
    setPayAmount(cleaned);
  };

  const flipCurrencies = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    rotation.value = withTiming(rotation.value + 180, { duration: 300 });
    setIsXlmToUsdc(!isXlmToUsdc);
    // Optionally flip amounts too, or just clear
    setPayAmount(receiveAmount === "0.00" ? "" : receiveAmount);
  };

  const handleReviewSwap = async () => {
    if (!payAmount || parseFloat(payAmount) <= 0 || parseFloat(payAmount) > Number(payBalance)) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }]
    };
  });

  return (
    <View style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.lg, height: 56 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, justifyContent: "center", alignItems: "flex-start" }}>
              <Feather name="chevron-left" size={28} color={Colors.textLightPrimary} />
            </TouchableOpacity>
            <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "700", fontSize: 18 }]}>Swap</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView 
            contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 100, paddingTop: Spacing.xl }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Swap Form Container */}
            <View>
              {/* Pay Section */}
              <View style={{ backgroundColor: Colors.white, borderRadius: 24, padding: Spacing.xl, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3, zIndex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.sm }}>
                  <Text style={[Typography.labelLarge, { color: Colors.textLightSecondary, fontWeight: "500" }]}>You pay</Text>
                  <Text style={[Typography.labelLarge, { color: Colors.textLightSecondary }]}>Available: {Number(payBalance).toLocaleString()} {payCurrency}</Text>
                </View>
                
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <TextInput
                    ref={amountInputRef}
                    value={payAmount}
                    onChangeText={handleAmountChange}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={Colors.border}
                    style={[Typography.displayLarge, { fontSize: 40, lineHeight: 48, color: Colors.textLightPrimary, flex: 1, height: 56 }]}
                    selectionColor={Colors.teal}
                  />
                  <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#F2F4F7", paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: 99, marginLeft: Spacing.sm }}>
                    <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "600" }]}>{payCurrency}</Text>
                  </View>
                </View>
              </View>

              {/* Flip Button */}
              <View style={{ alignItems: "center", justifyContent: "center", zIndex: 10, marginTop: -20, marginBottom: -20 }}>
                <TouchableOpacity 
                  onPress={flipCurrencies}
                  style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.white, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 }}
                >
                  <Animated.View style={animatedIconStyle}>
                    <Feather name="arrow-down" size={24} color={Colors.textLightPrimary} />
                  </Animated.View>
                </TouchableOpacity>
              </View>

              {/* Receive Section */}
              <View style={{ backgroundColor: Colors.white, borderRadius: 24, padding: Spacing.xl, paddingTop: Spacing.xl + 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3, zIndex: 1 }}>
                <Text style={[Typography.labelLarge, { color: Colors.textLightSecondary, fontWeight: "500", marginBottom: Spacing.sm }]}>You receive</Text>
                
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={[Typography.displayLarge, { fontSize: 40, lineHeight: 48, color: receiveAmount && receiveAmount !== "0.00" ? Colors.textLightPrimary : Colors.border, flex: 1, height: 56 }]} numberOfLines={1} adjustsFontSizeToFit>
                    {receiveAmount}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#F2F4F7", paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: 99, marginLeft: Spacing.sm }}>
                    <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "600" }]}>{receiveCurrency}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Rate Info */}
            <View style={{ marginTop: Spacing.xl, alignItems: "center" }}>
              <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>
                1 {payCurrency} ≈ {currentRate} {receiveCurrency}
              </Text>
              <Text style={[Typography.labelSmall, { color: Colors.teal, marginTop: 4 }]}>
                No network fees
              </Text>
            </View>
          </ScrollView>

          {/* Bottom Action Bar */}
          <View style={{ paddingHorizontal: Spacing.lg, paddingBottom: Math.max(insets.bottom, Spacing.lg), paddingTop: Spacing.md, backgroundColor: "#F8F9FA" }}>
            <TouchableOpacity
              onPress={handleReviewSwap}
              style={{
                backgroundColor: "#111111",
                borderRadius: 24,
                paddingVertical: 18,
                alignItems: "center",
                opacity: payAmount && parseFloat(payAmount) > 0 && parseFloat(payAmount) <= Number(payBalance) ? 1 : 0.5,
              }}
              disabled={!payAmount || parseFloat(payAmount) <= 0 || parseFloat(payAmount) > Number(payBalance)}
            >
              <Text style={[Typography.labelLarge, { color: Colors.white, fontWeight: "700", fontSize: 16 }]}>
                {payAmount && parseFloat(payAmount) > Number(payBalance) ? "Insufficient Balance" : "Review Swap"}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
