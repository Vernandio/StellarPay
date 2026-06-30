import { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, Pressable, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Colors } from "../../src/constants/colors";
import { Typography } from "../../src/constants/typography";
import { Spacing } from "../../src/constants/spacing";
import { signIn } from "../../src/services/firebase/auth";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter your email and password");
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, justifyContent: "center", paddingHorizontal: Spacing.lg }}
      >
        <Animated.View entering={FadeInDown.duration(280).springify()}>
          {/* Logo & Title */}
          <View style={{ alignItems: "center", marginBottom: Spacing.xxl }}>
            <Text style={[Typography.displayMedium, { color: Colors.textPrimary, marginBottom: Spacing.sm }]}>
              StellarPay
            </Text>
            <Text style={[Typography.bodyLarge, { color: Colors.textSecondary }]}>
              Send money at the speed of light
            </Text>
          </View>

          {/* Email Input */}
          <View style={{ marginBottom: Spacing.md }}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                Typography.bodyLarge,
                {
                  backgroundColor: "#13122A",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  height: 56,
                  paddingHorizontal: Spacing.md,
                  color: Colors.textPrimary,
                },
              ]}
            />
          </View>

          {/* Password Input */}
          <View style={{ marginBottom: Spacing.lg }}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                Typography.bodyLarge,
                {
                  backgroundColor: "#13122A",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  height: 56,
                  paddingHorizontal: Spacing.md,
                  color: Colors.textPrimary,
                },
              ]}
            />
          </View>

          {/* Error */}
          {error && (
            <Animated.View entering={FadeInDown.duration(200)}>
              <Text style={[Typography.bodySmall, { color: Colors.danger, marginBottom: Spacing.md, textAlign: "center" }]}>
                {error}
              </Text>
            </Animated.View>
          )}

          {/* Login Button */}
          <Pressable
            onPress={handleLogin}
            onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            disabled={isLoading}
            style={{
              height: 56,
              borderRadius: 9999,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: Colors.primary,
              opacity: isLoading ? 0.6 : 1,
              shadowColor: Colors.primary,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.4,
              shadowRadius: 24,
              elevation: 8,
            }}
          >
            <Text style={[Typography.labelLarge, { color: Colors.white }]}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Text>
          </Pressable>

          {/* Sign Up Link */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(auth)/signup");
            }}
            style={{ marginTop: Spacing.lg, alignItems: "center" }}
          >
            <Text style={[Typography.bodyMedium, { color: Colors.textSecondary }]}>
              Don't have an account?{" "}
              <Text style={{ color: Colors.primary, fontWeight: "600" }}>Sign Up</Text>
            </Text>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
