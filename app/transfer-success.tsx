import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
} from "react-native-reanimated";
import { Colors } from "../src/constants/colors";
import { Typography } from "../src/constants/typography";
import { Spacing } from "../src/constants/spacing";

const { width } = Dimensions.get("window");

export default function TransferSuccessScreen() {
  const params = useLocalSearchParams();
  
  const scale = useSharedValue(0);
  const checkScale = useSharedValue(0);
  const fadeY = useSharedValue(50);
  const fadeOpacity = useSharedValue(0);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    scale.value = withSpring(1, { damping: 12, stiffness: 100 });
    checkScale.value = withDelay(
      300, 
      withSequence(
        withSpring(1.2, { damping: 10 }),
        withSpring(1, { damping: 12 })
      )
    );
    
    fadeY.value = withDelay(500, withSpring(0, { damping: 15 }));
    fadeOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));
  }, []);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: fadeOpacity.value,
    transform: [{ translateY: fadeY.value }],
  }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F9FA", justifyContent: "space-between" }}>
      
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: Spacing.xl }}>
        {/* Animated Checkmark Circle */}
        <Animated.View 
          style={[
            {
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: Colors.teal,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: Spacing.xxl,
              shadowColor: Colors.teal,
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 10,
            },
            circleStyle
          ]}
        >
          <Animated.View style={checkStyle}>
            <Feather name="check" size={60} color={Colors.white} />
          </Animated.View>
        </Animated.View>

        {/* Animated Text Content */}
        <Animated.View style={[{ alignItems: "center" }, contentStyle]}>
          <Text style={[Typography.labelLarge, { color: Colors.textLightSecondary, marginBottom: Spacing.xs }]}>
            Successfully Sent
          </Text>
          <Text style={[Typography.displayLarge, { color: Colors.textLightPrimary, marginBottom: Spacing.xl }]}>
            {params.amount} {params.currency}
          </Text>
          
          <View style={{ backgroundColor: Colors.white, borderRadius: 16, padding: Spacing.lg, width: width - Spacing.xl * 2, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.md }}>
              <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>To</Text>
              <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary }]}>{params.name}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>Transaction ID</Text>
              <Text style={[Typography.bodyMedium, { color: Colors.textLightPrimary, maxWidth: 150 }]} numberOfLines={1} ellipsizeMode="middle">
                {params.hash || "Pending..."}
              </Text>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Done Button */}
      <Animated.View style={[{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl }, contentStyle]}>
        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync();
            router.dismissAll(); // Go back to root (home)
          }}
          style={{
            backgroundColor: "#111111",
            borderRadius: 24,
            paddingVertical: 18,
            alignItems: "center",
          }}
        >
          <Text style={[Typography.labelLarge, { color: Colors.white, fontWeight: "700", fontSize: 16 }]}>Done</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}
