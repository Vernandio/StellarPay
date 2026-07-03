import { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, Pressable, TextInput, Image, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, { FadeInDown, FadeIn, FadeOut } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "../../src/constants/colors";
import { Typography } from "../../src/constants/typography";
import { Spacing } from "../../src/constants/spacing";
import { signIn } from "../../src/services/firebase/auth";
import { auth } from "../../src/services/firebase/config";
import { getUserProfile } from "../../src/services/firebase/firestore";

const { height } = Dimensions.get("window");

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmailLogin, setShowEmailLogin] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter your email/username and password");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await signIn(email, password);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.message || "Failed to sign in. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const SocialButton = ({ icon, label, onPress, isGoogle = false, isApple = false }: any) => (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.white,
        height: 56,
        borderRadius: 16,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.borderLightStrong,
        paddingHorizontal: Spacing.lg,
      }}
    >
      {isApple ? (
        <View style={{ backgroundColor: "#000", width: 28, height: 28, borderRadius: 8, justifyContent: "center", alignItems: "center", marginRight: Spacing.md }}>
          <Feather name="aperture" size={16} color="#FFF" />
        </View>
      ) : (
        <Feather name={icon} size={24} color={isGoogle ? Colors.amber : Colors.textLightPrimary} style={{ marginRight: Spacing.md }} />
      )}
      <Text style={[Typography.bodyLarge, { color: Colors.textLightPrimary, fontWeight: "600", flex: 1 }]}>{label}</Text>
      <Feather name="chevron-right" size={20} color={Colors.textLightMuted} />
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>

      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, justifyContent: "space-between" }}
        >
          {/* Top Section */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)} style={{ flex: 1, position: "relative" }}>
            
            {/* Background Globe - Absolute positioned behind everything */}
            <View style={{ position: "absolute", bottom: -100, left: 0, right: 0, alignItems: "center", zIndex: -1, overflow: "hidden" }}>
              <Image 
                source={require("../../assets/images/globe.png")} 
                style={{ width: Dimensions.get("window").width, height: 400, opacity: 0.7, resizeMode: "cover" }}
              />
            </View>

            {/* Logo at Top */}
            <View style={{ alignItems: "center", paddingTop: Spacing.xxl }}>
              <Feather name="aperture" size={56} color={Colors.white} style={{ marginBottom: Spacing.md }} />
              <Text style={{ fontSize: 44, fontWeight: "800", color: Colors.white, marginBottom: Spacing.xs, letterSpacing: -1 }}>
                Stellar<Text style={{ fontWeight: "400" }}>Pay</Text>
              </Text>
              <Text style={[Typography.bodyLarge, { color: "rgba(255,255,255,0.6)", letterSpacing: 0.5 }]}>
                Fast. Secure. Borderless.
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
            }}
          >
            <View style={{ width: 40, height: 4, backgroundColor: Colors.borderLightStrong, borderRadius: 2, alignSelf: "center", marginBottom: Spacing.lg }} />
            
            {!showEmailLogin && (
              <Animated.View entering={FadeIn} exiting={FadeOut}>
                <View style={{ alignItems: "center", marginBottom: Spacing.xl }}>
                  <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, marginBottom: Spacing.xs }]}>
                    Welcome back 👋
                  </Text>
                  <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>
                    Sign in to continue to your account
                  </Text>
                </View>

                <SocialButton 
                  icon="chrome" 
                  label="Continue with Google" 
                  isGoogle 
                  onPress={async () => {
                    setError(null);
                    setIsLoading(true);
                    try {
                      // Trigger Google Sign-In
                      // In a real device setup, this uses expo-auth-session.
                      // For a smooth hackathon test experience without requiring client configuration:
                      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      
                      const user = auth.currentUser;
                      if (user) {
                        const profile = await getUserProfile(user.uid);
                        if (profile) {
                          if (profile.hasPin) {
                            router.replace("/(auth)/pin-entry");
                          } else {
                            router.replace("/(auth)/signup"); // Go to PIN setup
                          }
                        } else {
                          router.replace("/(auth)/signup"); // Onboard new user
                        }
                      } else {
                        // Demo fallback: if not authenticated yet, go to signup
                        router.replace("/(auth)/signup");
                      }
                    } catch (err: any) {
                      setError(err.message || "Google sign in failed");
                    } finally {
                      setIsLoading(false);
                    }
                  }} 
                />
                
                <SocialButton 
                  icon="smartphone" 
                  label="Continue with Phone Number" 
                  onPress={() => {
                    router.push("/(auth)/verify-phone");
                  }} 
                />

                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: Spacing.md }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: Colors.borderLight }} />
                  <Pressable onPress={() => setShowEmailLogin(true)}>
                    <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary, paddingHorizontal: Spacing.md }]}>
                      or sign in with email
                    </Text>
                  </Pressable>
                  <View style={{ flex: 1, height: 1, backgroundColor: Colors.borderLight }} />
                </View>
              </Animated.View>
            )}

            {showEmailLogin && (
              <Animated.View entering={FadeIn} exiting={FadeOut}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.xl }}>
                  <Pressable onPress={() => setShowEmailLogin(false)} style={{ padding: Spacing.xs, marginRight: Spacing.sm }}>
                    <Feather name="arrow-left" size={24} color={"#000"} />
                  </Pressable>
                  <View>
                    <Text style={[Typography.headingMedium, { color: "#000", fontWeight: "700" }]}>Sign in</Text>
                    <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary, marginTop: 2 }]}>Use your email or username</Text>
                  </View>
                </View>

                {error && (
                  <Animated.View entering={FadeInDown.duration(200)}>
                    <Text style={[Typography.bodySmall, { color: Colors.danger, marginBottom: Spacing.md, textAlign: "center" }]}>
                      {error}
                    </Text>
                  </Animated.View>
                )}

                <View style={{ marginBottom: Spacing.md }}>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email or Username"
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

                <View style={{ marginBottom: Spacing.lg }}>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Password"
                    placeholderTextColor={Colors.textLightMuted}
                    secureTextEntry
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

                <Pressable
                  onPress={handleLogin}
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
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Text>
                </Pressable>
              </Animated.View>
            )}

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/(auth)/signup");
              }}
              style={{ marginTop: Spacing.lg, alignItems: "center" }}
            >
              <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>
                Don't have an account?{"  "}
                <Text style={{ color: Colors.textLightPrimary, fontWeight: "700" }}>Sign up</Text>
              </Text>
            </Pressable>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: Spacing.lg, paddingHorizontal: Spacing.md }}>
              <Feather name="lock" size={14} color={Colors.textLightMuted} style={{ marginRight: Spacing.sm }} />
              <Text style={[Typography.bodySmall, { color: Colors.textLightMuted, fontSize: 12 }]}>
                Your funds are protected with bank-grade{"\n"}security and end-to-end encryption.
              </Text>
            </View>

          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <View style={{ backgroundColor: Colors.white, height: 40, position: "absolute", bottom: 0, left: 0, right: 0, zIndex: -1 }} />
    </View>
  );
}
