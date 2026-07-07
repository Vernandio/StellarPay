import React, { useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView, Platform, KeyboardAvoidingView, ActivityIndicator } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Colors } from "../src/constants/colors";
import { Typography } from "../src/constants/typography";
import { Spacing } from "../src/constants/spacing";
import { searchUser } from "../src/services/firebase/firestore";

export default function SplitBillScreen() {
  const insets = useSafeAreaInsets();
  const searchInputRef = useRef<TextInput>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<any[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  // Perform Firestore user search
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedSearch.trim()) {
        setSearchResults([]);
        return;
      }
      setSearchLoading(true);
      try {
        const found = await searchUser(debouncedSearch);
        if (found) {
          setSearchResults([
            {
              id: found.uid,
              name: found.displayName || found.username,
              handle: `@${found.username}`,
              avatar: (found.displayName || found.username).charAt(0).toUpperCase(),
              color: "#7B61FF",
            }
          ]);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error("Split bill user search failed:", err);
      } finally {
        setSearchLoading(false);
      }
    };
    performSearch();
  }, [debouncedSearch]);

  const suggestedFriends = [
    { id: "1", name: "Alex Chen", handle: "@alex", avatar: "A", color: "#FF6B6B" },
    { id: "2", name: "Sarah Miller", handle: "@sarahm", avatar: "S", color: "#4ECDC4" },
    { id: "3", name: "David Kim", handle: "@davidk", avatar: "D", color: "#45B7D1" },
    { id: "4", name: "Emma Watson", handle: "@emmaw", avatar: "E", color: "#9B59B6" },
  ];

  const handleSelectFriend = (contact: any) => {
    Haptics.selectionAsync();
    setSelectedFriends(prev => 
      prev.some(f => f.id === contact.id)
        ? prev.filter(f => f.id !== contact.id)
        : [...prev, contact]
    );
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/request",
      params: {
        group: JSON.stringify(selectedFriends)
      }
    });
  };

  const listToRender = search.trim() ? searchResults : suggestedFriends;
  const isSelected = (id: string) => selectedFriends.some(f => f.id === id);

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
                placeholder="Search user by username/phone/email"
                placeholderTextColor={Colors.textLightSecondary}
                style={[Typography.bodyLarge, { flex: 1, color: Colors.textLightPrimary, height: "100%" }]}
                selectionColor={Colors.teal}
              />
              {searchLoading && <ActivityIndicator size="small" color={Colors.teal} style={{ marginRight: Spacing.xs }} />}
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")} style={{ padding: Spacing.xs }}>
                  <Feather name="x-circle" size={18} color={Colors.textLightSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Friends List */}
          <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
            <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.md }]}>
              {search ? "Search Results" : "Suggested"}
            </Text>

            <View style={{ backgroundColor: Colors.white, borderRadius: 16, padding: Spacing.sm, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}>
              {listToRender.map((contact, index) => {
                const selected = isSelected(contact.id);
                return (
                  <TouchableOpacity 
                    key={contact.id} 
                    onPress={() => handleSelectFriend(contact)}
                    style={{ flexDirection: "row", alignItems: "center", paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm, borderBottomWidth: index === listToRender.length - 1 ? 0 : 1, borderBottomColor: Colors.borderLight }}
                  >
                    <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: contact.color || "#7B61FF", justifyContent: "center", alignItems: "center", marginRight: Spacing.md }}>
                      <Text style={[Typography.headingMedium, { color: Colors.white }]}>{contact.avatar}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>{contact.name}</Text>
                      <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>{contact.handle}</Text>
                    </View>
                    <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: selected ? 0 : 2, borderColor: Colors.border, backgroundColor: selected ? "#111111" : "transparent", justifyContent: "center", alignItems: "center" }}>
                      {selected && <Feather name="check" size={14} color={Colors.white} />}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {listToRender.length === 0 && (
                <View style={{ paddingVertical: Spacing.xxl, alignItems: "center" }}>
                  <Text style={[Typography.bodyLarge, { color: Colors.textLightSecondary }]}>No users found.</Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Sticky Continue Button */}
          {selectedFriends.length > 0 && (
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
                  Continue ({selectedFriends.length})
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
