import { View, Text, Pressable, TextInput, KeyboardAvoidingView, Platform, ScrollView, InteractionManager, Keyboard, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as Haptics from "expo-haptics";
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import { Colors } from "../src/constants/colors";
import { Typography } from "../src/constants/typography";
import { Spacing } from "../src/constants/spacing";
import { CURRENCIES } from "../src/constants/currencies";

export default function AddMoneyScreen() {
  const [amount, setAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("apple_pay");
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const inputRef = useRef<TextInput>(null);
  const currencySheetRef = useRef<BottomSheetModal>(null);

  const handleCurrencySelect = () => {
    Keyboard.dismiss();
    currencySheetRef.current?.present();
  };

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    []
  );

  useEffect(() => {
    // Wait for the native horizontal page slide to completely finish (approx 350ms)
    // before triggering the vertical keyboard slide, ensuring zero stutter
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const handleAmountChange = (text: string) => {
    // Only allow numbers and one decimal point
    const cleaned = text.replace(/[^0-9.]/g, "");
    if (cleaned.split(".").length > 2) return;
    setAmount(cleaned);
  };

  const handleContinue = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const fundingMethods = [
    { id: "apple_pay", title: "Apple Pay", icon: "smartphone", sub: "Instant" },
    { id: "card", title: "Debit Card", icon: "credit-card", sub: "Visa ending in 4242" },
    { id: "bank", title: "Bank Transfer", icon: "briefcase", sub: "1-3 business days" },
    { id: "crypto", title: "Crypto Deposit", icon: "link", sub: "Via Stellar Network" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.baseLight }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: Spacing.xl, flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, marginBottom: Spacing.lg }}>
            <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.white, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}>
              <Feather name="arrow-left" size={20} color={Colors.textLightPrimary} />
            </Pressable>
            <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "700", fontSize: 20 }]}>Add Money</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Amount Input */}
          <View style={{ alignItems: "center", marginBottom: Spacing.xxl }}>

            {/* Currency Selector Pill */}
            <Pressable
              onPress={handleCurrencySelect}
              style={{ flexDirection: "row", alignItems: "center", backgroundColor: Colors.white, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99, marginBottom: Spacing.lg, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}
            >
              <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginRight: 4 }]}>{currency.code}</Text>
              <Feather name="chevron-down" size={16} color={Colors.textLightSecondary} />
            </Pressable>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
              <Text style={[Typography.displayLarge, { fontSize: 64, lineHeight: 76, color: amount ? Colors.textLightPrimary : Colors.textLightSecondary }]}>{currency.symbol}</Text>
              <TextInput
                ref={inputRef}
                value={amount}
                onChangeText={handleAmountChange}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={Colors.textLightSecondary}
                style={[Typography.displayLarge, { fontSize: 64, lineHeight: 76, color: Colors.textLightPrimary }]}
                selectionColor={Colors.teal}
              />
            </View>
            <View style={{ backgroundColor: Colors.white, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, marginTop: Spacing.sm, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 }}>
              <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, fontWeight: "600" }]}>{currency.code} • {currency.name}</Text>
            </View>
          </View>

          {/* Funding Sources */}
          <View style={{ paddingHorizontal: Spacing.lg }}>
            <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.md }]}>
              Funding Source
            </Text>

            <View style={{ backgroundColor: Colors.white, borderRadius: 24, paddingHorizontal: Spacing.md, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2 }}>
              {fundingMethods.map((method, index) => {
                const isSelected = selectedMethod === method.id;
                return (
                  <Pressable
                    key={method.id}
                    onPress={() => setSelectedMethod(method.id)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: Spacing.lg,
                      borderBottomWidth: index === fundingMethods.length - 1 ? 0 : 1,
                      borderBottomColor: Colors.borderLight
                    }}
                  >
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: isSelected ? "#111111" : Colors.baseLight, justifyContent: "center", alignItems: "center", marginRight: Spacing.md }}>
                      <Feather name={method.icon as any} size={20} color={isSelected ? Colors.white : Colors.textLightPrimary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>{method.title}</Text>
                      <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>{method.sub}</Text>
                    </View>
                    <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: isSelected ? "#111111" : Colors.borderLight, justifyContent: "center", alignItems: "center" }}>
                      {isSelected && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#111111" }} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

        </ScrollView>

        {/* Bottom Action */}
        <View style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, paddingTop: Spacing.sm }}>
          <Pressable
            onPress={handleContinue}
            style={{
              backgroundColor: "#111111",
              borderRadius: 99,
              paddingVertical: Spacing.lg,
              alignItems: "center",
              opacity: amount && parseFloat(amount) > 0 ? 1 : 0.5,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 4
            }}
          >
            <Text style={[Typography.labelLarge, { color: Colors.white, fontWeight: "700", fontSize: 16 }]}>
              {amount && parseFloat(amount) > 0 ? `Add ${currency.symbol}${amount}` : "Enter Amount"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

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
    </SafeAreaView>
  );
}
