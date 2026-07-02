import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { Colors } from "../../src/constants/colors";
import { Typography } from "../../src/constants/typography";
import { Spacing } from "../../src/constants/spacing";

export default function PayScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<"Pay" | "Request" | "Split">((params.tab as "Pay" | "Request" | "Split") || "Pay");

  React.useEffect(() => {
    if (params.tab) {
      setActiveTab(params.tab as "Pay" | "Request" | "Split");
    }
  }, [params.tab]);

  const handleTabPress = (tab: "Pay" | "Request" | "Split") => {
    Haptics.selectionAsync();
    setActiveTab(tab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "Pay":
        return (
          <Animated.View entering={FadeInDown.duration(300)}>
            {/* PAY TO */}
            <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.md }]}>
              Pay To
            </Text>
            
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: Spacing.lg }}>
              {[
                { icon: "user", title: "Friends", sub: "By username", route: "/pay-friends" },
                { icon: "wifi", title: "Tap to Pay", sub: "Near field", route: "/pay-tap" },
                { icon: "link", title: "Onchain", sub: "To address", route: "/pay-onchain" },
              ].map((item, idx) => (
                <Pressable 
                  key={idx} 
                  onPress={() => {
                    Haptics.selectionAsync();
                    router.push(item.route as any);
                  }}
                  style={{ width: "31%", backgroundColor: Colors.white, borderRadius: 16, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.lg, alignItems: "center", marginBottom: Spacing.md, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}
                >
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.baseLight, justifyContent: "center", alignItems: "center", marginBottom: Spacing.sm }}>
                    <Feather name={item.icon as any} size={24} color={Colors.textLightPrimary} />
                  </View>
                  <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2, textAlign: "center" }]}>{item.title}</Text>
                  <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary, fontSize: 11, textAlign: "center" }]}>{item.sub}</Text>
                </Pressable>
              ))}
            </View>

            {/* YOU WILL PAY WITH */}
            <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.md }]}>
              You will pay with
            </Text>
            
            <Pressable style={{ flexDirection: "row", alignItems: "center", backgroundColor: Colors.white, borderRadius: 16, padding: Spacing.lg, marginBottom: Spacing.xl, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.textLightPrimary, justifyContent: "center", alignItems: "center", marginRight: Spacing.md }}>
                <Text style={{ color: Colors.white, fontWeight: "bold", fontSize: 18 }}>$</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>USDC</Text>
                <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>USDC (Stellar)</Text>
              </View>
              <View style={{ alignItems: "flex-end", marginRight: Spacing.sm }}>
                <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>832.50</Text>
                <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>≈ $832.50</Text>
              </View>
              <Feather name="chevron-right" size={20} color={Colors.textLightSecondary} />
            </Pressable>

            {/* QUICK ACTIONS */}
            <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.md }]}>
              Quick Actions
            </Text>
            
            <View style={{ backgroundColor: Colors.white, borderRadius: 16, paddingHorizontal: Spacing.lg, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}>
              {[
                { icon: "maximize", title: "Scan QR", sub: "Pay a merchant", route: "/qr" },
                { icon: "grid", title: "Show my QR", sub: "Let others scan to pay", route: "/qr" },
              ].map((item, idx) => (
                <Pressable 
                  key={idx} 
                  onPress={() => {
                    if (item.route) router.push(item.route as any);
                  }}
                  style={{ flexDirection: "row", alignItems: "center", paddingVertical: Spacing.lg, borderBottomWidth: idx === 1 ? 0 : 1, borderBottomColor: Colors.borderLight }}
                >
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
        );
      
      case "Request":
        return (
          <Animated.View entering={FadeInDown.duration(300)}>
            <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.md }]}>
              Request From
            </Text>
            
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: Spacing.lg }}>
              {[
                { icon: "user", title: "Friends", sub: "Search username", route: "/request-friends" },
                { icon: "link", title: "Share Link", sub: "Send via chat", route: "/modals/share-link" },
              ].map((item, idx) => (
                <Pressable 
                  key={idx} 
                  onPress={() => {
                    Haptics.selectionAsync();
                    router.push(item.route as any);
                  }}
                  style={{ width: "48%", backgroundColor: Colors.white, borderRadius: 16, padding: Spacing.lg, alignItems: "center", marginBottom: Spacing.md, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}
                >
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.baseLight, justifyContent: "center", alignItems: "center", marginBottom: Spacing.sm }}>
                    <Feather name={item.icon as any} size={24} color={Colors.textLightPrimary} />
                  </View>
                  <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>{item.title}</Text>
                  <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary, fontSize: 11 }]}>{item.sub}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.md }]}>
              My Payment QR
            </Text>
            <Pressable style={{ backgroundColor: Colors.white, borderRadius: 16, padding: Spacing.xl, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2, marginBottom: Spacing.xl }}>
              <View style={{ width: 160, height: 160, backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.borderLight, borderStyle: "dashed", borderRadius: 16, justifyContent: "center", alignItems: "center", marginBottom: Spacing.lg }}>
                <Feather name="grid" size={64} color={Colors.textLightPrimary} />
              </View>
              <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 4 }]}>Show QR Code</Text>
              <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>Let others scan to pay you instantly</Text>
            </Pressable>
          </Animated.View>
        );

      case "Split":
        return (
          <Animated.View entering={FadeInDown.duration(300)}>
            <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.md }]}>
              Split a Bill
            </Text>
            
            <Pressable 
              style={{ backgroundColor: Colors.white, borderRadius: 16, padding: Spacing.lg, flexDirection: "row", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2, marginBottom: Spacing.lg }}
              onPress={() => {
                Haptics.selectionAsync();
                router.push("/split-bill");
              }}
            >
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.baseLight, justifyContent: "center", alignItems: "center", marginRight: Spacing.md }}>
                <Feather name="users" size={24} color={Colors.textLightPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>Create a Group</Text>
                <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>Split expenses with roommates or friends</Text>
              </View>
              <Feather name="chevron-right" size={20} color={Colors.textLightSecondary} />
            </Pressable>

            <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.md }]}>
              Recent Expenses
            </Text>
            
            <View style={{ backgroundColor: Colors.white, borderRadius: 16, paddingHorizontal: Spacing.lg, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}>
              {[
                { title: "Dinner at Sushi Tei", date: "Today", amount: "$84.50", splitWith: "3 friends" },
                { title: "Netflix Subscription", date: "Yesterday", amount: "$15.99", splitWith: "4 friends" },
              ].map((item, idx) => (
                <Pressable key={idx} style={{ flexDirection: "row", alignItems: "center", paddingVertical: Spacing.lg, borderBottomWidth: idx === 1 ? 0 : 1, borderBottomColor: Colors.borderLight }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.baseLight, justifyContent: "center", alignItems: "center", marginRight: Spacing.md }}>
                    <Feather name="coffee" size={18} color={Colors.textLightPrimary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>{item.title}</Text>
                    <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>Split with {item.splitWith}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700" }]}>{item.amount}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.baseLight }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.xs }}>
          <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "700", fontSize: 28 }]}>Pay</Text>
          <Pressable>
            <Feather name="clock" size={22} color={Colors.textLightPrimary} />
          </Pressable>
        </View>
        <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginBottom: Spacing.xl }]}>
          Fast. Secure. Borderless.
        </Text>

        {/* Segmented Control */}
        <View style={{ flexDirection: "row", backgroundColor: Colors.white, borderRadius: 99, padding: 6, marginBottom: Spacing.xl, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 }}>
          <Pressable 
            onPress={() => handleTabPress("Pay")}
            style={{ flex: 1, backgroundColor: activeTab === "Pay" ? "#111111" : "transparent", borderRadius: 99, paddingVertical: 14, alignItems: "center", shadowColor: activeTab === "Pay" ? "#000" : "transparent", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 }}
          >
            <Text style={[Typography.labelLarge, { color: activeTab === "Pay" ? Colors.white : Colors.textLightSecondary, fontWeight: "700" }]}>Pay</Text>
          </Pressable>
          <Pressable 
            onPress={() => handleTabPress("Request")}
            style={{ flex: 1, backgroundColor: activeTab === "Request" ? "#111111" : "transparent", borderRadius: 99, paddingVertical: 14, alignItems: "center", shadowColor: activeTab === "Request" ? "#000" : "transparent", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 }}
          >
            <Text style={[Typography.labelLarge, { color: activeTab === "Request" ? Colors.white : Colors.textLightSecondary, fontWeight: "700" }]}>Request</Text>
          </Pressable>
          <Pressable 
            onPress={() => handleTabPress("Split")}
            style={{ flex: 1, backgroundColor: activeTab === "Split" ? "#111111" : "transparent", borderRadius: 99, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", shadowColor: activeTab === "Split" ? "#000" : "transparent", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 }}
          >
            <Feather name="maximize" size={14} color={activeTab === "Split" ? Colors.white : Colors.textLightSecondary} style={{ marginRight: 6 }} />
            <Text style={[Typography.labelLarge, { color: activeTab === "Split" ? Colors.white : Colors.textLightSecondary, fontWeight: "700" }]}>Split</Text>
          </Pressable>
        </View>

        {renderContent()}

      </ScrollView>
    </SafeAreaView>
  );
}
