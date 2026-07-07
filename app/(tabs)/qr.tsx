import { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, Pressable, Alert, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useNavigation, useLocalSearchParams } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import QRCode from "react-native-qrcode-svg";
import Animated, { FadeIn, FadeOut, FadeInDown } from "react-native-reanimated";
import { Colors } from "../../src/constants/colors";
import { Typography } from "../../src/constants/typography";
import { Spacing } from "../../src/constants/spacing";
import { useAuthStore } from "../../src/store/authStore";
import { getUserByUsername, getUserProfile } from "../../src/services/firebase/firestore";
import { isEMVCoQR } from "../../src/utils/emvco";
import { API_BASE } from "../../src/services/api/client";
import { doc, getDoc } from "@firebase/firestore";
import { db } from "../../src/services/firebase/config";

// ── QR URI scheme ────────────────────────────────────────────────────
// Format: stellarpay:@username
// We intentionally hide public keys from QR codes (Invisible Web3)

const buildQRPayload = (username: string): string =>
  `stellarpay:@${username}`;

const parseQRPayload = (data: string): { username: string; amount?: string; currency?: string } | null => {
  // Support "stellarpay:@username?amount=...&currency=..." format
  if (data.startsWith("stellarpay:@")) {
    const payloadPart = data.substring("stellarpay:@".length);
    const [username, queryString] = payloadPart.split("?");
    let amount: string | undefined;
    let currency: string | undefined;

    if (queryString) {
      const pairs = queryString.split("&");
      pairs.forEach((pair) => {
        const [key, val] = pair.split("=");
        if (key === "amount") amount = decodeURIComponent(val);
        if (key === "currency") currency = decodeURIComponent(val);
      });
    }

    return { username, amount, currency };
  }

  // Also support plain "@username" format
  if (data.startsWith("@") && data.length > 1) {
    return { username: data.substring(1) };
  }

  return null;
};

export default function QRScreen() {
  const [activeTab, setActiveTab] = useState<"Scan" | "My QR">("Scan");
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const scannedRef = useRef(false);

  const { profile } = useAuthStore();
  const navigation = useNavigation();
  const searchParams = useLocalSearchParams();
  const action = searchParams.action; // "request" or "send"

  // Reset scanned state when screen gets focus (returning from send/qr-pay screens)
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      scannedRef.current = false;
      setScanned(false);
      setIsLookingUp(false);
    });
    return unsubscribe;
  }, [navigation]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scannedRef.current || isLookingUp) return;
    scannedRef.current = true;
    setScanned(true);
    setIsLookingUp(true);

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // 1. Check if standard EMVCo QR code (QRIS / VietQR / PHQR)
    if (isEMVCoQR(data)) {
      setIsLookingUp(false);
      router.push({
        pathname: "/qr-pay",
        params: { qrPayload: data },
      });
      return;
    }

    // 2. Check if it's a dynamic P2P single-use payment request QR code
    if (data.startsWith("stellarpay:request?id=")) {
      const parts = data.split("id=");
      const requestId = parts[1];
      if (requestId) {
        try {
          const docRef = doc(db, "requests", requestId);
          const docSnap = await getDoc(docRef);

          if (!docSnap.exists()) {
            Alert.alert("Invalid QR Code", "This payment request could not be found.", [
              { text: "Scan Again", onPress: () => { scannedRef.current = false; setScanned(false); setIsLookingUp(false); } }
            ]);
            return;
          }

          const reqData = docSnap.data();

          if (reqData.status === "paid") {
            Alert.alert("Request Already Paid", "This payment request has already been completed and cannot be paid again.", [
              { text: "Scan Again", onPress: () => { scannedRef.current = false; setScanned(false); setIsLookingUp(false); } }
            ]);
            return;
          }

          if (reqData.status === "declined") {
            Alert.alert("Request Cancelled", "This payment request was cancelled by the requester.", [
              { text: "Scan Again", onPress: () => { scannedRef.current = false; setScanned(false); setIsLookingUp(false); } }
            ]);
            return;
          }

          // Fetch requester's profile to get public key
          const requesterProfile = await getUserProfile(reqData.senderUid);
          if (!requesterProfile?.stellarPublicKey) {
            throw new Error("Requester has not initialized their Stellar wallet yet.");
          }

          setIsLookingUp(false);
          router.push({
            pathname: "/send",
            params: {
              name: reqData.senderDisplayName || reqData.senderUsername,
              handle: `@${reqData.senderUsername}`,
              publicKey: requesterProfile.stellarPublicKey,
              uid: reqData.senderUid,
              avatar: (reqData.senderDisplayName || reqData.senderUsername).charAt(0).toUpperCase(),
              color: "#7B61FF",
              amount: reqData.requestedAmount || "",
              currencyCode: reqData.requestedCurrency || "",
              requestId: requestId,
              memo: reqData.message || "",
            },
          });
          return;
        } catch (err: any) {
          Alert.alert("Error", err.message || "Failed to retrieve request details.", [
            { text: "Scan Again", onPress: () => { scannedRef.current = false; setScanned(false); setIsLookingUp(false); } }
          ]);
          return;
        }
      }
    }

    // 3. Otherwise fallback to P2P transfer code
    const parsed = parseQRPayload(data);
    if (!parsed) {
      Alert.alert("Invalid QR Code", "This QR code is not a valid StellarPay code.", [
        { text: "Scan Again", onPress: () => { scannedRef.current = false; setScanned(false); setIsLookingUp(false); } },
      ]);
      return;
    }

    try {
      const user = await getUserByUsername(parsed.username);
      if (!user) {
        Alert.alert("User Not Found", `@${parsed.username} doesn't have a StellarPay account.`, [
          { text: "Scan Again", onPress: () => { scannedRef.current = false; setScanned(false); setIsLookingUp(false); } },
        ]);
        return;
      }

      // Navigate to request or send screen based on active scan intent
      if (action === "request") {
        router.push({
          pathname: "/request",
          params: {
            name: user.displayName || user.username,
            handle: `@${user.username}`,
            uid: user.uid,
            avatar: (user.displayName || user.username).charAt(0).toUpperCase(),
            color: "#7B61FF",
          },
        });
      } else {
        router.push({
          pathname: "/send",
          params: {
            name: user.displayName || user.username,
            handle: `@${user.username}`,
            publicKey: user.stellarPublicKey || "",
            uid: user.uid,
            avatar: (user.displayName || user.username).charAt(0).toUpperCase(),
            color: "#7B61FF",
            amount: parsed.amount || "",
            currencyCode: parsed.currency || "",
          },
        });
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to look up user.", [
        { text: "Scan Again", onPress: () => { scannedRef.current = false; setScanned(false); setIsLookingUp(false); } },
      ]);
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleGalleryPick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        base64: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert("Error", "Could not read the selected image file.");
        return;
      }

      setIsLookingUp(true);
      
      const response = await fetch(`${API_BASE}/api/qr/decode`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: asset.base64,
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || "Failed to decode QR code.");
      }

      const decodedText = resData.data;
      
      // Pass the decoded text to our standard parser
      await handleBarCodeScanned({ data: decodedText });
    } catch (err: any) {
      setIsLookingUp(false);
      Alert.alert("Gallery Scan Failed", err.message || "Failed to parse QR code.");
    }
  };

  // Reset scanned state when switching back to Scan tab
  useEffect(() => {
    if (activeTab === "Scan") {
      scannedRef.current = false;
      setScanned(false);
    }
  }, [activeTab]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.baseLight }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.xl }}>
          <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "700", fontSize: 22 }]}>
            {activeTab === "Scan" ? "Scan to Pay" : "My QR Code"}
          </Text>
          {activeTab === "Scan" && (
            <Pressable onPress={handleGalleryPick} style={{ width: 44, height: 44, justifyContent: "center", alignItems: "center" }}>
              <Feather name="image" size={24} color={Colors.textLightPrimary} />
            </Pressable>
          )}
        </View>

        {/* Segmented Control */}
        <View style={{ flexDirection: "row", backgroundColor: Colors.white, borderRadius: 99, padding: 4, marginBottom: Spacing.xl, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 2 }}>
          <Pressable
            onPress={() => setActiveTab("Scan")}
            style={{ flex: 1, backgroundColor: activeTab === "Scan" ? Colors.textLightPrimary : Colors.transparent, borderRadius: 99, paddingVertical: 12, alignItems: "center", minHeight: 44 }}
          >
            <Text style={[Typography.labelLarge, { color: activeTab === "Scan" ? Colors.white : Colors.textLightSecondary, fontWeight: "600" }]}>Scan</Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("My QR")}
            style={{ flex: 1, backgroundColor: activeTab === "My QR" ? Colors.textLightPrimary : Colors.transparent, borderRadius: 99, paddingVertical: 12, alignItems: "center", minHeight: 44 }}
          >
            <Text style={[Typography.labelLarge, { color: activeTab === "My QR" ? Colors.white : Colors.textLightSecondary, fontWeight: "600" }]}>My QR</Text>
          </Pressable>
        </View>

        {activeTab === "Scan" ? (
          <Animated.View entering={FadeIn} exiting={FadeOut}>
            <Text style={[Typography.bodyMedium, { color: Colors.textLightPrimary, textAlign: "center", marginBottom: Spacing.md, fontWeight: "500" }]}>
              Align the QR code within the frame
            </Text>

            {/* Camera Viewfinder */}
            <View style={{ backgroundColor: Colors.textLightPrimary, height: 380, borderRadius: 24, overflow: "hidden", marginBottom: Spacing.xl }}>
              {permission?.granted ? (
                <View style={{ flex: 1 }}>
                  <CameraView
                    style={{ flex: 1 }}
                    facing="back"
                    barcodeScannerSettings={{
                      barcodeTypes: ["qr"],
                    }}
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                  />

                  {/* Frame Overlay */}
                  <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center" }}>
                    {/* Frame Corners */}
                    <View style={{ width: 220, height: 220 }}>
                      <View style={{ position: "absolute", top: 0, left: 0, width: 40, height: 40, borderTopWidth: 4, borderLeftWidth: 4, borderColor: Colors.white, borderTopLeftRadius: 16 }} />
                      <View style={{ position: "absolute", top: 0, right: 0, width: 40, height: 40, borderTopWidth: 4, borderRightWidth: 4, borderColor: Colors.white, borderTopRightRadius: 16 }} />
                      <View style={{ position: "absolute", bottom: 0, left: 0, width: 40, height: 40, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: Colors.white, borderBottomLeftRadius: 16 }} />
                      <View style={{ position: "absolute", bottom: 0, right: 0, width: 40, height: 40, borderBottomWidth: 4, borderRightWidth: 4, borderColor: Colors.white, borderBottomRightRadius: 16 }} />
                    </View>
                  </View>

                  {/* Scanned overlay */}
                  {isLookingUp && (
                    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" }}>
                      <Animated.View entering={FadeIn} style={{ alignItems: "center" }}>
                        <Feather name="loader" size={32} color={Colors.white} />
                        <Text style={[Typography.labelLarge, { color: Colors.white, marginTop: Spacing.md }]}>Looking up user...</Text>
                      </Animated.View>
                    </View>
                  )}
                </View>
              ) : (
                /* Permission not granted state */
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: Spacing.xl }}>
                  <Feather name="camera-off" size={48} color={Colors.white} style={{ marginBottom: Spacing.lg, opacity: 0.6 }} />
                  <Text style={[Typography.bodyMedium, { color: Colors.white, textAlign: "center", marginBottom: Spacing.lg, opacity: 0.8 }]}>
                    Camera access is needed to scan QR codes
                  </Text>
                  <Pressable
                    onPress={requestPermission}
                    style={{ backgroundColor: Colors.white, paddingVertical: 12, paddingHorizontal: Spacing.xl, borderRadius: 99, minHeight: 44, justifyContent: "center" }}
                  >
                    <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700" }]}>Allow Camera</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* OR SELECT FROM */}
            <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.md }]}>
              Or select from
            </Text>

            <View style={{ backgroundColor: Colors.white, borderRadius: 16, paddingHorizontal: Spacing.lg, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}>
              {[
                { icon: "image", title: "Photo Library", sub: "Upload QR from gallery", onPress: handleGalleryPick },
                { icon: "plus-square", title: "Enter Username", sub: "Send by @username directly", onPress: () => {
                  // Could open a text input modal to enter username directly
                  Alert.alert("Coming Soon", "Direct username entry will be available soon.");
                }},
              ].map((item, idx) => (
                <Pressable
                  key={idx}
                  onPress={item.onPress}
                  style={{ flexDirection: "row", alignItems: "center", paddingVertical: Spacing.lg, borderBottomWidth: idx === 0 ? 1 : 0, borderBottomColor: Colors.borderLight, minHeight: 56 }}
                >
                  <Feather name={item.icon as any} size={24} color={Colors.textLightPrimary} style={{ marginRight: Spacing.md }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: 2 }]}>{item.title}</Text>
                    <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>{item.sub}</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={Colors.textLightSecondary} />
                </Pressable>
              ))}
            </View>

            {/* Scan Again button (shown after scan) */}
            {scanned && !isLookingUp && (
              <Animated.View entering={FadeInDown.duration(300)} style={{ marginTop: Spacing.xl }}>
                <Pressable
                  onPress={() => {
                    scannedRef.current = false;
                    setScanned(false);
                  }}
                  style={{ backgroundColor: Colors.textLightPrimary, borderRadius: 99, paddingVertical: Spacing.md, alignItems: "center", minHeight: 44 }}
                >
                  <Text style={[Typography.labelLarge, { color: Colors.white, fontWeight: "700" }]}>Scan Again</Text>
                </Pressable>
              </Animated.View>
            )}
          </Animated.View>
        ) : (
          /* ── My QR Tab ─────────────────────────────────────────────── */
          <Animated.View entering={FadeIn} exiting={FadeOut} style={{ alignItems: "center", paddingTop: Spacing.lg }}>
            <View style={{ backgroundColor: Colors.white, borderRadius: 32, padding: Spacing.xxl, alignItems: "center", width: "100%", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 4 }}>
              {/* User Avatar */}
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center", marginBottom: Spacing.lg }}>
                <Text style={[Typography.headingLarge, { color: Colors.white, fontSize: 24 }]}>
                  {(profile?.displayName || profile?.username || "U").charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: Spacing.xs }]}>
                @{profile?.username || "username"}
              </Text>
              <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginBottom: Spacing.xxl }]}>StellarPay</Text>

              {/* Real QR Code */}
              <View style={{ backgroundColor: Colors.white, padding: Spacing.lg, borderRadius: 24, borderWidth: 1, borderColor: Colors.borderLight, marginBottom: Spacing.xl }}>
                <QRCode
                  value={buildQRPayload(profile?.username || "user")}
                  size={200}
                  backgroundColor={Colors.white}
                  color={Colors.textLightPrimary}
                />
              </View>

              <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, textAlign: "center", paddingHorizontal: Spacing.lg }]}>
                Show this QR code to securely receive funds instantly.
              </Text>
            </View>

            <View style={{ flexDirection: "row", marginTop: Spacing.xl, gap: Spacing.lg }}>
              <Pressable
                style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: Colors.white, paddingVertical: Spacing.md, borderRadius: 99, borderWidth: 1, borderColor: Colors.borderLight, minHeight: 44 }}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Alert.alert("Saved", "QR code saved to your device.");
                }}
              >
                <Feather name="download" size={20} color={Colors.textLightPrimary} style={{ marginRight: Spacing.sm }} />
                <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary }]}>Save</Text>
              </Pressable>
              <Pressable
                style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: Colors.textLightPrimary, paddingVertical: Spacing.md, borderRadius: 99, minHeight: 44 }}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Alert.alert("Share", "Share sheet will open here.");
                }}
              >
                <Feather name="share-2" size={20} color={Colors.white} style={{ marginRight: Spacing.sm }} />
                <Text style={[Typography.labelLarge, { color: Colors.white }]}>Share</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
