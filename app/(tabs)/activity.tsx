import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Colors } from "../../src/constants/colors";
import { Typography } from "../../src/constants/typography";
import { Spacing } from "../../src/constants/spacing";

export default function ActivityScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.baseLight }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.xl }}>
          <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "700", fontSize: 28 }]}>History</Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Pressable style={{ marginRight: Spacing.lg }}>
              <Feather name="search" size={24} color={Colors.textLightPrimary} />
            </Pressable>
            <Pressable>
              <Feather name="list" size={24} color={Colors.textLightPrimary} />
            </Pressable>
          </View>
        </View>

        {/* Segmented Control */}
        <View style={{ flexDirection: "row", backgroundColor: Colors.white, borderRadius: 99, padding: 4, marginBottom: Spacing.xl, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 2 }}>
          <Pressable style={{ flex: 1, backgroundColor: "#111111", borderRadius: 99, paddingVertical: 12, alignItems: "center" }}>
            <Text style={[Typography.labelLarge, { color: Colors.white, fontWeight: "600" }]}>All</Text>
          </Pressable>
          <Pressable style={{ flex: 1, borderRadius: 99, paddingVertical: 12, alignItems: "center" }}>
            <Text style={[Typography.labelLarge, { color: Colors.textLightSecondary, fontWeight: "600" }]}>Sent</Text>
          </Pressable>
          <Pressable style={{ flex: 1, borderRadius: 99, paddingVertical: 12, alignItems: "center" }}>
            <Text style={[Typography.labelLarge, { color: Colors.textLightSecondary, fontWeight: "600" }]}>Received</Text>
          </Pressable>
          <Pressable style={{ flex: 1, borderRadius: 99, paddingVertical: 12, alignItems: "center" }}>
            <Text style={[Typography.labelLarge, { color: Colors.textLightSecondary, fontWeight: "600" }]}>Swap</Text>
          </Pressable>
        </View>

        {/* TODAY Section */}
        <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.md }]}>
          Today
        </Text>
        
        <View style={{ marginBottom: Spacing.xl }}>
          {/* Item 1 */}
          <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#FFE0B2", justifyContent: "center", alignItems: "center", marginRight: Spacing.md, overflow: "hidden" }}>
              <Feather name="user" size={24} color="#F57C00" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>To Sarah</Text>
              <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>9:20 AM</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>- $25.00</Text>
              <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>- 12.50 USDC</Text>
            </View>
          </View>

          {/* Item 2 */}
          <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#E8F5E9", justifyContent: "center", alignItems: "center", marginRight: Spacing.md }}>
              <Feather name="coffee" size={24} color="#2E7D32" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>Starbucks</Text>
              <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>8:45 AM</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>- $6.80</Text>
              <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>- 6.80 USDC</Text>
            </View>
          </View>

          {/* Item 3 */}
          <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: Spacing.md }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#EFEBE9", justifyContent: "center", alignItems: "center", marginRight: Spacing.md }}>
              <Feather name="shopping-bag" size={24} color="#5D4037" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>Paid to Coffee House</Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary, marginRight: 8 }]}>7:30 AM</Text>
                <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>via QRIS</Text>
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>- 15.25 USDC</Text>
              <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>- 15.25 USDC</Text>
            </View>
          </View>
        </View>

        {/* YESTERDAY Section */}
        <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.md }]}>
          Yesterday
        </Text>
        
        <View style={{ marginBottom: Spacing.xl }}>
          {/* Item 1 */}
          <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#E3F2FD", justifyContent: "center", alignItems: "center", marginRight: Spacing.md }}>
              <Feather name="arrow-down" size={24} color="#1976D2" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>Received from Alex</Text>
              <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>3:40 PM</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[Typography.labelLarge, { color: "#1DB98A", fontWeight: "700", marginBottom: 2 }]}>+ $50.00</Text>
              <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>+ 25.00 USDC</Text>
            </View>
          </View>

          {/* Item 2 */}
          <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.borderLight, justifyContent: "center", alignItems: "center", marginRight: Spacing.md }}>
              <Feather name="refresh-cw" size={20} color={Colors.textLightPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>Swap USDC → XLM</Text>
              <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>1:10 PM</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[Typography.labelLarge, { color: "#1DB98A", fontWeight: "700", marginBottom: 2 }]}>+ 25.00 XLM</Text>
              <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>+ $24.80</Text>
            </View>
          </View>

          {/* Item 3 */}
          <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: Spacing.md }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#E8F5E9", justifyContent: "center", alignItems: "center", marginRight: Spacing.md }}>
              <Feather name="navigation" size={24} color="#2E7D32" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>Grab</Text>
              <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>12:15 PM</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>- 12.40 USDC</Text>
              <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>via SGQR</Text>
            </View>
          </View>
        </View>

        {/* OLDER Section */}
        <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.md }]}>
          Jun 6, 2025
        </Text>
        
        <View style={{ marginBottom: Spacing.xl }}>
          {/* Item 1 */}
          <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#E1F5FE", justifyContent: "center", alignItems: "center", marginRight: Spacing.md }}>
              <Feather name="user" size={24} color="#0288D1" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>Sent to Michael</Text>
              <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>9:15 PM</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>- $30.00</Text>
              <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>- 15.00 USDC</Text>
            </View>
          </View>

          {/* Item 2 */}
          <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: Spacing.md }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#FCE4EC", justifyContent: "center", alignItems: "center", marginRight: Spacing.md }}>
              <Feather name="shopping-cart" size={24} color="#C2185B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>Lazada</Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary, marginRight: 8 }]}>6:45 PM</Text>
                <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>via PromptPay</Text>
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>- $21.30</Text>
              <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>- 21.30 USDC</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
