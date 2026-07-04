import React, { useState, useRef, useEffect } from "react";
import { View, Text, KeyboardAvoidingView, Platform, Pressable, TextInput, Image, Dimensions, ScrollView, Modal, FlatList, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, { FadeInRight, FadeOutLeft, FadeInLeft, FadeOutRight, FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { RecaptchaModal } from "../../src/components/RecaptchaModal";
import { Colors } from "../../src/constants/colors";
import { Typography } from "../../src/constants/typography";
import { Spacing } from "../../src/constants/spacing";
import { linkPhoneToAccount, sendPhoneVerificationCode } from "../../src/services/firebase/auth";
import { updateUserProfile } from "../../src/services/firebase/firestore";
import { auth, firebaseConfig } from "../../src/services/firebase/config";

export default function VerifyPhoneScreen() {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+62");
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
  const [otp, setOtp] = useState(["", "", "", "", "", ""]); // Firebase SMS OTP is 6 digits
  const [verificationId, setVerificationId] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recaptchaVerifier = useRef<any>(null);

  const otpRefs = [
    useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), 
    useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)
  ];

  const handleSendOtp = async () => {
    if (!phone || phone.length < 9) {
      setError("Please enter a valid phone number");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Format phone to E.164 standard required by Firebase
      let rawPhone = phone.trim().replace(/[\s-]/g, "");
      
      // If user typed '08...', strip the '0' since we have the country code prefix
      if (rawPhone.startsWith("0")) {
        rawPhone = rawPhone.substring(1);
      }
      
      // If they typed '+' manually, assume they typed the full international number
      let formattedPhone = rawPhone.startsWith("+") ? rawPhone : `${countryCode}${rawPhone}`;

      // Trigger a real Firebase SMS verification code request using reCAPTCHA modal verifier
      const verId = await sendPhoneVerificationCode(formattedPhone, recaptchaVerifier.current);
      setVerificationId(verId);
      
      setDirection("forward");
      setStep(2);
      
      // Auto focus OTP box
      setTimeout(() => {
        otpRefs[0].current?.focus();
      }, 500);
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.message || "Failed to send verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < 5) {
      otpRefs[index + 1].current?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length < 6) {
      setError("Please enter the complete 6-digit OTP");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No user logged in");

      if (!verificationId) {
        throw new Error("No active verification session found. Send OTP first.");
      }

      // Link SMS OTP credentials to the existing authenticated account
      await linkPhoneToAccount(verificationId, code);
      
      // Update database profile record with verified phone number
      await updateUserProfile(user.uid, { phone: user.phoneNumber || phone });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Navigate to main layout
      router.replace("/(tabs)");
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.message || "Verification failed. Please check the code and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, justifyContent: "space-between" }}
        >
          {/* Top Section */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)} style={{ flex: 0.65, position: "relative" }}>
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, zIndex: 10 }}>
              <Pressable onPress={() => step > 1 ? setStep(1) : router.canGoBack() ? router.back() : router.replace("/(auth)/login")} style={{ padding: Spacing.xs, marginRight: Spacing.md }}>
                <Feather name="arrow-left" size={24} color={Colors.white} />
              </Pressable>
              <Text style={{ fontSize: 20, fontWeight: "700", color: Colors.white }}>Verify Phone</Text>
            </View>

            {/* Background Globe - Absolute positioned behind everything */}
            <View style={{ position: "absolute", bottom: -60, left: 0, right: 0, alignItems: "center", zIndex: -1, overflow: "hidden" }}>
              <Image 
                source={require("../../assets/images/globe.png")} 
                style={{ width: Dimensions.get("window").width, height: 400, opacity: 0.7, resizeMode: "cover" }}
              />
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
              flex: 1,
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
                      Link Phone Number
                    </Text>
                    <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>
                      We need to verify your phone number to secure transaction messages and notifications.
                    </Text>
                  </View>

                  <View style={{ marginBottom: Spacing.xl }}>
                    <Text style={[Typography.labelLarge, { color: Colors.textLightSecondary, marginBottom: Spacing.xs, marginLeft: Spacing.xs }]}>Phone Number</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Pressable 
                        onPress={() => setShowCountryPicker(true)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: Colors.baseLight,
                          borderWidth: 1,
                          borderColor: Colors.borderLight,
                          borderRadius: 16,
                          height: 56,
                          paddingHorizontal: Spacing.md,
                          marginRight: Spacing.sm,
                        }}
                      >
                        <Text style={{ fontSize: 16, color: Colors.textLightPrimary, marginRight: 4 }}>
                          {COUNTRIES.find(c => c.code === countryCode)?.flag} {countryCode}
                        </Text>
                        <Feather name="chevron-down" size={16} color={Colors.textLightSecondary} />
                      </Pressable>
                      
                      <TextInput
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="812 3456 7890"
                        placeholderTextColor={Colors.textLightMuted}
                        keyboardType="phone-pad"
                        style={{
                          flex: 1,
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
                  </View>

                  <Pressable
                    onPress={handleSendOtp}
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
                      {isLoading ? "Sending OTP..." : "Send Verification Code"}
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
                    <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, marginBottom: Spacing.xs }]}>
                      Enter 6-Digit Code
                    </Text>
                    <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>
                      Sent via SMS to {phone}
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
                          width: 45,
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
                    onPress={handleVerifyOtp}
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
                      {isLoading ? "Verifying..." : "Verify & Complete"}
                    </Text>
                  </Pressable>
                  
                  <Text style={[Typography.bodyMedium, { color: Colors.textLightMuted, textAlign: "center", marginTop: Spacing.lg }]}>
                    (Demo mode: any 6 digits work)
                  </Text>
                </Animated.View>
              )}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <RecaptchaModal
        ref={recaptchaVerifier}
        siteKey="6LcM4y0UAAAAAJOZ24qE3g30u0w2M636sYnGdK42"
        baseUrl={`https://${firebaseConfig.authDomain}`}
      />
      
      {/* Country Code Picker Modal */}
      <Modal visible={showCountryPicker} transparent animationType="slide" onRequestClose={() => setShowCountryPicker(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, maxHeight: Dimensions.get("window").height * 0.7 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md }}>
              <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary }]}>Select Country</Text>
              <Pressable onPress={() => setShowCountryPicker(false)} style={{ padding: Spacing.xs }}>
                <Feather name="x" size={24} color={Colors.textLightSecondary} />
              </Pressable>
            </View>
            <FlatList
              data={COUNTRIES}
              keyExtractor={(item) => item.code}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight }}
                  onPress={() => {
                    setCountryCode(item.code);
                    setShowCountryPicker(false);
                  }}
                >
                  <Text style={{ fontSize: 24, marginRight: Spacing.md }}>{item.flag}</Text>
                  <Text style={[Typography.bodyLarge, { flex: 1, color: Colors.textLightPrimary }]}>{item.label}</Text>
                  <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>{item.code}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <View style={{ backgroundColor: Colors.white, height: 40, position: "absolute", bottom: 0, left: 0, right: 0, zIndex: -1 }} />
    </View>
  );
}
