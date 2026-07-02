import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Colors } from "../../src/constants/colors";
import { Typography } from "../../src/constants/typography";
import { Spacing } from "../../src/constants/spacing";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

export default function QRScreen() {
  const [activeTab, setActiveTab] = useState<"Scan" | "My QR">("Scan");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.baseLight }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.xl }}>
          {/* <Pressable>
            <Feather name="chevron-left" size={28} color={Colors.textLightPrimary} />
          </Pressable> */}
          <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "700", fontSize: 22 }]}>
            {activeTab === "Scan" ? "Scan to Pay" : "My QR Code"}
          </Text>
          <Pressable>
            <Feather name="image" size={24} color={Colors.textLightPrimary} />
          </Pressable>
        </View>

        {/* Segmented Control */}
        <View style={{ flexDirection: "row", backgroundColor: Colors.white, borderRadius: 99, padding: 4, marginBottom: Spacing.xl, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 2 }}>
          <Pressable 
            onPress={() => setActiveTab("Scan")}
            style={{ flex: 1, backgroundColor: activeTab === "Scan" ? "#111111" : "transparent", borderRadius: 99, paddingVertical: 12, alignItems: "center" }}
          >
            <Text style={[Typography.labelLarge, { color: activeTab === "Scan" ? Colors.white : Colors.textLightSecondary, fontWeight: "600" }]}>Scan</Text>
          </Pressable>
          <Pressable 
            onPress={() => setActiveTab("My QR")}
            style={{ flex: 1, backgroundColor: activeTab === "My QR" ? "#111111" : "transparent", borderRadius: 99, paddingVertical: 12, alignItems: "center" }}
          >
            <Text style={[Typography.labelLarge, { color: activeTab === "My QR" ? Colors.white : Colors.textLightSecondary, fontWeight: "600" }]}>My QR</Text>
          </Pressable>
        </View>

        {activeTab === "Scan" ? (
          <Animated.View entering={FadeIn} exiting={FadeOut}>
            <Text style={[Typography.bodyMedium, { color: Colors.textLightPrimary, textAlign: "center", marginBottom: Spacing.md, fontWeight: "500" }]}>
              Align the QR code within the frame
            </Text>

            {/* Camera Viewfinder Fake */}
            <View style={{ backgroundColor: "#111111", height: 380, borderRadius: 24, overflow: "hidden", marginBottom: Spacing.xl, alignItems: "center", justifyContent: "center" }}>
              {/* Frame Corners */}
              <View style={{ position: "absolute", top: 40, left: 40, width: 40, height: 40, borderTopWidth: 4, borderLeftWidth: 4, borderColor: Colors.white, borderTopLeftRadius: 16 }} />
              <View style={{ position: "absolute", top: 40, right: 40, width: 40, height: 40, borderTopWidth: 4, borderRightWidth: 4, borderColor: Colors.white, borderTopRightRadius: 16 }} />
              <View style={{ position: "absolute", bottom: 80, left: 40, width: 40, height: 40, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: Colors.white, borderBottomLeftRadius: 16 }} />
              <View style={{ position: "absolute", bottom: 80, right: 40, width: 40, height: 40, borderBottomWidth: 4, borderRightWidth: 4, borderColor: Colors.white, borderBottomRightRadius: 16 }} />

              {/* Dummy QR */}
              <View style={{ width: 160, height: 160, backgroundColor: Colors.white, borderRadius: 16, justifyContent: "center", alignItems: "center", padding: 16, marginTop: -20 }}>
                <View style={{ width: "100%", height: "100%", borderWidth: 2, borderColor: "#111111", borderStyle: "dashed", borderRadius: 8, justifyContent: "center", alignItems: "center" }}>
                  <Feather name="grid" size={48} color="#111111" />
                </View>
              </View>

              {/* Flash Button */}
              <Pressable style={{ position: "absolute", bottom: 24, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", borderRadius: 99, paddingVertical: 10, paddingHorizontal: 20 }}>
                <Feather name="zap" size={16} color={Colors.white} style={{ marginRight: 8 }} />
                <Text style={[Typography.labelLarge, { color: Colors.white, fontWeight: "600" }]}>Flash</Text>
              </Pressable>
            </View>

            {/* OR SELECT FROM */}
            <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.md }]}>
              Or select from
            </Text>

            <View style={{ backgroundColor: Colors.white, borderRadius: 16, paddingHorizontal: Spacing.lg, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}>
              {[
                { icon: "image", title: "Photo Library", sub: "Upload QR from gallery" },
                { icon: "plus-square", title: "Enter Amount", sub: "Enter merchant amount" },
              ].map((item, idx) => (
                <Pressable key={idx} style={{ flexDirection: "row", alignItems: "center", paddingVertical: Spacing.lg, borderBottomWidth: idx === 1 ? 0 : 1, borderBottomColor: Colors.borderLight }}>
                  <Feather name={item.icon as any} size={24} color={Colors.textLightPrimary} style={{ marginRight: Spacing.md }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>{item.title}</Text>
                    <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>{item.sub}</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={Colors.textLightSecondary} />
                </Pressable>
              ))}
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={{ alignItems: "center", paddingTop: Spacing.lg }}>
            <View style={{ backgroundColor: Colors.white, borderRadius: 32, padding: Spacing.xxl, alignItems: "center", width: "100%", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 4 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.baseLight, justifyContent: "center", alignItems: "center", marginBottom: Spacing.lg }}>
                <Feather name="user" size={32} color={Colors.textLightPrimary} />
              </View>
              <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: Spacing.xs }]}>@username</Text>
              <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginBottom: Spacing.xxl }]}>StellarPay</Text>

              {/* Fake Personal QR Code */}
              <View style={{ width: 220, height: 220, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: 24, justifyContent: "center", alignItems: "center", marginBottom: Spacing.xl }}>
                <Feather name="grid" size={140} color="#000" />
              </View>

              <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, textAlign: "center", paddingHorizontal: Spacing.lg }]}>
                Show this QR code to securely receive funds instantly.
              </Text>
            </View>

            <View style={{ flexDirection: "row", marginTop: Spacing.xl, gap: Spacing.lg }}>
              <Pressable style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: Colors.white, paddingVertical: Spacing.md, borderRadius: 99, borderWidth: 1, borderColor: Colors.borderLight }}>
                <Feather name="download" size={20} color={Colors.textLightPrimary} style={{ marginRight: Spacing.sm }} />
                <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary }]}>Save</Text>
              </Pressable>
              <Pressable style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#000", paddingVertical: Spacing.md, borderRadius: 99 }}>
                <Feather name="share-2" size={20} color={Colors.white} style={{ marginRight: Spacing.sm }} />
                <Text style={[Typography.labelLarge, { color: Colors.white }]}>Share</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
