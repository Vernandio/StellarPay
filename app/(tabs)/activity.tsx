import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { View, Text, ScrollView, Pressable, TextInput, TouchableOpacity, Share, RefreshControl, Alert, ActivityIndicator, Platform } from "react-native";
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
import { DateField } from "../../src/components/ui/DateField";

import { useTransactions, Activity } from "../../src/hooks/useTransactions";
import { useAuthStore } from "../../src/store/authStore";
import { subscribeToAllUserRequests, updatePaymentRequest, PaymentRequest } from "../../src/services/firebase/requests";
import { saveTransaction } from "../../src/services/firebase/transactions";
import { createNotification } from "../../src/services/firebase/notifications";
import { getUserProfile } from "../../src/services/firebase/firestore";
import { useWallet } from "../../src/hooks/useWallet";
import { useStellar } from "../../src/hooks/useStellar";
import { formatAmount } from "../../src/utils/format";
import { PinVerifySheet, PinVerifySheetRef } from "../../src/components/PinVerifySheet";

export default function ActivityScreen() {
  const [activeTab, setActiveTab] = useState<"Transactions" | "Requests">("Transactions");
  const [filter, setFilter] = useState<"All" | "Sent" | "Received">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const { activities, isLoading, fetchTransactions } = useTransactions();
  const { profile, user } = useAuthStore();
  const { send } = useStellar();
  const { refreshBalances } = useWallet();
  const [refreshing, setRefreshing] = useState(false);

  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [isProcessingRequest, setIsProcessingRequest] = useState(false);

  // Subscribe to requests in real time
  useEffect(() => {
    if (!profile?.uid) return;
    const unsubscribe = subscribeToAllUserRequests(profile.uid, (data) => {
      setRequests(data);
    });
    return () => unsubscribe();
  }, [profile?.uid]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTransactions();
    setRefreshing(false);
  }, [fetchTransactions]);

  const detailSheetRef = useRef<BottomSheetModal>(null);
  const requestSheetRef = useRef<BottomSheetModal>(null);
  const pinSheetRef = useRef<PinVerifySheetRef>(null);
  const viewShotRef = useRef<any>(null);
  const [selectedTx, setSelectedTx] = useState<Activity | null>(null);

  const handleTxPress = (tx: Activity) => {
    Haptics.selectionAsync();
    setSelectedTx(tx);
    detailSheetRef.current?.present();
  };

  const handleRequestPress = (req: PaymentRequest) => {
    Haptics.selectionAsync();
    setSelectedRequest(req);
    requestSheetRef.current?.present();
  };

  const handleShareReceipt = async () => {
    if (!selectedTx || !viewShotRef.current) return;
    try {
      const uri = await viewShotRef.current.capture();
      
      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = uri;
        link.download = `receipt-${selectedTx.hash || selectedTx.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

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

  const handlePayRequest = () => {
    if (!selectedRequest) return;
    pinSheetRef.current?.present();
  };

  const handleExecutePayment = async () => {
    if (!selectedRequest || !user) return;
    setIsProcessingRequest(true);

    try {
      const requester = await getUserProfile(selectedRequest.senderUid);
      if (!requester?.stellarPublicKey) {
        throw new Error("This person hasn't finished setting up their account yet.");
      }

      const txHash = await send(
        requester.stellarPublicKey,
        selectedRequest.amountUSD,
        "USDC",
        selectedRequest.message,
        selectedRequest.senderUid
      );

      await updatePaymentRequest(selectedRequest.id, {
        status: "paid",
        txHash,
      });

      await saveTransaction({
        hash: txHash,
        senderUid: user.uid,
        senderUsername: profile?.username || "",
        receiverUid: selectedRequest.senderUid,
        receiverUsername: selectedRequest.senderUsername,
        amountUSD: selectedRequest.amountUSD,
        displayCurrency: "USD",
        displayAmount: selectedRequest.amountUSD,
        memo: selectedRequest.message || "",
        status: "completed",
      });

      await createNotification({
        uid: selectedRequest.senderUid,
        title: "Request Paid",
        message: `${profile?.displayName || profile?.username} paid your request of $${parseFloat(selectedRequest.amountUSD).toFixed(2)} USD`,
        type: "request_paid",
        referenceId: selectedRequest.id,
      });

      await createNotification({
        uid: user.uid,
        title: "Payment Sent",
        message: `You paid $${parseFloat(selectedRequest.amountUSD).toFixed(2)} USD to ${selectedRequest.senderDisplayName || selectedRequest.senderUsername}`,
        type: "payment_sent",
        referenceId: txHash,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", `Paid $${parseFloat(selectedRequest.amountUSD).toFixed(2)} USD successfully.`);
      
      requestSheetRef.current?.dismiss();
      refreshBalances();
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Payment Failed", err.message || "Failed to pay request.");
    } finally {
      setIsProcessingRequest(false);
      setSelectedRequest(null);
    }
  };

  const handleDeclineRequest = async () => {
    if (!selectedRequest || !user || !profile) return;

    const isSent = selectedRequest.senderUid === profile.uid;
    const alertTitle = isSent ? "Cancel Request" : "Decline Request";
    const alertMsg = isSent 
      ? `Are you sure you want to cancel this request for $${formatAmount(selectedRequest.amountUSD, "USD")} USD to @${selectedRequest.receiverUsername}?`
      : `Are you sure you want to decline this request for $${formatAmount(selectedRequest.amountUSD, "USD")} USD from ${selectedRequest.senderDisplayName || selectedRequest.senderUsername}?`;

    const confirmText = isSent ? "Cancel Request" : "Decline";

    Alert.alert(
      alertTitle,
      alertMsg,
      [
        { text: "No", style: "cancel" },
        {
          text: confirmText,
          style: "destructive",
          onPress: async () => {
            setIsProcessingRequest(true);
            try {
              await updatePaymentRequest(selectedRequest.id, { status: "declined" });

              if (!isSent) {
                await createNotification({
                  uid: selectedRequest.senderUid,
                  title: "Request Declined",
                  message: `${profile?.displayName || profile?.username} declined your request of $${formatAmount(selectedRequest.amountUSD, "USD")} USD`,
                  type: "request_declined",
                  referenceId: selectedRequest.id,
                });
              } else {
                await createNotification({
                  uid: selectedRequest.receiverUid,
                  title: "Request Cancelled",
                  message: `${profile?.displayName || profile?.username} cancelled their request of $${formatAmount(selectedRequest.amountUSD, "USD")} USD`,
                  type: "request_declined",
                  referenceId: selectedRequest.id,
                });
              }

              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              requestSheetRef.current?.dismiss();
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to update request.");
            } finally {
              setIsProcessingRequest(false);
              setSelectedRequest(null);
            }
          },
        },
      ]
    );
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
    ),
    []
  );

  const filteredActivities = useMemo(() => {
    return activities.filter(item => {
      if (filter === "Sent" && item.type !== "sent") return false;
      if (filter === "Received" && item.type !== "received") return false;

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

      if (searchQuery) {
        const query = searchQuery.toLowerCase().trim();
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

        {/* Toggle Segment Tabs */}
        <View style={{ flexDirection: "row", backgroundColor: Colors.white, borderRadius: 16, padding: 4, marginBottom: Spacing.xl, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 }}>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab("Transactions"); }}
            style={{ flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 12, backgroundColor: activeTab === "Transactions" ? Colors.textLightPrimary : Colors.transparent }}
          >
            <Text style={[Typography.labelLarge, { color: activeTab === "Transactions" ? Colors.white : Colors.textLightSecondary, fontWeight: "700" }]}>Transactions</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab("Requests"); }}
            style={{ flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 12, backgroundColor: activeTab === "Requests" ? Colors.textLightPrimary : Colors.transparent }}
          >
            <Text style={[Typography.labelLarge, { color: activeTab === "Requests" ? Colors.white : Colors.textLightSecondary, fontWeight: "700" }]}>Requests</Text>
          </TouchableOpacity>
        </View>

        {showSearch && activeTab === "Transactions" && (
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

        {showDateFilter && activeTab === "Transactions" && (
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
              <DateField
                label="Start Date"
                value={startDate}
                onChange={setStartDate}
                maximumDate={endDate || new Date()}
              />
              <DateField
                label="End Date"
                value={endDate}
                onChange={setEndDate}
                minimumDate={startDate || undefined}
                maximumDate={new Date()}
              />
            </View>

            {startDate || endDate ? (
              <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary, marginTop: Spacing.sm, fontSize: 12, fontStyle: "italic" }]}>
                Showing transactions from {startDate ? startDate.toLocaleDateString() : "earliest"} to {endDate ? endDate.toLocaleDateString() : "today"}
              </Text>
            ) : null}
          </Animated.View>
        )}

        {activeTab === "Transactions" ? (
          <Animated.View layout={Layout.springify()}>
            {isLoading ? (
              <View style={{ alignItems: "center", marginTop: Spacing.xxl }}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginTop: Spacing.sm }]}>Loading transactions...</Text>
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
        ) : (
          <Animated.View layout={Layout.springify()}>
            {requests.length === 0 ? (
              <View style={{ alignItems: "center", marginTop: Spacing.xxl }}>
                <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>No payment requests found.</Text>
              </View>
            ) : (
              requests.map((item) => {
                const isSent = item.senderUid === profile?.uid;
                const formattedDate = item.createdAt?.seconds 
                  ? new Date(item.createdAt.seconds * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) 
                  : "Just now";

                let statusColor: string = Colors.amber;
                if (item.status === "paid") statusColor = Colors.teal;
                if (item.status === "declined") statusColor = Colors.danger;

                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleRequestPress(item)}
                    style={{ 
                      backgroundColor: Colors.white, 
                      borderRadius: 16, 
                      padding: Spacing.lg, 
                      marginBottom: Spacing.md,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.02,
                      shadowRadius: 6,
                      elevation: 1,
                      borderWidth: 1,
                      borderColor: Colors.borderLight
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: Spacing.sm }}>
                      <View style={{ flex: 1, marginRight: Spacing.md }}>
                        <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700" }]}>
                          {isSent ? `Request to @${item.receiverUsername}` : `Request from @${item.senderUsername}`}
                        </Text>
                        <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary, marginTop: 2 }]}>
                          {formattedDate}
                        </Text>
                      </View>
                      
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700" }]}>
                          {formatAmount(item.amountUSD, "USD")} USD
                        </Text>
                        
                        <View style={{ 
                          marginTop: 6, 
                          paddingHorizontal: 8, 
                          paddingVertical: 3, 
                          borderRadius: 8, 
                          backgroundColor: statusColor + "20"
                        }}>
                          <Text style={[Typography.labelSmall, { color: statusColor, fontWeight: "700", textTransform: "uppercase", fontSize: 10 }]}>
                            {item.status}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {item.message ? (
                      <View style={{ backgroundColor: Colors.baseLight, borderRadius: 8, padding: Spacing.sm, marginTop: Spacing.xs }}>
                        <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]} numberOfLines={1}>
                          "{item.message}"
                        </Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })
            )}
          </Animated.View>
        )}

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
            <View style={{ alignItems: "center", marginTop: Spacing.sm, marginBottom: Spacing.lg }}>
              <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "700", fontSize: 20 }]}>
                Transaction Details
              </Text>
            </View>

            <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }} style={{ backgroundColor: Colors.white }}>
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
                
                <Text style={[Typography.displayLarge, { color: selectedTx.isPositive ? Colors.teal : Colors.textLightPrimary, fontWeight: "800", fontSize: 32, marginVertical: 6 }]}>
                  {selectedTx.amountPrimary}
                </Text>

                {selectedTx.amountSecondary && (
                  <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginBottom: Spacing.md }]}>
                    {selectedTx.amountSecondary}
                  </Text>
                )}

                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(29, 185, 138, 0.1)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.teal, marginRight: 6 }} />
                  <Text style={[Typography.labelSmall, { color: Colors.teal, fontWeight: "700", textTransform: "uppercase", fontSize: 11 }]}>
                    Successful
                  </Text>
                </View>
              </View>

              <View style={{ backgroundColor: Colors.baseLight, borderRadius: 20, padding: Spacing.lg, marginBottom: Spacing.xl }}>
                <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.md }]}>
                  Transfer Details
                </Text>

                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md }}>
                  <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>Transaction ID</Text>
                  <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "600" }]}>
                    {selectedTx.hash ? `${selectedTx.hash.substring(0, 10)}...${selectedTx.hash.substring(selectedTx.hash.length - 10)}` : `#${selectedTx.id.substring(0, 8)}`}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md }}>
                  <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>Date & Time</Text>
                  <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "600" }]}>
                    {selectedTx.dateSection} • {selectedTx.time}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md }}>
                  <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>Transfer Fee</Text>
                  <Text style={[Typography.labelLarge, { color: Colors.teal, fontWeight: "700" }]}>Free</Text>
                </View>

                <View style={{ height: 1, backgroundColor: Colors.borderLightStrong, marginVertical: Spacing.xs, marginBottom: Spacing.md }} />

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

      {/* Request Details Sheet */}
      <BottomSheetModal
        ref={requestSheetRef}
        enableDynamicSizing={true}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: Colors.white, borderRadius: 24 }}
        handleIndicatorStyle={{ backgroundColor: Colors.border, width: 40 }}
        enablePanDownToClose={true}
      >
        {selectedRequest && (
          <BottomSheetView style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl }}>
            <View style={{ alignItems: "center", marginTop: Spacing.sm, marginBottom: Spacing.lg }}>
              <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "700", fontSize: 20 }]}>
                Request Details
              </Text>
            </View>

            <View style={{ alignItems: "center", marginBottom: Spacing.xl }}>
              <View style={{
                width: 64, height: 64, borderRadius: 32,
                backgroundColor: Colors.baseLight,
                justifyContent: "center", alignItems: "center",
                marginBottom: Spacing.md
              }}>
                <Feather name="file-text" size={28} color={Colors.textLightPrimary} />
              </View>

              <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "700", fontSize: 22, marginBottom: 2 }]}>
                {selectedRequest.senderUid === profile?.uid
                  ? `To: ${selectedRequest.receiverUsername}`
                  : `From: ${selectedRequest.senderDisplayName || selectedRequest.senderUsername}`}
              </Text>

              <Text style={[Typography.displayLarge, { color: Colors.textLightPrimary, fontWeight: "800", fontSize: 32, marginVertical: 6 }]}>
                {formatAmount(selectedRequest.amountUSD, "USD")} USD
              </Text>

              {/* Status Badge */}
              <View style={{ 
                flexDirection: "row", 
                alignItems: "center", 
                backgroundColor: (selectedRequest.status === "paid" ? Colors.teal : selectedRequest.status === "declined" ? Colors.danger : Colors.amber) + "20", 
                paddingHorizontal: 12, 
                paddingVertical: 6, 
                borderRadius: 99 
              }}>
                <Text style={[Typography.labelSmall, { 
                  color: selectedRequest.status === "paid" ? Colors.teal : selectedRequest.status === "declined" ? Colors.danger : Colors.amber, 
                  fontWeight: "700", 
                  textTransform: "uppercase", 
                  fontSize: 11 
                }]}>
                  {selectedRequest.status}
                </Text>
              </View>
            </View>

            <View style={{ backgroundColor: Colors.baseLight, borderRadius: 20, padding: Spacing.lg, marginBottom: Spacing.xl }}>
              <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.md }]}>
                Request Information
              </Text>

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md }}>
                <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>Request ID</Text>
                <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "600" }]}>
                  #{selectedRequest.id.substring(0, 8)}
                </Text>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md }}>
                <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary }]}>Requested On</Text>
                <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "600" }]}>
                  {selectedRequest.createdAt?.seconds 
                    ? new Date(selectedRequest.createdAt.seconds * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) 
                    : "Today"}
                </Text>
              </View>

              {selectedRequest.message ? (
                <View style={{ marginTop: Spacing.xs }}>
                  <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginBottom: 6 }]}>Message</Text>
                  <View style={{ backgroundColor: Colors.white, borderRadius: 12, padding: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight }}>
                    <Text style={[Typography.bodyMedium, { color: Colors.textLightPrimary }]}>
                      {selectedRequest.message}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>

            {/* Actions for pending request */}
            {selectedRequest.status === "pending" ? (
              selectedRequest.receiverUid === profile?.uid ? (
                <View style={{ flexDirection: "row", gap: Spacing.md }}>
                  <TouchableOpacity
                    onPress={handleDeclineRequest}
                    disabled={isProcessingRequest}
                    style={{ flex: 1, height: 52, borderRadius: 26, borderWidth: 1, borderColor: Colors.borderLightStrong, justifyContent: "center", alignItems: "center", backgroundColor: Colors.white }}
                  >
                    <Text style={[Typography.labelLarge, { color: Colors.danger, fontWeight: "700" }]}>DECLINE</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handlePayRequest}
                    disabled={isProcessingRequest}
                    style={{ flex: 1, height: 52, borderRadius: 26, backgroundColor: Colors.textLightPrimary, justifyContent: "center", alignItems: "center" }}
                  >
                    {isProcessingRequest ? (
                      <ActivityIndicator color={Colors.white} />
                    ) : (
                      <Text style={[Typography.labelLarge, { color: Colors.white, fontWeight: "700" }]}>PAY NOW</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleDeclineRequest}
                  disabled={isProcessingRequest}
                  style={{ height: 52, borderRadius: 26, borderWidth: 1, borderColor: Colors.borderLightStrong, justifyContent: "center", alignItems: "center", backgroundColor: Colors.white }}
                >
                  <Text style={[Typography.labelLarge, { color: Colors.danger, fontWeight: "700" }]}>CANCEL REQUEST</Text>
                </TouchableOpacity>
              )
            ) : (
              <TouchableOpacity
                onPress={() => requestSheetRef.current?.dismiss()}
                style={{ height: 52, borderRadius: 26, backgroundColor: "#111111", justifyContent: "center", alignItems: "center" }}
              >
                <Text style={[Typography.labelLarge, { color: Colors.white, fontWeight: "700" }]}>Close</Text>
              </TouchableOpacity>
            )}
          </BottomSheetView>
        )}
      </BottomSheetModal>

      <PinVerifySheet ref={pinSheetRef} onSuccess={handleExecutePayment} />
    </SafeAreaView>
  );
}
