import React, { useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView, Platform, KeyboardAvoidingView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Colors } from "../src/constants/colors";
import { Typography } from "../src/constants/typography";
import { Spacing } from "../src/constants/spacing";
import { searchUser, getSuggestedFriends } from "../src/services/firebase/firestore";
import { useAuthStore } from "../src/store/authStore";
import { Friend } from "../src/types";
import { apiClient } from "../src/services/api/client";

export default function SplitBillScreen() {
  const { profile } = useAuthStore();
  const insets = useSafeAreaInsets();
  const searchInputRef = useRef<TextInput>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<any[]>([]);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrItems, setOcrItems] = useState<{ name: string; price: number }[]>([]);
  const [ocrTotal, setOcrTotal] = useState<number | null>(null);
  const [ocrCurrency, setOcrCurrency] = useState<string>("USD");

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
            },
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

  const [suggestedFriends, setSuggestedFriends] = useState<Friend[]>([]);

  useEffect(() => {
    if (profile?.uid) {
      getSuggestedFriends(profile.uid).then(setSuggestedFriends).catch(console.error);
    }
  }, [profile?.uid]);

  const handleSelectFriend = (contact: any) => {
    Haptics.selectionAsync();
    setSelectedFriends((prev) => (prev.some((f) => f.id === contact.id) ? prev.filter((f) => f.id !== contact.id) : [...prev, contact]));
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/request",
      params: {
        group: JSON.stringify(selectedFriends),
        ...(ocrTotal ? { amount: ocrTotal.toString(), currency: ocrCurrency } : {}),
      },
    });
  };

  const handleScanReceipt = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });

      if (result.canceled || !result.assets?.[0]) return;

      setOcrLoading(true);
      const asset = result.assets[0];

      // Read image as base64
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: 'base64',
      });

      // Call backend OCR endpoint
      const response = await apiClient.post<{
        success: boolean;
        receipt: { items: { name: string; price: number }[]; total: number; currency?: string };
      }>('/api/ocr/scan-receipt', {
        image: base64,
        mimeType: asset.mimeType || 'image/jpeg',
      });

      if (response.success && response.receipt) {
        setOcrItems(response.receipt.items || []);
        setOcrTotal(response.receipt.total || 0);
        setOcrCurrency(response.receipt.currency || 'USD');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Scan Failed', 'Could not extract receipt data from the image.');
      }
    } catch (err: any) {
      console.error('OCR scan error:', err);
      Alert.alert('Scan Error', err.message || 'Failed to scan receipt.');
    } finally {
      setOcrLoading(false);
    }
  };

  const listToRender = search.trim() ? searchResults : suggestedFriends;
  const isSelected = (id: string) => selectedFriends.some((f) => f.id === id);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.baseLight }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
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
            <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "700", fontSize: 20 }]}>Split Bill</Text>
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
                placeholder="Search user by username..."
                placeholderTextColor={Colors.textLightSecondary}
                style={[Typography.bodyMedium, { flex: 1, color: Colors.textLightPrimary, height: "100%", fontSize: 14, letterSpacing: 0 }]}
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

          {/* AI Receipt Scanner Button */}
          <TouchableOpacity
            onPress={handleScanReceipt}
            disabled={ocrLoading}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: Colors.primary,
              marginHorizontal: Spacing.lg,
              marginBottom: Spacing.lg,
              borderRadius: 16,
              paddingVertical: Spacing.md,
              paddingHorizontal: Spacing.lg,
              shadowColor: Colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 4,
              opacity: ocrLoading ? 0.7 : 1,
            }}
          >
            {ocrLoading ? (
              <ActivityIndicator size="small" color={Colors.white} style={{ marginRight: Spacing.sm }} />
            ) : (
              <Feather name="camera" size={20} color={Colors.white} style={{ marginRight: Spacing.sm }} />
            )}
            <Text style={[Typography.labelLarge, { color: Colors.white, fontWeight: "700" }]}>
              {ocrLoading ? "Scanning Receipt..." : "Scan Receipt (AI OCR)"}
            </Text>
          </TouchableOpacity>

          {/* OCR Results */}
          {ocrItems.length > 0 && (
            <View style={{ marginHorizontal: Spacing.lg, marginBottom: Spacing.lg }}>
              <View
                style={{
                  backgroundColor: Colors.white,
                  borderRadius: 16,
                  padding: Spacing.lg,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.03,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.md }}>
                  <Feather name="file-text" size={18} color={Colors.primary} style={{ marginRight: Spacing.sm }} />
                  <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700" }]}>Receipt Items</Text>
                </View>
                {ocrItems.map((item, idx) => (
                  <View
                    key={idx}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingVertical: Spacing.sm,
                      borderBottomWidth: idx === ocrItems.length - 1 ? 0 : 1,
                      borderBottomColor: Colors.borderLight,
                    }}
                  >
                    <Text style={[Typography.bodyMedium, { color: Colors.textLightPrimary, flex: 1, marginRight: Spacing.md }]} numberOfLines={2}>{item.name}</Text>
                    <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "600" }]}>
                      {ocrCurrency === "IDR" || ocrCurrency === "VND"
                        ? item.price.toLocaleString(undefined, { maximumFractionDigits: 0 })
                        : item.price.toFixed(2)}
                    </Text>
                  </View>
                ))}
                <View style={{ height: 1, backgroundColor: Colors.borderLightStrong, marginVertical: Spacing.md }} />
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700" }]}>Total</Text>
                  <Text style={[Typography.headingMedium, { color: Colors.teal, fontWeight: "800" }]}>
                    {ocrCurrency} {ocrTotal !== null
                      ? (ocrCurrency === "IDR" || ocrCurrency === "VND"
                        ? ocrTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })
                        : ocrTotal.toFixed(2))
                      : "0"}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Friends List */}
          <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
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
              {listToRender.map((contact, index) => {
                const selected = isSelected(contact.id);
                return (
                  <TouchableOpacity
                    key={contact.id}
                    onPress={() => handleSelectFriend(contact)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: Spacing.md,
                      paddingHorizontal: Spacing.sm,
                      borderBottomWidth: index === listToRender.length - 1 ? 0 : 1,
                      borderBottomColor: Colors.borderLight,
                    }}
                  >
                    <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: contact.color || "#7B61FF", justifyContent: "center", alignItems: "center", marginRight: Spacing.md }}>
                      <Text style={[Typography.headingMedium, { color: Colors.white }]}>{contact.avatar}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>{contact.name}</Text>
                      <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>{contact.handle}</Text>
                    </View>
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        borderWidth: selected ? 0 : 2,
                        borderColor: Colors.border,
                        backgroundColor: selected ? "#111111" : "transparent",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
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
            <View
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                paddingHorizontal: Spacing.lg,
                paddingBottom: Math.max(insets.bottom, Spacing.lg),
                paddingTop: Spacing.md,
                backgroundColor: "rgba(242, 244, 247, 0.9)",
              }}
            >
              <TouchableOpacity
                onPress={handleContinue}
                style={{
                  backgroundColor: "#111111",
                  borderRadius: 24,
                  paddingVertical: 18,
                  alignItems: "center",
                }}
              >
                <Text style={[Typography.labelLarge, { color: Colors.white, fontWeight: "700", fontSize: 16 }]}>Continue ({selectedFriends.length})</Text>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
