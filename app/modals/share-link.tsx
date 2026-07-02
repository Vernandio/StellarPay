import { View, Text, Pressable, TextInput, ScrollView, Image } from "react-native";
import { router } from "expo-router";
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../src/constants/colors";
import { Typography } from "../../src/constants/typography";
import { Spacing } from "../../src/constants/spacing";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";

export default function ShareLinkModal() {
  const insets = useSafeAreaInsets();
  const socials = [
    { id: "whatsapp", name: "WhatsApp", icon: "whatsapp", color: "#25D366" },
    { id: "telegram", name: "Telegram", icon: "telegram-plane", color: "#0088cc" },
    { id: "discord", name: "Discord", icon: "discord", color: "#5865F2" },
    { id: "line", name: "LINE", icon: "line", color: "#00C300" },
    { id: "wechat", name: "WeChat", icon: "weixin", color: "#07C160" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end", alignItems: "center" }}>
      <Pressable style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} onPress={() => router.back()} />
      <Animated.View
        entering={SlideInDown.duration(300).springify()}
        exiting={SlideOutDown.duration(200)}
        style={{
          width: "100%",
          backgroundColor: Colors.white,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          padding: Spacing.xl,
          paddingBottom: Math.max(insets.bottom, Spacing.xl),
          alignItems: "center",
          position: "relative",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 10,
        }}
      >
        {/* Floating Link Icon */}
        <View style={{
          position: "absolute",
          top: -36,
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: Colors.white,
          justifyContent: "center",
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
          elevation: 4
        }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.surfaceLight, justifyContent: "center", alignItems: "center" }}>
            <Feather name="link" size={24} color={Colors.textLightPrimary} />
          </View>
        </View>

        {/* Close Button */}
        <Pressable
          onPress={() => router.back()}
          style={{ position: "absolute", top: 20, right: 20, width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.white, justifyContent: "center", alignItems: "center" }}
        >
          <Feather name="x" size={20} color={Colors.textLightSecondary} />
        </Pressable>

        {/* Content */}
        <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "800", marginTop: Spacing.xl, marginBottom: Spacing.xs }]}>
          Share with Friends
        </Text>
        <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, textAlign: "center", paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl, lineHeight: 22 }]}>
          Trading is more effective when you connect with friends!
        </Text>

        {/* Link Input */}
        <View style={{ width: "100%", marginBottom: Spacing.xl }}>
          <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: Spacing.sm }]}>
            Share your link
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: Colors.surfaceLight, borderRadius: 16, paddingHorizontal: Spacing.lg, height: 56 }}>
            <Text style={[Typography.bodyLarge, { color: Colors.textLightPrimary, flex: 1 }]} numberOfLines={1}>
              https://stellarpay.app/pay/alex
            </Text>
            <Pressable style={{ padding: 4 }}>
              <Feather name="copy" size={24} color={Colors.textLightSecondary} />
            </Pressable>
          </View>
        </View>

        {/* Socials Grid */}
        <View style={{ width: "100%", marginBottom: Spacing.xl }}>
          <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: Spacing.md }]}>
            Share to
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {socials.map((social) => (
              <Pressable key={social.id} style={{ alignItems: "center" }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: social.color, justifyContent: "center", alignItems: "center", marginBottom: Spacing.sm }}>
                  <FontAwesome5 name={social.icon} size={28} color={Colors.white} />
                </View>
                <Text style={[Typography.labelSmall, { color: Colors.textLightPrimary, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }]} numberOfLines={1}>
                  {social.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Send Button */}
        <Pressable
          onPress={() => router.back()}
          style={{
            width: "100%",
            height: 56,
            borderRadius: 16,
            backgroundColor: "#000",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={[Typography.labelLarge, { color: Colors.white, fontWeight: "700" }]}>Send</Text>
        </Pressable>

      </Animated.View>
    </View>
  );
}
