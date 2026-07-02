import { useState, useMemo } from "react";
import { View, Text, ScrollView, Pressable, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Colors } from "../../src/constants/colors";
import { Typography } from "../../src/constants/typography";
import { Spacing } from "../../src/constants/spacing";
import Animated, { FadeIn, FadeOut, Layout } from "react-native-reanimated";

type ActivityType = "sent" | "received" | "swap";

interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  time: string;
  amountPrimary: string;
  amountSecondary?: string;
  icon: any;
  isPositive: boolean;
  dateSection: string;
  extra?: string;
}

const ACTIVITIES: Activity[] = [
  { id: "1", type: "sent", title: "To Sarah", time: "9:20 AM", amountPrimary: "- $25.00", amountSecondary: "- 12.50 USDC", icon: "user", isPositive: false, dateSection: "Today" },
  { id: "2", type: "sent", title: "Starbucks", time: "8:45 AM", amountPrimary: "- $6.80", amountSecondary: "- 6.80 USDC", icon: "coffee", isPositive: false, dateSection: "Today" },
  { id: "3", type: "sent", title: "Paid to Coffee House", time: "7:30 AM", amountPrimary: "- 15.25 USDC", amountSecondary: "- 15.25 USDC", icon: "shopping-bag", isPositive: false, dateSection: "Today", extra: "via QRIS" },
  { id: "4", type: "received", title: "Received from Alex", time: "3:40 PM", amountPrimary: "+ $50.00", amountSecondary: "+ 25.00 USDC", icon: "arrow-down", isPositive: true, dateSection: "Yesterday" },
  { id: "5", type: "swap", title: "Swap USDC → XLM", time: "1:10 PM", amountPrimary: "+ 25.00 XLM", amountSecondary: "+ $24.80", icon: "refresh-cw", isPositive: true, dateSection: "Yesterday" },
  { id: "6", type: "sent", title: "Grab", time: "12:15 PM", amountPrimary: "- 12.40 USDC", amountSecondary: "via SGQR", icon: "navigation", isPositive: false, dateSection: "Yesterday" },
  { id: "7", type: "sent", title: "Sent to Michael", time: "9:15 PM", amountPrimary: "- $30.00", amountSecondary: "- 15.00 USDC", icon: "user", isPositive: false, dateSection: "Jun 6, 2025" },
  { id: "8", type: "sent", title: "Lazada", time: "6:45 PM", amountPrimary: "- $21.30", amountSecondary: "- 21.30 USDC", icon: "shopping-cart", isPositive: false, dateSection: "Jun 6, 2025", extra: "via PromptPay" },
];

export default function ActivityScreen() {
  const [filter, setFilter] = useState<"All" | "Sent" | "Received">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateFilter, setDateFilter] = useState<"All" | "Today" | "Yesterday" | "Older">("All");

  const filteredActivities = useMemo(() => {
    return ACTIVITIES.filter(item => {
      // Type Filter
      if (filter === "Sent" && item.type !== "sent") return false;
      if (filter === "Received" && item.type !== "received") return false;

      // Date Filter
      if (dateFilter !== "All") {
        if (dateFilter === "Today" && item.dateSection !== "Today") return false;
        if (dateFilter === "Yesterday" && item.dateSection !== "Yesterday") return false;
        if (dateFilter === "Older" && (item.dateSection === "Today" || item.dateSection === "Yesterday")) return false;
      }

      // Search Query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return item.title.toLowerCase().includes(query) || 
               item.amountPrimary.toLowerCase().includes(query) ||
               item.dateSection.toLowerCase().includes(query);
      }
      return true;
    });
  }, [filter, searchQuery, dateFilter]);

  // Group by dateSection
  const groupedActivities = filteredActivities.reduce((acc, curr) => {
    if (!acc[curr.dateSection]) {
      acc[curr.dateSection] = [];
    }
    acc[curr.dateSection].push(curr);
    return acc;
  }, {} as Record<string, Activity[]>);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.baseLight }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.xl }}>
          <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "700", fontSize: 28 }]}>History</Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Pressable onPress={() => { setShowSearch(!showSearch); setShowDateFilter(false); setSearchQuery(""); }} style={{ marginRight: Spacing.lg }}>
              <Feather name={showSearch ? "x" : "search"} size={24} color={showSearch ? Colors.primary : Colors.textLightPrimary} />
            </Pressable>
            <Pressable onPress={() => { setShowDateFilter(!showDateFilter); setShowSearch(false); }}>
              <Feather name={showDateFilter ? "x" : "list"} size={24} color={showDateFilter ? Colors.primary : Colors.textLightPrimary} />
            </Pressable>
          </View>
        </View>

        {showSearch && (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={{ marginBottom: Spacing.xl }}>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: Colors.white, borderRadius: 16, paddingHorizontal: Spacing.md, height: 50, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 2 }}>
              <Feather name="search" size={20} color={Colors.textLightSecondary} style={{ marginRight: Spacing.sm }} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search transactions..."
                placeholderTextColor="#999999"
                style={{ flex: 1, fontFamily: "Inter-Regular", fontSize: 16, color: Colors.textLightPrimary }}
                autoFocus
              />
            </View>
          </Animated.View>
        )}

        {showDateFilter && (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={{ marginBottom: Spacing.xl }}>
            <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.sm }]}>Filter by Date</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm }}>
              {(["All", "Today", "Yesterday", "Older"] as const).map(d => (
                <Pressable
                  key={d}
                  onPress={() => setDateFilter(d)}
                  style={{ paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: 20, backgroundColor: dateFilter === d ? "#000" : Colors.white, borderWidth: 1, borderColor: dateFilter === d ? "#000" : Colors.borderLight, marginRight: Spacing.xs, marginBottom: Spacing.xs }}
                >
                  <Text style={[Typography.labelLarge, { color: dateFilter === d ? Colors.white : Colors.textLightPrimary }]}>{d}</Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Segmented Control */}
        <View style={{ flexDirection: "row", backgroundColor: Colors.white, borderRadius: 99, padding: 4, marginBottom: Spacing.xl, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 2 }}>
          {(["All", "Sent", "Received"] as const).map(tab => (
            <Pressable 
              key={tab}
              onPress={() => setFilter(tab)}
              style={{ flex: 1, backgroundColor: filter === tab ? "#111111" : "transparent", borderRadius: 99, paddingVertical: 12, alignItems: "center" }}
            >
              <Text style={[Typography.labelLarge, { color: filter === tab ? Colors.white : Colors.textLightSecondary, fontWeight: "600" }]}>{tab}</Text>
            </Pressable>
          ))}
        </View>

        {/* List */}
        <Animated.View layout={Layout.springify()}>
          {Object.entries(groupedActivities).length === 0 ? (
            <View style={{ alignItems: "center", marginTop: Spacing.xxl }}>
              <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>No transactions found.</Text>
            </View>
          ) : (
            Object.entries(groupedActivities).map(([date, items]) => (
              <View key={date} style={{ marginBottom: Spacing.xl }}>
                <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.md }]}>
                  {date}
                </Text>
                
                {items.map((item, index) => (
                  <View key={item.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: Spacing.md, borderBottomWidth: index === items.length - 1 ? 0 : 1, borderBottomColor: Colors.borderLight }}>
                    <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: item.type === "swap" ? Colors.white : Colors.baseLight, borderWidth: item.type === "swap" ? 1 : 0, borderColor: Colors.borderLight, justifyContent: "center", alignItems: "center", marginRight: Spacing.md, overflow: "hidden" }}>
                      <Feather name={item.icon} size={24} color={Colors.textLightPrimary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>{item.title}</Text>
                      {item.extra ? (
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary, marginRight: 8 }]}>{item.time}</Text>
                          <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>{item.extra}</Text>
                        </View>
                      ) : (
                        <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>{item.time}</Text>
                      )}
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={[Typography.labelLarge, { color: item.isPositive ? "#1DB98A" : Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>{item.amountPrimary}</Text>
                      <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>{item.amountSecondary}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ))
          )}
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
}
