import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef, useRef } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert } from "react-native";
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue, useAnimatedStyle, withSequence, withTiming, FadeIn,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Colors } from "../constants/colors";
import { Spacing } from "../constants/spacing";
import { Typography } from "../constants/typography";
import { verifyPin as verifyPinApi } from "../services/api/pin";

// Formats a remaining-seconds count as "m:ss" (or "Ns" under a minute).
function formatCountdown(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

interface PinVerifySheetProps {
  onSuccess: (verifiedPin: string) => void;
  onDismiss?: () => void;
}

export interface PinVerifySheetRef {
  present: () => void;
  dismiss: () => void;
}

export const PinVerifySheet = forwardRef<PinVerifySheetRef, PinVerifySheetProps>(
  ({ onSuccess, onDismiss }, ref) => {
    const sheetRef = useRef<BottomSheetModal>(null);
    const [pin, setPin] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState("");
    const [verified, setVerified] = useState(false);
    // Server-driven lockout countdown (ms epoch), null when not locked.
    const [lockedUntil, setLockedUntil] = useState<number | null>(null);
    const [lockRemaining, setLockRemaining] = useState(0);

    const shakeX = useSharedValue(0);

    useImperativeHandle(ref, () => ({
      present: () => {
        setPin("");
        setError("");
        setVerified(false);
        sheetRef.current?.present();
      },
      dismiss: () => sheetRef.current?.dismiss(),
    }));

    const shakeStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: shakeX.value }],
    }));

    // Tick the lockout countdown; clear the lock when it expires.
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
          setError("");
        }
      };
      tick();
      const id = setInterval(tick, 1000);
      return () => clearInterval(id);
    }, [lockedUntil]);

    const locked = lockedUntil !== null && lockRemaining > 0;

    const shake = () => {
      shakeX.value = withSequence(
        withTiming(-12, { duration: 50 }),
        withTiming(12, { duration: 50 }),
        withTiming(-12, { duration: 50 }),
        withTiming(12, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    };

    const verifyPin = async (fullPin: string) => {
      // Blocked by an active lockout — ignore submissions until it expires.
      if (lockedUntil !== null && lockedUntil > Date.now()) return;
      setIsVerifying(true);
      setError("");
      try {
        // Attempt-counting and lockout are enforced server-side; we just render
        // the verdict. See verifyPin in src/services/api/pin.ts.
        const result = await verifyPinApi(fullPin);

        if (result.ok) {
          setVerified(true);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setTimeout(() => {
            sheetRef.current?.dismiss();
            onSuccess(fullPin);
          }, 600);
          return;
        }

        setPin("");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        if (result.reason === "locked") {
          setLockedUntil(new Date(result.lockedUntil).getTime());
          setError(result.error);
        } else if (result.reason === "incorrect") {
          shake();
          setError(
            result.remaining > 0
              ? `Incorrect PIN. ${result.remaining} attempt${
                  result.remaining === 1 ? "" : "s"
                } remaining.`
              : result.error
          );
        } else {
          setError(result.error);
        }
      } catch (err: any) {
        // Genuine network/transport failure.
        setPin("");
        setError(err.message || "An unexpected error occurred.");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setIsVerifying(false);
      }
    };

    const handleKeyPress = (key: string) => {
      if (isVerifying || verified || locked) return;

      if (key === "delete") {
        setPin((p) => p.slice(0, -1));
        setError("");
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
      }

      const newPin = pin + key;
      if (newPin.length <= 6) {
        setPin(newPin);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (newPin.length === 6) {
          verifyPin(newPin);
        }
      }
    };

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
      ),
      []
    );

    const KEYPAD = [
      ["1", "2", "3"],
      ["4", "5", "6"],
      ["7", "8", "9"],
      ["", "0", "delete"],
    ];

    return (
      <BottomSheetModal
        ref={sheetRef}
        enableDynamicSizing={true}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: Colors.white, borderRadius: 24 }}
        handleIndicatorStyle={{ backgroundColor: Colors.textLightMuted, width: 40 }}
        enablePanDownToClose={true}
        onDismiss={onDismiss}
      >
        <BottomSheetView style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl }}>
          {/* Title */}
          <View style={{ alignItems: "center", marginTop: Spacing.md, marginBottom: Spacing.xl }}>
            <View style={{
              width: 56, height: 56, borderRadius: 28,
              backgroundColor: verified ? Colors.teal : Colors.baseLight,
              justifyContent: "center", alignItems: "center",
              marginBottom: Spacing.md,
            }}>
              <Feather
                name={verified ? "check" : "lock"}
                size={28}
                color={verified ? Colors.white : Colors.textLightPrimary}
              />
            </View>
            <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary, fontWeight: "700" }]}>
              {verified ? "Verified!" : "Enter your PIN"}
            </Text>
            <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginTop: Spacing.xs }]}>
              {verified ? "Transaction authorized" : "Enter your 6-digit security PIN"}
            </Text>
          </View>

          {/* PIN Dots */}
          <Animated.View style={[shakeStyle, { flexDirection: "row", justifyContent: "center", marginBottom: Spacing.lg, gap: Spacing.md }]}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View
                key={i}
                style={{
                  width: 44, height: 52, borderRadius: 12,
                  backgroundColor: Colors.baseLight,
                  borderWidth: 2,
                  borderColor: i < pin.length
                    ? (error ? Colors.danger : Colors.textLightPrimary)
                    : (i === pin.length ? Colors.borderLightStrong : Colors.borderLight),
                  justifyContent: "center", alignItems: "center",
                }}
              >
                {i < pin.length && (
                  <View style={{
                    width: 14, height: 14, borderRadius: 7,
                    backgroundColor: error ? Colors.danger : Colors.textLightPrimary,
                  }} />
                )}
              </View>
            ))}
          </Animated.View>

          {/* Error / lockout countdown */}
          {error || locked ? (
            <Text style={[Typography.bodySmall, { color: Colors.danger, textAlign: "center", marginBottom: Spacing.md }]}>
              {locked
                ? `Too many attempts. Try again in ${formatCountdown(lockRemaining)}.`
                : error}
            </Text>
          ) : null}

          {/* Loading */}
          {isVerifying && (
            <View style={{ alignItems: "center", marginBottom: Spacing.md }}>
              <ActivityIndicator color={Colors.textLightPrimary} />
            </View>
          )}

          {/* Keypad */}
          <View style={{ marginBottom: Spacing.sm, paddingHorizontal: Spacing.md }}>
            {KEYPAD.map((row, rowIdx) => (
              <View key={rowIdx} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.sm }}>
                {row.map((key) => (
                  <Pressable
                    key={key || "empty"}
                    onPress={() => key && handleKeyPress(key)}
                    disabled={!key || isVerifying || verified}
                    style={{
                      flex: 1,
                      height: 68,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {({ pressed }) => (
                      <View style={{
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                        justifyContent: "center",
                        alignItems: "center",
                        backgroundColor: pressed && key ? "rgba(0,0,0,0.05)" : "transparent",
                      }}>
                        {key === "delete" ? (
                          <Feather name="delete" size={24} color={Colors.textLightPrimary} />
                        ) : (
                          <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontSize: 26, fontWeight: "600" }]}>
                            {key}
                          </Text>
                        )}
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);
