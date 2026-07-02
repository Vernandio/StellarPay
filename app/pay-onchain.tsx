import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Keyboard } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Colors } from "../src/constants/colors";
import { Typography } from "../src/constants/typography";
import { Spacing } from "../src/constants/spacing";

export default function PayOnchainScreen() {
  const [address, setAddress] = useState("");

  const handlePaste = async () => {
    // In a real app, import Clipboard from react-native or expo-clipboard
    // const text = await Clipboard.getStringAsync();
    // setAddress(text);
    Haptics.selectionAsync();
    setAddress("GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890");
  };

  const handleNext = () => {
    Keyboard.dismiss();
    Haptics.selectionAsync();
    router.push("/send");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.baseLight }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.lg, height: 56 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.white, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}>
            <Feather name="arrow-left" size={20} color={Colors.textLightPrimary} />
          </TouchableOpacity>
          <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "700", fontSize: 20 }]}>Send Onchain</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={{ flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl }}>
          <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.md }]}>
            Stellar Address
          </Text>

          <View style={{ backgroundColor: Colors.white, borderRadius: 16, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, marginBottom: Spacing.lg, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="G..."
              placeholderTextColor={Colors.textLightSecondary}
              style={[Typography.mono, { color: Colors.textLightPrimary, fontSize: 16, minHeight: 80 }]}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              selectionColor={Colors.teal}
            />
            {address.length > 0 && (
              <TouchableOpacity onPress={() => setAddress("")} style={{ position: "absolute", right: 12, top: 12, padding: Spacing.xs }}>
                <Feather name="x-circle" size={18} color={Colors.textLightSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity onPress={handlePaste} style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", backgroundColor: Colors.white, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: 99, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 }}>
            <Feather name="clipboard" size={16} color={Colors.textLightPrimary} style={{ marginRight: Spacing.xs }} />
            <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700" }]}>Paste</Text>
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          {/* Action Button */}
          <View style={{ paddingVertical: Spacing.lg }}>
            <TouchableOpacity
              onPress={handleNext}
              style={{
                backgroundColor: "#111111",
                borderRadius: 99,
                paddingVertical: Spacing.lg,
                alignItems: "center",
                opacity: address.length > 10 ? 1 : 0.5,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 4
              }}
              disabled={address.length <= 10}
            >
              <Text style={[Typography.labelLarge, { color: Colors.white, fontWeight: "700", fontSize: 16 }]}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
