import React, { useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView, Platform, Clipboard, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Colors } from "../src/constants/colors";
import { Typography } from "../src/constants/typography";
import { Spacing } from "../src/constants/spacing";
import { useAuthStore } from "../src/store/authStore";
import { searchUser, getSuggestedFriends } from "../src/services/firebase/firestore";
import { Friend } from "../src/types";

export default function RequestFriendsScreen() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  const { profile } = useAuthStore();
  const insets = useSafeAreaInsets();

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

  // Perform search against Firestore
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
            },
          ]);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error("Firestore search user failed:", err);
      } finally {
        setSearchLoading(false);
      }
    };
    performSearch();
  }, [debouncedSearch]);

  const [suggestedFriends, setSuggestedFriends] = useState<Friend[]>([]);

  useEffect(() => {
    if (profile?.uid) {
      getSuggestedFriends(profile.uid).then(setSuggestedFriends).catch(console.error);
    }
  }, [profile?.uid]);

  const handleSelectFriend = (contact: any) => {
    Haptics.selectionAsync();
    router.push({
      pathname: "/request",
      params: {
        id: contact.id,
        name: contact.name,
        handle: contact.handle,
        avatar: contact.avatar,
        color: contact.color,
      },
    });
  };

  const handleShareLink = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const username = profile?.username || "user";
    const link = `https://stellarpay.com/send?username=${username}`;
    Clipboard.setString(link);
    Alert.alert("Link Copied!", `Your personal request link has been copied to your clipboard:\n\n${link}\n\nShare this link with your friends to receive payments instantly!`, [{ text: "OK" }]);
  };

  const handleScanQR = () => {
    Haptics.selectionAsync();
    router.push({
      pathname: "/(tabs)/qr",
      params: { action: "request" },
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.baseLight }} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.lg, height: 56 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: Colors.white,
            justifyContent: "center",
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
          }}
        >
          <Feather name="arrow-left" size={20} color={Colors.textLightPrimary} />
        </TouchableOpacity>
        <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "700", fontSize: 20 }]}>Request Money</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
        {/* Quick Action Cards */}
        <View style={{ paddingHorizontal: Spacing.lg, marginTop: Spacing.lg, gap: Spacing.md }}>
          <View
            style={{
              backgroundColor: Colors.white,
              borderRadius: 20,
              padding: Spacing.md,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.03,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            {/* Scan QR */}
            <TouchableOpacity onPress={handleScanQR} style={{ flexDirection: "row", alignItems: "center", paddingVertical: Spacing.sm }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryGlow, justifyContent: "center", alignItems: "center", marginRight: Spacing.md }}>
                <Feather name="camera" size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700" }]}>Scan Friend's QR</Text>
                <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>Scan code to request instantly</Text>
              </View>
              <Feather name="chevron-right" size={18} color={Colors.textLightMuted} />
            </TouchableOpacity>

            <View style={{ height: 1, backgroundColor: Colors.borderLight, marginVertical: Spacing.sm }} />

            {/* Share Link */}
            <TouchableOpacity onPress={handleShareLink} style={{ flexDirection: "row", alignItems: "center", paddingVertical: Spacing.sm }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.tealGlow, justifyContent: "center", alignItems: "center", marginRight: Spacing.md }}>
                <Feather name="share-2" size={20} color={Colors.teal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700" }]}>Share Payment Link</Text>
                <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>Let anyone pay you via link</Text>
              </View>
              <Feather name="chevron-right" size={18} color={Colors.textLightMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.lg }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: Colors.white,
              borderRadius: 16,
              paddingHorizontal: Spacing.md,
              height: 50,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.03,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <Feather name="search" size={20} color={Colors.textLightSecondary} style={{ marginRight: Spacing.sm }} />
            <TextInput
              ref={searchInputRef}
              value={search}
              onChangeText={setSearch}
              placeholder="Search by username, phone, or email"
              placeholderTextColor={Colors.textLightSecondary}
              style={[Typography.bodyLarge, { flex: 1, color: Colors.textLightPrimary, height: "100%" }]}
              selectionColor={Colors.teal}
            />
            {searchLoading ? (
              <ActivityIndicator size="small" color={Colors.teal} />
            ) : search.length > 0 ? (
              <TouchableOpacity onPress={() => setSearch("")} style={{ padding: Spacing.xs }}>
                <Feather name="x-circle" size={18} color={Colors.textLightSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* List Section */}
        <View style={{ paddingHorizontal: Spacing.lg }}>
          <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.md }]}>
            {search ? "Search Results" : "Suggested"}
          </Text>

          <View
            style={{
              backgroundColor: Colors.white,
              borderRadius: 16,
              padding: Spacing.sm,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.03,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            {search
              ? // Search Results
                searchResults.map((contact, index) => (
                  <TouchableOpacity
                    key={contact.id}
                    onPress={() => handleSelectFriend(contact)}
                    style={{ flexDirection: "row", alignItems: "center", paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm }}
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
                ))
              : // Suggested Friends
                suggestedFriends.map((contact, index) => (
                  <TouchableOpacity
                    key={contact.id}
                    onPress={() => handleSelectFriend(contact)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: Spacing.md,
                      paddingHorizontal: Spacing.sm,
                      borderBottomWidth: index === suggestedFriends.length - 1 ? 0 : 1,
                      borderBottomColor: Colors.borderLight,
                    }}
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

            {search && searchResults.length === 0 && !searchLoading && (
              <View style={{ paddingVertical: Spacing.xxl, alignItems: "center" }}>
                <Text style={[Typography.bodyLarge, { color: Colors.textLightSecondary }]}>No user found matching search query.</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
