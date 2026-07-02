import React, { useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView, Platform } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Colors } from "../src/constants/colors";
import { Typography } from "../src/constants/typography";
import { Spacing } from "../src/constants/spacing";

export default function PayFriendsScreen() {
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

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
    router.push({
      pathname: "/send",
      params: {
        id: contact.id,
        name: contact.name,
        handle: contact.handle,
        avatar: contact.avatar,
        color: contact.color
      }
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.baseLight }} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.lg, height: 56 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.white, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}>
          <Feather name="arrow-left" size={20} color={Colors.textLightPrimary} />
        </TouchableOpacity>
        <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "700", fontSize: 20 }]}>Pay Friends</Text>
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
      <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl }}>
        <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.md }]}>
          {search ? "Search Results" : "Suggested"}
        </Text>

        <View style={{ backgroundColor: Colors.white, borderRadius: 16, padding: Spacing.sm, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}>
          {filteredFriends.map((contact, index) => (
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
              <Feather name="chevron-right" size={20} color={Colors.textLightSecondary} />
            </TouchableOpacity>
          ))}

          {filteredFriends.length === 0 && (
            <View style={{ paddingVertical: Spacing.xxl, alignItems: "center" }}>
              <Text style={[Typography.bodyLarge, { color: Colors.textLightSecondary }]}>No friends found.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
