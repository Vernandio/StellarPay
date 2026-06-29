import React, { useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useAuth } from "../src/hooks/useAuth";
import { Colors } from "../src/constants/colors";
import { Typography } from "../src/constants/typography";
import { Spacing, Radius } from "../src/constants/spacing";

const { width } = Dimensions.get("window");

export default function LandingScreen() {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Animation values for floating payment badge
  const floatAnim = useSharedValue(0);

  useEffect(() => {
    floatAnim.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1, // Infinite repetition
      true // Reverse direction
    );
  }, []);

  const floatingStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: floatAnim.value }],
    };
  });

  const handlePressCTA = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isAuthenticated) {
      router.replace("/(tabs)");
    } else {
      router.replace("/(auth)/login");
    }
  };

  const handlePressSecondary = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Directly go to Sign Up screen as secondary action
    router.replace("/(auth)/signup");
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <Animated.View entering={FadeInUp.duration(600)}>
          <View style={styles.loadingLogo}>
            <Feather name="zap" size={32} color={Colors.primary} />
          </View>
        </Animated.View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Top Header */}
      <Animated.View 
        entering={FadeInUp.delay(100).duration(500)} 
        style={styles.header}
      >
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Feather name="zap" size={18} color={Colors.white} />
          </View>
          <Text style={[Typography.headingMedium, styles.logoText]}>StellarPay</Text>
        </View>
        <View style={styles.tag}>
          <Text style={[Typography.labelSmall, styles.tagText]}>APAC HACKATHON</Text>
        </View>
      </Animated.View>

      {/* Visual Showcase (Minimalist Mock Card) */}
      <View style={styles.showcaseContainer}>
        <Animated.View 
          entering={FadeInDown.delay(200).duration(600).springify()}
          style={[styles.mockCard, floatingStyle]}
        >
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={styles.cardIndicator} />
            <Feather name="wifi" size={16} color={Colors.textMuted} />
          </View>

          {/* Card Balance */}
          <View style={styles.cardBody}>
            <Text style={[Typography.labelSmall, styles.cardSubtitle]}>USDC BALANCE</Text>
            <View style={styles.balanceRow}>
              <Text style={styles.currencySymbol}>$</Text>
              <Text style={styles.balanceValue}>1,250</Text>
              <Text style={styles.balanceDecimal}>.00</Text>
            </View>
          </View>

          {/* Card Footer */}
          <View style={styles.cardFooter}>
            <View>
              <Text style={[Typography.labelSmall, styles.cardHolderLabel]}>STELLAR MERCHANT</Text>
              <Text style={styles.cardHolder}>Tap to Settle Pay</Text>
            </View>
            <View style={styles.badgeGlow}>
              <Feather name="check-circle" size={18} color={Colors.teal} />
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Hero Headline & Subtext */}
      <View style={styles.textContainer}>
        <Animated.Text 
          entering={FadeInDown.delay(300).duration(600)}
          style={[Typography.displayMedium, styles.headline]}
        >
          Gasless Payments.{"\n"}Instant Settlement.
        </Animated.Text>
        <Animated.Text 
          entering={FadeInDown.delay(450).duration(600)}
          style={[Typography.bodyLarge, styles.subtext]}
        >
          P2P Transfers and NFC payments settled in local currencies using paths on the Stellar blockchain. Completely sponsored fees.
        </Animated.Text>
      </View>

      {/* Features Grid */}
      <View style={styles.featuresContainer}>
        <Animated.View 
          entering={FadeInDown.delay(550).duration(600)}
          style={styles.featureItem}
        >
          <View style={[styles.featureIcon, { backgroundColor: Colors.primaryGlow }]}>
            <Feather name="send" size={16} color={Colors.primary} />
          </View>
          <View style={styles.featureTextCol}>
            <Text style={styles.featureTitle}>Gasless Transfers</Text>
            <Text style={styles.featureDesc}>Protocol 13 Fee Bump transactions sponsor network fees.</Text>
          </View>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(650).duration(600)}
          style={styles.featureItem}
        >
          <View style={[styles.featureIcon, { backgroundColor: Colors.tealGlow }]}>
            <Feather name="refresh-cw" size={16} color={Colors.teal} />
          </View>
          <View style={styles.featureTextCol}>
            <Text style={styles.featureTitle}>Auto Path Swapping</Text>
            <Text style={styles.featureDesc}>Send USDC, settle automatically in local merchant assets.</Text>
          </View>
        </Animated.View>
      </View>

      {/* Bottom Actions */}
      <Animated.View 
        entering={FadeInDown.delay(750).duration(600)}
        style={styles.footer}
      >
        <Pressable 
          onPress={handlePressCTA}
          style={({ pressed }) => [
            styles.ctaButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={[Typography.labelLarge, styles.ctaText]}>
            {isAuthenticated ? "Enter Dashboard" : "Get Started"}
          </Text>
          <Feather name="arrow-right" size={16} color={Colors.white} style={{ marginLeft: 6 }} />
        </Pressable>

        {!isAuthenticated && (
          <Pressable 
            onPress={handlePressSecondary}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={[Typography.bodyMedium, styles.secondaryText]}>
              Create New Wallet Account
            </Text>
          </Pressable>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.base,
    paddingHorizontal: Spacing.lg,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingLogo: {
    width: 64,
    height: 64,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoIcon: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  logoText: {
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
    fontWeight: "800",
  },
  tag: {
    backgroundColor: Colors.surface2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  tagText: {
    color: Colors.textMuted,
    fontSize: 9,
  },
  showcaseContainer: {
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: Spacing.lg,
  },
  mockCard: {
    width: width - Spacing.lg * 2,
    height: 170,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    padding: Spacing.md,
    justifyContent: "space-between",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardBody: {
    marginVertical: Spacing.sm,
  },
  cardIndicator: {
    width: 32,
    height: 22,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  cardSubtitle: {
    color: Colors.textMuted,
    fontSize: 10,
    marginBottom: 4,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  currencySymbol: {
    fontSize: 22,
    color: Colors.textSecondary,
    fontWeight: "300",
    marginRight: 2,
  },
  balanceValue: {
    fontSize: 36,
    color: Colors.textPrimary,
    fontWeight: "300",
  },
  balanceDecimal: {
    fontSize: 22,
    color: Colors.textSecondary,
    fontWeight: "400",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  cardHolderLabel: {
    color: Colors.textMuted,
    fontSize: 8,
  },
  cardHolder: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  badgeGlow: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.tealGlow,
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    marginBottom: Spacing.lg,
  },
  headline: {
    color: Colors.textPrimary,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "800",
    marginBottom: Spacing.sm,
  },
  subtext: {
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  featuresContainer: {
    marginBottom: Spacing.xl,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  featureTextCol: {
    flex: 1,
  },
  featureTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  featureDesc: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  footer: {
    marginTop: "auto",
    paddingBottom: Spacing.lg,
  },
  ctaButton: {
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  ctaText: {
    color: Colors.white,
    fontWeight: "700",
  },
  secondaryButton: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  secondaryText: {
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
