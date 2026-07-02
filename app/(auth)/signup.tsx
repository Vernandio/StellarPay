import { useState, useRef } from "react";
import { View, Text, KeyboardAvoidingView, Platform, Pressable, TextInput, Keyboard, Image, Dimensions, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, { FadeInRight, FadeOutLeft, FadeInLeft, FadeOutRight, FadeInDown, FadeIn, FadeOut } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { Colors } from "../../src/constants/colors";
import { Typography } from "../../src/constants/typography";
import { Spacing } from "../../src/constants/spacing";
import { signUp } from "../../src/services/firebase/auth";

export default function SignUpScreen() {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");

  // Step 1: Info
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2: OTP
  const [otp, setOtp] = useState(["", "", "", ""]);
  const otpRefs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];

  // Step 3: PIN
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const pinRefs = [
    useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), 
    useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)
  ];

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextStep = () => {
    Keyboard.dismiss();
    setError(null);
    if (step === 1) {
      if (!username || !email || !phone) {
        setError("Please fill in all fields");
        return;
      }
    }
    if (step === 2) {
      if (otp.join("").length < 4) {
        setError("Please enter the complete OTP");
        return;
      }
    }
    setDirection("forward");
    setStep(step + 1);
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
      await signUp(email, pinPassword, username);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.message || "Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < 3) {
      otpRefs[index + 1].current?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const handlePinChange = (text: string, index: number) => {
    const newPin = [...pin];
    newPin[index] = text;
    setPin(newPin);

    if (text && index < 5) {
      pinRefs[index + 1].current?.focus();
    }
  };

  const handlePinKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !pin[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  };

  const TopHeader = () => (
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, zIndex: 10 }}>
      <Pressable onPress={step > 1 ? prevStep : () => router.back()} style={{ padding: Spacing.xs, marginRight: Spacing.md }}>
        <Feather name="arrow-left" size={24} color={Colors.white} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", gap: 6, height: 4 }}>
          {[1, 2, 3].map((s) => (
            <View 
              key={s} 
              style={{ 
                flex: 1, 
                backgroundColor: s <= step ? Colors.white : "rgba(255,255,255,0.2)", 
                borderRadius: 2 
              }} 
            />
          ))}
        </View>
      </View>
      <View style={{ width: 32 }} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, justifyContent: "space-between" }}
        >
          {/* Top Section */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)} style={{ flex: 0.65, position: "relative" }}>
            <TopHeader />
            
            {/* Background Globe - Absolute positioned behind everything */}
            <View style={{ position: "absolute", bottom: -60, left: 0, right: 0, alignItems: "center", zIndex: -1, overflow: "hidden" }}>
              <Image 
                source={require("../../assets/images/globe.png")} 
                style={{ width: Dimensions.get("window").width, height: 400, opacity: 0.7, resizeMode: "cover" }}
              />
            </View>

            {/* Logo at Top */}
            <View style={{ alignItems: "center", paddingTop: Spacing.lg }}>
              <Feather name="aperture" size={56} color={Colors.white} style={{ marginBottom: Spacing.md }} />
              <Text style={{ fontSize: 44, fontWeight: "800", color: Colors.white, marginBottom: Spacing.xs, letterSpacing: -1 }}>
                Stellar<Text style={{ fontWeight: "400" }}>Pay</Text>
              </Text>
              <Text style={[Typography.bodyLarge, { color: "rgba(255,255,255,0.6)", letterSpacing: 0.5 }]}>
                Join the future of payments
              </Text>
            </View>
          </Animated.View>

          {/* Bottom Card */}
          <Animated.View 
            entering={FadeInDown.duration(400).delay(300).springify()}
            style={{
              backgroundColor: Colors.white,
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              paddingTop: Spacing.lg,
              paddingHorizontal: Spacing.xl,
              paddingBottom: Spacing.xxl,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -12 },
              shadowOpacity: 0.03,
              shadowRadius: 24,
              elevation: 8,
              zIndex: 10,
              flex: 1, // Make card take remaining space naturally
            }}
          >
            <View style={{ width: 40, height: 4, backgroundColor: Colors.borderLightStrong, borderRadius: 2, alignSelf: "center", marginBottom: Spacing.lg }} />
            
            {error && (
              <Animated.View entering={FadeInDown.duration(200)}>
                <Text style={[Typography.bodySmall, { color: Colors.danger, marginBottom: Spacing.md, textAlign: "center" }]}>
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
                    <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, marginBottom: Spacing.xs }]}>
                      Create Account
                    </Text>
                    <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>
                      Enter your details to get started
                    </Text>
                  </View>

                  <View style={{ marginBottom: Spacing.md }}>
                    <Text style={[Typography.labelLarge, { color: Colors.textLightSecondary, marginBottom: Spacing.xs, marginLeft: Spacing.xs }]}>Username</Text>
                    <TextInput
                      value={username}
                      onChangeText={setUsername}
                      placeholder="@username"
                      placeholderTextColor={Colors.textLightMuted}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={{
                        fontFamily: "Inter-Regular",
                        fontSize: 16,
                        backgroundColor: Colors.baseLight,
                        borderWidth: 1,
                        borderColor: Colors.borderLight,
                        borderRadius: 16,
                        height: 56,
                        paddingHorizontal: Spacing.md,
                        color: Colors.textLightPrimary,
                      }}
                    />
                  </View>

                  <View style={{ marginBottom: Spacing.md }}>
                    <Text style={[Typography.labelLarge, { color: Colors.textLightSecondary, marginBottom: Spacing.xs, marginLeft: Spacing.xs }]}>Email Address</Text>
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="name@example.com"
                      placeholderTextColor={Colors.textLightMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={{
                        fontFamily: "Inter-Regular",
                        fontSize: 16,
                        backgroundColor: Colors.baseLight,
                        borderWidth: 1,
                        borderColor: Colors.borderLight,
                        borderRadius: 16,
                        height: 56,
                        paddingHorizontal: Spacing.md,
                        color: Colors.textLightPrimary,
                      }}
                    />
                  </View>

                  <View style={{ marginBottom: Spacing.xl }}>
                    <Text style={[Typography.labelLarge, { color: Colors.textLightSecondary, marginBottom: Spacing.xs, marginLeft: Spacing.xs }]}>Phone Number (HP)</Text>
                    <TextInput
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="+62 812 3456 7890"
                      placeholderTextColor={Colors.textLightMuted}
                      keyboardType="phone-pad"
                      style={{
                        fontFamily: "Inter-Regular",
                        fontSize: 16,
                        backgroundColor: Colors.baseLight,
                        borderWidth: 1,
                        borderColor: Colors.borderLight,
                        borderRadius: 16,
                        height: 56,
                        paddingHorizontal: Spacing.md,
                        color: Colors.textLightPrimary,
                      }}
                    />
                  </View>

                  <Pressable
                    onPress={nextStep}
                    onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                    style={{
                      height: 56,
                      borderRadius: 9999,
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: "#000",
                    }}
                  >
                    <Text style={[Typography.labelLarge, { color: Colors.white }]}>Continue</Text>
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
                    <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, marginBottom: Spacing.xs }]}>
                      Verify your number
                    </Text>
                    <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>
                      Enter the 4-digit OTP sent to {phone || email}
                    </Text>
                  </View>

                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.xxl }}>
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
                          width: 70,
                          height: 70,
                          backgroundColor: Colors.baseLight,
                          borderWidth: 1,
                          borderColor: digit ? Colors.primary : Colors.borderLight,
                          borderRadius: 16,
                          textAlign: "center",
                          color: Colors.textLightPrimary,
                        }}
                      />
                    ))}
                  </View>

                  <Pressable
                    onPress={nextStep}
                    onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                    style={{
                      height: 56,
                      borderRadius: 9999,
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: "#000",
                    }}
                  >
                    <Text style={[Typography.labelLarge, { color: Colors.white }]}>Verify OTP</Text>
                  </Pressable>
                  
                  <Text style={[Typography.bodyMedium, { color: Colors.textLightMuted, textAlign: "center", marginTop: Spacing.lg }]}>
                    (Demo mode: any 4 digits work)
                  </Text>
                </Animated.View>
              )}

              {step === 3 && (
                <Animated.View 
                  entering={direction === "forward" ? FadeInRight : FadeInLeft} 
                  exiting={direction === "forward" ? FadeOutLeft : FadeOutRight}
                  style={{ flex: 1 }}
                >
                  <View style={{ marginBottom: Spacing.xl }}>
                    <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, marginBottom: Spacing.xs }]}>
                      Set up your PIN
                    </Text>
                    <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>
                      Create a 6-digit PIN to secure your account
                    </Text>
                  </View>

                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.xxl }}>
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
                          backgroundColor: Colors.baseLight,
                          borderWidth: 1,
                          borderColor: digit ? Colors.primary : Colors.borderLight,
                          borderRadius: 12,
                          textAlign: "center",
                          color: Colors.textLightPrimary,
                        }}
                      />
                    ))}
                  </View>

                  <Pressable
                    onPress={handleSignUp}
                    onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                    disabled={isLoading}
                    style={{
                      height: 56,
                      borderRadius: 9999,
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: "#000",
                      opacity: isLoading ? 0.6 : 1,
                    }}
                  >
                    <Text style={[Typography.labelLarge, { color: Colors.white }]}>
                      {isLoading ? "Creating Account..." : "Finish & Create Account"}
                    </Text>
                  </Pressable>
                </Animated.View>
              )}
            </ScrollView>

          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <View style={{ backgroundColor: Colors.white, height: 40, position: "absolute", bottom: 0, left: 0, right: 0, zIndex: -1 }} />
    </View>
  );
}
