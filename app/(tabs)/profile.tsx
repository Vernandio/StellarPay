import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "../../src/constants/colors";
import { Typography } from "../../src/constants/typography";
import { Spacing } from "../../src/constants/spacing";
import { useAuth } from "../../src/hooks/useAuth";
import { useWallet } from "../../src/hooks/useWallet";
import { truncateAddress } from "../../src/utils/format";
import { signOut } from "../../src/services/firebase/auth";

export default function ProfileScreen() {
  const { profile } = useAuth();
  const { publicKey } = useWallet();

  const handleSignOut = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await signOut();
    router.replace("/(auth)/login");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={["top"]}>
      <View style={{ flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }}>
        <Text style={[Typography.headingLarge, { color: Colors.textPrimary, marginBottom: Spacing.xl }]}>
          Profile
        </Text>

        {/* Profile Card */}
        <Animated.View entering={FadeInDown.duration(280)}>
          <View style={{
            backgroundColor: Colors.surface,
            borderRadius: 16,
            borderWidth: 0.5,
            borderColor: Colors.border,
            padding: Spacing.lg,
            alignItems: "center",
            marginBottom: Spacing.lg,
          }}>
            <View style={{
              width: 72,
              height: 72,
              borderRadius: 9999,
              backgroundColor: Colors.surface2,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: Spacing.md,
            }}>
              <Feather name="user" size={28} color={Colors.primary} />
            </View>
            <Text style={[Typography.headingMedium, { color: Colors.textPrimary, marginBottom: Spacing.xs }]}>
              {profile?.displayName || "User"}
            </Text>
            <Text style={[Typography.bodySmall, { color: Colors.textMuted, marginBottom: Spacing.xs }]}>
              @{profile?.username || "username"}
            </Text>
            {publicKey && (
              <Text style={[Typography.mono, { color: Colors.textMuted }]}>
                {truncateAddress(publicKey)}
              </Text>
            )}
          </View>
        </Animated.View>

        {/* Sign Out */}
        <Pressable
          onPress={handleSignOut}
          style={{
            height: 56,
            borderRadius: 9999,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: Colors.surface,
            borderWidth: 0.5,
            borderColor: Colors.border,
          }}
        >
          <Text style={[Typography.labelLarge, { color: Colors.danger }]}>Sign Out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
