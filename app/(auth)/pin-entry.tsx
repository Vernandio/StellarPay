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
  Keyboard,
  ScrollView,
  Alert,
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
import { webFormColumn } from "../../src/constants/layout";
import { verifyPin } from "../../src/services/api/pin";
import { signOut } from "../../src/services/firebase/auth";
import { auth } from "../../src/services/firebase/config";
import { getUserProfile, UserProfile } from "../../src/services/firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const { width } = Dimensions.get("window");

// Formats a remaining-seconds count as "m:ss" (or "Ns" under a minute).
function formatCountdown(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

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
        onPress={() => {
          inputRef.current?.focus();
        }}
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
        style={{
          position: "absolute",
          opacity: 0.01,
          left: -9999,
          width: 100,
          height: 50,
        }}
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
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  // Server-driven lockout: when set, PIN entry is disabled until this time.
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockRemaining, setLockRemaining] = useState(0);

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

  const handleBiometricAuth = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) return;

      // Scoped per account — see profile.tsx biometric setup
      const savedPin = await SecureStore.getItemAsync(`saved_pin_${uid}`);
      if (!savedPin) return;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to access StellarPay",
        fallbackLabel: "Use PIN",
        disableDeviceFallback: true,
      });

      if (result.success) {
        await verifyCode(savedPin);
      }
    } catch (err) {
      console.warn("Biometric login failed:", err);
    }
  };

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    AsyncStorage.getItem(`biometrics_enabled_${uid}`).then((val) => {
      if (val === "true") {
        setBiometricsEnabled(true);
        // Wait briefly for UI transitions to settle before showing native prompt
        setTimeout(() => {
          handleBiometricAuth();
        }, 500);
      }
    });
  }, []);

  // Tick the lockout countdown once per second; clear the lock when it expires.
  useEffect(() => {
    if (lockedUntil === null) {
      setLockRemaining(0);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
      setLockRemaining(remaining);
      if (remaining === 0) {
        setLockedUntil(null);
        setError(null);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const verifyCode = async (enteredPin: string) => {
    // Locked out — don't even attempt (also blocks a queued biometric/onComplete).
    if (lockedUntil !== null && lockedUntil > Date.now()) return;
    setIsLoading(true);
    setError(null);
    try {
      // Attempt-counting and lockout are enforced server-side; the client just
      // reflects the verdict. See verifyPin in src/services/api/pin.ts.
      const result = await verifyPin(enteredPin);

      if (result.ok) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/(tabs)");
        return;
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setPin("");

      if (result.reason === "locked") {
        setLockedUntil(new Date(result.lockedUntil).getTime());
        setError(result.error);
      } else if (result.reason === "incorrect") {
        setError(
          result.remaining > 0
            ? `Incorrect PIN code. ${result.remaining} attempt${
                result.remaining === 1 ? "" : "s"
              } remaining.`
            : result.error
        );
      } else {
        setError(result.error);
      }
    } catch (err: any) {
      // Only genuine transport/unexpected failures reach here.
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setPin("");
      setError(err.message || "Incorrect PIN code. Please try again.");
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
  const locked = lockedUntil !== null && lockRemaining > 0;

  return (
    <Pressable onPress={() => Keyboard.dismiss()} style={{ flex: 1, backgroundColor: Colors.base }}>
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
            {(error || locked) && (
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
                  {locked
                    ? `Too many incorrect attempts. Try again in ${formatCountdown(
                        lockRemaining
                      )}.`
                    : error}
                </Text>
              </Animated.View>
            )}

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={webFormColumn} contentContainerStyle={{ flexGrow: 1 }}>
              <PinRow
                value={pin}
                onChangeText={setPin}
                onComplete={verifyCode}
                label="Enter your PIN 🔒"
                sublabel={accountLabel ? `Signing in as ${accountLabel}` : "Confirm your identity"}
                onSubmit={() => verifyCode(pin)}
                submitLabel="Unlock"
                isLoading={isLoading || locked}
                autoFocus
              />

              {biometricsEnabled && (
                <TouchableOpacity
                  onPress={handleBiometricAuth}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    alignSelf: "center",
                    backgroundColor: Colors.baseLight,
                    borderRadius: 16,
                    paddingVertical: 12,
                    paddingHorizontal: Spacing.lg,
                    marginTop: Spacing.lg,
                    borderWidth: 1,
                    borderColor: Colors.borderLightStrong,
                    minHeight: 44,
                  }}
                >
                  <Feather name="cpu" size={18} color={Colors.textLightPrimary} style={{ marginRight: 8 }} />
                  <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "600" }]}>Unlock with Biometrics</Text>
                </TouchableOpacity>
              )}

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
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Pressable>
  );
}
