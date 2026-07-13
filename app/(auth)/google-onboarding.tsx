import { useState, useRef, useEffect } from "react";
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
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { Colors } from "../../src/constants/colors";
import { Typography } from "../../src/constants/typography";
import { Spacing } from "../../src/constants/spacing";
import { webFormColumn } from "../../src/constants/layout";
import { auth } from "../../src/services/firebase/config";
import { signOut, createGoogleUserProfile } from "../../src/services/firebase/auth";
import { checkAvailability } from "../../src/services/api/auth";
import { setupPin } from "../../src/services/api/pin";
import { createWallet } from "../../src/services/stellar/wallet";
import {
  updateUserProfile,
  createWalletCache,
} from "../../src/services/firebase/firestore";

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

export default function GoogleOnboardingScreen() {
  // The Google user is already signed in to Firebase by the time we get here.
  const gUser = auth.currentUser;

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");

  // Pre-filled from the Google account. Name is editable; email is fixed.
  const [displayName, setDisplayName] = useState(gUser?.displayName || "");
  const email = gUser?.email || "";
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+62");
  const [phoneE164, setPhoneE164] = useState("");
  const [showCountryPicker, setShowCountryPicker] = useState(false);

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
    phone?: string;
  }>({});

  // Guard: if someone lands here without a Google session, bounce home.
  useEffect(() => {
    if (!gUser) router.replace("/(auth)/landing");
  }, [gUser]);

  const handleContinue = async () => {
    Keyboard.dismiss();
    setError(null);
    setFieldErrors({});
    if (!displayName || !username || !phone) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      // Format phone to E.164 (same rules as the email signup flow).
      let rawPhone = phone.trim().replace(/[\s-]/g, "");
      if (rawPhone.startsWith("0")) rawPhone = rawPhone.substring(1);
      const formattedPhone = rawPhone.startsWith("+")
        ? rawPhone
        : `${countryCode}${rawPhone}`;
      setPhoneE164(formattedPhone);

      // Email belongs to this Google account already, so only check the
      // fields the user is choosing here.
      const availability = await checkAvailability({
        username: username.trim(),
        phone: formattedPhone,
      });

      const nextFieldErrors: { username?: string; phone?: string } = {};
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
      setDirection("forward");
      setStep(2);
      setTimeout(() => pinRefs[0].current?.focus(), 500);
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinish = async () => {
    if (pin.join("").length < 6) {
      setError("Please set a 6-digit PIN");
      return;
    }
    if (!gUser) {
      setError("Your Google session expired. Please sign in again.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const pinCode = pin.join("");

      // 1. Create the Firestore profile (name from Google/edited, chosen
      //    username + phone, hasPin: true).
      await createGoogleUserProfile(
        gUser,
        username,
        displayName,
        phoneE164 || null,
        countryCode
      );

      // 2. Hash + store the PIN in the backend so PIN login works.
      await setupPin(pinCode);

      // 3. Create + fund the Stellar wallet (non-blocking, mirrors signup).
      try {
        const newPublicKey = await createWallet(gUser.uid);
        await updateUserProfile(gUser.uid, { stellarPublicKey: newPublicKey });
        await createWalletCache(gUser.uid, newPublicKey);
      } catch (stellarErr) {
        console.warn("Automatic Stellar Wallet creation failed:", stellarErr);
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.message || "Failed to finish setup. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const prevStep = () => {
    Keyboard.dismiss();
    setError(null);
    setDirection("backward");
    setStep(1);
  };

  // Cancelling onboarding must sign the half-created Google session out,
  // otherwise app/index.tsx would loop the user back here on next launch.
  const handleCancel = async () => {
    try {
      await signOut();
    } catch {}
    router.replace("/(auth)/landing");
  };

  const handlePinChange = (text: string, index: number) => {
    if (text.length > 1) {
      const pasted = text.replace(/[^0-9]/g, "").slice(0, 6).split("");
      const newPin = [...pin];
      pasted.forEach((char, i) => {
        if (index + i < 6) newPin[index + i] = char;
      });
      setPin(newPin);
      const nextIndex = Math.min(index + pasted.length, 5);
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

  const inputStyle = (hasError?: boolean) => ({
    fontFamily: "Inter-Regular" as const,
    fontSize: 16,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: hasError ? Colors.danger : Colors.borderLight,
    borderRadius: 12,
    height: 56,
    paddingHorizontal: Spacing.md,
    color: Colors.textLightPrimary,
  });

  const labelStyle = [
    Typography.labelLarge,
    {
      color: Colors.textLightSecondary,
      marginBottom: Spacing.xs,
      marginLeft: Spacing.xs,
    },
  ];

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
          <Animated.View
            entering={FadeInDown.duration(400).delay(100)}
            style={{ flex: 0.55, position: "relative" }}
          >
            {/* Header */}
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
                onPress={step > 1 ? prevStep : handleCancel}
                style={{ padding: Spacing.xs, marginRight: Spacing.md }}
              >
                <Feather name="arrow-left" size={24} color={Colors.white} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", gap: 6, height: 4 }}>
                  {[1, 2].map((s) => (
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

            {/* Globe */}
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
                  height: 380,
                  opacity: 0.7,
                  resizeMode: "cover",
                }}
              />
            </View>

            <View style={{ alignItems: "center", paddingTop: Spacing.lg }}>
              <Feather
                name="aperture"
                size={48}
                color={Colors.white}
                style={{ marginBottom: Spacing.md }}
              />
              <Text
                style={{
                  fontSize: 36,
                  fontWeight: "800",
                  color: Colors.white,
                  letterSpacing: -1,
                }}
              >
                Almost there
              </Text>
              <Text
                style={[
                  Typography.bodyLarge,
                  { color: "rgba(255,255,255,0.6)", marginTop: Spacing.xs },
                ]}
              >
                Finish setting up your account
              </Text>
            </View>
          </Animated.View>

          {/* Card */}
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
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.05,
              shadowRadius: 24,
              elevation: 8,
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

            <ScrollView
              style={[{ flex: 1 }, webFormColumn]}
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
                      Your details
                    </Text>
                    <Text
                      style={[
                        Typography.bodyMedium,
                        { color: Colors.textLightSecondary },
                      ]}
                    >
                      We pulled your name from Google — pick a username and add
                      your phone number.
                    </Text>
                  </View>

                  {/* Email (read-only, from Google) */}
                  <View style={{ marginBottom: Spacing.md }}>
                    <Text style={labelStyle}>Email</Text>
                    <View
                      style={{
                        ...inputStyle(),
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: Colors.baseLight,
                      }}
                    >
                      <Feather
                        name="mail"
                        size={16}
                        color={Colors.textLightMuted}
                        style={{ marginRight: Spacing.sm }}
                      />
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 16,
                          color: Colors.textLightSecondary,
                        }}
                        numberOfLines={1}
                      >
                        {email}
                      </Text>
                      <Feather name="check-circle" size={16} color={Colors.teal} />
                    </View>
                  </View>

                  {/* Display name */}
                  <View style={{ marginBottom: Spacing.md }}>
                    <Text style={labelStyle}>Display Name</Text>
                    <TextInput
                      value={displayName}
                      onChangeText={setDisplayName}
                      placeholder="Your name"
                      placeholderTextColor={Colors.textLightMuted}
                      autoCapitalize="words"
                      autoCorrect={false}
                      style={inputStyle()}
                    />
                  </View>

                  {/* Username */}
                  <View style={{ marginBottom: Spacing.md }}>
                    <Text style={labelStyle}>Username</Text>
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
                      style={inputStyle(!!fieldErrors.username)}
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

                  {/* Phone */}
                  <View style={{ marginBottom: Spacing.xl }}>
                    <Text style={labelStyle}>Phone Number</Text>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
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
                        style={{ ...inputStyle(!!fieldErrors.phone), flex: 1 }}
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
                    onPress={handleContinue}
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
                          {
                            color: Colors.white,
                            fontWeight: "700",
                            fontSize: 16,
                          },
                        ]}
                      >
                        Continue
                      </Text>
                    )}
                  </TouchableOpacity>
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
                          borderColor: digit ? Colors.primary : Colors.borderLight,
                          borderRadius: 12,
                          textAlign: "center",
                          color: Colors.textLightPrimary,
                        }}
                      />
                    ))}
                  </View>

                  <TouchableOpacity
                    onPress={handleFinish}
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
                          {
                            color: Colors.white,
                            fontWeight: "700",
                            fontSize: 16,
                          },
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

      {/* Country picker */}
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
            style={[
              {
                backgroundColor: Colors.surfaceLight,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: Spacing.lg,
                maxHeight: Dimensions.get("window").height * 0.7,
              },
              webFormColumn,
            ]}
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
