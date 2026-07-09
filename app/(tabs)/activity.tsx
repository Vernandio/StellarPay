import { useState, useMemo, useRef, useCallback } from "react";
import { View, Text, ScrollView, Pressable, TextInput, TouchableOpacity, Share, RefreshControl, Modal, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Colors } from "../../src/constants/colors";
import { Typography } from "../../src/constants/typography";
import { Spacing } from "../../src/constants/spacing";
import Animated, { FadeIn, FadeOut, Layout, FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useTransactions, Activity } from "../../src/hooks/useTransactions";

export default function ActivityScreen() {
  const [filter, setFilter] = useState<"All" | "Sent" | "Received">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const { activities, isLoading, fetchTransactions } = useTransactions();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTransactions();
    setRefreshing(false);
  }, [fetchTransactions]);

  const detailSheetRef = useRef<BottomSheetModal>(null);
  const viewShotRef = useRef<any>(null);
  const [selectedTx, setSelectedTx] = useState<Activity | null>(null);

  const handleTxPress = (tx: Activity) => {
    Haptics.selectionAsync();
    setSelectedTx(tx);
    detailSheetRef.current?.present();
  };

  const handleShareReceipt = async () => {
    if (!selectedTx || !viewShotRef.current) return;
    try {
      const uri = await viewShotRef.current.capture();
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share Receipt' });
    } catch (err) {
      console.warn('Share receipt failed:', err);
      // Fallback to text share
      try {
        const shareMessage = `StellarPay Receipt\n\n` +
          `Title: ${selectedTx.title}\n` +
          `Amount: ${selectedTx.amountPrimary}\n` +
          `Date: ${selectedTx.dateSection} ${selectedTx.time}\n` +
          `Status: Successful\n` +
          `Reference ID: ${selectedTx.hash || "N/A"}\n` +
          (selectedTx.memo ? `Note: ${selectedTx.memo}\n` : "");
        await Share.share({ message: shareMessage });
      } catch (fallbackErr) {
        console.warn('Fallback share failed:', fallbackErr);
      }
    }
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
    ),
    []
  );

  const filteredActivities = useMemo(() => {
    return activities.filter(item => {
      // Type Filter
      if (filter === "Sent" && item.type !== "sent") return false;
      if (filter === "Received" && item.type !== "received") return false;

      // Date Filter
      if (item.date) {
        const itemDate = new Date(item.date);
        if (startDate) {
          const startOfDay = new Date(startDate);
          startOfDay.setHours(0, 0, 0, 0);
          if (itemDate < startOfDay) return false;
        }
        if (endDate) {
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (itemDate > endOfDay) return false;
        }
      }

      // Search Query
      if (searchQuery) {
        const query = searchQuery.toLowerCase().trim();
        // Remove symbols to search nominal amounts (e.g. "$50" or "Rp 400,000" -> "400000")
        const cleanQuery = query.replace(/[^0-9.]/g, "");
        
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesHash = item.hash ? item.hash.toLowerCase().includes(query) : false;
        const matchesId = item.id.toLowerCase().includes(query);
        const matchesMemo = item.memo ? item.memo.toLowerCase().includes(query) : false;
        
        const cleanAmountPrimary = item.amountPrimary.replace(/[^0-9.]/g, "");
        const cleanAmountSecondary = item.amountSecondary ? item.amountSecondary.replace(/[^0-9.]/g, "") : "";
        const matchesAmount = cleanQuery && (cleanAmountPrimary.includes(cleanQuery) || cleanAmountSecondary.includes(cleanQuery));
        
        return matchesTitle || matchesHash || matchesId || matchesMemo || matchesAmount;
      }
      return true;
    });
  }, [activities, filter, searchQuery, startDate, endDate]);

  // Group by dateSection
  const groupedActivities = filteredActivities.reduce((acc, curr) => {
    if (!acc[curr.dateSection]) {
      acc[curr.dateSection] = [];
    }
    acc[curr.dateSection].push(curr);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.baseLight }} edges={["top"]}>
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        
        {/* Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.xl }}>
          <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "700", fontSize: 28 }]}>History</Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Pressable onPress={() => { setShowSearch(!showSearch); setShowDateFilter(false); setSearchQuery(""); }} style={{ marginRight: Spacing.lg }}>
              <Feather name={showSearch ? "x" : "search"} size={24} color={showSearch ? Colors.primary : Colors.textLightPrimary} />
            </Pressable>
            <Pressable onPress={() => { setShowDateFilter(!showDateFilter); setShowSearch(false); }}>
              <Feather name={showDateFilter ? "x" : "calendar"} size={24} color={showDateFilter ? Colors.primary : Colors.textLightPrimary} />
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
          <Animated.View 
            entering={FadeInDown.duration(300)} 
            exiting={FadeOut} 
            style={{ 
              backgroundColor: Colors.white, 
              borderRadius: 20, 
              padding: Spacing.md, 
              marginBottom: Spacing.xl,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.03,
              shadowRadius: 12,
              elevation: 3,
              borderWidth: 1,
              borderColor: Colors.borderLight
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Feather name="calendar" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
                <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700" }]}>Date Range Filter</Text>
              </View>
              {(startDate || endDate) && (
                <Pressable
                  onPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    setStartDate(null);
                    setEndDate(null);
                  }}
                  style={{ paddingVertical: 4, paddingHorizontal: 8 }}
                >
                  <Text style={[Typography.labelSmall, { color: Colors.danger, fontWeight: "700" }]}>Reset Filter</Text>
                </Pressable>
              )}
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
              <Pressable
                onPress={() => setShowStartPicker(true)}
                style={{ 
                  flex: 1, 
                  backgroundColor: Colors.baseLight, 
                  borderRadius: 12, 
                  padding: Spacing.md, 
                  borderWidth: 1, 
                  borderColor: startDate ? Colors.primary : Colors.borderLight,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  minHeight: 48
                }}
              >
                <View>
                  <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary, fontSize: 11, marginBottom: 2 }]}>Start Date</Text>
                  <Text style={[Typography.labelLarge, { color: startDate ? Colors.textLightPrimary : Colors.textLightMuted, fontWeight: "600" }]}>
                    {startDate ? startDate.toLocaleDateString() : "Select Date"}
                  </Text>
                </View>
                <Feather name="calendar" size={14} color={startDate ? Colors.primary : Colors.textLightMuted} />
              </Pressable>

              <Pressable
                onPress={() => setShowEndPicker(true)}
                style={{ 
                  flex: 1, 
                  backgroundColor: Colors.baseLight, 
                  borderRadius: 12, 
                  padding: Spacing.md, 
                  borderWidth: 1, 
                  borderColor: endDate ? Colors.primary : Colors.borderLight,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  minHeight: 48
                }}
              >
                <View>
                  <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary, fontSize: 11, marginBottom: 2 }]}>End Date</Text>
                  <Text style={[Typography.labelLarge, { color: endDate ? Colors.textLightPrimary : Colors.textLightMuted, fontWeight: "600" }]}>
                    {endDate ? endDate.toLocaleDateString() : "Select Date"}
                  </Text>
                </View>
                <Feather name="calendar" size={14} color={endDate ? Colors.primary : Colors.textLightMuted} />
              </Pressable>
            </View>

            {startDate || endDate ? (
              <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary, marginTop: Spacing.sm, fontSize: 12, fontStyle: "italic" }]}>
                Showing transactions from {startDate ? startDate.toLocaleDateString() : "earliest"} to {endDate ? endDate.toLocaleDateString() : "today"}
              </Text>
            ) : null}

            {showStartPicker && (
              Platform.OS === "ios" ? (
                <Modal transparent={true} animationType="fade" visible={showStartPicker}>
                  <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" }}>
                    <View style={{ backgroundColor: Colors.white, borderRadius: 24, padding: Spacing.lg, width: "90%", alignItems: "center" }}>
                      <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary, marginBottom: Spacing.md, fontWeight: "700" }]}>Select Start Date</Text>
                      <DateTimePicker
                        value={startDate || new Date()}
                        mode="date"
                        display="inline"
                        maximumDate={endDate || new Date()}
                        onChange={(event, selectedDate) => {
                          if (selectedDate) setStartDate(selectedDate);
                        }}
                      />
                      <TouchableOpacity
                        onPress={() => setShowStartPicker(false)}
                        style={{ backgroundColor: "#111111", paddingVertical: 12, paddingHorizontal: Spacing.xl, borderRadius: 99, marginTop: Spacing.md, width: "100%", alignItems: "center" }}
                      >
                        <Text style={[Typography.labelLarge, { color: Colors.white, fontWeight: "700" }]}>Done</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              ) : (
                <DateTimePicker
                  value={startDate || new Date()}
                  mode="date"
                  display="default"
                  maximumDate={endDate || new Date()}
                  onChange={(event, selectedDate) => {
                    setShowStartPicker(false);
                    if (selectedDate) setStartDate(selectedDate);
                  }}
                />
              )
            )}

            {showEndPicker && (
              Platform.OS === "ios" ? (
                <Modal transparent={true} animationType="fade" visible={showEndPicker}>
                  <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" }}>
                    <View style={{ backgroundColor: Colors.white, borderRadius: 24, padding: Spacing.lg, width: "90%", alignItems: "center" }}>
                      <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary, marginBottom: Spacing.md, fontWeight: "700" }]}>Select End Date</Text>
                      <DateTimePicker
                        value={endDate || new Date()}
                        mode="date"
                        display="inline"
                        minimumDate={startDate || undefined}
                        maximumDate={new Date()}
                        onChange={(event, selectedDate) => {
                          if (selectedDate) setEndDate(selectedDate);
                        }}
                      />
                      <TouchableOpacity
                        onPress={() => setShowEndPicker(false)}
                        style={{ backgroundColor: "#111111", paddingVertical: 12, paddingHorizontal: Spacing.xl, borderRadius: 99, marginTop: Spacing.md, width: "100%", alignItems: "center" }}
                      >
                        <Text style={[Typography.labelLarge, { color: Colors.white, fontWeight: "700" }]}>Done</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              ) : (
                <DateTimePicker
                  value={endDate || new Date()}
                  mode="date"
                  display="default"
                  minimumDate={startDate || undefined}
                  maximumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    setShowEndPicker(false);
                    if (selectedDate) setEndDate(selectedDate);
                  }}
                />
              )
            )}
          </Animated.View>
        )}



        <Animated.View layout={Layout.springify()}>
          {isLoading ? (
            <View style={{ alignItems: "center", marginTop: Spacing.xxl }}>
              <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>Loading transactions...</Text>
            </View>
          ) : Object.entries(groupedActivities).length === 0 ? (
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
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleTxPress(item)}
                    style={{ flexDirection: "row", alignItems: "center", paddingVertical: Spacing.md, borderBottomWidth: index === items.length - 1 ? 0 : 1, borderBottomColor: Colors.borderLight }}
                  >
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
                  </TouchableOpacity>
                ))}
              </View>
            ))
          )}
        </Animated.View>

      </ScrollView>

      {/* Transaction Details Sheet */}
      <BottomSheetModal
        ref={detailSheetRef}
        enableDynamicSizing={true}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: Colors.white, borderRadius: 24 }}
        handleIndicatorStyle={{ backgroundColor: Colors.border, width: 40 }}
        enablePanDownToClose={true}
      >
        {selectedTx && (
          <BottomSheetView style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl }}>
            {/* Header */}
            <View style={{ alignItems: "center", marginTop: Spacing.sm, marginBottom: Spacing.lg }}>
              <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "700", fontSize: 20 }]}>
                Transaction Details
              </Text>
            </View>

            <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }} style={{ backgroundColor: Colors.white }}>
            {/* Main Receipt Info Card */}
            <View style={{ alignItems: "center", marginBottom: Spacing.xl }}>
              <View style={{
                width: 64, height: 64, borderRadius: 32,
                backgroundColor: selectedTx.isPositive ? "rgba(29, 185, 138, 0.1)" : Colors.baseLight,
                justifyContent: "center", alignItems: "center",
                marginBottom: Spacing.md
              }}>
                <Feather
                  name={selectedTx.icon}
                  size={28}
                  color={selectedTx.isPositive ? Colors.teal : Colors.textLightPrimary}
                />
              </View>
              
              <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "700", fontSize: 24, marginBottom: 2 }]}>
                {selectedTx.title}
              </Text>
              
              {/* Large display amount (primary — local currency or USD) */}
              <Text style={[Typography.displayLarge, { color: selectedTx.isPositive ? Colors.teal : Colors.textLightPrimary, fontWeight: "800", fontSize: 32, marginVertical: 6 }]}>
                {selectedTx.amountPrimary}
              </Text>

              {/* Subtext USD equivalent (only when primary is a local currency) */}
              {selectedTx.amountSecondary && (
                <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginBottom: Spacing.md }]}>
                  {selectedTx.amountSecondary}
                </Text>
              )}

              {/* Success Badge */}
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(29, 185, 138, 0.1)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.teal, marginRight: 6 }} />
                <Text style={[Typography.labelSmall, { color: Colors.teal, fontWeight: "700", textTransform: "uppercase", fontSize: 11 }]}>
                  Successful
                </Text>
              </View>
            </View>

            {/* Transfer Details Panel */}
            <View style={{ backgroundColor: Colors.baseLight, borderRadius: 20, padding: Spacing.lg, marginBottom: Spacing.xl }}>
              <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.md }]}>
                Transfer Details
              </Text>

              {/* Transfer ID / Hash row */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md }}>
                <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>Transaction ID</Text>
                <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "600" }]}>
                  {selectedTx.hash ? `${selectedTx.hash.substring(0, 10)}...${selectedTx.hash.substring(selectedTx.hash.length - 10)}` : `#${selectedTx.id.substring(0, 8)}`}
                </Text>
              </View>

              {/* Transfer Date/Time row */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md }}>
                <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>Date & Time</Text>
                <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "600" }]}>
                  {selectedTx.dateSection} • {selectedTx.time}
                </Text>
              </View>

              {/* Transfer Fee row */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md }}>
                <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>Transfer Fee</Text>
                <Text style={[Typography.labelLarge, { color: Colors.teal, fontWeight: "700" }]}>Free</Text>
              </View>

              <View style={{ height: 1, backgroundColor: Colors.borderLightStrong, marginVertical: Spacing.xs, marginBottom: Spacing.md }} />

              {/* Note / Memo Row */}
              {selectedTx.memo ? (
                <View style={{ marginTop: Spacing.xs }}>
                  <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginBottom: 6 }]}>Notes</Text>
                  <View style={{ backgroundColor: Colors.white, borderRadius: 12, padding: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight }}>
                    <Text style={[Typography.bodyMedium, { color: Colors.textLightPrimary }]}>
                      {selectedTx.memo}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
            </ViewShot>

            {/* Action Buttons Row */}
            <View style={{ flexDirection: "row", gap: Spacing.md }}>
              <TouchableOpacity
                onPress={handleShareReceipt}
                style={{ flex: 1, height: 52, borderRadius: 26, borderWidth: 1, borderColor: Colors.borderLightStrong, justifyContent: "center", alignItems: "center", backgroundColor: Colors.white, flexDirection: "row" }}
              >
                <Feather name="share-2" size={16} color={Colors.textLightPrimary} style={{ marginRight: 8 }} />
                <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700" }]}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => detailSheetRef.current?.dismiss()}
                style={{ flex: 1, height: 52, borderRadius: 26, backgroundColor: "#111111", justifyContent: "center", alignItems: "center" }}
              >
                <Text style={[Typography.labelLarge, { color: Colors.white, fontWeight: "700" }]}>Done</Text>
              </TouchableOpacity>
            </View>
          </BottomSheetView>
        )}
      </BottomSheetModal>
    </SafeAreaView>
  );
}
