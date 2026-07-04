import { useState, useRef } from "react";
import {
  View, Text, Pressable, TextInput, Image,
  Dimensions, KeyboardAvoidingView, Platform, ScrollView, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, { FadeInDown, FadeIn, FadeOut } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { Colors } from "../../src/constants/colors";
import { Typography } from "../../src/constants/typography";
import { Spacing } from "../../src/constants/spacing";
import { signInWithCustomToken } from "@firebase/auth";
import { auth } from "../../src/services/firebase/config";
import { resolveUser, sendForgotPinOtp, verifyForgotPinOtp } from "../../src/services/api/auth";
import { verifyPin, setupPin } from "../../src/services/api/pin";
import { getUserProfile } from "../../src/services/firebase/firestore";
import { apiClient } from "../../src/services/api/client";

const { width } = Dimensions.get("window");

// ── Step IDs ────────────────────────────────────────────────────────────
type Step = "identifier" | "pin" | "forgot_send" | "forgot_verify" | "forgot_newpin";

export default function LoginScreen() {
  // ── Shared state ──────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("identifier");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Identifier step ───────────────────────────────────────────────────
  const [identifier, setIdentifier] = useState("");
  const [resolvedEmail, setResolvedEmail] = useState("");

  // ── PIN step ──────────────────────────────────────────────────────────
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const pinRefs = Array.from({ length: 6 }, () => useRef<TextInput>(null));

  // ── Forgot PIN ────────────────────────────────────────────────────────
  const [forgotOtp, setForgotOtp] = useState("");
  const [newPin, setNewPin] = useState(["", "", "", "", "", ""]);
  const newPinRefs = Array.from({ length: 6 }, () => useRef<TextInput>(null));

  // ─────────────────────────────────────────────────────────────────────
  // Step 1: Resolve identifier → email
  // ─────────────────────────────────────────────────────────────────────
  const handleResolve = async () => {
    if (!identifier.trim()) { setError("Please enter your email, phone, or username"); return; }
    setIsLoading(true);
    setError(null);
    try {
      const result = await resolveUser(identifier.trim());
      setResolvedEmail(result.email ?? "");
      setStep("pin");
      setTimeout(() => pinRefs[0].current?.focus(), 400);
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.message || "Account not found. Please check your input.");
    } finally {
      setIsLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // Step 2: Verify PIN
  // ─────────────────────────────────────────────────────────────────────
  const handlePinChange = async (text: string, index: number) => {
    let arr = [...pin];
    if (text.length > 1) {
      const pasted = text.replace(/\D/g, "").slice(0, 6).split("");
      pasted.forEach((c, i) => { if (index + i < 6) arr[index + i] = c; });
      setPin(arr);
      pinRefs[Math.min(index + pasted.length, 5)].current?.focus();
    } else {
      arr[index] = text;
      setPin(arr);
      if (text && index < 5) pinRefs[index + 1].current?.focus();
    }
    if (arr.join("").length === 6) await verifyPinCode(arr.join(""));
  };

  const handlePinKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !pin[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  };

  const verifyPinCode = async (code: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Sign in the Firebase user by their resolved email via OTP (no password needed)
      // In this flow, the backend already issued a customToken during OTP verification.
      // Here we just call verifyPin which requires an authenticated session.
      // If no session, sign in via the backend resolve endpoint with a temp token.
      if (!auth.currentUser) {
        const { customToken } = await apiClient.post<{ customToken: string }>(
          "/api/auth/resolve-user-token",
          { email: resolvedEmail }
        );
        await signInWithCustomToken(auth, customToken);
      }

      const valid = await verifyPin(code);
      if (!valid) throw new Error("Incorrect PIN. Please try again.");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.message || "Incorrect PIN. Please try again.");
      setPin(["", "", "", "", "", ""]);
      pinRefs[0].current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // Forgot PIN: Send OTP
  // ─────────────────────────────────────────────────────────────────────
  const handleForgotSend = async () => {
    if (!resolvedEmail) { setError("Could not determine account email"); return; }
    setIsLoading(true);
    setError(null);
    try {
      await sendForgotPinOtp(resolvedEmail);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("forgot_verify");
    } catch (err: any) {
      setError(err.message || "Failed to send reset code");
    } finally {
      setIsLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // Forgot PIN: Verify OTP
  // ─────────────────────────────────────────────────────────────────────
  const handleForgotVerify = async () => {
    if (forgotOtp.trim().length < 8) { setError("Please enter the full 8-character reset code"); return; }
    setIsLoading(true);
    setError(null);
    try {
      const { customToken } = await verifyForgotPinOtp(resolvedEmail, forgotOtp.trim());
      await signInWithCustomToken(auth, customToken);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("forgot_newpin");
      setTimeout(() => newPinRefs[0].current?.focus(), 400);
    } catch (err: any) {
      setError(err.message || "Invalid reset code");
    } finally {
      setIsLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // Forgot PIN: Set new PIN
  // ─────────────────────────────────────────────────────────────────────
  const handleNewPinChange = async (text: string, index: number) => {
    let arr = [...newPin];
    if (text.length > 1) {
      const pasted = text.replace(/\D/g, "").slice(0, 6).split("");
      pasted.forEach((c, i) => { if (index + i < 6) arr[index + i] = c; });
      setNewPin(arr);
      newPinRefs[Math.min(index + pasted.length, 5)].current?.focus();
    } else {
      arr[index] = text;
      setNewPin(arr);
      if (text && index < 5) newPinRefs[index + 1].current?.focus();
    }
    if (arr.join("").length === 6) await handleSetNewPin(arr.join(""));
  };

  const handleNewPinKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !newPin[index] && index > 0) {
      newPinRefs[index - 1].current?.focus();
    }
  };

  const handleSetNewPin = async (code: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await setupPin(code);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err.message || "Failed to set new PIN");
      setNewPin(["", "", "", "", "", ""]);
      newPinRefs[0].current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // Shared sub-components
  // ─────────────────────────────────────────────────────────────────────
  const PinRow = ({
    values, refs, onChange, onKeyPress, label, sublabel,
  }: {
    values: string[]; refs: any[]; onChange: (t: string, i: number) => void;
    onKeyPress: (e: any, i: number) => void; label: string; sublabel: string;
  }) => (
    <Animated.View entering={FadeIn.duration(250)}>
      <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, marginBottom: Spacing.xs }]}>{label}</Text>
      <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginBottom: Spacing.xl }]}>{sublabel}</Text>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.xl }}>
        {values.map((digit, i) => (
          <TextInput
            key={i}
            ref={refs[i]}
            value={digit}
            onChangeText={(t) => onChange(t, i)}
            onKeyPress={(e) => onKeyPress(e, i)}
            keyboardType="number-pad"
            maxLength={6}
            secureTextEntry
            editable={!isLoading}
            style={{
              fontSize: 28, fontWeight: "700",
              width: 50, height: 60,
              backgroundColor: Colors.baseLight,
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
        <Text style={[Typography.bodySmall, { color: Colors.textLightMuted, textAlign: "center" }]}>Verifying…</Text>
      )}
    </Animated.View>
  );

  // ─────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, justifyContent: "space-between" }}
        >
          {/* Globe hero */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)} style={{ flex: 0.65, position: "relative" }}>
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl }}>
              <Pressable
                onPress={() => {
                  if (step === "pin") { setStep("identifier"); setPin(["","","","","",""]); setError(null); }
                  else if (step === "forgot_send") { setStep("pin"); setError(null); }
                  else if (step === "forgot_verify") { setStep("forgot_send"); setError(null); }
                  else if (step === "forgot_newpin") { setStep("forgot_verify"); setError(null); }
                  else router.canGoBack() ? router.back() : router.replace("/(auth)/landing");
                }}
                style={{ padding: Spacing.xs, marginRight: Spacing.md }}
              >
                <Feather name="arrow-left" size={24} color={Colors.white} />
              </Pressable>
              <Text style={{ fontSize: 20, fontWeight: "700", color: Colors.white }}>Sign In</Text>
            </View>

            <View style={{ position: "absolute", bottom: -60, left: 0, right: 0, alignItems: "center", zIndex: -1, overflow: "hidden" }}>
              <Image
                source={require("../../assets/images/globe.png")}
                style={{ width, height: 380, opacity: 0.65, resizeMode: "cover" }}
              />
            </View>
          </Animated.View>

          {/* Bottom card */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(250).springify()}
            style={{
              backgroundColor: Colors.white,
              borderTopLeftRadius: 32, borderTopRightRadius: 32,
              paddingTop: Spacing.lg, paddingHorizontal: Spacing.xl,
              paddingBottom: Spacing.xxl,
              shadowColor: "#000", shadowOffset: { width: 0, height: -12 },
              shadowOpacity: 0.04, shadowRadius: 24, elevation: 8,
              flex: 1,
            }}
          >
            <View style={{ width: 40, height: 4, backgroundColor: Colors.borderLightStrong, borderRadius: 2, alignSelf: "center", marginBottom: Spacing.lg }} />

            {error && (
              <Animated.View entering={FadeInDown.duration(200)}>
                <Text style={[Typography.bodySmall, { color: Colors.danger, marginBottom: Spacing.md, textAlign: "center" }]}>{error}</Text>
              </Animated.View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>

              {/* ── STEP: identifier ── */}
              {step === "identifier" && (
                <Animated.View entering={FadeIn.duration(250)}>
                  <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, marginBottom: Spacing.xs }]}>
                    Welcome back 👋
                  </Text>
                  <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginBottom: Spacing.xl }]}>
                    Enter your email, phone number, or username
                  </Text>

                  <TextInput
                    value={identifier}
                    onChangeText={setIdentifier}
                    placeholder="Email, phone, or username"
                    placeholderTextColor={Colors.textLightMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="go"
                    onSubmitEditing={handleResolve}
                    style={{
                      fontFamily: "Inter-Regular",
                      fontSize: 16,
                      backgroundColor: Colors.baseLight,
                      borderWidth: 1.5,
                      borderColor: Colors.borderLight,
                      borderRadius: 16,
                      height: 58,
                      paddingHorizontal: Spacing.md,
                      color: Colors.textLightPrimary,
                      marginBottom: Spacing.lg,
                    }}
                  />

                  <Pressable
                    onPress={handleResolve}
                    onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                    disabled={isLoading}
                    style={({ pressed }) => ({
                      height: 58, borderRadius: 18,
                      justifyContent: "center", alignItems: "center",
                      backgroundColor: "#000",
                      opacity: isLoading || pressed ? 0.7 : 1,
                      flexDirection: "row", gap: 10,
                    })}
                  >
                    {isLoading
                      ? <Text style={[Typography.labelLarge, { color: Colors.white }]}>Looking up…</Text>
                      : <>
                          <Text style={[Typography.labelLarge, { color: Colors.white, fontSize: 16 }]}>Continue</Text>
                          <Feather name="arrow-right" size={18} color="#FFF" />
                        </>
                    }
                  </Pressable>
                </Animated.View>
              )}

              {/* ── STEP: pin ── */}
              {step === "pin" && (
                <PinRow
                  values={pin} refs={pinRefs}
                  onChange={handlePinChange} onKeyPress={handlePinKeyPress}
                  label="Enter your PIN 🔒"
                  sublabel={`Signing in as ${resolvedEmail}`}
                />
              )}
              {step === "pin" && (
                <Animated.View entering={FadeIn.duration(300)}>
                  <Pressable
                    onPress={() => { setError(null); setStep("forgot_send"); }}
                    style={{ alignSelf: "center", paddingVertical: Spacing.sm }}
                  >
                    <Text style={[Typography.bodyMedium, { color: Colors.primary, fontWeight: "600" }]}>
                      Forgot PIN?
                    </Text>
                  </Pressable>
                </Animated.View>
              )}

              {/* ── STEP: forgot_send ── */}
              {step === "forgot_send" && (
                <Animated.View entering={FadeIn.duration(250)}>
                  <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, marginBottom: Spacing.xs }]}>
                    Forgot PIN 🔑
                  </Text>
                  <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginBottom: Spacing.xl }]}>
                    We'll send an 8-character reset code to{"\n"}
                    <Text style={{ color: Colors.textLightPrimary, fontWeight: "600" }}>{resolvedEmail}</Text>
                  </Text>

                  <Pressable
                    onPress={handleForgotSend}
                    disabled={isLoading}
                    style={({ pressed }) => ({
                      height: 58, borderRadius: 18,
                      justifyContent: "center", alignItems: "center",
                      backgroundColor: "#000",
                      opacity: isLoading || pressed ? 0.7 : 1,
                      flexDirection: "row", gap: 10,
                    })}
                  >
                    {isLoading
                      ? <Text style={[Typography.labelLarge, { color: Colors.white }]}>Sending…</Text>
                      : <>
                          <Feather name="mail" size={18} color="#FFF" />
                          <Text style={[Typography.labelLarge, { color: Colors.white, fontSize: 16 }]}>Send Reset Code</Text>
                        </>
                    }
                  </Pressable>
                </Animated.View>
              )}

              {/* ── STEP: forgot_verify ── */}
              {step === "forgot_verify" && (
                <Animated.View entering={FadeIn.duration(250)}>
                  <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, marginBottom: Spacing.xs }]}>
                    Check your email 📬
                  </Text>
                  <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginBottom: Spacing.xl }]}>
                    Enter the 8-character code we sent to your email. It expires in 10 minutes.
                  </Text>

                  <TextInput
                    value={forgotOtp}
                    onChangeText={(t) => setForgotOtp(t.toUpperCase())}
                    placeholder="e.g. AK3MPBNQ"
                    placeholderTextColor={Colors.textLightMuted}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={8}
                    returnKeyType="go"
                    onSubmitEditing={handleForgotVerify}
                    style={{
                      fontFamily: "Inter-Regular",
                      fontSize: 22,
                      letterSpacing: 6,
                      backgroundColor: Colors.baseLight,
                      borderWidth: 1.5,
                      borderColor: forgotOtp.length > 0 ? Colors.primary : Colors.borderLight,
                      borderRadius: 16,
                      height: 64,
                      paddingHorizontal: Spacing.md,
                      color: Colors.textLightPrimary,
                      textAlign: "center",
                      marginBottom: Spacing.lg,
                    }}
                  />

                  <Pressable
                    onPress={handleForgotVerify}
                    disabled={isLoading}
                    style={({ pressed }) => ({
                      height: 58, borderRadius: 18,
                      justifyContent: "center", alignItems: "center",
                      backgroundColor: "#000",
                      opacity: isLoading || pressed ? 0.7 : 1,
                    })}
                  >
                    <Text style={[Typography.labelLarge, { color: Colors.white, fontSize: 16 }]}>
                      {isLoading ? "Verifying…" : "Verify Code"}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleForgotSend}
                    disabled={isLoading}
                    style={{ alignSelf: "center", paddingVertical: Spacing.md }}
                  >
                    <Text style={[Typography.bodyMedium, { color: Colors.primary, fontWeight: "600" }]}>Resend code</Text>
                  </Pressable>
                </Animated.View>
              )}

              {/* ── STEP: forgot_newpin ── */}
              {step === "forgot_newpin" && (
                <PinRow
                  values={newPin} refs={newPinRefs}
                  onChange={handleNewPinChange} onKeyPress={handleNewPinKeyPress}
                  label="Set a new PIN ✨"
                  sublabel="Choose a new 6-digit security PIN for your account"
                />
              )}

            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <View style={{ backgroundColor: Colors.white, height: 40, position: "absolute", bottom: 0, left: 0, right: 0, zIndex: -1 }} />
    </View>
  );
}
