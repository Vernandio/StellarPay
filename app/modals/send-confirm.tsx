import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Colors } from "../../src/constants/colors";
import { Typography } from "../../src/constants/typography";
import { Spacing } from "../../src/constants/spacing";

export default function SendConfirmModal() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={["top", "bottom"]}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: Spacing.lg }}>
        <Feather name="check-circle" size={48} color={Colors.teal} style={{ marginBottom: Spacing.md }} />
        <Text style={[Typography.headingLarge, { color: Colors.textPrimary, marginBottom: Spacing.sm }]}>
          Confirm Payment
        </Text>
        <Text style={[Typography.bodyMedium, { color: Colors.textMuted, textAlign: "center", marginBottom: Spacing.xl }]}>
          Review and confirm your payment details
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={{
            height: 56,
            borderRadius: 9999,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: Colors.surface,
            borderWidth: 0.5,
            borderColor: Colors.border,
            width: "100%",
          }}
        >
          <Text style={[Typography.labelLarge, { color: Colors.textPrimary }]}>Close</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
