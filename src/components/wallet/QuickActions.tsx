// TODO: Implement QuickActions with animated icons
import React from "react";
import { View, Text, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors } from "../../constants/colors";
import { Typography } from "../../constants/typography";
import { Spacing } from "../../constants/spacing";

interface QuickAction {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
}

interface QuickActionsProps {
  actions: QuickAction[];
}

export const QuickActions: React.FC<QuickActionsProps> = ({ actions }) => {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      {actions.map((action) => (
        <Pressable
          key={action.label}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            action.onPress();
          }}
          style={{
            flex: 1,
            alignItems: "center",
            paddingVertical: Spacing.md,
            marginHorizontal: Spacing.xs,
            backgroundColor: Colors.surface,
            borderRadius: 16,
            borderWidth: 0.5,
            borderColor: Colors.border,
          }}
        >
          <View style={{
            width: 48,
            height: 48,
            borderRadius: 9999,
            backgroundColor: Colors.surface2,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: Spacing.sm,
          }}>
            <Feather name={action.icon} size={24} color={Colors.primary} />
          </View>
          <Text style={[Typography.labelLarge, { color: Colors.textPrimary }]}>{action.label}</Text>
        </Pressable>
      ))}
    </View>
  );
};
