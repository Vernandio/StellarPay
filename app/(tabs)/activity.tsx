import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Colors } from "../../src/constants/colors";
import { Typography } from "../../src/constants/typography";
import { Spacing } from "../../src/constants/spacing";

export default function ActivityScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={["top"]}>
      <View style={{ flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }}>
        <Text style={[Typography.headingLarge, { color: Colors.textPrimary, marginBottom: Spacing.lg }]}>
          Activity
        </Text>

        {/* Empty State */}
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Feather name="clock" size={48} color={Colors.teal} style={{ marginBottom: Spacing.md }} />
          <Text style={[Typography.headingMedium, { color: Colors.textPrimary, marginBottom: Spacing.sm }]}>
            No activity yet
          </Text>
          <Text style={[Typography.bodyMedium, { color: Colors.textMuted, textAlign: "center" }]}>
            Your transaction history will appear here
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
