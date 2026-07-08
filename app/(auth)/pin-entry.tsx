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
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { Colors } from "../../src/constants/colors";
import { Typography } from "../../src/constants/typography";
import { Spacing } from "../../src/constants/spacing";
import { verifyPin } from "../../src/services/api/pin";
import { signOut } from "../../src/services/firebase/auth";
import { auth } from "../../src/services/firebase/config";
import { getUserProfile, UserProfile } from "../../src/services/firebase/firestore";

const { width } = Dimensions.get("window");

function PinRow({
  value,
  onChangeText,
  onComplete,
  label,
  sublabel,
  onSubmit,
  submitLabel,
  isLoading,
  autoFocus,
}: {
  value: string;
  onChangeText: (code: string) => void;
  onComplete: (code: string) => void;
  label: string;
  sublabel: string;
  onSubmit: () => void;
  submitLabel: string;
  isLoading: boolean;
  autoFocus?: boolean;
}) {
  const inputRef = useRef<TextInput>(null);
  const complete = value.length === 6;

  useEffect(() => {
    if (!autoFocus) return;
    const t = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, [autoFocus]);

  return (
    <Animated.View entering={FadeIn.duration(250)}>
      <Text
        style={[
          Typography.headingLarge,
          { color: Colors.textLightPrimary, marginBottom: Spacing.xs },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          Typography.bodyMedium,
          { color: Colors.textLightSecondary, marginBottom: Spacing.xl },
        ]}
      >
        {sublabel}
      </Text>

      <Pressable
        onPress={() => inputRef.current?.focus()}
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: Spacing.xl,
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => {
          const filled = i < value.length;
          const active = i === value.length;
          return (
            <View
              key={i}
              style={{
                width: 50,
                height: 60,
                backgroundColor: Colors.surfaceLight,
                borderWidth: 1,
                borderColor:
                  filled || active ? Colors.primary : Colors.borderLight,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                ...(filled || active ? {
                  shadowColor: Colors.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 16,
                } : {})
              }}
            >
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: "700",
                  color: Colors.textLightPrimary,
                }}
              >
                {filled ? "•" : ""}
              </Text>
            </View>
          );
        })}
      </Pressable>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => {
          const digits = t.replace(/\D/g, "").slice(0, 6);
          onChangeText(digits);
          if (digits.length === 6) onComplete(digits);
        }}
        keyboardType="number-pad"
        maxLength={6}
        editable={!isLoading}
        textContentType="oneTimeCode"
        caretHidden
        style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
      />

      <TouchableOpacity
        onPress={onSubmit}
        disabled={!complete || isLoading}
        style={{
          backgroundColor: "#111111",
          borderRadius: 24,
          height: 56,
          justifyContent: "center",
          alignItems: "center",
          opacity: !complete || isLoading ? 0.4 : 1,
        }}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <Text
            style={[
              Typography.labelLarge,
              { color: Colors.white, fontWeight: "700", fontSize: 16 },
            ]}
          >
            {submitLabel}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function PinEntryScreen() {
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

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
      setPin("");
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

  return (
    <View style={{ flex: 1, backgroundColor: Colors.base }}>
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
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg }}>
              <View style={{ width: 40 }} />
              <View style={{ flex: 1 }} />
              <View style={{ width: 40 }} />
            </View>

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
                  width,
                  height: 380,
                  opacity: 0.65,
                  resizeMode: "cover",
                }}
              />
            </View>
          </Animated.View>

          {/* Bottom Card */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(250).springify()}
            style={{
              backgroundColor: Colors.surfaceLight,
              borderWidth: 0.5,
              borderColor: Colors.borderLight,
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              paddingTop: Spacing.xl,
              paddingHorizontal: Spacing.xl,
              paddingBottom: Spacing.xxl,
              shadowColor: "#000", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.05, shadowRadius: 24, elevation: 8,
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

            <View style={{ flex: 1 }}>
              <PinRow
                value={pin}
                onChangeText={setPin}
                onComplete={verifyCode}
                label="Enter your PIN 🔒"
                sublabel={accountLabel ? `Signing in as ${accountLabel}` : "Confirm your identity"}
                onSubmit={() => verifyCode(pin)}
                submitLabel="Unlock"
                isLoading={isLoading}
                autoFocus
              />

              <Pressable
                onPress={handleLogout}
                style={{ alignSelf: "center", marginTop: Spacing.xl, padding: Spacing.sm }}
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
