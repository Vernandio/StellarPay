import React, { useRef, useState } from "react";
import { View, Text, Pressable, TextInput, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn } from "react-native-reanimated";
import { Colors } from "../src/constants/colors";
import { Typography } from "../src/constants/typography";
import { Spacing } from "../src/constants/spacing";
import { changePin, verifyPin } from "../src/services/api/pin";

type Stage = "current" | "new" | "confirm";

const emptyPin = () => ["", "", "", "", "", ""];

export default function SecurityScreen() {
  const [stage, setStage] = useState<Stage>("current");
  const [currentPin, setCurrentPin] = useState(emptyPin());
  const [newPin, setNewPin] = useState(emptyPin());
  const [confirmPin, setConfirmPin] = useState(emptyPin());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentRefs = [
    useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null),
    useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null),
  ];
  const newRefs = [
    useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null),
    useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null),
  ];
  const confirmRefs = [
    useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null),
    useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null),
  ];

  const makeHandlers = (
    values: string[],
    setValues: (v: string[]) => void,
    refs: React.RefObject<TextInput | null>[]
  ) => {
    const onChange = (text: string, index: number) => {
      const arr = [...values];
      if (text.length > 1) {
        const pasted = text.replace(/[^0-9]/g, "").slice(0, 6).split("");
        pasted.forEach((c, i) => { if (index + i < 6) arr[index + i] = c; });
        setValues(arr);
        setTimeout(() => refs[Math.min(index + pasted.length, 5)].current?.focus(), 0);
        return arr;
      }
      arr[index] = text;
      setValues(arr);
      if (text && index < 5) setTimeout(() => refs[index + 1].current?.focus(), 0);
      return arr;
    };

    const onKeyPress = (e: any, index: number) => {
      if (e.nativeEvent.key === "Backspace" && !values[index] && index > 0) {
        const arr = [...values];
        arr[index - 1] = "";
        setValues(arr);
        setTimeout(() => refs[index - 1].current?.focus(), 0);
      }
    };

    return { onChange, onKeyPress };
  };

  const currentHandlers = makeHandlers(currentPin, setCurrentPin, currentRefs);
  const newHandlers = makeHandlers(newPin, setNewPin, newRefs);
  const confirmHandlers = makeHandlers(confirmPin, setConfirmPin, confirmRefs);

  const handleCurrentChange = async (text: string, index: number) => {
    const arr = currentHandlers.onChange(text, index);
    const pinStr = arr.join("");
    if (pinStr.length === 6) {
      setIsLoading(true);
      setError(null);
      try {
        const result = await verifyPin(pinStr);
        if (result.ok) {
          setStage("new");
          setTimeout(() => newRefs[0].current?.focus(), 300);
        } else {
          setError(
            result.reason === "locked"
              ? result.error
              : result.reason === "incorrect"
              ? "Incorrect current PIN"
              : result.error
          );
          setCurrentPin(emptyPin());
          currentRefs[0].current?.focus();
        }
      } catch (err: any) {
        setError(err.message || "Incorrect PIN code. Please try again.");
        setCurrentPin(emptyPin());
        currentRefs[0].current?.focus();
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleNewChange = (text: string, index: number) => {
    const arr = newHandlers.onChange(text, index);
    if (arr.join("").length === 6) {
      if (arr.join("") === currentPin.join("")) {
        setError("New PIN must be different from your current PIN");
        setNewPin(emptyPin());
        newRefs[0].current?.focus();
        return;
      }
      setError(null);
      setStage("confirm");
      setTimeout(() => confirmRefs[0].current?.focus(), 300);
    }
  };

  const handleConfirmChange = (text: string, index: number) => {
    const arr = confirmHandlers.onChange(text, index);
    if (arr.join("").length === 6) {
      submitChange(arr.join(""));
    }
  };

  const submitChange = async (confirmed: string) => {
    if (confirmed !== newPin.join("")) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError("PINs don't match. Please try again.");
      setConfirmPin(emptyPin());
      confirmRefs[0].current?.focus();
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await changePin(currentPin.join(""), newPin.join(""));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.message || "Failed to change PIN. Please try again.");
      setStage("current");
      setCurrentPin(emptyPin());
      setNewPin(emptyPin());
      setConfirmPin(emptyPin());
      setTimeout(() => currentRefs[0].current?.focus(), 300);
    } finally {
      setIsLoading(false);
    }
  };

  const stageConfig: Record<Stage, {
    title: string; sublabel: string; values: string[];
    refs: React.RefObject<TextInput | null>[];
    onChange: (t: string, i: number) => void;
    onKeyPress: (e: any, i: number) => void;
  }> = {
    current: {
      title: "Enter current PIN",
      sublabel: "Confirm your existing 6-digit PIN to continue",
      values: currentPin, refs: currentRefs,
      onChange: handleCurrentChange, onKeyPress: currentHandlers.onKeyPress,
    },
    new: {
      title: "Choose a new PIN",
      sublabel: "Pick a new 6-digit PIN for your account",
      values: newPin, refs: newRefs,
      onChange: handleNewChange, onKeyPress: newHandlers.onKeyPress,
    },
    confirm: {
      title: "Confirm new PIN",
      sublabel: "Enter your new PIN once more to confirm",
      values: confirmPin, refs: confirmRefs,
      onChange: handleConfirmChange, onKeyPress: confirmHandlers.onKeyPress,
    },
  };

  const active = stageConfig[stage];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.baseLight }} edges={["top", "bottom"]}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: Spacing.lg,
          height: 56,
          backgroundColor: Colors.baseLight,
          borderBottomWidth: 1,
          borderBottomColor: Colors.borderLight,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{ width: 40, height: 40, justifyContent: "center", alignItems: "flex-start" }}
        >
          <Feather name="arrow-left" size={22} color={Colors.textLightPrimary} />
        </Pressable>
        <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary }]}>Change PIN</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ flex: 1, padding: Spacing.lg, justifyContent: "center" }}>
        <Animated.View key={stage} entering={FadeIn.duration(200)}>
          <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, marginBottom: Spacing.xs }]}>
            {active.title}
          </Text>
          <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginBottom: Spacing.xl }]}>
            {active.sublabel}
          </Text>

          {error && (
            <Text style={[Typography.bodySmall, { color: Colors.danger, marginBottom: Spacing.md, textAlign: "center" }]}>
              {error}
            </Text>
          )}

          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.xl }}>
            {active.values.map((digit, i) => (
              <TextInput
                key={i}
                ref={active.refs[i]}
                value={digit}
                onChangeText={(t) => active.onChange(t, i)}
                onKeyPress={(e) => active.onKeyPress(e, i)}
                keyboardType="number-pad"
                maxLength={1}
                secureTextEntry
                editable={!isLoading}
                style={{
                  fontSize: 28, fontWeight: "700",
                  width: 50, height: 60,
                  backgroundColor: Colors.white,
                  borderWidth: 1.5,
                  borderColor: digit ? Colors.primary : Colors.borderLight,
                  borderRadius: 14,
                  textAlign: "center",
                  color: Colors.textLightPrimary,
                }}
              />
            ))}
          </View>

          {isLoading && (
            <View style={{ alignItems: "center" }}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          )}
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
