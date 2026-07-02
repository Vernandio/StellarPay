import React, { useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView, Platform, KeyboardAvoidingView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Colors } from "../src/constants/colors";
import { Typography } from "../src/constants/typography";
import { Spacing } from "../src/constants/spacing";

export default function SplitBillScreen() {
  const insets = useSafeAreaInsets();
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 400);
    return () => clearTimeout(timer);
  }, []);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const friends = [
    { id: "1", name: "Alex Chen", handle: "@alex", avatar: "A", color: "#FF6B6B" },
    { id: "2", name: "Sarah Miller", handle: "@sarahm", avatar: "S", color: "#4ECDC4" },
    { id: "3", name: "David Kim", handle: "@davidk", avatar: "D", color: "#45B7D1" },
    { id: "4", name: "Emma Watson", handle: "@emmaw", avatar: "E", color: "#9B59B6" },
    { id: "5", name: "James Bond", handle: "@jamesb", avatar: "J", color: "#F39C12" },
  ];

  const filteredFriends = friends.filter((f) => 
    f.name.toLowerCase().includes(search.toLowerCase()) || 
    f.handle.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectFriend = (contact: any) => {
    Haptics.selectionAsync();
    setSelectedIds(prev => 
      prev.includes(contact.id) 
        ? prev.filter(id => id !== contact.id)
        : [...prev, contact.id]
    );
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const selectedFriends = friends.filter(f => selectedIds.includes(f.id));
    router.push({
      pathname: "/request",
      params: {
        group: JSON.stringify(selectedFriends)
      }
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.baseLight }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.lg, height: 56 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.white, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}>
              <Feather name="arrow-left" size={20} color={Colors.textLightPrimary} />
            </TouchableOpacity>
            <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "700", fontSize: 20 }]}>Split Bill</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Search Bar */}
          <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.lg }}>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: Colors.white, borderRadius: 16, paddingHorizontal: Spacing.md, height: 50, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}>
              <Feather name="search" size={20} color={Colors.textLightSecondary} style={{ marginRight: Spacing.sm }} />
                <TextInput
                  ref={searchInputRef}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search by name or @username"
                  placeholderTextColor={Colors.textLightSecondary}
                  style={[Typography.bodyLarge, { flex: 1, color: Colors.textLightPrimary, height: "100%" }]}
                  selectionColor={Colors.teal}
                />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")} style={{ padding: Spacing.xs }}>
                  <Feather name="x-circle" size={18} color={Colors.textLightSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Friends List */}
          <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 120 }}>
            <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.md }]}>
              {search ? "Search Results" : "Suggested"}
            </Text>

            <View style={{ backgroundColor: Colors.white, borderRadius: 16, padding: Spacing.sm, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}>
              {filteredFriends.map((contact, index) => {
                const isSelected = selectedIds.includes(contact.id);
                return (
                  <TouchableOpacity 
                    key={contact.id} 
                    onPress={() => handleSelectFriend(contact)}
                    style={{ flexDirection: "row", alignItems: "center", paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm, borderBottomWidth: index === filteredFriends.length - 1 ? 0 : 1, borderBottomColor: Colors.borderLight }}
                  >
                    <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: contact.color, justifyContent: "center", alignItems: "center", marginRight: Spacing.md }}>
                      <Text style={[Typography.headingMedium, { color: Colors.white }]}>{contact.avatar}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>{contact.name}</Text>
                      <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>{contact.handle}</Text>
                    </View>
                    <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: isSelected ? 0 : 2, borderColor: Colors.border, backgroundColor: isSelected ? "#111111" : "transparent", justifyContent: "center", alignItems: "center" }}>
                      {isSelected && <Feather name="check" size={14} color={Colors.white} />}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {filteredFriends.length === 0 && (
                <View style={{ paddingVertical: Spacing.xxl, alignItems: "center" }}>
                  <Text style={[Typography.bodyLarge, { color: Colors.textLightSecondary }]}>No friends found.</Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Sticky Continue Button */}
          {selectedIds.length > 0 && (
            <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: Spacing.lg, paddingBottom: Math.max(insets.bottom, Spacing.lg), paddingTop: Spacing.md, backgroundColor: "rgba(242, 244, 247, 0.9)" }}>
              <TouchableOpacity
                onPress={handleContinue}
                style={{
                  backgroundColor: "#111111",
                  borderRadius: 24,
                  paddingVertical: 18,
                  alignItems: "center",
                }}
              >
                <Text style={[Typography.labelLarge, { color: Colors.white, fontWeight: "700", fontSize: 16 }]}>
                  Continue ({selectedIds.length})
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
