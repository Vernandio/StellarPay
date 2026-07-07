import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  Image,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { Colors } from "../../src/constants/colors";
import { Typography } from "../../src/constants/typography";
import { Spacing } from "../../src/constants/spacing";
import { verifyPin } from "../../src/services/api/pin";
import { signOut } from "../../src/services/firebase/auth";
import { auth } from "../../src/services/firebase/config";
import { getUserProfile, UserProfile } from "../../src/services/firebase/firestore";

export default function PinEntryScreen() {
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const pinRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  useEffect(() => {
    (async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (uid) {
          const userProfile = await getUserProfile(uid);
          setProfile(userProfile);
        }
      } catch (err) {
        console.error("Failed to load profile on pin-entry:", err);
      } finally {
        setProfileLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      pinRefs[0].current?.focus();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const handlePinChange = async (text: string, index: number) => {
    let newPinArray = [...pin];

    if (text.length > 1) {
      const pastedData = text
        .replace(/[^0-9]/g, "")
        .slice(0, 6)
        .split("");
      pastedData.forEach((char, i) => {
        if (index + i < 6) {
          newPinArray[index + i] = char;
        }
      });
      setPin(newPinArray);
      const nextIndex = Math.min(index + pastedData.length, 5);
      setTimeout(() => pinRefs[nextIndex].current?.focus(), 0);
    } else {
      newPinArray[index] = text;
      setPin(newPinArray);

      // If text entered, focus next input
      if (text && index < 5) {
        setTimeout(() => pinRefs[index + 1].current?.focus(), 0);
      }
    }

    // Trigger verification if all 6 digits are entered
    if (newPinArray.join("").length === 6) {
      await verifyCode(newPinArray.join(""));
    }
  };

  const handlePinKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !pin[index] && index > 0) {
      const arr = [...pin];
      arr[index - 1] = "";
      setPin(arr);
      setTimeout(() => pinRefs[index - 1].current?.focus(), 0);
    }
  };

  const verifyCode = async (enteredPin: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const isValid = await verifyPin(enteredPin);
      if (isValid) {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
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

  const accountLabel = profile?.email || profile?.username || auth.currentUser?.email || null;
  const pinComplete = pin.join("").length === 6;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.baseLight }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, justifyContent: "space-between" }}
        >
          {/* Top Section */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(100)}
            style={{ flex: 0.6, position: "relative" }}
          >
            {/* Background Globe - Absolute positioned behind everything */}
            <View
              style={{
                position: "absolute",
                bottom: -60,
                left: 0,
                right: 0,
                alignItems: "center",
                zIndex: -1,
                overflow: "hidden",
              }}
            >
              <Image
                source={require("../../assets/images/globe.png")}
                style={{
                  width: Dimensions.get("window").width,
                  height: 400,
                  opacity: 0.7,
                  resizeMode: "cover",
                }}
              />
            </View>

            {/* Title / Logo */}
            <View style={{ alignItems: "center", paddingTop: Spacing.xxl }}>
              <Feather
                name="lock"
                size={56}
                color={Colors.white}
                style={{ marginBottom: Spacing.md }}
              />
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: "800",
                  color: Colors.white,
                  marginBottom: Spacing.xs,
                  letterSpacing: -0.5,
                }}
              >
                Enter Security PIN
              </Text>

              {profileLoading ? (
                <ActivityIndicator color="Colors.textLightSecondary" style={{ marginTop: Spacing.xs }} />
              ) : (
                <>
                  <Text
                    style={[
                      Typography.bodyLarge,
                      {
                        color: Colors.textLightSecondary,
                        textAlign: "center",
                        paddingHorizontal: Spacing.xl,
                      },
                    ]}
                  >
                    Confirm your identity to access your wallet
                  </Text>
                  {accountLabel && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: Spacing.sm,
                        backgroundColor: Colors.borderLightStrong,
                        paddingHorizontal: Spacing.md,
                        paddingVertical: Spacing.xs,
                        borderRadius: 999,
                      }}
                    >
                      <Feather name="user" size={13} color={Colors.textLightPrimary} style={{ marginRight: 6 }} />
                      <Text
                        style={[
                          Typography.bodySmall,
                          { color: Colors.textLightPrimary, fontWeight: "600" },
                        ]}
                      >
                        {accountLabel}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </Animated.View>

          {/* Bottom Card */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(300).springify()}
            style={{
              backgroundColor: Colors.surfaceLight,
              borderWidth: 0.5,
              borderColor: Colors.borderLight,
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              paddingTop: Spacing.xxl,
              paddingHorizontal: Spacing.xl,
              paddingBottom: Spacing.xxl,
              shadowColor: "#000", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.05, shadowRadius: 24, elevation: 8,
              zIndex: 10,
              flex: 1,
            }}
          >
            {error && (
              <Animated.View entering={FadeInDown.duration(200)}>
                <Text
                  style={[
                    Typography.bodySmall,
                    {
                      color: Colors.danger,
                      marginBottom: Spacing.md,
                      textAlign: "center",
                    },
                  ]}
                >
                  {error}
                </Text>
              </Animated.View>
            )}

            <View style={{ flex: 1, justifyContent: "center" }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: Spacing.xl,
                }}
              >
                {pin.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={pinRefs[index]}
                    value={digit}
                    onChangeText={(text) => handlePinChange(text, index)}
                    onKeyPress={(e) => handlePinKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    secureTextEntry
                    editable={!isLoading}
                    style={{
                      fontSize: 28,
                      fontWeight: "700",
                      width: 50,
                      height: 60,
                      backgroundColor: Colors.surfaceLight,
                      borderWidth: 1,
                      borderColor: digit ? Colors.primary : Colors.borderLight,
                      borderRadius: 12,
                      textAlign: "center",
                      color: Colors.textLightPrimary,
                      ...(digit ? {
                        shadowColor: Colors.primary,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.15,
                        shadowRadius: 16,
                      } : {})
                    }}
                  />
                ))}
              </View>

              <Pressable
                onPress={() => verifyCode(pin.join(""))}
                disabled={!pinComplete || isLoading}
                style={({ pressed }) => ({
                  borderRadius: 9999,
                  overflow: "hidden",
                  opacity: !pinComplete || isLoading ? 0.4 : (pressed ? 0.9 : 1),
                  shadowColor: Colors.primary,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: isLoading ? 0 : (pressed ? 0.4 : 0.2),
                  shadowRadius: 24,
                  marginBottom: Spacing.md,
                })}
              >
                <LinearGradient
                  colors={[Colors.primary, Colors.primaryDark]}
                  style={{
                    height: 56,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {isLoading ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <Text style={[Typography.labelLarge, { color: Colors.white, fontSize: 16 }]}>
                      Unlock
                    </Text>
                  )}
                </LinearGradient>
              </Pressable>

              <Pressable
                onPress={handleLogout}
                style={{ alignSelf: "center", padding: Spacing.md }}
              >
                <Text
                  style={[
                    Typography.bodyMedium,
                    { color: Colors.textLightSecondary, fontWeight: "600" },
                  ]}
                >
                  Use another account
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
