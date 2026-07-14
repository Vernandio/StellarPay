import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeIn, FadeOut } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { Colors } from "../../src/constants/colors";
import { Typography } from "../../src/constants/typography";
import { Spacing } from "../../src/constants/spacing";
import { webFormColumn } from "../../src/constants/layout";
import { signInWithCustomToken } from "@firebase/auth";
import { auth } from "../../src/services/firebase/config";
import {
  resolveUser,
  sendForgotPinOtp,
  verifyForgotPinOtp,
} from "../../src/services/api/auth";
import { verifyPin, setupPin } from "../../src/services/api/pin";
import { getUserProfile } from "../../src/services/firebase/firestore";
import { apiClient } from "../../src/services/api/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  GoogleSignInButton,
  OrDivider,
} from "../../src/components/GoogleSignInButton";

const { width } = Dimensions.get("window");

// ── Step IDs ────────────────────────────────────────────────────────────
type Step =
  | "identifier"
  | "pin"
  | "forgot_send"
  | "forgot_verify"
  | "forgot_newpin";

// ── Shared 6-digit PIN input ──────────────────────────────────────────────
// A SINGLE hidden TextInput drives all six boxes. The old version used six
// separate inputs and hopped focus after each digit, which made the keyboard
// dismiss + re-present on every keystroke (visible flicker). With one input
// that never loses focus, the keyboard stays put, and paste/backspace work for
// free. Defined at module scope so it isn't re-created on every LoginScreen
// render (which would remount the input and drop the keyboard).
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
    // Focus after the step's fade-in so the keyboard doesn't fight the animation.
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
          inputRef.current?.blur();
          setTimeout(() => inputRef.current?.focus(), 50);
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

      {/* The real, invisible input. Tapping any box focuses it. */}
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

export default function LoginScreen() {
  // ── Shared state ──────────────────────────────────────────────────────
  const params = useLocalSearchParams<{ step?: Step }>();
  const [step, setStep] = useState<Step>((params.step as Step) || "identifier");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Identifier step ───────────────────────────────────────────────────
  const [identifier, setIdentifier] = useState("");
  const [resolvedEmail, setResolvedEmail] = useState("");
  const [resolvedUid, setResolvedUid] = useState("");

  // ── PIN step ──────────────────────────────────────────────────────────
  const [pin, setPin] = useState("");

  // ── Forgot PIN ────────────────────────────────────────────────────────
  const [forgotOtp, setForgotOtp] = useState("");
  const [newPin, setNewPin] = useState("");

  // ─────────────────────────────────────────────────────────────────────
  // Step 1: Resolve identifier → email
  // ─────────────────────────────────────────────────────────────────────
  const handleResolve = async () => {
    if (!identifier.trim()) {
      setError("Please enter your email, username, or phone number");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await resolveUser(identifier.trim());
      setResolvedEmail(result.email ?? "");
      setResolvedUid(result.uid ?? "");

      const { getUserProfile } = require("../../src/services/firebase/firestore");
      const profile = await getUserProfile(result.uid);
      if (profile && profile.hasPin === false) {
        setStep("forgot_send");
      } else {
        setStep("pin");
      }
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
  const handleBiometricAuth = async () => {
    try {
      if (!resolvedUid) return;
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) return;

      // Per-account key: only the PIN saved for THIS resolved account can be
      // unlocked biometrically — never another account's PIN on this device.
      const savedPin = await SecureStore.getItemAsync(`saved_pin_${resolvedUid}`);
      if (!savedPin) return;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to unlock StellarPay",
        fallbackLabel: "Use PIN",
        disableDeviceFallback: true,
      });

      if (result.success) {
        verifyPinCode(savedPin);
      }
    } catch (err) {
      console.warn("Biometric login failed:", err);
    }
  };

  useEffect(() => {
    if (step === "pin" && resolvedUid) {
      AsyncStorage.getItem(`biometrics_enabled_${resolvedUid}`).then((val) => {
        if (val === "true") {
          setTimeout(() => {
            handleBiometricAuth();
          }, 500);
        }
      });
    }
  }, [step, resolvedUid]);

  const verifyPinCode = async (code: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Ensure we are signed in as the correct resolved user.
      // If there's an active session for a different email, sign it out first.
      if (
        !auth.currentUser || 
        auth.currentUser.email?.toLowerCase() !== resolvedEmail.toLowerCase()
      ) {
        if (auth.currentUser) {
          await auth.signOut();
        }
        const { customToken } = await apiClient.post<{ customToken: string }>(
          "/api/auth/resolve-user-token",
          { email: resolvedEmail }
        );
        await signInWithCustomToken(auth, customToken);
      }

      const valid = await verifyPin(code);
      if (!valid) throw new Error("Incorrect PIN. Please try again.");
      
      // Clear failed PIN attempts on successful login
      await AsyncStorage.removeItem("failed_pin_attempts");
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.message || "Incorrect PIN. Please try again.");
      setPin("");
    } finally {
      setIsLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // Forgot PIN: Send OTP
  // ─────────────────────────────────────────────────────────────────────
  const handleForgotSend = async () => {
    if (!resolvedEmail) {
      setError("Could not determine account email");
      return;
    }
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
    if (forgotOtp.trim().length < 8) {
      setError("Please enter the full 8-character reset code");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { customToken } = await verifyForgotPinOtp(
        resolvedEmail,
        forgotOtp.trim()
      );
      await signInWithCustomToken(auth, customToken);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("forgot_newpin");
    } catch (err: any) {
      setError(err.message || "Invalid reset code");
    } finally {
      setIsLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // Forgot PIN: Set new PIN
  // ─────────────────────────────────────────────────────────────────────
  const handleSetNewPin = async (code: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await setupPin(code);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err.message || "Failed to set new PIN");
      setNewPin("");
    } finally {
      setIsLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: Colors.baseLight }}>
      <LinearGradient
        colors={["#000000", "#111111", Colors.baseLight]}
        locations={[0, 0.6, 1]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 380 }}
      />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          // Android's window already resizes for the keyboard (adjustResize).
          // Adding behavior="height" here double-compensates and shoved the CTA
          // off-screen, so let Android handle it natively and only pad on iOS.
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, justifyContent: "space-between" }}
        >
          {/* Globe hero */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(100)}
            style={{ flex: 0.65, position: "relative" }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: Spacing.xl,
                paddingTop: Spacing.xl,
              }}
            >
              <Pressable
                onPress={() => {
                  if (step === "pin") {
                    setStep("identifier");
                    setPin("");
                    setError(null);
                  } else if (step === "forgot_send") {
                    setStep("pin");
                    setError(null);
                  } else if (step === "forgot_verify") {
                    setStep("forgot_send");
                    setError(null);
                  } else if (step === "forgot_newpin") {
                    setStep("forgot_verify");
                    setError(null);
                  } else
                    router.canGoBack()
                      ? router.back()
                      : router.replace("/(auth)/landing");
                }}
                style={{ padding: Spacing.xs, marginRight: Spacing.md }}
              >
                <Feather name="arrow-left" size={24} color={Colors.white} />
              </Pressable>
              <Text
                style={{ fontSize: 20, fontWeight: "700", color: Colors.white }}
              >
                Sign In
              </Text>
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

          {/* Bottom card */}
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

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ flexGrow: 1, paddingBottom: Spacing.xl }}
              style={[{ flex: 1 }, webFormColumn]}
            >
              {/* ── STEP: identifier ── */}
              {step === "identifier" && (
                <Animated.View entering={FadeIn.duration(250)}>
                  <Text
                    style={[
                      Typography.headingLarge,
                      {
                        color: Colors.textLightPrimary,
                        marginBottom: Spacing.xs,
                      },
                    ]}
                  >
                    Welcome back 👋
                  </Text>
                  <Text
                    style={[
                      Typography.bodyMedium,
                      {
                        color: Colors.textLightSecondary,
                        marginBottom: Spacing.xl,
                      },
                    ]}
                  >
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
                      backgroundColor: Colors.surfaceLight,
                      borderWidth: 1,
                      borderColor: Colors.borderLight,
                      borderRadius: 12,
                      height: 56,
                      paddingHorizontal: Spacing.md,
                      color: Colors.textLightPrimary,
                      marginBottom: Spacing.lg,
                    }}
                  />

                  <TouchableOpacity
                    onPress={handleResolve}
                    onPressIn={() =>
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    }
                    disabled={isLoading}
                    style={{
                      backgroundColor: "#111111",
                      borderRadius: 24,
                      height: 56,
                      justifyContent: "center",
                      alignItems: "center",
                      flexDirection: "row",
                      gap: 10,
                      opacity: isLoading ? 0.6 : 1,
                    }}
                    activeOpacity={0.8}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={Colors.white} />
                    ) : (
                      <>
                        <Text
                          style={[
                            Typography.labelLarge,
                            { color: Colors.white, fontWeight: "700", fontSize: 16 },
                          ]}
                        >
                          Continue
                        </Text>
                        <Feather name="arrow-right" size={18} color="#FFF" />
                      </>
                    )}
                  </TouchableOpacity>

                  <OrDivider />
                  <GoogleSignInButton label="Sign in with Google" />

                  <Pressable
                    onPress={() => router.push("/(auth)/signup")}
                    style={{ alignSelf: "center", marginTop: Spacing.xl, padding: Spacing.sm }}
                  >
                    <Text
                      style={[
                        Typography.bodyMedium,
                        { color: Colors.textLightSecondary },
                      ]}
                    >
                      Don't have an account? <Text style={{ color: Colors.primary, fontWeight: "600" }}>Sign up</Text>
                    </Text>
                  </Pressable>
                </Animated.View>
              )}

              {/* ── STEP: pin ── */}
              {step === "pin" && (
                <PinRow
                  value={pin}
                  onChangeText={setPin}
                  onComplete={verifyPinCode}
                  label="Enter your PIN 🔒"
                  sublabel={`Signing in as ${resolvedEmail}`}
                  onSubmit={() => verifyPinCode(pin)}
                  submitLabel="Unlock"
                  isLoading={isLoading}
                  autoFocus
                />
              )}
              {step === "pin" && (
                <Animated.View entering={FadeIn.duration(300)}>
                  <Pressable
                    onPress={() => {
                      setError(null);
                      setStep("forgot_send");
                    }}
                    style={{ alignSelf: "center", paddingVertical: Spacing.sm }}
                  >
                    <Text
                      style={[
                        Typography.bodyMedium,
                        { color: Colors.primary, fontWeight: "600" },
                      ]}
                    >
                      Forgot PIN?
                    </Text>
                  </Pressable>
                </Animated.View>
              )}

              {/* ── STEP: forgot_send ── */}
              {step === "forgot_send" && (
                <Animated.View entering={FadeIn.duration(250)}>
                  <Text
                    style={[
                      Typography.headingLarge,
                      {
                        color: Colors.textLightPrimary,
                        marginBottom: Spacing.xs,
                      },
                    ]}
                  >
                    Forgot PIN 🔑
                  </Text>
                  <Text
                    style={[
                      Typography.bodyMedium,
                      {
                        color: Colors.textLightSecondary,
                        marginBottom: Spacing.xl,
                      },
                    ]}
                  >
                    We'll send an 8-character reset code to{"\n"}
                    <Text
                      style={{
                        color: Colors.textLightPrimary,
                        fontWeight: "600",
                      }}
                    >
                      {resolvedEmail}
                    </Text>
                  </Text>

                  <TouchableOpacity
                    onPress={handleForgotSend}
                    disabled={isLoading}
                    style={{
                      backgroundColor: "#111111",
                      borderRadius: 24,
                      height: 56,
                      justifyContent: "center",
                      alignItems: "center",
                      flexDirection: "row",
                      gap: 10,
                      opacity: isLoading ? 0.6 : 1,
                    }}
                    activeOpacity={0.8}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={Colors.white} />
                    ) : (
                      <>
                        <Feather name="mail" size={18} color="#FFF" />
                        <Text
                          style={[
                            Typography.labelLarge,
                            { color: Colors.white, fontWeight: "700", fontSize: 16 },
                          ]}
                        >
                          Send Reset Code
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              )}

              {/* ── STEP: forgot_verify ── */}
              {step === "forgot_verify" && (
                <Animated.View entering={FadeIn.duration(250)}>
                  <Text
                    style={[
                      Typography.headingLarge,
                      {
                        color: Colors.textLightPrimary,
                        marginBottom: Spacing.xs,
                      },
                    ]}
                  >
                    Check your email 📬
                  </Text>
                  <Text
                    style={[
                      Typography.bodyMedium,
                      {
                        color: Colors.textLightSecondary,
                        marginBottom: Spacing.xl,
                      },
                    ]}
                  >
                    Enter the 8-character code we sent to your email. It expires
                    in 10 minutes.
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
                      backgroundColor: Colors.surfaceLight,
                      borderWidth: 1,
                      borderColor:
                        forgotOtp.length > 0
                          ? Colors.primary
                          : Colors.borderLight,
                      borderRadius: 12,
                      height: 56,
                      paddingHorizontal: Spacing.md,
                      color: Colors.textLightPrimary,
                      textAlign: "center",
                      marginBottom: Spacing.lg,
                    }}
                  />

                  <TouchableOpacity
                    onPress={handleForgotVerify}
                    disabled={isLoading}
                    style={{
                      backgroundColor: "#111111",
                      borderRadius: 24,
                      height: 56,
                      justifyContent: "center",
                      alignItems: "center",
                      opacity: isLoading ? 0.6 : 1,
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
                        Verify Code
                      </Text>
                    )}
                  </TouchableOpacity>

                  <Pressable
                    onPress={handleForgotSend}
                    disabled={isLoading}
                    style={{ alignSelf: "center", paddingVertical: Spacing.md }}
                  >
                    <Text
                      style={[
                        Typography.bodyMedium,
                        { color: Colors.primary, fontWeight: "600" },
                      ]}
                    >
                      Resend code
                    </Text>
                  </Pressable>
                </Animated.View>
              )}

              {/* ── STEP: forgot_newpin ── */}
              {step === "forgot_newpin" && (
                <PinRow
                  value={newPin}
                  onChangeText={setNewPin}
                  onComplete={handleSetNewPin}
                  label="Set a new PIN ✨"
                  sublabel="Choose a new 6-digit security PIN for your account"
                  onSubmit={() => handleSetNewPin(newPin)}
                  submitLabel="Set PIN"
                  isLoading={isLoading}
                  autoFocus
                />
              )}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
