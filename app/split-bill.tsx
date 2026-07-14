import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView, Platform, KeyboardAvoidingView, ActivityIndicator, Alert, Pressable, Image } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Colors } from "../src/constants/colors";
import { Typography } from "../src/constants/typography";
import { Spacing } from "../src/constants/spacing";
import { showToast } from "../src/store/toastStore";

import { searchUser, getSuggestedFriends } from "../src/services/firebase/firestore";
import { useAuthStore } from "../src/store/authStore";
import { Friend } from "../src/types";
import { apiClient } from "../src/services/api/client";
import { createPaymentRequest } from "../src/services/firebase/requests";
import { createNotification } from "../src/services/firebase/notifications";

type Step = "select_friends" | "choose_method" | "review_bill" | "split_nominals";

interface BillItem {
  name: string;
  price: number;
  priceStr?: string;
  qty: number;
  qtyStr?: string;
}

const SUPPORTED_CURRENCIES = [
  { code: "USD", symbol: "$", flag: "🇺🇸" },
  { code: "IDR", symbol: "Rp", flag: "🇮🇩" },
  { code: "PHP", symbol: "₱", flag: "🇵🇭" },
  { code: "SGD", symbol: "S$", flag: "🇸🇬" },
];

export default function SplitBillScreen() {
  const { profile } = useAuthStore();
  const insets = useSafeAreaInsets();
  const searchInputRef = useRef<TextInput>(null);

  // Flow step control
  const [currentStep, setCurrentStep] = useState<Step>("select_friends");

  // Step 1: Select Friends States
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<any[]>([]);
  const [suggestedFriends, setSuggestedFriends] = useState<Friend[]>([]);

  // Step 3: Bill Items States
  const [currency, setCurrency] = useState<string>("USD");
  const [items, setItems] = useState<BillItem[]>([
    { name: "", price: 0, priceStr: "", qty: 1, qtyStr: "1" },
  ]);
  const [tax, setTax] = useState<number>(0);
  const [taxStr, setTaxStr] = useState<string>("");
  const [service, setService] = useState<number>(0);
  const [serviceStr, setServiceStr] = useState<string>("");
  const [tips, setTips] = useState<number>(0);
  const [tipsStr, setTipsStr] = useState<string>("");
  const [discount, setDiscount] = useState<number>(0);
  const [discountStr, setDiscountStr] = useState<string>("");
  const [showFeesAndTaxDetails, setShowFeesAndTaxDetails] = useState<boolean>(false);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);

  // Step 4: Split distribution states
  const [splitMode, setSplitMode] = useState<"evenly" | "items">("evenly");
  const [itemAssignments, setItemAssignments] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);

  // Auto-focus search input on mount
  useEffect(() => {
    if (currentStep === "select_friends") {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  // Load suggested friends
  useEffect(() => {
    if (profile?.uid) {
      getSuggestedFriends(profile.uid).then(setSuggestedFriends).catch(console.error);
    }
  }, [profile?.uid]);

  // User search logic
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedSearch.trim()) {
        setSearchResults([]);
        return;
      }
      setSearchLoading(true);
      try {
        const found = await searchUser(debouncedSearch);
        if (found && found.uid !== profile?.uid) {
          setSearchResults([
            {
              id: found.uid,
              name: found.displayName || found.username,
              handle: `@${found.username}`,
              avatar: (found.displayName || found.username).charAt(0).toUpperCase(),
              avatarUrl: found.avatarUrl || null,
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

  const handleSelectFriend = (contact: any) => {
    if (contact.id === profile?.uid || contact.handle?.replace("@", "").toLowerCase() === profile?.username?.toLowerCase()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Invalid Action", "You are already included in the bill split automatically. Please select your friends instead.");
      return;
    }
    Haptics.selectionAsync();
    setSelectedFriends((prev) =>
      prev.some((f) => f.id === contact.id)
        ? prev.filter((f) => f.id !== contact.id)
        : [...prev, contact]
    );
  };

  const isSelected = (id: string) => selectedFriends.some((f) => f.id === id);

  const getSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  };

  const getTotal = () => {
    return getSubtotal() + tax + service + tips - discount;
  };

  // Scan Receipt via Gemini OCR
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
      let base64 = "";
      if (Platform.OS === 'web') {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            const base64Data = result.split(',')[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: 'base64',
        });
      }

      // Call backend OCR endpoint
      const response = await apiClient.post<{
        success: boolean;
        receipt: {
          items: { name: string; price: number; qty?: number }[];
          tax?: number;
          service?: number;
          tips?: number;
          discount?: number;
          total?: number;
          currency?: string;
        };
      }>('/api/ocr/scan-receipt', {
        image: base64,
        mimeType: asset.mimeType || 'image/jpeg',
      });

      if (response.success && response.receipt) {
        const parsedItems = (response.receipt.items || []).map(i => ({
          name: i.name || "Unlabeled Item",
          price: Number(i.price) || 0,
          qty: Number(i.qty) || 1,
        }));
        
        setItems(parsedItems);
        const parsedTax = Number(response.receipt.tax) || 0;
        const parsedService = Number(response.receipt.service) || 0;
        const parsedTips = Number(response.receipt.tips) || 0;
        const parsedDiscount = Number(response.receipt.discount) || 0;

        setTax(parsedTax);
        setService(parsedService);
        setTips(parsedTips);
        setDiscount(parsedDiscount);
        setCurrency(response.receipt.currency || "USD");

        // Automatically show the fees panel if any extracted values are greater than zero
        if (parsedTax > 0 || parsedDiscount > 0 || parsedService > 0 || parsedTips > 0) {
          setShowFeesAndTaxDetails(true);
        } else {
          setShowFeesAndTaxDetails(false);
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setCurrentStep("review_bill");
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

  const getFlattenedItems = (): { name: string; price: number; originalIndex: number; unitId: string }[] => {
    const flat: { name: string; price: number; originalIndex: number; unitId: string }[] = [];
    items.forEach((item, itemIdx) => {
      for (let i = 0; i < item.qty; i++) {
        flat.push({
          name: item.qty > 1 ? `${item.name} (${i + 1}/${item.qty})` : item.name,
          price: item.price,
          originalIndex: itemIdx,
          unitId: `${itemIdx}_${i}`,
        });
      }
    });
    return flat;
  };

  // Calculations for step 4 splits
  const getParticipantSplitAmounts = () => {
    const totalParticipants = selectedFriends.length + 1; // friends + self
    const netTotal = getTotal();

    if (splitMode === "evenly") {
      const share = netTotal / totalParticipants;
      const results: Record<string, number> = {
        self: share,
      };
      selectedFriends.forEach(f => {
        results[f.id] = share;
      });
      return results;
    } else {
      // Itemized split calculation
      const subtotal = getSubtotal();
      const results: Record<string, number> = { self: 0 };
      selectedFriends.forEach(f => { results[f.id] = 0; });

      const flatItems = getFlattenedItems();
      flatItems.forEach((flatItem) => {
        const assignedUids = itemAssignments[flatItem.unitId] || ["self"]; // Default to self if unassigned
        const sharePrice = flatItem.price / assignedUids.length;

        assignedUids.forEach((uid: string) => {
          results[uid] = (results[uid] || 0) + sharePrice;
        });
      });

      // Distribute tax, service charge, tips, and discount proportionally
      if (subtotal > 0) {
        const participantUids = Object.keys(results);
        participantUids.forEach(uid => {
          const userSub = results[uid];
          const ratio = userSub / subtotal;
          const userTax = tax * ratio;
          const userService = service * ratio;
          const userTips = tips * ratio;
          const userDisc = discount * ratio;
          results[uid] = userSub + userTax + userService + userTips - userDisc;
        });
      }

      return results;
    }
  };

  const getParticipantSplitBreakdowns = (): Record<string, { subtotal: number; tax: number; service: number; tips: number; discount: number; total: number }> => {
    const totalParticipants = selectedFriends.length + 1;
    const breakdowns: Record<string, { subtotal: number; tax: number; service: number; tips: number; discount: number; total: number }> = {
      self: { subtotal: 0, tax: 0, service: 0, tips: 0, discount: 0, total: 0 }
    };
    selectedFriends.forEach(f => {
      breakdowns[f.id] = { subtotal: 0, tax: 0, service: 0, tips: 0, discount: 0, total: 0 };
    });

    if (splitMode === "evenly") {
      const shareSubtotal = getSubtotal() / totalParticipants;
      const shareTax = tax / totalParticipants;
      const shareService = service / totalParticipants;
      const shareTips = tips / totalParticipants;
      const shareDiscount = discount / totalParticipants;
      const shareTotal = getTotal() / totalParticipants;

      const keys = Object.keys(breakdowns);
      keys.forEach(k => {
        breakdowns[k] = {
          subtotal: shareSubtotal,
          tax: shareTax,
          service: shareService,
          tips: shareTips,
          discount: shareDiscount,
          total: shareTotal
        };
      });
    } else {
      const flatItems = getFlattenedItems();
      flatItems.forEach((flatItem) => {
        const assignedUids = itemAssignments[flatItem.unitId] || ["self"];
        const sharePrice = flatItem.price / assignedUids.length;
        assignedUids.forEach(uid => {
          if (breakdowns[uid]) {
            breakdowns[uid].subtotal += sharePrice;
          }
        });
      });

      const totalSub = getSubtotal();
      const keys = Object.keys(breakdowns);
      keys.forEach(uid => {
        const b = breakdowns[uid];
        if (totalSub > 0) {
          const ratio = b.subtotal / totalSub;
          b.tax = tax * ratio;
          b.service = service * ratio;
          b.tips = tips * ratio;
          b.discount = discount * ratio;
          b.total = b.subtotal + b.tax + b.service + b.tips - b.discount;
        } else {
          b.total = 0;
        }
      });
    }

    return breakdowns;
  };

  const handleConfirmSplit = async () => {
    const splits = getParticipantSplitAmounts();
    const breakdowns = getParticipantSplitBreakdowns();
    setIsSubmitting(true);
    try {
      // Loop through all selected friends and submit requests
      for (const friend of selectedFriends) {
        const amount = splits[friend.id] || 0;
        if (amount <= 0) continue;

        // Filter flat items assigned to this specific friend
        const friendItems: { name: string; price: number; qty: number }[] = [];
        const flatItems = getFlattenedItems();
        flatItems.forEach((flatItem) => {
          const assigned = itemAssignments[flatItem.unitId] || ["self"];
          if (assigned.includes(friend.id)) {
            const existing = friendItems.find(i => i.name === flatItem.name);
            if (existing) {
              existing.qty += 1;
            } else {
              friendItems.push({ name: flatItem.name, price: flatItem.price, qty: 1 });
            }
          }
        });

        // Save requested amount in USD (all Firestore transactions base on USD)
        // Convert to USD value if non-USD selected
        const requestedUSD = currency === "USD" ? amount : amount / 15000; // Mock 15k rate fallback for non-USD splits
        const friendBreakdown = breakdowns[friend.id];

        const requestId = await createPaymentRequest({
          senderUid: profile?.uid || "",
          senderUsername: profile?.username || "",
          senderDisplayName: profile?.displayName || profile?.username || "",
          receiverUid: friend.id,
          receiverUsername: friend.handle.replace("@", ""),
          amountUSD: requestedUSD.toFixed(2),
          message: `Split bill for ${items[0]?.name || "Dinner"}${items.length > 1 ? ` & ${items.length - 1} other items` : ""}`,
          requestedCurrency: currency,
          requestedAmount: amount.toFixed(2),
          splitItems: friendItems,
          taxAmount: friendBreakdown?.tax.toFixed(2),
          serviceAmount: friendBreakdown?.service.toFixed(2),
          tipsAmount: friendBreakdown?.tips.toFixed(2),
          discountAmount: friendBreakdown?.discount.toFixed(2),
          subtotalAmount: friendBreakdown?.subtotal.toFixed(2),
        });

        await createNotification({
          uid: friend.id,
          title: "Split Bill Request",
          message: `${profile?.displayName || profile?.username} requested ${currency} ${currency === "IDR" || currency === "VND" ? Math.round(amount).toLocaleString() : amount.toFixed(2)} for a split bill.`,
          type: "request_received",
          referenceId: requestId,
        });
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      let totalRequested = 0;
      for (const friend of selectedFriends) {
        if (splits[friend.id] > 0) totalRequested += splits[friend.id];
      }
      
      const totalAmountStr = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: currency === "VND" || currency === "IDR" ? 0 : 2,
        maximumFractionDigits: currency === "VND" || currency === "IDR" ? 0 : 2,
      }).format(totalRequested);
      
      const nameStr = selectedFriends.length === 1 
        ? selectedFriends[0].name 
        : `${selectedFriends[0].name} & ${selectedFriends.length - 1} others`;

      showToast(`Requested ${currency} ${totalAmountStr} from ${nameStr}`, "success");
      router.back();
    } catch (err: any) {
      console.error("Confirm split failed:", err);
      Alert.alert("Error", err.message || "Failed to submit split bill.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render Functions
  const renderStepHeader = () => {
    let title = "Split Bill";
    let backAction = () => router.back();

    if (currentStep === "choose_method") {
      title = "Choose Method";
      backAction = () => setCurrentStep("select_friends");
    } else if (currentStep === "review_bill") {
      title = "Review Bill Items";
      backAction = () => setCurrentStep("choose_method");
    } else if (currentStep === "split_nominals") {
      title = "Distribute Split";
      backAction = () => setCurrentStep("review_bill");
    }

    return (
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.lg, height: 56 }}>
        <TouchableOpacity
          onPress={backAction}
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
        <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "700", fontSize: 20 }]}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.baseLight }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          
          {renderStepHeader()}

          {/* ──────────────── STEP 1: SELECT FRIENDS ──────────────── */}
          {currentStep === "select_friends" && (
            <View style={{ flex: 1 }}>
              {/* Search Bar */}
              <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm }}>
                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: Colors.white, borderRadius: 16, paddingHorizontal: Spacing.md, height: 50, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}>
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

              {/* Horizontal list of selected friends */}
              {selectedFriends.length > 0 && (
                <View style={{ height: 60, paddingVertical: Spacing.xs, paddingHorizontal: Spacing.lg }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {selectedFriends.map((friend) => (
                      <View key={friend.id} style={{ flexDirection: "row", alignItems: "center", backgroundColor: Colors.white, borderRadius: 99, paddingLeft: 4, paddingRight: Spacing.sm, height: 36, marginRight: Spacing.sm, borderWidth: 1, borderColor: Colors.borderLight }}>
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: friend.color || Colors.primary, justifyContent: "center", alignItems: "center", marginRight: 6, overflow: "hidden" }}>
                          {friend.avatarUrl ? (
                            <Image source={{ uri: friend.avatarUrl }} style={{ width: "100%", height: "100%" }} />
                          ) : (
                            <Text style={[Typography.bodySmall, { color: Colors.white, fontWeight: "700" }]}>{friend.avatar}</Text>
                          )}
                        </View>
                        <Text style={[Typography.bodySmall, { color: Colors.textLightPrimary, fontWeight: "600", marginRight: 4 }]}>{friend.name}</Text>
                        <TouchableOpacity onPress={() => handleSelectFriend(friend)}>
                          <Feather name="x" size={14} color={Colors.textLightSecondary} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Friends list */}
              <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
                <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginVertical: Spacing.sm }]}>
                  {search ? "Search Results" : "Suggested Friends"}
                </Text>

                <View style={{ backgroundColor: Colors.white, borderRadius: 16, padding: Spacing.sm, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}>
                  {(search ? searchResults : suggestedFriends).map((contact, index) => {
                    const selected = isSelected(contact.id);
                    return (
                      <TouchableOpacity
                        key={contact.id}
                        onPress={() => handleSelectFriend(contact)}
                        style={{ flexDirection: "row", alignItems: "center", paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm, borderBottomWidth: index === (search ? searchResults : suggestedFriends).length - 1 ? 0 : 1, borderBottomColor: Colors.borderLight }}
                      >
                        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: contact.color || Colors.primary, justifyContent: "center", alignItems: "center", marginRight: Spacing.md, overflow: "hidden" }}>
                          {contact.avatarUrl ? (
                            <Image source={{ uri: contact.avatarUrl }} style={{ width: "100%", height: "100%" }} />
                          ) : (
                            <Text style={[Typography.headingMedium, { color: Colors.white, fontSize: 16 }]}>{contact.avatar}</Text>
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>{contact.name}</Text>
                          <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>{contact.handle}</Text>
                        </View>
                        <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: selected ? 0 : 2, borderColor: Colors.borderLightStrong, backgroundColor: selected ? "#111111" : "transparent", justifyContent: "center", alignItems: "center" }}>
                          {selected && <Feather name="check" size={14} color={Colors.white} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  {(search ? searchResults : suggestedFriends).length === 0 && (
                    <View style={{ paddingVertical: Spacing.xxl, alignItems: "center" }}>
                      <Text style={[Typography.bodyLarge, { color: Colors.textLightSecondary }]}>No users found.</Text>
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* Continue button */}
              {selectedFriends.length > 0 && (
                <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: Spacing.lg, paddingBottom: Math.max(insets.bottom, Spacing.lg), paddingTop: Spacing.md, backgroundColor: "rgba(242, 244, 247, 0.9)" }}>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setCurrentStep("choose_method");
                    }}
                    style={{ backgroundColor: "#111111", borderRadius: 24, paddingVertical: 18, alignItems: "center" }}
                  >
                    <Text style={[Typography.labelLarge, { color: Colors.white, fontWeight: "700", fontSize: 16 }]}>Continue ({selectedFriends.length})</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* ──────────────── STEP 2: CHOOSE METHOD ──────────────── */}
          {currentStep === "choose_method" && (
            <View style={{ flex: 1, paddingHorizontal: Spacing.lg, justifyContent: "center", gap: Spacing.lg }}>
              <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary, textAlign: "center", fontWeight: "700" }]}>How would you like to enter items?</Text>
              
              {/* Scan Receipt Button */}
              <TouchableOpacity
                onPress={handleScanReceipt}
                disabled={ocrLoading}
                style={{
                  backgroundColor: Colors.white,
                  borderRadius: 24,
                  padding: Spacing.xl,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: Colors.borderLight,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.05,
                  shadowRadius: 12,
                  elevation: 2,
                }}
              >
                {ocrLoading ? (
                  <ActivityIndicator size="large" color={Colors.primary} style={{ marginBottom: Spacing.md }} />
                ) : (
                  <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primaryGlow, justifyContent: "center", alignItems: "center", marginBottom: Spacing.md }}>
                    <Feather name="camera" size={30} color={Colors.primary} />
                  </View>
                )}
                <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: Spacing.xs }]}>
                  {ocrLoading ? "Scanning..." : "Scan Receipt (AI OCR)"}
                </Text>
                <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, textAlign: "center" }]}>
                  Take a photo or upload an image. AI will extract items, prices, tax, and discount instantly.
                </Text>
              </TouchableOpacity>

              {/* Manual Input Button */}
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setCurrentStep("review_bill");
                }}
                style={{
                  backgroundColor: Colors.white,
                  borderRadius: 24,
                  padding: Spacing.xl,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: Colors.borderLight,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.05,
                  shadowRadius: 12,
                  elevation: 2,
                }}
              >
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.tealGlow, justifyContent: "center", alignItems: "center", marginBottom: Spacing.md }}>
                  <Feather name="edit-3" size={30} color={Colors.teal} />
                </View>
                <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: Spacing.xs }]}>
                  Enter Manually
                </Text>
                <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, textAlign: "center" }]}>
                  Type in your items, price, tax, and discount details manually.
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ──────────────── STEP 3: EDITABLE BILL REVIEW ──────────────── */}
          {currentStep === "review_bill" && (
            <View style={{ flex: 1 }}>
              {/* Currency Bar */}
              <View style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, zIndex: 10 }}>
                <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, marginBottom: Spacing.xs }]}>Receipt Currency</Text>
                <Pressable
                  onPress={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.white, borderRadius: 12, paddingHorizontal: Spacing.md, height: 48, borderWidth: 1, borderColor: Colors.borderLight }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ fontSize: 20, marginRight: 8 }}>
                      {SUPPORTED_CURRENCIES.find(c => c.code === currency)?.flag || "🇺🇸"}
                    </Text>
                    <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700" }]}>{currency}</Text>
                  </View>
                  <Feather name={showCurrencyDropdown ? "chevron-up" : "chevron-down"} size={20} color={Colors.textLightSecondary} />
                </Pressable>

                {showCurrencyDropdown && (
                  <View style={{ position: "absolute", top: 72, left: Spacing.lg, right: Spacing.lg, backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderLight, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, zIndex: 20 }}>
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <TouchableOpacity
                        key={c.code}
                        onPress={() => {
                          setCurrency(c.code);
                          setShowCurrencyDropdown(false);
                        }}
                        style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight }}
                      >
                        <Text style={{ fontSize: 20, marginRight: Spacing.sm }}>{c.flag}</Text>
                        <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "600" }]}>{c.code} ({c.symbol})</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Items List */}
              <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 160 }} style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
                <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.sm }]}>Line Items</Text>

                {items.map((item, idx) => (
                  <View
                    key={idx}
                    style={{
                      backgroundColor: Colors.white,
                      borderRadius: 16,
                      padding: Spacing.md,
                      marginBottom: Spacing.sm,
                      borderWidth: 1,
                      borderColor: Colors.borderLight,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.01,
                      shadowRadius: 4,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.xs, marginBottom: Spacing.sm }}>
                      {/* Item Name Input */}
                      <TextInput
                        value={item.name}
                        onChangeText={(text) => {
                          const updated = [...items];
                          updated[idx].name = text;
                          setItems(updated);
                        }}
                        placeholder="Item Name"
                        placeholderTextColor={Colors.textLightMuted}
                        style={[Typography.labelLarge, { flex: 1, color: Colors.textLightPrimary, fontWeight: "600", paddingBottom: 2, borderBottomWidth: 1, borderBottomColor: Colors.borderLight }]}
                      />
                      {/* Delete Button */}
                      <TouchableOpacity
                        onPress={() => {
                          if (items.length === 1) return;
                          setItems(items.filter((_, i) => i !== idx));
                        }}
                        style={{ padding: Spacing.xs }}
                      >
                        <Feather name="trash-2" size={18} color={Colors.danger} />
                      </TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
                      {/* Qty Input */}
                      <View style={{ flex: 1 }}>
                        <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary, marginBottom: 2 }]}>Qty</Text>
                        <TextInput
                          value={item.qtyStr ?? item.qty.toString()}
                          onChangeText={(text) => {
                            const updated = [...items];
                            updated[idx].qtyStr = text;
                            updated[idx].qty = parseInt(text.replace(/\D/g, "")) || 0;
                            setItems(updated);
                          }}
                          keyboardType="number-pad"
                          style={[Typography.bodyMedium, { color: Colors.textLightPrimary, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, paddingBottom: 2 }]}
                        />
                      </View>
                      
                      {/* Unit Price Input */}
                      <View style={{ flex: 2 }}>
                        <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary, marginBottom: 2 }]}>Price per Unit</Text>
                        <TextInput
                          value={item.priceStr ?? (item.price === 0 ? "" : item.price.toString())}
                          onChangeText={(text) => {
                            const updated = [...items];
                            // Parse float safely
                            const cleanText = text.replace(/[^0-9.]/g, "");
                            updated[idx].priceStr = text;
                            updated[idx].price = parseFloat(cleanText) || 0;
                            setItems(updated);
                          }}
                          keyboardType="decimal-pad"
                          placeholder="0.00"
                          style={[Typography.bodyMedium, { color: Colors.textLightPrimary, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, paddingBottom: 2, fontWeight: "700" }]}
                        />
                      </View>

                      {/* Total cost of item row */}
                      <View style={{ flex: 1.5, alignItems: "flex-end", justifyContent: "flex-end" }}>
                        <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary, marginBottom: 2 }]}>Total</Text>
                        <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700" }]}>
                          {(item.price * item.qty).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}

                {/* Add Item Button */}
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setItems([...items, { name: "", price: 0, qty: 1 }]);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: Colors.white,
                    borderRadius: 12,
                    paddingVertical: Spacing.md,
                    borderWidth: 1,
                    borderStyle: "dashed",
                    borderColor: Colors.primary,
                    marginBottom: Spacing.xl,
                  }}
                >
                  <Feather name="plus" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
                  <Text style={[Typography.labelLarge, { color: Colors.primary, fontWeight: "700" }]}>Add Item</Text>
                </TouchableOpacity>

                {/* Calculations Panel */}
                <View style={{ backgroundColor: Colors.white, borderRadius: 20, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.borderLight, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8 }}>
                  {/* Subtotal Display */}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: showFeesAndTaxDetails ? Spacing.md : 0 }}>
                    <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>Subtotal</Text>
                    <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700" }]}>{currency} {getSubtotal().toFixed(2)}</Text>
                  </View>

                  {showFeesAndTaxDetails ? (
                    <>
                      {/* Tax Input */}
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: Spacing.md, marginBottom: Spacing.md }}>
                        <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>Tax (+)</Text>
                        <TextInput
                          value={taxStr ?? (tax === 0 ? "" : tax.toString())}
                          onChangeText={(text) => {
                            const cleanText = text.replace(/[^0-9.]/g, "");
                            setTaxStr(text);
                            setTax(parseFloat(cleanText) || 0);
                          }}
                          keyboardType="decimal-pad"
                          placeholder="0.00"
                          style={[Typography.labelLarge, { color: Colors.danger, fontWeight: "700", textAlign: "right", width: 100, borderBottomWidth: 1, borderBottomColor: Colors.borderLight }]}
                        />
                      </View>

                      {/* Service Charge Input */}
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md }}>
                        <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>Service Charge (+)</Text>
                        <TextInput
                          value={serviceStr ?? (service === 0 ? "" : service.toString())}
                          onChangeText={(text) => {
                            const cleanText = text.replace(/[^0-9.]/g, "");
                            setServiceStr(text);
                            setService(parseFloat(cleanText) || 0);
                          }}
                          keyboardType="decimal-pad"
                          placeholder="0.00"
                          style={[Typography.labelLarge, { color: Colors.amber, fontWeight: "700", textAlign: "right", width: 100, borderBottomWidth: 1, borderBottomColor: Colors.borderLight }]}
                        />
                      </View>

                      {/* Tips Input */}
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md }}>
                        <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>Tips (+)</Text>
                        <TextInput
                          value={tipsStr ?? (tips === 0 ? "" : tips.toString())}
                          onChangeText={(text) => {
                            const cleanText = text.replace(/[^0-9.]/g, "");
                            setTipsStr(text);
                            setTips(parseFloat(cleanText) || 0);
                          }}
                          keyboardType="decimal-pad"
                          placeholder="0.00"
                          style={[Typography.labelLarge, { color: Colors.primary, fontWeight: "700", textAlign: "right", width: 100, borderBottomWidth: 1, borderBottomColor: Colors.borderLight }]}
                        />
                      </View>

                      {/* Discount Input */}
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md }}>
                        <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>Discount (-)</Text>
                        <TextInput
                          value={discountStr ?? (discount === 0 ? "" : discount.toString())}
                          onChangeText={(text) => {
                            const cleanText = text.replace(/[^0-9.]/g, "");
                            setDiscountStr(text);
                            setDiscount(parseFloat(cleanText) || 0);
                          }}
                          keyboardType="decimal-pad"
                          placeholder="0.00"
                          style={[Typography.labelLarge, { color: Colors.teal, fontWeight: "700", textAlign: "right", width: 100, borderBottomWidth: 1, borderBottomColor: Colors.borderLight }]}
                        />
                      </View>
                    </>
                  ) : (
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowFeesAndTaxDetails(true);
                      }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: Colors.baseLight,
                        borderRadius: 12,
                        paddingVertical: 10,
                        marginTop: Spacing.md,
                      }}
                    >
                      <Feather name="plus-circle" size={14} color={Colors.textLightSecondary} style={{ marginRight: 6 }} />
                      <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary, fontWeight: "600" }]}>
                        Add Tax, Service Charge, Tips, or Discount
                      </Text>
                    </Pressable>
                  )}

                  <View style={{ height: 1, backgroundColor: Colors.borderLightStrong, marginVertical: Spacing.md }} />

                  {/* Grand Total */}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700" }]}>Grand Total</Text>
                    <Text style={[Typography.headingMedium, { color: Colors.teal, fontWeight: "800" }]}>
                      {currency} {getTotal().toFixed(2)}
                    </Text>
                  </View>
                </View>
              </ScrollView>

              {/* Continue button */}
              <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: Spacing.lg, paddingBottom: Math.max(insets.bottom, Spacing.lg), paddingTop: Spacing.md, backgroundColor: "rgba(242, 244, 247, 0.9)" }}>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCurrentStep("split_nominals");
                  }}
                  style={{ backgroundColor: "#111111", borderRadius: 24, paddingVertical: 18, alignItems: "center" }}
                >
                  <Text style={[Typography.labelLarge, { color: Colors.white, fontWeight: "700", fontSize: 16 }]}>Continue to Split</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ──────────────── STEP 4: DISTRIBUTE SPLIT ──────────────── */}
          {currentStep === "split_nominals" && (
            <View style={{ flex: 1 }}>
              {/* Tab Selector */}
              <View style={{ flexDirection: "row", paddingHorizontal: Spacing.lg, marginBottom: Spacing.md, gap: Spacing.sm }}>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSplitMode("evenly");
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: splitMode === "evenly" ? Colors.primary : Colors.white,
                    borderRadius: 12,
                    paddingVertical: 12,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: splitMode === "evenly" ? Colors.primary : Colors.borderLight,
                  }}
                >
                  <Text style={[Typography.labelLarge, { color: splitMode === "evenly" ? Colors.white : Colors.textLightPrimary, fontWeight: "700" }]}>Split Evenly</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSplitMode("items");
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: splitMode === "items" ? Colors.primary : Colors.white,
                    borderRadius: 12,
                    paddingVertical: 12,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: splitMode === "items" ? Colors.primary : Colors.borderLight,
                  }}
                >
                  <Text style={[Typography.labelLarge, { color: splitMode === "items" ? Colors.white : Colors.textLightPrimary, fontWeight: "700" }]}>Split by Items</Text>
                </TouchableOpacity>
              </View>

              {/* Splits List Container */}
              <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 160 }} style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
                {(() => {
                  const breakdowns = getParticipantSplitBreakdowns();
                  return splitMode === "evenly" ? (
                    /* ── Even Split View ── */
                    <View style={{ backgroundColor: Colors.white, borderRadius: 20, padding: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8 }}>
                      <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.md, paddingHorizontal: Spacing.xs }]}>Participant Shares</Text>
                      {/* Self Row */}
                      <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: Spacing.md, paddingHorizontal: Spacing.xs, borderBottomWidth: 1, borderBottomColor: Colors.borderLight }}>
                        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.tealGlow, justifyContent: "center", alignItems: "center", marginRight: Spacing.md }}>
                          <Text style={[Typography.labelLarge, { color: Colors.teal, fontWeight: "700" }]}>ME</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700" }]}>Me (You)</Text>
                          <Text style={[Typography.bodySmall, { color: Colors.textLightMuted, fontSize: 11, marginTop: 2 }]}>
                            Base: {currency} {breakdowns["self"]?.subtotal.toFixed(2)} | Fees/Tax: {currency} {(breakdowns["self"]?.tax + breakdowns["self"]?.service + breakdowns["self"]?.tips - breakdowns["self"]?.discount).toFixed(2)}
                          </Text>
                        </View>
                        <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary, fontSize: 16, fontWeight: "800" }]}>
                          {currency} {breakdowns["self"]?.total.toFixed(2)}
                        </Text>
                      </View>
                      {/* Friends Rows */}
                      {selectedFriends.map((friend) => (
                        <View key={friend.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: Spacing.md, paddingHorizontal: Spacing.xs, borderBottomWidth: 1, borderBottomColor: Colors.borderLight }}>
                          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: friend.color || Colors.primary, justifyContent: "center", alignItems: "center", marginRight: Spacing.md }}>
                            <Text style={[Typography.labelLarge, { color: Colors.white, fontWeight: "700" }]}>{friend.avatar}</Text>
                          </View>
                          <View style={{ flex: 1, marginRight: Spacing.md }}>
                            <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700" }]} numberOfLines={1}>{friend.name}</Text>
                            <Text style={[Typography.bodySmall, { color: Colors.textLightMuted, fontSize: 11, marginTop: 2 }]}>
                              Base: {currency} {breakdowns[friend.id]?.subtotal.toFixed(2)} | Fees/Tax: {currency} {(breakdowns[friend.id]?.tax + breakdowns[friend.id]?.service + breakdowns[friend.id]?.tips - breakdowns[friend.id]?.discount).toFixed(2)}
                            </Text>
                          </View>
                          <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary, fontSize: 16, fontWeight: "800" }]}>
                            {currency} {breakdowns[friend.id]?.total.toFixed(2)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                  /* ── Itemized Split View ── */
                  <View style={{ gap: Spacing.md }}>
                    <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, paddingHorizontal: Spacing.xs }]}>Assign Items to Friends</Text>
                    
                    {getFlattenedItems().map((flatItem, flatIdx) => {
                      const assigned = itemAssignments[flatItem.unitId] || ["self"];
                      return (
                        <View
                          key={flatItem.unitId}
                          style={{
                            backgroundColor: Colors.white,
                            borderRadius: 16,
                            padding: Spacing.md,
                            borderWidth: 1,
                            borderColor: Colors.borderLight,
                          }}
                        >
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.sm }}>
                            <View style={{ flex: 1, marginRight: Spacing.md }}>
                              <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700" }]}>{flatItem.name || "Item"}</Text>
                              <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>1x @ {flatItem.price.toFixed(2)}</Text>
                            </View>
                            <Text style={[Typography.labelLarge, { color: Colors.teal, fontWeight: "800" }]}>{currency} {flatItem.price.toFixed(2)}</Text>
                          </View>

                          <View style={{ height: 1, backgroundColor: Colors.borderLight, marginVertical: Spacing.sm }} />

                          {/* Assignees checkbox grid */}
                          <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary, marginBottom: Spacing.sm }]}>Shared by:</Text>
                          
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm }}>
                            {/* Toggle Self */}
                            <TouchableOpacity
                              onPress={() => {
                                const list = itemAssignments[flatItem.unitId] || ["self"];
                                const next = list.includes("self") ? list.filter((u: string) => u !== "self") : [...list, "self"];
                                setItemAssignments({ ...itemAssignments, [flatItem.unitId]: next });
                              }}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                paddingVertical: 6,
                                paddingHorizontal: 12,
                                borderRadius: 99,
                                backgroundColor: assigned.includes("self") ? Colors.primaryGlow : Colors.baseLight,
                                borderWidth: 1,
                                borderColor: assigned.includes("self") ? Colors.primary : Colors.borderLight,
                              }}
                            >
                              <Text style={[Typography.bodySmall, { color: assigned.includes("self") ? Colors.primary : Colors.textLightPrimary, fontWeight: "600" }]}>Me</Text>
                            </TouchableOpacity>

                            {/* Toggle Friends */}
                            {selectedFriends.map((friend) => {
                              const active = assigned.includes(friend.id);
                              return (
                                <TouchableOpacity
                                  key={friend.id}
                                  onPress={() => {
                                    const list = itemAssignments[flatItem.unitId] || ["self"];
                                    const next = list.includes(friend.id) ? list.filter((u: string) => u !== friend.id) : [...list, friend.id];
                                    setItemAssignments({ ...itemAssignments, [flatItem.unitId]: next });
                                  }}
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    paddingVertical: 6,
                                    paddingHorizontal: 12,
                                    borderRadius: 99,
                                    backgroundColor: active ? Colors.primaryGlow : Colors.baseLight,
                                    borderWidth: 1,
                                    borderColor: active ? Colors.primary : Colors.borderLight,
                                  }}
                                >
                                  <Text style={[Typography.bodySmall, { color: active ? Colors.primary : Colors.textLightPrimary, fontWeight: "600" }]} numberOfLines={1}>{friend.name}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      );
                    })}

                    {/* Proportional Split Results Panel */}
                    <View style={{ backgroundColor: Colors.white, borderRadius: 20, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.borderLight, marginTop: Spacing.md }}>
                      <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: Spacing.md }]}>Summary of Calculated Shares</Text>
                      {/* Self */}
                      <View style={{ paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderLight }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                          <Text style={[Typography.bodyMedium, { color: Colors.textLightPrimary, fontWeight: "600" }]}>Me (You)</Text>
                          <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700" }]}>{currency} {breakdowns["self"]?.total.toFixed(2)}</Text>
                        </View>
                        <Text style={[Typography.bodySmall, { color: Colors.textLightMuted, fontSize: 11, marginTop: 2 }]}>
                          Base: {currency} {breakdowns["self"]?.subtotal.toFixed(2)} | Fees/Tax: {currency} {(breakdowns["self"]?.tax + breakdowns["self"]?.service + breakdowns["self"]?.tips - breakdowns["self"]?.discount).toFixed(2)}
                        </Text>
                      </View>
                      {/* Friends */}
                      {selectedFriends.map((friend) => (
                        <View key={friend.id} style={{ paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderLight }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                            <Text style={[Typography.bodyMedium, { color: Colors.textLightPrimary, fontWeight: "600" }]}>{friend.name}</Text>
                            <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700" }]}>{currency} {breakdowns[friend.id]?.total.toFixed(2)}</Text>
                          </View>
                          <Text style={[Typography.bodySmall, { color: Colors.textLightMuted, fontSize: 11, marginTop: 2 }]}>
                            Base: {currency} {breakdowns[friend.id]?.subtotal.toFixed(2)} | Fees/Tax: {currency} {(breakdowns[friend.id]?.tax + breakdowns[friend.id]?.service + breakdowns[friend.id]?.tips - breakdowns[friend.id]?.discount).toFixed(2)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })()}
              </ScrollView>

              {/* Confirm split button */}
              <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: Spacing.lg, paddingBottom: Math.max(insets.bottom, Spacing.lg), paddingTop: Spacing.md, backgroundColor: "rgba(242, 244, 247, 0.9)" }}>
                <TouchableOpacity
                  onPress={handleConfirmSplit}
                  disabled={isSubmitting}
                  style={{
                    backgroundColor: "#111111",
                    borderRadius: 24,
                    paddingVertical: 18,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  {isSubmitting && <ActivityIndicator size="small" color={Colors.white} style={{ marginRight: 8 }} />}
                  <Text style={[Typography.labelLarge, { color: Colors.white, fontWeight: "700", fontSize: 16 }]}>
                    {isSubmitting ? "Sending Requests..." : `Send Split Request (${currency} ${getTotal().toFixed(2)})`}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
