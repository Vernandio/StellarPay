import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../../constants/colors";
import { Typography } from "../../constants/typography";
import { Spacing, Radius } from "../../constants/spacing";

interface BadgeProps {
  text: string;
  variant?: "default" | "success" | "warning" | "danger";
}

export const Badge: React.FC<BadgeProps> = ({ text, variant = "default" }) => {
  const getColors = () => {
    switch (variant) {
      case "success": return { bg: Colors.tealGlow, text: Colors.teal };
      case "warning": return { bg: "rgba(240, 165, 0, 0.2)", text: Colors.amber };
      case "danger": return { bg: Colors.dangerGlow, text: Colors.danger };
      default: return { bg: Colors.primaryGlow, text: Colors.primary };
    }
  };

  const colors = getColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[Typography.labelSmall, { color: colors.text }]}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    alignSelf: "flex-start",
  },
});
