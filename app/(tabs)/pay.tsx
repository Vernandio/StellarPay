import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Colors } from "../../src/constants/colors";
import { Typography } from "../../src/constants/typography";
import { Spacing } from "../../src/constants/spacing";

export default function PayScreen() {
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
        <View style={{ flexDirection: "row", backgroundColor: Colors.white, borderRadius: 99, padding: 4, marginBottom: Spacing.xl, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 2 }}>
          <Pressable style={{ flex: 1, backgroundColor: "#111111", borderRadius: 99, paddingVertical: 12, alignItems: "center" }}>
            <Text style={[Typography.labelLarge, { color: Colors.white, fontWeight: "600" }]}>Pay</Text>
          </Pressable>
          <Pressable style={{ flex: 1, borderRadius: 99, paddingVertical: 12, alignItems: "center" }}>
            <Text style={[Typography.labelLarge, { color: Colors.textLightSecondary, fontWeight: "600" }]}>Request</Text>
          </Pressable>
          <Pressable style={{ flex: 1, borderRadius: 99, paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center" }}>
            <Feather name="maximize" size={14} color={Colors.textLightSecondary} style={{ marginRight: 4 }} />
            <Text style={[Typography.labelLarge, { color: Colors.textLightSecondary, fontWeight: "600" }]}>Split</Text>
          </Pressable>
        </View>

        {/* PAY TO */}
        <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.md }]}>
          Pay To
        </Text>
        
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: Spacing.lg }}>
          {[
            { icon: "user", title: "Friends", sub: "By username" },
            { icon: "shopping-bag", title: "Merchants", sub: "Pay any business" },
            { icon: "wifi", title: "Tap to Pay", sub: "Near field" },
            { icon: "globe", title: "Overseas", sub: "Across APAC" },
          ].map((item, idx) => (
            <Pressable key={idx} style={{ width: "48%", backgroundColor: Colors.white, borderRadius: 16, padding: Spacing.lg, alignItems: "center", marginBottom: Spacing.md, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}>
              <Feather name={item.icon as any} size={28} color={Colors.textLightPrimary} style={{ marginBottom: Spacing.sm }} />
              <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>{item.title}</Text>
              <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary, fontSize: 11 }]}>{item.sub}</Text>
            </Pressable>
          ))}
        </View>

        {/* YOU WILL PAY WITH */}
        <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.md }]}>
          You will pay with
        </Text>
        
        <Pressable style={{ flexDirection: "row", alignItems: "center", backgroundColor: Colors.white, borderRadius: 16, padding: Spacing.lg, marginBottom: Spacing.xl, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#2775CA", justifyContent: "center", alignItems: "center", marginRight: Spacing.md }}>
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
            { icon: "maximize", title: "Scan QR", sub: "Pay a merchant" },
            { icon: "grid", title: "Show my QR", sub: "Let others scan to pay" },
            { icon: "link", title: "Pay with Link", sub: "Share payment link" },
          ].map((item, idx) => (
            <Pressable key={idx} style={{ flexDirection: "row", alignItems: "center", paddingVertical: Spacing.lg, borderBottomWidth: idx === 2 ? 0 : 1, borderBottomColor: Colors.borderLight }}>
              <Feather name={item.icon as any} size={24} color={Colors.textLightPrimary} style={{ marginRight: Spacing.md }} />
              <View style={{ flex: 1 }}>
                <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>{item.title}</Text>
                <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>{item.sub}</Text>
              </View>
              <Feather name="chevron-right" size={20} color={Colors.textLightSecondary} />
            </Pressable>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
