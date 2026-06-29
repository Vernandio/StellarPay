import React from "react";
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Colors } from "../../constants/colors";
import { Typography } from "../../constants/typography";
import { Spacing, Radius } from "../../constants/spacing";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 10 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const getButtonStyle = (): ViewStyle => {
    switch (variant) {
      case "primary":
        return {
          backgroundColor: Colors.primary,
          shadowColor: Colors.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4,
          shadowRadius: 24,
          elevation: 8,
        };
      case "secondary":
        return {
          backgroundColor: Colors.surface,
          borderWidth: 0.5,
          borderColor: Colors.border,
        };
      case "ghost":
        return {
          backgroundColor: Colors.transparent,
        };
      case "danger":
        return {
          backgroundColor: Colors.danger,
          shadowColor: Colors.danger,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4,
          shadowRadius: 24,
          elevation: 8,
        };
      default:
        return {};
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case "primary":
      case "danger":
        return Colors.white;
      case "secondary":
        return Colors.textPrimary;
      case "ghost":
        return Colors.primary;
      default:
        return Colors.textPrimary;
    }
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        styles.base,
        getButtonStyle(),
        disabled && styles.disabled,
        animatedStyle,
        style,
      ]}
    >
      <Text style={[Typography.labelLarge, { color: getTextColor() }, textStyle]}>
        {loading ? "Loading..." : title}
      </Text>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: Radius.full,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  disabled: {
    opacity: 0.5,
  },
});
