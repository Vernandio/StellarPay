import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image, Dimensions, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { Colors } from "../../src/constants/colors";
import { Spacing } from "../../src/constants/spacing";

const { width, height } = Dimensions.get("window");

const BTN_HEIGHT = 56;
const BTN_RADIUS = 24;

const features = [
  {
    title: "Smooth &\nFrictionless",
    description: "Experience instant, borderless payments that feel just like your favorite fintech app."
  },
  {
    title: "Scan, Tap,\nand Pay",
    description: "Checkout seamlessly using QR codes or tap-to-pay NFC at your local merchants."
  },
  {
    title: "Pay by\nUsername",
    description: "Forget long account numbers. Send money globally using just a simple username."
  }
];

export default function LandingScreen() {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setActiveIndex(Math.round(index));
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      
      {/* ── Background Globe ── */}
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
        <Image
          source={require("../../assets/images/globe.png")}
          style={{ width: width, height: height * 0.6, opacity: 0.6, resizeMode: "cover", marginTop: height * 0.1 }}
        />
      </View>

      <SafeAreaView style={{ flex: 1, zIndex: 1 }} edges={["top", "bottom"]}>
        
        {/* ── Top Section: Logo & Text ── */}
        <View style={{ flex: 1 }}>
          
          {/* Logo Header */}
          <Animated.View 
            entering={FadeInDown.duration(600).delay(100)}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: Spacing.xl }}
          >
            <Feather name="aperture" size={28} color="#FFFFFF" style={{ marginRight: Spacing.sm }} />
            <Text style={{ fontSize: 24, fontWeight: "700", color: "#FFFFFF", letterSpacing: -0.5 }}>StellarPay</Text>
          </Animated.View>

          {/* Spacer to push text down */}
          <View style={{ flex: 1 }} />

          {/* Carousel Text */}
          <Animated.View 
            entering={FadeInDown.duration(600).delay(300)}
            style={{ paddingBottom: Spacing.xxl }}
          >
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              {features.map((feature, index) => (
                <View key={index} style={{ width, alignItems: "center" }}>
                  <Text
                    style={{
                      fontSize: 36,
                      fontWeight: "700",
                      color: "#FFFFFF",
                      textAlign: "center",
                      lineHeight: 42,
                      letterSpacing: -1,
                      marginBottom: Spacing.md,
                    }}
                  >
                    {feature.title}
                  </Text>
                  <Text
                    style={{
                      fontSize: 15,
                      color: "rgba(255, 255, 255, 0.7)",
                      textAlign: "center",
                      lineHeight: 22,
                      paddingHorizontal: Spacing.xl,
                    }}
                  >
                    {feature.description}
                  </Text>
                </View>
              ))}
            </ScrollView>

            {/* Pagination Dots */}
            <View style={{ flexDirection: "row", justifyContent: "center", marginTop: Spacing.xl }}>
              {features.map((_, index) => (
                <View
                  key={index}
                  style={{
                    width: activeIndex === index ? 24 : 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: activeIndex === index ? "#FFFFFF" : "rgba(255, 255, 255, 0.3)",
                    marginHorizontal: 4,
                  }}
                />
              ))}
            </View>
          </Animated.View>
        </View>

        {/* ── Bottom Section: White Curve & Buttons ── */}
        <View style={{ height: 260, justifyContent: "flex-end" }}>
          {/* Huge circle to create the elliptical curve */}
          <View 
            style={{
              position: "absolute",
              top: 0,
              left: -(width * 0.5),
              width: width * 2,
              height: width * 2,
              borderRadius: width,
              backgroundColor: "#FFFFFF",
              zIndex: -1,
            }}
          />
          
          <Animated.View
            entering={FadeInUp.duration(600).delay(500).springify()}
            style={{ paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl + 20 }}
          >
            {/* Create Account Button */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/(auth)/signup");
              }}
              activeOpacity={0.8}
              style={{
                height: BTN_HEIGHT,
                borderRadius: BTN_RADIUS,
                backgroundColor: "#111111",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                marginBottom: Spacing.md,
              }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
                Create Account
              </Text>
              <Feather name="arrow-right" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Log In Button */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/(auth)/login");
              }}
              activeOpacity={0.8}
              style={{
                height: BTN_HEIGHT,
                borderRadius: BTN_RADIUS,
                backgroundColor: "#FFFFFF",
                borderWidth: 1.5,
                borderColor: "#E5E5EA",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              <Text style={{ color: "#000000", fontSize: 16, fontWeight: "700" }}>
                Log In
              </Text>
              <Feather name="arrow-right" size={18} color="#000000" />
            </TouchableOpacity>
          </Animated.View>
        </View>

      </SafeAreaView>
    </View>
  );
}
