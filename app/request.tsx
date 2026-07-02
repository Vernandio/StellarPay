import { View, Text, TextInput, KeyboardAvoidingView, Platform, Keyboard, TouchableOpacity, ScrollView, Dimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState, useRef, useCallback, useEffect } from "react";
import * as Haptics from "expo-haptics";
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import { Colors } from "../src/constants/colors";
import { Typography } from "../src/constants/typography";
import { Spacing } from "../src/constants/spacing";
import { CURRENCIES } from "../src/constants/currencies";

const { height } = Dimensions.get("window");

export default function RequestScreen() {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  let parsedGroup: any[] = [];
  if (params.group && typeof params.group === "string") {
    try {
      parsedGroup = JSON.parse(params.group);
    } catch (e) { }
  }
  
  const isGroup = parsedGroup.length > 0;
  
  const [amount, setAmount] = useState("");
  const [forReason, setForReason] = useState("");
  const [message, setMessage] = useState("");
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const [groupAmounts, setGroupAmounts] = useState<{[id: string]: string}>({});
  
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
    
    // Auto-split if group
    if (isGroup && cleaned) {
      const parsedTotal = parseFloat(cleaned);
      if (!isNaN(parsedTotal) && parsedGroup.length > 0) {
        const split = (parsedTotal / parsedGroup.length).toFixed(2);
        const newAmounts: {[id: string]: string} = {};
        parsedGroup.forEach(p => newAmounts[p.id] = split);
        setGroupAmounts(newAmounts);
      }
    } else if (isGroup) {
      setGroupAmounts({});
    }
  };

  const handleIndividualAmountChange = (id: string, text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, "");
    if (cleaned.split(".").length > 2) return;
    
    setGroupAmounts(prev => {
      const next = { ...prev, [id]: cleaned };
      let newTotal = 0;
      parsedGroup.forEach(p => {
        newTotal += parseFloat(next[p.id] || "0");
      });
      setAmount(newTotal > 0 ? newTotal.toFixed(2) : "");
      return next;
    });
  };

  const handleRequest = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
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
            <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "700", fontSize: 18 }]}>Request Money</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView 
            contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 100 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Requester Section */}
            <View style={{ marginTop: Spacing.lg, marginBottom: Spacing.xl }}>
              <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginBottom: Spacing.md }]}>From</Text>
              
              {isGroup ? (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ flexDirection: "row", marginRight: Spacing.md }}>
                    {parsedGroup.slice(0, 3).map((contact, i) => (
                      <View key={contact.id} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: contact.color, justifyContent: "center", alignItems: "center", marginLeft: i > 0 ? -16 : 0, borderWidth: 2, borderColor: Colors.baseLight }}>
                        <Text style={[Typography.headingMedium, { color: Colors.white, fontSize: 16 }]}>{contact.avatar}</Text>
                      </View>
                    ))}
                    {parsedGroup.length > 3 && (
                      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.border, justifyContent: "center", alignItems: "center", marginLeft: -16, borderWidth: 2, borderColor: Colors.baseLight }}>
                        <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary }]}>+{parsedGroup.length - 3}</Text>
                      </View>
                    )}
                  </View>
                  <View>
                    <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>
                      {parsedGroup[0].name} {parsedGroup.length > 1 ? `& ${parsedGroup.length - 1} others` : ""}
                    </Text>
                    <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>Split Bill Group</Text>
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: (params.color as string) || Colors.baseLight, justifyContent: "center", alignItems: "center", marginRight: Spacing.md }}>
                    <Text style={[Typography.headingLarge, { color: Colors.white }]}>{params.avatar || "U"}</Text>
                  </View>
                  <View>
                    <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>{params.name || "Unknown User"}</Text>
                    <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>{params.handle || "@user"}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Main Form Card */}
            <View style={{ backgroundColor: Colors.white, borderRadius: 24, padding: Spacing.xl, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 }}>
              
              {/* Amount */}
              <Text style={[Typography.labelLarge, { color: Colors.textLightSecondary, fontWeight: "500", marginBottom: Spacing.xs }]}>Amount</Text>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.xl }}>
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
                    currencySheetRef.current?.present();
                  }}
                  style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#F2F4F7", paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: 99, marginLeft: Spacing.sm }}
                >
                  <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "600", marginRight: 4 }]}>{currency.code}</Text>
                  <Feather name="chevron-down" size={16} color={Colors.textLightPrimary} />
                </TouchableOpacity>
              </View>

              {/* For */}
              <Text style={[Typography.labelLarge, { color: Colors.textLightSecondary, fontWeight: "500", marginBottom: Spacing.sm }]}>For</Text>
              <TextInput
                value={forReason}
                onChangeText={setForReason}
                placeholder="Movie night 🎬"
                placeholderTextColor={Colors.textLightSecondary}
                style={[Typography.headingMedium, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: Spacing.xl }]}
                selectionColor={Colors.teal}
              />

              {/* Message */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.sm }}>
                <Text style={[Typography.labelLarge, { color: Colors.textLightSecondary, fontWeight: "500" }]}>Message (optional)</Text>
                <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>{message.length}/120</Text>
              </View>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Thanks in advance! 🙏"
                placeholderTextColor={Colors.textLightSecondary}
                maxLength={120}
                style={[Typography.bodyLarge, { color: Colors.textLightPrimary, fontWeight: "500" }]}
                selectionColor={Colors.teal}
              />
            </View>

            {/* Split Details Section */}
            {isGroup && (
              <View style={{ marginTop: Spacing.xl }}>
                <Text style={[Typography.labelLarge, { color: Colors.textLightSecondary, fontWeight: "500", marginBottom: Spacing.md }]}>Split Details</Text>
                <View style={{ backgroundColor: Colors.white, borderRadius: 24, padding: Spacing.lg, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 }}>
                  {parsedGroup.map((contact, index) => (
                    <View key={contact.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: index === parsedGroup.length - 1 ? 0 : Spacing.lg }}>
                      <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: Spacing.md }}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: contact.color, justifyContent: "center", alignItems: "center", marginRight: Spacing.sm }}>
                          <Text style={[Typography.headingMedium, { color: Colors.white }]}>{contact.avatar}</Text>
                        </View>
                        <Text style={[Typography.bodyLarge, { color: Colors.textLightPrimary, fontWeight: "600" }]} numberOfLines={1}>
                          {contact.name}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#F8F9FA", borderRadius: 12, paddingHorizontal: Spacing.sm, height: 40, width: 100 }}>
                        <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginRight: 2 }]}>{currency.symbol}</Text>
                        <TextInput
                          value={groupAmounts[contact.id] || ""}
                          onChangeText={(t) => handleIndividualAmountChange(contact.id, t)}
                          keyboardType="decimal-pad"
                          placeholder="0.00"
                          placeholderTextColor={Colors.textLightSecondary}
                          style={[Typography.bodyLarge, { color: Colors.textLightPrimary, fontWeight: "600", flex: 1, padding: 0 }]}
                          selectionColor={Colors.teal}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

          </ScrollView>

          {/* Bottom Action Bar */}
          <View style={{ paddingHorizontal: Spacing.lg, paddingBottom: Math.max(insets.bottom, Spacing.lg), paddingTop: Spacing.md, backgroundColor: "#F8F9FA" }}>
            <TouchableOpacity
              onPress={handleRequest}
              style={{
                backgroundColor: "#111111",
                borderRadius: 24,
                paddingVertical: 18,
                alignItems: "center",
                opacity: amount && parseFloat(amount) > 0 ? 1 : 0.5,
              }}
              disabled={!amount || parseFloat(amount) <= 0}
            >
              <Text style={[Typography.labelLarge, { color: Colors.white, fontWeight: "700", fontSize: 16 }]}>Request</Text>
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
              {currency.code === c.code && (
                <Feather name="check" size={24} color={"#111111"} />
              )}
            </TouchableOpacity>
          ))}
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}
