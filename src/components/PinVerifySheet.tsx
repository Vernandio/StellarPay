import React, { useState, useCallback, useImperativeHandle, forwardRef, useRef } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue, useAnimatedStyle, withSequence, withTiming, FadeIn,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Colors } from "../constants/colors";
import { Spacing } from "../constants/spacing";
import { Typography } from "../constants/typography";
import { useAuthStore } from "../store/authStore";
import { auth } from "../services/firebase/config";
import { API_BASE } from "../services/api/client";

interface PinVerifySheetProps {
  onSuccess: () => void;
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

    const verifyPin = async (fullPin: string) => {
      setIsVerifying(true);
      setError("");
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch(`${API_BASE}/api/pin/verify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ pin: fullPin }),
        });

        const data = await res.json();

        if (res.ok && data.valid) {
          setVerified(true);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setTimeout(() => {
            sheetRef.current?.dismiss();
            onSuccess();
          }, 600);
        } else {
          setPin("");
          setError(data.error || "Incorrect PIN");
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          shakeX.value = withSequence(
            withTiming(-12, { duration: 50 }),
            withTiming(12, { duration: 50 }),
            withTiming(-12, { duration: 50 }),
            withTiming(12, { duration: 50 }),
            withTiming(0, { duration: 50 })
          );
        }
      } catch (err) {
        setPin("");
        setError("Network error. Try again.");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setIsVerifying(false);
      }
    };

    const handleKeyPress = (key: string) => {
      if (isVerifying || verified) return;

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

          {/* Error */}
          {error ? (
            <Text style={[Typography.bodySmall, { color: Colors.danger, textAlign: "center", marginBottom: Spacing.md }]}>
              {error}
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
