import { TouchableOpacity, Text, ActivityIndicator, View } from "react-native";
import { AntDesign } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { useGoogleAuth } from "../hooks/useGoogleAuth";
import { Colors } from "../constants/colors";
import { Typography } from "../constants/typography";
import { Spacing } from "../constants/spacing";

/**
 * Self-contained "Continue with Google" button. Owns the whole OAuth flow
 * via useGoogleAuth (prompt → Firebase → route), so screens just drop it in.
 */
export function GoogleSignInButton({
  label = "Continue with Google",
}: {
  label?: string;
}) {
  const { promptGoogle, isProcessing, error } = useGoogleAuth();

  return (
    <View>
      <TouchableOpacity
        onPress={promptGoogle}
        disabled={isProcessing}
        activeOpacity={0.8}
        style={{
          height: 56,
          borderRadius: 24,
          backgroundColor: Colors.white,
          borderWidth: 1.5,
          borderColor: Colors.borderLight,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          opacity: isProcessing ? 0.6 : 1,
        }}
      >
        {isProcessing ? (
          <ActivityIndicator color={Colors.textLightPrimary} />
        ) : (
          <>
            <AntDesign name="google" size={18} color="#EA4335" />
            <Text
              style={[
                Typography.labelLarge,
                { color: "#111111", fontWeight: "700", fontSize: 16 },
              ]}
            >
              {label}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {error && (
        <Animated.View entering={FadeIn.duration(200)}>
          <Text
            style={[
              Typography.bodySmall,
              {
                color: Colors.danger,
                textAlign: "center",
                marginTop: Spacing.sm,
              },
            ]}
          >
            {error}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

/**
 * A simple "or" divider to sit between the primary CTA and the Google button.
 */
export function OrDivider() {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginVertical: Spacing.lg,
      }}
    >
      <View style={{ flex: 1, height: 1, backgroundColor: Colors.borderLight }} />
      <Text
        style={[
          Typography.bodySmall,
          { color: Colors.textLightMuted, marginHorizontal: Spacing.md },
        ]}
      >
        or
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: Colors.borderLight }} />
    </View>
  );
}
