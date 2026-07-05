import { View, Text, Pressable, Image, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { Colors } from "../../src/constants/colors";
import { Typography } from "../../src/constants/typography";
import { Spacing } from "../../src/constants/spacing";

const { width } = Dimensions.get("window");

const BTN_HEIGHT = 56;
const BTN_RADIUS = 16;

export default function LandingScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(100)}
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {/* Globe */}
          <View
            style={{
              position: "absolute",
              bottom: -80,
              left: 0,
              right: 0,
              alignItems: "center",
              overflow: "hidden",
            }}
          >
            <Image
              source={require("../../assets/images/globe.png")}
              style={{ width, height: 400, opacity: 0.72, resizeMode: "cover" }}
            />
          </View>

          {/* Logo */}
          <Feather
            name="aperture"
            size={60}
            color="#FFF"
            style={{ marginBottom: 14 }}
          />
          <Text
            style={{
              fontSize: 46,
              fontWeight: "800",
              color: "#FFF",
              letterSpacing: -1.5,
            }}
          >
            Stellar<Text style={{ fontWeight: "300" }}>Pay</Text>
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: "rgba(255,255,255,0.5)",
              letterSpacing: 1,
              marginTop: 6,
            }}
          >
            Fast. Secure. Borderless.
          </Text>
        </Animated.View>

        {/* ── Bottom Card ───────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(250).springify()}
          style={{
            backgroundColor: "#FFFFFF",
            borderTopLeftRadius: 36,
            borderTopRightRadius: 36,
            paddingTop: Spacing.xl,
            paddingHorizontal: Spacing.xl,
            paddingBottom: Spacing.xxl,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -8 },
            shadowOpacity: 0.08,
            shadowRadius: 24,
            elevation: 12,
          }}
        >
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: "#111",
              textAlign: "center",
              marginBottom: 4,
            }}
          >
            Welcome back 👋
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: "#8E8E93",
              textAlign: "center",
              marginBottom: Spacing.xl,
            }}
          >
            Sign in to continue to your account
          </Text>

          {/* ── Sign In ── */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/(auth)/login");
            }}
            style={{ marginBottom: Spacing.sm }}
          >
            {({ pressed }) => (
              <View
                style={{
                  height: BTN_HEIGHT,
                  borderRadius: BTN_RADIUS,
                  backgroundColor: "#111",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.8 : 1,
                }}
              >
                <Feather name="log-in" size={18} color="#FFF" />
                <Text
                  style={{
                    color: "#FFF",
                    fontSize: 16,
                    fontWeight: "700",
                    marginLeft: 10,
                  }}
                >
                  Sign In
                </Text>
              </View>
            )}
          </Pressable>

          {/* ── Continue with Google ── */}
          {/* <Pressable
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            style={{ marginBottom: Spacing.sm }}
          >
            {({ pressed }) => (
              <View style={{
                height: BTN_HEIGHT,
                borderRadius: BTN_RADIUS,
                backgroundColor: "#FFF",
                borderWidth: 1.5,
                borderColor: "#E5E5EA",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.75 : 1,
              }}>
                <Feather name="chrome" size={18} color="#F59E0B" />
                <Text style={{ color: "#111", fontSize: 16, fontWeight: "600", marginLeft: 10 }}>Continue with Google</Text>
              </View>
            )}
          </Pressable> */}
          <View
            style={{
              height: BTN_HEIGHT,
              borderRadius: BTN_RADIUS,
              backgroundColor: "#F5F5F7",
              borderWidth: 1.5,
              borderColor: "#E5E5EA",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.55,
              marginBottom: Spacing.sm,
            }}
          >
            <Feather name="chrome" size={18} color="#F59E0B" />
            <Text
              style={{
                color: "#8E8E93",
                fontSize: 16,
                fontWeight: "600",
                marginLeft: 10,
              }}
            >
              Continue with Google
            </Text>
            <View
              style={{
                backgroundColor: "rgba(245,158,11,0.15)",
                borderRadius: 6,
                paddingHorizontal: 7,
                paddingVertical: 2,
                marginLeft: 8,
              }}
            >
              <Text
                style={{
                  color: "#F59E0B",
                  fontSize: 10,
                  fontWeight: "700",
                  letterSpacing: 0.5,
                }}
              >
                MAINTENANCE
              </Text>
            </View>
          </View>

          {/* ── Phone Number (Maintenance) ── */}
          <View
            style={{
              height: BTN_HEIGHT,
              borderRadius: BTN_RADIUS,
              backgroundColor: "#F5F5F7",
              borderWidth: 1.5,
              borderColor: "#E5E5EA",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.55,
              marginBottom: Spacing.xl,
            }}
          >
            <Feather name="smartphone" size={18} color="#8E8E93" />
            <Text
              style={{
                color: "#8E8E93",
                fontSize: 16,
                fontWeight: "600",
                marginLeft: 10,
              }}
            >
              Phone Number
            </Text>
            <View
              style={{
                backgroundColor: "rgba(245,158,11,0.15)",
                borderRadius: 6,
                paddingHorizontal: 7,
                paddingVertical: 2,
                marginLeft: 8,
              }}
            >
              <Text
                style={{
                  color: "#F59E0B",
                  fontSize: 10,
                  fontWeight: "700",
                  letterSpacing: 0.5,
                }}
              >
                MAINTENANCE
              </Text>
            </View>
          </View>

          {/* ── Sign up link ── */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(auth)/signup");
            }}
            style={{ alignItems: "center", marginBottom: Spacing.md }}
          >
            <Text style={{ fontSize: 15, color: "#8E8E93" }}>
              Don't have an account?{"  "}
              <Text style={{ color: "#111", fontWeight: "700" }}>Sign up</Text>
            </Text>
          </Pressable>

          {/* ── Security note ── */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather
              name="lock"
              size={12}
              color="#C7C7CC"
              style={{ marginRight: 5 }}
            />
            <Text style={{ fontSize: 12, color: "#C7C7CC" }}>
              Bank-grade security & end-to-end encryption
            </Text>
          </View>
        </Animated.View>
      </SafeAreaView>
      <View
        style={{
          backgroundColor: "#FFF",
          height: 40,
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: -1,
        }}
      />
    </View>
  );
}
