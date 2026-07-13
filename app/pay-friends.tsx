import React, { useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Colors } from "../src/constants/colors";
import { Typography } from "../src/constants/typography";
import { Spacing } from "../src/constants/spacing";
import { getUserByUsername, getSuggestedFriends, UserProfile } from "../src/services/firebase/firestore";
import { useAuthStore } from "../src/store/authStore";
import { Friend } from "../src/types";

export default function PayFriendsScreen() {
  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<UserProfile | null>(null);
  const [suggestedFriends, setSuggestedFriends] = useState<Friend[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [selectingHandle, setSelectingHandle] = useState<string | null>(null);
  const searchInputRef = useRef<TextInput>(null);

  const { user } = useAuthStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Load people the user has sent money to / requested money from.
  useEffect(() => {
    if (!user?.uid) return;
    setLoadingSuggestions(true);
    getSuggestedFriends(user.uid)
      .then(setSuggestedFriends)
      .catch(console.error)
      .finally(() => setLoadingSuggestions(false));
  }, [user?.uid]);

  useEffect(() => {
    const term = search.trim().replace("@", "");
    if (term.length < 3) {
      setSearchResult(null);
      setIsSearching(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const profile = await getUserByUsername(term);
        if (profile && profile.uid !== user?.uid) {
          setSearchResult(profile);
        } else {
          setSearchResult(null);
        }
      } catch (err) {
        console.error("Search error", err);
        setSearchResult(null);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [search, user]);

  const handleSelectFriend = (profile: UserProfile) => {
    Haptics.selectionAsync();
    router.push({
      pathname: "/send",
      params: {
        id: profile.uid,
        name: profile.displayName,
        handle: `@${profile.username}`,
        avatar: profile.displayName.substring(0, 1).toUpperCase(),
        color: "#4ECDC4",
        publicKey: profile.stellarPublicKey || "",
      },
    });
  };

  // Suggested friends carry only display info, so resolve the full profile
  // (for the recipient's public key) before heading to the send screen.
  const handleSelectSuggested = async (friend: Friend) => {
    if (selectingHandle) return;
    Haptics.selectionAsync();
    const username = friend.handle.replace("@", "");
    setSelectingHandle(friend.handle);
    try {
      const profile = await getUserByUsername(username);
      if (profile) handleSelectFriend(profile);
    } catch (err) {
      console.error("Failed to resolve friend profile", err);
    } finally {
      setSelectingHandle(null);
    }
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
        <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "700", fontSize: 20 }]}>Pay Friends</Text>
        <View style={{ width: 40 }} />
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
            placeholder="Search by exact @username"
            placeholderTextColor={Colors.textLightSecondary}
            style={{ flex: 1, color: Colors.textLightPrimary, height: "100%" }}
            selectionColor={Colors.teal}
            autoCapitalize="none"
            autoCorrect={false}
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
          {search.trim().length > 0 ? "Search Result" : suggestedFriends.length > 0 ? "Suggested" : "Type a username"}
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
          {search.trim().length > 0 ? (
            isSearching ? (
              <View style={{ paddingVertical: Spacing.xxl, alignItems: "center" }}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : searchResult ? (
              <TouchableOpacity onPress={() => handleSelectFriend(searchResult)} style={{ flexDirection: "row", alignItems: "center", paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#4ECDC4", justifyContent: "center", alignItems: "center", marginRight: Spacing.md, overflow: "hidden" }}>
                  {searchResult.avatarUrl ? (
                    <Image source={{ uri: searchResult.avatarUrl }} style={{ width: "100%", height: "100%" }} />
                  ) : (
                    <Text style={[Typography.headingMedium, { color: Colors.white }]}>
                      {searchResult.displayName.substring(0, 1).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>{searchResult.displayName}</Text>
                  <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>@{searchResult.username}</Text>
                </View>
                <Feather name="chevron-right" size={20} color={Colors.textLightSecondary} />
              </TouchableOpacity>
            ) : search.trim().length >= 3 ? (
              <View style={{ paddingVertical: Spacing.xxl, alignItems: "center" }}>
                <Text style={[Typography.bodyLarge, { color: Colors.textLightSecondary }]}>No user found for "{search}".</Text>
              </View>
            ) : (
              <View style={{ paddingVertical: Spacing.xxl, alignItems: "center" }}>
                <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>Type at least 3 characters to search.</Text>
              </View>
            )
          ) : loadingSuggestions ? (
            <View style={{ paddingVertical: Spacing.xxl, alignItems: "center" }}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : suggestedFriends.length > 0 ? (
            suggestedFriends.map((friend, index) => (
              <TouchableOpacity
                key={friend.id}
                onPress={() => handleSelectSuggested(friend)}
                disabled={selectingHandle !== null}
                style={{ flexDirection: "row", alignItems: "center", paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm, borderBottomWidth: index === suggestedFriends.length - 1 ? 0 : 1, borderBottomColor: Colors.borderLight }}
              >
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: friend.color, justifyContent: "center", alignItems: "center", marginRight: Spacing.md }}>
                  <Text style={[Typography.headingMedium, { color: Colors.white }]}>{friend.avatar}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>{friend.name}</Text>
                  <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>{friend.handle}</Text>
                </View>
                {selectingHandle === friend.handle ? (
                  <ActivityIndicator size="small" color={Colors.textLightSecondary} />
                ) : (
                  <Feather name="chevron-right" size={20} color={Colors.textLightSecondary} />
                )}
              </TouchableOpacity>
            ))
          ) : (
            <View style={{ paddingVertical: Spacing.xxl, alignItems: "center" }}>
              <Feather name="users" size={32} color={Colors.borderLight} style={{ marginBottom: Spacing.md }} />
              <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, textAlign: "center" }]}>Search for friends using their{"\n"}exact @username</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
