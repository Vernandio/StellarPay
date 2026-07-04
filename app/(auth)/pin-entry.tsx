import React, { useState, useRef, useEffect } from "react";
import { View, Text, KeyboardAvoidingView, Platform, Pressable, TextInput, Image, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { Colors } from "../../src/constants/colors";
import { Typography } from "../../src/constants/typography";
import { Spacing } from "../../src/constants/spacing";
import { verifyPin } from "../../src/services/api/pin";
import { signOut } from "../../src/services/firebase/auth";

export default function PinEntryScreen() {
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const pinRefs = [
    useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), 
    useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)
  ];

  useEffect(() => {
    // Focus first box automatically
    const timer = setTimeout(() => {
      pinRefs[0].current?.focus();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const handlePinChange = async (text: string, index: number) => {
    let newPinArray = [...pin];

    if (text.length > 1) {
      const pastedData = text.replace(/[^0-9]/g, "").slice(0, 6).split("");
      pastedData.forEach((char, i) => {
        if (index + i < 6) {
          newPinArray[index + i] = char;
        }
      });
      setPin(newPinArray);
      const nextIndex = Math.min(index + pastedData.length, 5);
      pinRefs[nextIndex].current?.focus();
    } else {
      newPinArray[index] = text;
      setPin(newPinArray);

      // If text entered, focus next input
      if (text && index < 5) {
        pinRefs[index + 1].current?.focus();
      }
    }

    // Trigger verification if all 6 digits are entered
    if (newPinArray.join("").length === 6) {
      await verifyCode(newPinArray.join(""));
    }
  };

  const handlePinKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !pin[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  };

  const verifyCode = async (enteredPin: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const isValid = await verifyPin(enteredPin);
      if (isValid) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/(tabs)");
      } else {
        throw new Error("Invalid PIN code");
      }
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.message || "Incorrect PIN code. Please try again.");
      setPin(["", "", "", "", "", ""]);
      pinRefs[0].current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await signOut();
      router.replace("/(auth)/login");
    } catch (err) {
      console.error("Signout error:", err);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, justifyContent: "space-between" }}
        >
          {/* Top Section */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)} style={{ flex: 0.6, position: "relative" }}>
            {/* Background Globe - Absolute positioned behind everything */}
            <View style={{ position: "absolute", bottom: -60, left: 0, right: 0, alignItems: "center", zIndex: -1, overflow: "hidden" }}>
              <Image 
                source={require("../../assets/images/globe.png")} 
                style={{ width: Dimensions.get("window").width, height: 400, opacity: 0.7, resizeMode: "cover" }}
              />
            </View>

            {/* Title / Logo */}
            <View style={{ alignItems: "center", paddingTop: Spacing.xxl }}>
              <Feather name="lock" size={56} color={Colors.white} style={{ marginBottom: Spacing.md }} />
              <Text style={{ fontSize: 32, fontWeight: "800", color: Colors.white, marginBottom: Spacing.xs, letterSpacing: -0.5 }}>
                Enter Security PIN
              </Text>
              <Text style={[Typography.bodyLarge, { color: "rgba(255,255,255,0.6)", textAlign: "center", paddingHorizontal: Spacing.xl }]}>
                Confirm your identity to access your wallet
              </Text>
            </View>
          </Animated.View>

          {/* Bottom Card */}
          <Animated.View 
            entering={FadeInDown.duration(400).delay(300).springify()}
            style={{
              backgroundColor: Colors.white,
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              paddingTop: Spacing.xl,
              paddingHorizontal: Spacing.xl,
              paddingBottom: Spacing.xxl,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -12 },
              shadowOpacity: 0.03,
              shadowRadius: 24,
              elevation: 8,
              zIndex: 10,
              flex: 1,
            }}
          >
            <View style={{ width: 40, height: 4, backgroundColor: Colors.borderLightStrong, borderRadius: 2, alignSelf: "center", marginBottom: Spacing.xl }} />

            {error && (
              <Animated.View entering={FadeInDown.duration(200)}>
                <Text style={[Typography.bodySmall, { color: Colors.danger, marginBottom: Spacing.md, textAlign: "center" }]}>
                  {error}
                </Text>
              </Animated.View>
            )}

            <View style={{ flex: 1, justifyContent: "center" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.xl }}>
                {pin.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={pinRefs[index]}
                    value={digit}
                    onChangeText={(text) => handlePinChange(text, index)}
                    onKeyPress={(e) => handlePinKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={6}
                    secureTextEntry
                    editable={!isLoading}
                    style={{
                      fontSize: 28,
                      fontWeight: "700",
                      width: 50,
                      height: 60,
                      backgroundColor: Colors.baseLight,
                      borderWidth: 1,
                      borderColor: digit ? Colors.primary : Colors.borderLight,
                      borderRadius: 12,
                      textAlign: "center",
                      color: Colors.textLightPrimary,
                    }}
                  />
                ))}
              </View>

              <Pressable
                onPress={handleLogout}
                style={{ alignSelf: "center", padding: Spacing.md }}
              >
                <Text style={[Typography.bodyMedium, { color: Colors.primary, fontWeight: "600" }]}>
                  Log out of this account
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <View style={{ backgroundColor: Colors.white, height: 40, position: "absolute", bottom: 0, left: 0, right: 0, zIndex: -1 }} />
    </View>
  );
}
