import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  Easing 
} from "react-native-reanimated";
import { Colors } from "../src/constants/colors";
import { Typography } from "../src/constants/typography";
import { Spacing } from "../src/constants/spacing";

const { width } = Dimensions.get("window");
const CIRCLE_SIZE = width * 0.6;

export default function PayTapScreen() {
  const pulse1 = useSharedValue(1);
  const pulse2 = useSharedValue(1);
  const pulse3 = useSharedValue(1);

  useEffect(() => {
    pulse1.value = withRepeat(
      withSequence(
        withTiming(1.5, { duration: 2000, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 0 })
      ),
      -1,
      false
    );
    
    setTimeout(() => {
      pulse2.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 2000, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 0 })
        ),
        -1,
        false
      );
    }, 600);

    setTimeout(() => {
      pulse3.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 2000, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 0 })
        ),
        -1,
        false
      );
    }, 1200);
  }, []);

  const animatedStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: pulse1.value }],
    opacity: 1 - (pulse1.value - 1) * 2,
  }));

  const animatedStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: pulse2.value }],
    opacity: 1 - (pulse2.value - 1) * 2,
  }));

  const animatedStyle3 = useAnimatedStyle(() => ({
    transform: [{ scale: pulse3.value }],
    opacity: 1 - (pulse3.value - 1) * 2,
  }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.baseLight }} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.lg, height: 56 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.white, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}>
          <Feather name="arrow-left" size={20} color={Colors.textLightPrimary} />
        </TouchableOpacity>
        <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "700", fontSize: 20 }]}>Tap to Pay</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: Spacing.xl }}>
        
        <View style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE, justifyContent: "center", alignItems: "center", marginBottom: Spacing.xxl * 2 }}>
          {/* Pulsing Circles */}
          <Animated.View style={[{ position: "absolute", width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2, backgroundColor: Colors.teal }, animatedStyle1]} />
          <Animated.View style={[{ position: "absolute", width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2, backgroundColor: Colors.teal }, animatedStyle2]} />
          <Animated.View style={[{ position: "absolute", width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2, backgroundColor: Colors.teal }, animatedStyle3]} />
          
          {/* Center Icon */}
          <View style={{ width: CIRCLE_SIZE * 0.4, height: CIRCLE_SIZE * 0.4, borderRadius: CIRCLE_SIZE * 0.2, backgroundColor: Colors.white, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 8 }}>
            <Feather name="wifi" size={40} color={Colors.teal} style={{ transform: [{ rotate: "90deg" }] }} />
          </View>
        </View>

        <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, textAlign: "center", marginBottom: Spacing.sm }]}>Ready to Pay</Text>
        <Text style={[Typography.bodyLarge, { color: Colors.textLightSecondary, textAlign: "center" }]}>
          Hold your phone near the payment reader to send funds securely via NFC.
        </Text>
      </View>

      <View style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ paddingVertical: Spacing.lg, alignItems: "center" }}
        >
          <Text style={[Typography.labelLarge, { color: Colors.textLightSecondary, fontWeight: "700" }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
