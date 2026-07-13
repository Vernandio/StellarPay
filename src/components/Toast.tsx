import React, { useEffect } from "react";
import { View, Text, Pressable, Platform, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../constants/colors";
import { Spacing } from "../constants/spacing";
import { Typography } from "../constants/typography";
import { useToastStore } from "../store/toastStore";

const { width } = Dimensions.get("window");
const isWeb = Platform.OS === "web";

export function Toast() {
  const { visible, message, type, hide } = useToastStore();
  const insets = useSafeAreaInsets();
  
  // Reanimated shared values
  const translateY = useSharedValue(-150);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Slide down and fade in
      translateY.value = withSpring(insets.top > 0 ? insets.top + 16 : 24, {
        damping: 15,
        stiffness: 100,
      });
      opacity.value = withTiming(1, { duration: 250 });
    } else {
      // Slide back up and fade out
      translateY.value = withTiming(-150, { duration: 250 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible, insets.top]);

  // Icon and border/glow colors based on status type
  let iconName: keyof typeof Feather.glyphMap = "info";
  let iconColor: string = Colors.primary;
  let borderColor: string = "rgba(123, 97, 255, 0.2)";

  if (type === "success") {
    iconName = "check-circle";
    iconColor = Colors.teal;
    borderColor = "rgba(29, 185, 138, 0.3)";
  } else if (type === "error") {
    iconName = "alert-circle";
    iconColor = Colors.danger;
    borderColor = "rgba(226, 75, 74, 0.3)";
  } else if (type === "warning") {
    iconName = "alert-triangle";
    iconColor = Colors.amber;
    borderColor = "rgba(240, 165, 0, 0.3)";
  }

  // IMPORTANT: All hooks must be called BEFORE any conditional return
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  // Safe to return early now — all hooks have been called
  if (!visible && opacity.value === 0) return null;

  // Toast width: Clamp to maximum reading width of 480px on web, stretch comfortably on mobile
  const toastWidth = isWeb ? Math.min(width - 32, 480) : width - 32;

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          position: Platform.OS === "web" ? "fixed" as any : "absolute",
          top: 0,
          left: isWeb ? "50%" : 16,
          marginLeft: isWeb ? -toastWidth / 2 : 0,
          width: toastWidth,
          zIndex: 99999,
          backgroundColor: "#1A1930", // Sleek dark surface matching surface theme
          borderRadius: 20,
          borderWidth: 1.5,
          borderColor: borderColor,
          paddingVertical: Spacing.md,
          paddingHorizontal: Spacing.lg,
          flexDirection: "row",
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.25,
          shadowRadius: 16,
          elevation: 10,
        },
      ]}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: "rgba(255,255,255,0.03)",
          justifyContent: "center",
          alignItems: "center",
          marginRight: Spacing.md,
        }}
      >
        <Feather name={iconName} size={20} color={iconColor} />
      </View>
      <Text
        style={[
          Typography.bodyMedium,
          {
            color: Colors.textPrimary,
            flex: 1,
            fontWeight: "600",
            lineHeight: 20,
          },
        ]}
      >
        {message}
      </Text>
      <Pressable
        onPress={hide}
        style={{
          padding: Spacing.xs,
          marginLeft: Spacing.sm,
          width: 36,
          height: 36,
          borderRadius: 18,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(255,255,255,0.03)",
        }}
      >
        <Feather name="x" size={16} color={Colors.textMuted} />
      </Pressable>
    </Animated.View>
  );
}
