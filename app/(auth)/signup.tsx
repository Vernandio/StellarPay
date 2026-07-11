import { useState, useRef } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  Keyboard,
  Image,
  Dimensions,
  ScrollView,
  Modal,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInRight,
  FadeOutLeft,
  FadeInLeft,
  FadeOutRight,
  FadeInDown,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { RecaptchaModal } from "../../src/components/RecaptchaModal";
import { Colors } from "../../src/constants/colors";
import { Typography } from "../../src/constants/typography";
import { Spacing } from "../../src/constants/spacing";
import {
  signUp,
  sendEmailVerificationCode,
  signInWithEmailOtp,
  linkEmailToAccount,
  createPhoneUserProfile,
} from "../../src/services/firebase/auth";
import { setupPin } from "../../src/services/api/pin";
import { checkAvailability } from "../../src/services/api/auth";
import { auth, firebaseConfig } from "../../src/services/firebase/config";
import { createWallet } from "../../src/services/stellar/wallet";
import {
  updateUserProfile,
  createWalletCache,
} from "../../src/services/firebase/firestore";
import {
  GoogleSignInButton,
  OrDivider,
} from "../../src/components/GoogleSignInButton";

export default function SignUpScreen() {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");

  // Step 1: Info
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+62");
  // Full E.164 number (e.g. "+62812...") computed & validated in handleSendOtp,
  // persisted to Firestore in handleSignUp.
  const [phoneE164, setPhoneE164] = useState("");
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const COUNTRIES = [
    { code: "+62", label: "Indonesia", flag: "🇮🇩" },
    { code: "+1", label: "United States", flag: "🇺🇸" },
    { code: "+44", label: "United Kingdom", flag: "🇬🇧" },
    { code: "+65", label: "Singapore", flag: "🇸🇬" },
    { code: "+60", label: "Malaysia", flag: "🇲🇾" },
    { code: "+63", label: "Philippines", flag: "🇵🇭" },
    { code: "+66", label: "Thailand", flag: "🇹🇭" },
    { code: "+84", label: "Vietnam", flag: "🇻🇳" },
    { code: "+91", label: "India", flag: "🇮🇳" },
    { code: "+81", label: "Japan", flag: "🇯🇵" },
    { code: "+82", label: "South Korea", flag: "🇰🇷" },
    { code: "+61", label: "Australia", flag: "🇦🇺" },
  ];

  // Step 2: OTP (SMS codes from Firebase are 6 digits)
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];
  const [verificationId, setVerificationId] = useState<string | null>(null);

  // Step 3: PIN
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const pinRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    email?: string;
    phone?: string;
  }>({});

  const recaptchaVerifier = useRef<any>(null);

  const handleSendOtp = async () => {
    Keyboard.dismiss();
    setError(null);
    setFieldErrors({});
    if (!displayName || !username || !email || !phone) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      // Format phone to E.164 standard required by Firebase
      let rawPhone = phone.trim().replace(/[\s-]/g, "");

      // If user typed '08...', strip the '0' since we have the country code prefix
      if (rawPhone.startsWith("0")) {
        rawPhone = rawPhone.substring(1);
      }

      // If they typed '+' manually, assume they typed the full international number
      let formattedPhone = rawPhone.startsWith("+")
        ? rawPhone
        : `${countryCode}${rawPhone}`;

      // Remember the validated E.164 number so handleSignUp can persist it.
      setPhoneE164(formattedPhone);

      // Make sure email, username, and phone aren't already registered
      const availability = await checkAvailability({
        email: email.trim(),
        username: username.trim(),
        phone: formattedPhone,
      });

      const nextFieldErrors: {
        username?: string;
        email?: string;
        phone?: string;
      } = {};
      if (availability.email === false)
        nextFieldErrors.email = "This email is already registered";
      if (availability.username === false)
        nextFieldErrors.username = "This username is already taken";
      if (availability.phone === false)
        nextFieldErrors.phone = "This phone number is already registered";

      if (Object.keys(nextFieldErrors).length > 0) {
        setFieldErrors(nextFieldErrors);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Trigger OTP email request from the backend
      const verId = await sendEmailVerificationCode(email);
      setVerificationId(verId);

      setDirection("forward");
      setStep(2);

      setTimeout(() => {
        otpRefs[0].current?.focus();
      }, 500);
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(
        err.message || "Failed to send verification code. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    Keyboard.dismiss();
    setError(null);
    const code = otp.join("");
    if (code.length < 6) {
      setError("Please enter the complete 6-digit OTP");
      return;
    }

    setIsLoading(true);
    try {
      if (!verificationId) {
        throw new Error("No active verification session. Send OTP first.");
      }

      // Verify the OTP by signing in via the backend custom token
      await signInWithEmailOtp(email, code);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDirection("forward");
      setStep(3);
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(
        err.message || "Invalid OTP code. Please check the code and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const prevStep = () => {
    Keyboard.dismiss();
    setError(null);
    setDirection("backward");
    setStep(step - 1);
  };

  const handleSignUp = async () => {
    if (pin.join("").length < 6) {
      setError("Please set a 6-digit PIN");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const pinPassword = pin.join("");
      const user = auth.currentUser;
      if (!user) throw new Error("No authenticated phone user found");

      // 1. Link email and PIN password to the signed-in phone account
      await linkEmailToAccount(email, pinPassword);

      // 2. Create the user profile inside Firestore (incl. phone + dial code)
      await createPhoneUserProfile(user, username, email, displayName, phoneE164 || null, countryCode);

      // 3. Automatically create Stellar Wallet & fund it on Testnet
      try {
        const newPublicKey = await createWallet(user.uid);
        await updateUserProfile(user.uid, { stellarPublicKey: newPublicKey });
        await createWalletCache(user.uid, newPublicKey);
      } catch (stellarErr) {
        console.warn("Automatic Stellar Wallet creation failed:", stellarErr);
      }

      // 4. Hash and save PIN in Express backend (non-blocking for testing/offline setups)
      try {
        await setupPin(pinPassword);
      } catch (pinErr) {
        console.warn(
          "Backend PIN setup failed (likely due to offline backend or missing serviceAccountKey):",
          pinErr
        );
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered to another account.");
        setDirection("backward");
        setStep(1);
        setFieldErrors({ email: "This email is already registered" });
        setIsLoading(false);
        return;
      }
      setError(err.message || "Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    if (text.length > 1) {
      const pastedData = text
        .replace(/[^0-9]/g, "")
        .slice(0, 6)
        .split("");
      const newOtp = [...otp];
      pastedData.forEach((char, i) => {
        if (index + i < 6) {
          newOtp[index + i] = char;
        }
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + pastedData.length, 5);
      setTimeout(() => otpRefs[nextIndex].current?.focus(), 0);
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < 5) {
      setTimeout(() => otpRefs[index + 1].current?.focus(), 0);
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = "";
      setOtp(newOtp);
      setTimeout(() => otpRefs[index - 1].current?.focus(), 0);
    }
  };

  const handlePinChange = (text: string, index: number) => {
    if (text.length > 1) {
      const pastedData = text
        .replace(/[^0-9]/g, "")
        .slice(0, 6)
        .split("");
      const newPin = [...pin];
      pastedData.forEach((char, i) => {
        if (index + i < 6) {
          newPin[index + i] = char;
        }
      });
      setPin(newPin);
      const nextIndex = Math.min(index + pastedData.length, 5);
      setTimeout(() => pinRefs[nextIndex].current?.focus(), 0);
      return;
    }

    const newPin = [...pin];
    newPin[index] = text;
    setPin(newPin);

    if (text && index < 5) {
      setTimeout(() => pinRefs[index + 1].current?.focus(), 0);
    }
  };

  const handlePinKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !pin[index] && index > 0) {
      const newPin = [...pin];
      newPin[index - 1] = "";
      setPin(newPin);
      setTimeout(() => pinRefs[index - 1].current?.focus(), 0);
    }
  };

  const TopHeader = () => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.xl,
        zIndex: 10,
      }}
    >
      <Pressable
        onPress={
          step > 1
            ? prevStep
            : () =>
                router.canGoBack()
                  ? router.back()
                  : router.replace("/(auth)/landing")
        }
        style={{ padding: Spacing.xs, marginRight: Spacing.md }}
      >
        <Feather name="arrow-left" size={24} color={Colors.white} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", gap: 6, height: 4 }}>
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              style={{
                flex: 1,
                backgroundColor:
                  s <= step ? Colors.white : "rgba(255,255,255,0.2)",
                borderRadius: 2,
              }}
            />
          ))}
        </View>
      </View>
      <View style={{ width: 32 }} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.baseLight }}>
      <LinearGradient
        colors={["#000000", "#111111", Colors.baseLight]}
        locations={[0, 0.6, 1]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 380 }}
      />
      
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, justifyContent: "space-between" }}
        >
          {/* Top Section */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(100)}
            style={{ flex: 0.65, position: "relative" }}
          >
            <TopHeader />

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

            {/* Logo at Top */}
            <View style={{ alignItems: "center", paddingTop: Spacing.lg }}>
              <Feather
                name="aperture"
                size={56}
                color={Colors.white}
                style={{ marginBottom: Spacing.md }}
              />
              <Text
                style={{
                  fontSize: 44,
                  fontWeight: "800",
                  color: Colors.white,
                  marginBottom: Spacing.xs,
                  letterSpacing: -1,
                }}
              >
                Stellar<Text style={{ fontWeight: "400" }}>Pay</Text>
              </Text>
              <Text
                style={[
                  Typography.bodyLarge,
                  { color: "rgba(255,255,255,0.6)", letterSpacing: 0.5 },
                ]}
              >
                Join the future of payments
              </Text>
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
              paddingTop: Spacing.xl,
              paddingHorizontal: Spacing.xl,
              paddingBottom: Spacing.xxl,
              shadowColor: "#000", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.05, shadowRadius: 24, elevation: 8,
              zIndex: 10,
              flex: 1, // Make card take remaining space naturally
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
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, paddingBottom: Spacing.xl }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {step === 1 && (
                <Animated.View
                  entering={direction === "forward" ? FadeInRight : FadeInLeft}
                  exiting={direction === "forward" ? FadeOutLeft : FadeOutRight}
                >
                  <View style={{ marginBottom: Spacing.xl }}>
                    <Text
                      style={[
                        Typography.headingLarge,
                        {
                          color: Colors.textLightPrimary,
                          marginBottom: Spacing.xs,
                        },
                      ]}
                    >
                      Create Account
                    </Text>
                    <Text
                      style={[
                        Typography.bodyMedium,
                        { color: Colors.textLightSecondary },
                      ]}
                    >
                      Enter your details to get started
                    </Text>
                  </View>

                  <View style={{ marginBottom: Spacing.md }}>
                    <Text
                      style={[
                        Typography.labelLarge,
                        {
                          color: Colors.textLightSecondary,
                          marginBottom: Spacing.xs,
                          marginLeft: Spacing.xs,
                        },
                      ]}
                    >
                      Display Name
                    </Text>
                    <TextInput
                      value={displayName}
                      onChangeText={setDisplayName}
                      placeholder="Your name"
                      placeholderTextColor={Colors.textLightMuted}
                      autoCapitalize="words"
                      autoCorrect={false}
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
                      }}
                    />
                  </View>

                  <View style={{ marginBottom: Spacing.md }}>
                    <Text
                      style={[
                        Typography.labelLarge,
                        {
                          color: Colors.textLightSecondary,
                          marginBottom: Spacing.xs,
                          marginLeft: Spacing.xs,
                        },
                      ]}
                    >
                      Username
                    </Text>
                    <TextInput
                      value={username}
                      onChangeText={(text) => {
                        setUsername(text);
                        setFieldErrors((f) => ({ ...f, username: undefined }));
                      }}
                      placeholder="@username"
                      placeholderTextColor={Colors.textLightMuted}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={{
                        fontFamily: "Inter-Regular",
                        fontSize: 16,
                        backgroundColor: Colors.surfaceLight,
                        borderWidth: 1,
                        borderColor: fieldErrors.username
                          ? Colors.danger
                          : Colors.borderLight,
                        borderRadius: 12,
                        height: 56,
                        paddingHorizontal: Spacing.md,
                        color: Colors.textLightPrimary,
                      }}
                    />
                    {fieldErrors.username && (
                      <Text
                        style={[
                          Typography.bodySmall,
                          {
                            color: Colors.danger,
                            marginTop: Spacing.xs,
                            marginLeft: Spacing.xs,
                          },
                        ]}
                      >
                        {fieldErrors.username}
                      </Text>
                    )}
                  </View>

                  <View style={{ marginBottom: Spacing.md }}>
                    <Text
                      style={[
                        Typography.labelLarge,
                        {
                          color: Colors.textLightSecondary,
                          marginBottom: Spacing.xs,
                          marginLeft: Spacing.xs,
                        },
                      ]}
                    >
                      Email Address
                    </Text>
                    <TextInput
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        setFieldErrors((f) => ({ ...f, email: undefined }));
                      }}
                      placeholder="name@example.com"
                      placeholderTextColor={Colors.textLightMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={{
                        fontFamily: "Inter-Regular",
                        fontSize: 16,
                        backgroundColor: Colors.surfaceLight,
                        borderWidth: 1,
                        borderColor: fieldErrors.email
                          ? Colors.danger
                          : Colors.borderLight,
                        borderRadius: 12,
                        height: 56,
                        paddingHorizontal: Spacing.md,
                        color: Colors.textLightPrimary,
                      }}
                    />
                    {fieldErrors.email && (
                      <Text
                        style={[
                          Typography.bodySmall,
                          {
                            color: Colors.danger,
                            marginTop: Spacing.xs,
                            marginLeft: Spacing.xs,
                          },
                        ]}
                      >
                        {fieldErrors.email}
                      </Text>
                    )}
                  </View>

                  <View style={{ marginBottom: Spacing.xl }}>
                    <Text
                      style={[
                        Typography.labelLarge,
                        {
                          color: Colors.textLightSecondary,
                          marginBottom: Spacing.xs,
                          marginLeft: Spacing.xs,
                        },
                      ]}
                    >
                      Phone Number (HP)
                    </Text>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Pressable
                        onPress={() => setShowCountryPicker(true)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: Colors.surfaceLight,
                          borderWidth: 1,
                          borderColor: fieldErrors.phone
                            ? Colors.danger
                            : Colors.borderLight,
                          borderRadius: 12,
                          height: 56,
                          paddingHorizontal: Spacing.md,
                          marginRight: Spacing.sm,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 16,
                            color: Colors.textLightPrimary,
                            marginRight: 4,
                          }}
                        >
                          {COUNTRIES.find((c) => c.code === countryCode)?.flag}{" "}
                          {countryCode}
                        </Text>
                        <Feather
                          name="chevron-down"
                          size={16}
                          color={Colors.textLightSecondary}
                        />
                      </Pressable>

                      <TextInput
                        value={phone}
                        onChangeText={(text) => {
                          setPhone(text);
                          setFieldErrors((f) => ({ ...f, phone: undefined }));
                        }}
                        placeholder="812 3456 7890"
                        placeholderTextColor={Colors.textLightMuted}
                        keyboardType="phone-pad"
                        style={{
                          flex: 1,
                          fontFamily: "Inter-Regular",
                          fontSize: 16,
                          backgroundColor: Colors.surfaceLight,
                          borderWidth: 1,
                          borderColor: fieldErrors.phone
                            ? Colors.danger
                            : Colors.borderLight,
                          borderRadius: 12,
                          height: 56,
                          paddingHorizontal: Spacing.md,
                          color: Colors.textLightPrimary,
                        }}
                      />
                    </View>
                    {fieldErrors.phone && (
                      <Text
                        style={[
                          Typography.bodySmall,
                          {
                            color: Colors.danger,
                            marginTop: Spacing.xs,
                            marginLeft: Spacing.xs,
                          },
                        ]}
                      >
                        {fieldErrors.phone}
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={handleSendOtp}
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
                        Continue
                      </Text>
                    )}
                  </TouchableOpacity>

                  <OrDivider />
                  <GoogleSignInButton label="Sign up with Google" />

                  <Pressable
                    onPress={() => router.push("/(auth)/login")}
                    style={{
                      alignSelf: "center",
                      marginTop: Spacing.xl,
                      padding: Spacing.sm,
                    }}
                  >
                    <Text
                      style={[
                        Typography.bodyMedium,
                        { color: Colors.textLightSecondary },
                      ]}
                    >
                      Already have an account?{" "}
                      <Text
                        style={{ color: Colors.primary, fontWeight: "600" }}
                      >
                        Sign in
                      </Text>
                    </Text>
                  </Pressable>
                </Animated.View>
              )}

              {step === 2 && (
                <Animated.View
                  entering={direction === "forward" ? FadeInRight : FadeInLeft}
                  exiting={direction === "forward" ? FadeOutLeft : FadeOutRight}
                  style={{ flex: 1 }}
                >
                  <View style={{ marginBottom: Spacing.xl }}>
                    <Text
                      style={[
                        Typography.headingLarge,
                        {
                          color: Colors.textLightPrimary,
                          marginBottom: Spacing.xs,
                        },
                      ]}
                    >
                      Verify your number
                    </Text>
                    <Text
                      style={[
                        Typography.bodyMedium,
                        { color: Colors.textLightSecondary },
                      ]}
                    >
                      Enter the 6-digit OTP sent to your email
                    </Text>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: Spacing.xxl,
                    }}
                  >
                    {otp.map((digit, index) => (
                      <TextInput
                        key={index}
                        ref={otpRefs[index]}
                        value={digit}
                        onChangeText={(text) => handleOtpChange(text, index)}
                        onKeyPress={(e) => handleOtpKeyPress(e, index)}
                        keyboardType="number-pad"
                        maxLength={1}
                        style={{
                          fontSize: 28,
                          fontWeight: "700",
                          width: 45,
                          height: 60,
                          backgroundColor: Colors.surfaceLight,
                          borderWidth: 1,
                          borderColor: digit
                            ? Colors.primary
                            : Colors.borderLight,
                          borderRadius: 12,
                          textAlign: "center",
                          color: Colors.textLightPrimary,
                          ...(digit
                            ? {
                                shadowColor: Colors.primary,
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.15,
                                shadowRadius: 16,
                              }
                            : {}),
                        }}
                      />
                    ))}
                  </View>

                  <TouchableOpacity
                    onPress={handleVerifyOtp}
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
                        Verify OTP
                      </Text>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              )}

              {step === 3 && (
                <Animated.View
                  entering={direction === "forward" ? FadeInRight : FadeInLeft}
                  exiting={direction === "forward" ? FadeOutLeft : FadeOutRight}
                  style={{ flex: 1 }}
                >
                  <View style={{ marginBottom: Spacing.xl }}>
                    <Text
                      style={[
                        Typography.headingLarge,
                        {
                          color: Colors.textLightPrimary,
                          marginBottom: Spacing.xs,
                        },
                      ]}
                    >
                      Set up your PIN
                    </Text>
                    <Text
                      style={[
                        Typography.bodyMedium,
                        { color: Colors.textLightSecondary },
                      ]}
                    >
                      Create a 6-digit PIN to secure your account
                    </Text>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: Spacing.xxl,
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
                        style={{
                          fontSize: 28,
                          fontWeight: "700",
                          width: 50,
                          height: 60,
                          backgroundColor: Colors.surfaceLight,
                          borderWidth: 1,
                          borderColor: digit
                            ? Colors.primary
                            : Colors.borderLight,
                          borderRadius: 12,
                          textAlign: "center",
                          color: Colors.textLightPrimary,
                          ...(digit
                            ? {
                                shadowColor: Colors.primary,
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.15,
                                shadowRadius: 16,
                              }
                            : {}),
                        }}
                      />
                    ))}
                  </View>

                  <TouchableOpacity
                    onPress={handleSignUp}
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
                        Finish & Create Account
                      </Text>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              )}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      {/* Country Code Picker Modal */}
      <Modal
        visible={showCountryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <View
            style={{
              backgroundColor: Colors.surfaceLight,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: Spacing.lg,
              maxHeight: Dimensions.get("window").height * 0.7,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: Spacing.md,
              }}
            >
              <Text
                style={[
                  Typography.headingMedium,
                  { color: Colors.textLightPrimary },
                ]}
              >
                Select Country
              </Text>
              <Pressable
                onPress={() => setShowCountryPicker(false)}
                style={{ padding: Spacing.xs }}
              >
                <Feather name="x" size={24} color={Colors.textLightSecondary} />
              </Pressable>
            </View>
            <FlatList
              data={COUNTRIES}
              keyExtractor={(item) => item.code}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: Spacing.md,
                    borderBottomWidth: 1,
                    borderBottomColor: Colors.borderLight,
                  }}
                  onPress={() => {
                    setCountryCode(item.code);
                    setShowCountryPicker(false);
                  }}
                >
                  <Text style={{ fontSize: 24, marginRight: Spacing.md }}>
                    {item.flag}
                  </Text>
                  <Text
                    style={[
                      Typography.bodyLarge,
                      { flex: 1, color: Colors.textLightPrimary },
                    ]}
                  >
                    {item.label}
                  </Text>
                  <Text
                    style={[
                      Typography.bodyMedium,
                      { color: Colors.textLightSecondary },
                    ]}
                  >
                    {item.code}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
