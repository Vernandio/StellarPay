import { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Colors } from "../../src/constants/colors";
import { Typography } from "../../src/constants/typography";
import { Spacing } from "../../src/constants/spacing";
import { signUp } from "../../src/services/firebase/auth";

export default function SignUpScreen() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async () => {
    if (!username || !email || !password) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await signUp(email, password, username);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.message || "Failed to create account. Please try again.");
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
          {/* Title */}
          <View style={{ alignItems: "center", marginBottom: Spacing.xxl }}>
            <Text style={[Typography.displayMedium, { color: Colors.textPrimary, marginBottom: Spacing.sm }]}>
              Create Account
            </Text>
            <Text style={[Typography.bodyLarge, { color: Colors.textSecondary }]}>
              Join the future of payments
            </Text>
          </View>

          {/* Username Input */}
          <View style={{ marginBottom: Spacing.md }}>
            <View style={{
              backgroundColor: "#13122A",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
              borderRadius: 12,
              height: 56,
              justifyContent: "center",
              paddingHorizontal: Spacing.md,
            }}>
              <Pressable>
                <Text style={[Typography.bodyLarge, { color: username ? Colors.textPrimary : Colors.textMuted }]}>
                  {username || "Username"}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Email Input */}
          <View style={{ marginBottom: Spacing.md }}>
            <View style={{
              backgroundColor: "#13122A",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
              borderRadius: 12,
              height: 56,
              justifyContent: "center",
              paddingHorizontal: Spacing.md,
            }}>
              <Pressable>
                <Text style={[Typography.bodyLarge, { color: email ? Colors.textPrimary : Colors.textMuted }]}>
                  {email || "Email address"}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Password Input */}
          <View style={{ marginBottom: Spacing.lg }}>
            <View style={{
              backgroundColor: "#13122A",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
              borderRadius: 12,
              height: 56,
              justifyContent: "center",
              paddingHorizontal: Spacing.md,
            }}>
              <Pressable>
                <Text style={[Typography.bodyLarge, { color: password ? Colors.textPrimary : Colors.textMuted }]}>
                  {password ? "••••••••" : "Password"}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Error */}
          {error && (
            <Animated.View entering={FadeInDown.duration(200)}>
              <Text style={[Typography.bodySmall, { color: Colors.danger, marginBottom: Spacing.md, textAlign: "center" }]}>
                {error}
              </Text>
            </Animated.View>
          )}

          {/* Sign Up Button */}
          <Pressable
            onPress={handleSignUp}
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
              {isLoading ? "Creating account..." : "Create Account"}
            </Text>
          </Pressable>

          {/* Login Link */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={{ marginTop: Spacing.lg, alignItems: "center" }}
          >
            <Text style={[Typography.bodyMedium, { color: Colors.textSecondary }]}>
              Already have an account?{" "}
              <Text style={{ color: Colors.primary, fontWeight: "600" }}>Sign In</Text>
            </Text>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
