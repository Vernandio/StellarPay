import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Dimensions, Platform, NativeModules } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  Easing,
  FadeInDown
} from "react-native-reanimated";
// Safe conditional import for NFC Manager to prevent crashes in Expo Go
let NfcManager: any = {
  isSupported: async () => false,
  start: async () => {},
  setEventListener: () => {},
  cancelTechnologyRequest: async () => {},
  unregisterTagEvent: async () => {},
  requestTechnology: async () => {},
  getTag: async () => null,
};
let NfcEvents: any = {
  DiscoverTag: "DiscoverTag",
  SessionClosed: "SessionClosed",
};
let NfcTech: any = {
  Ndef: "Ndef",
};
let Ndef: any = {
  text: {
    decodePayload: (payload: any) => "",
  }
};

const hasNativeNfc = !!NativeModules.NfcManager;
if (hasNativeNfc) {
  try {
    const NfcLib = require("react-native-nfc-manager");
    NfcManager = NfcLib.default || NfcLib;
    NfcEvents = NfcLib.NfcEvents || NfcEvents;
    NfcTech = NfcLib.NfcTech || NfcTech;
    Ndef = NfcLib.Ndef || Ndef;
  } catch (err) {
    console.warn("Failed to load native NfcManager:", err);
  }
}
import { Colors } from "../src/constants/colors";
import { Typography } from "../src/constants/typography";
import { Spacing } from "../src/constants/spacing";
import { useAuthStore } from "../src/store/authStore";
import { getUserProfile } from "../src/services/firebase/firestore";

// HCE is only supported on Android with native modules installed
let HCESession: any;
let NFCTagType4NDEFContentType: any;
let NFCTagType4: any;

if (Platform.OS === 'android' && NativeModules.HCESession) {
  const HCE = require("react-native-hce");
  HCESession = HCE.HCESession;
  NFCTagType4NDEFContentType = HCE.NFCTagType4NDEFContentType;
  NFCTagType4 = HCE.NFCTagType4;
}

const { width } = Dimensions.get("window");
const CIRCLE_SIZE = width * 0.6;

type Mode = "scan" | "broadcast";

export default function PayTapScreen() {
  const [hasNfc, setHasNfc] = useState<boolean | null>(null);
  const [status, setStatus] = useState<"ready" | "scanning" | "broadcasting" | "success" | "error">("ready");
  const [mode, setMode] = useState<Mode>("scan");
  
  const { user } = useAuthStore();

  const pulse1 = useSharedValue(1);
  const pulse2 = useSharedValue(1);
  const pulse3 = useSharedValue(1);

  useEffect(() => {
    // Animation Logic
    pulse1.value = withRepeat(
      withSequence(
        withTiming(1.5, { duration: 2000, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 0 })
      ),
      -1,
      false
    );
    setTimeout(() => {
      pulse2.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 2000, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 0 })
        ),
        -1,
        false
      );
    }, 600);
    setTimeout(() => {
      pulse3.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 2000, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 0 })
        ),
        -1,
        false
      );
    }, 1200);

    checkNfcSupport();

    return () => {
      stopAllNfcActivity();
    };
  }, []);

  // When mode changes, restart the correct NFC activity
  useEffect(() => {
    if (hasNfc) {
      stopAllNfcActivity().then(() => {
        if (mode === "scan") {
          startNfcScan();
        } else {
          startNfcBroadcast();
        }
      });
    }
  }, [mode, hasNfc]);

  const stopAllNfcActivity = async () => {
    try {
      NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
      NfcManager.setEventListener(NfcEvents.SessionClosed, null);
      await NfcManager.cancelTechnologyRequest().catch(() => {});
      await NfcManager.unregisterTagEvent().catch(() => {});
      
      if (Platform.OS === 'android') {
        const session = await HCESession.getInstance();
        await session.setEnabled(false);
      }
    } catch (e) {}
  };

  const checkNfcSupport = async () => {
    try {
      const supported = await NfcManager.isSupported();
      setHasNfc(supported);
      if (!supported) {
        setStatus("error");
      }
    } catch (ex) {
      console.warn("NFC Support Error", ex);
      setHasNfc(false);
      setStatus("error");
    }
  };

  const startNfcScan = async () => {
    setStatus("scanning");
    try {
      await NfcManager.start();
      
      // Request NDEF technology to automatically read the NDEF payload on Android
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      
      if (tag) {
        handleNfcTag(tag);
      }
    } catch (ex: any) {
      if (ex !== "cancelled") {
        console.warn("NFC Start Error", ex);
        setStatus("error");
      }
    } finally {
      NfcManager.cancelTechnologyRequest().catch(() => {});
    }
  };

  const startNfcBroadcast = async () => {
    if (Platform.OS !== 'android') {
      setStatus("error");
      return;
    }
    
    setStatus("broadcasting");
    try {
      if (!user) {
        setStatus("error");
        return;
      }
      
      const myWalletId = user.uid;
      
      const tag = new NFCTagType4({
        type: NFCTagType4NDEFContentType.Text,
        content: myWalletId,
        writable: false
      });
    
      const session = await HCESession.getInstance();
      session.setApplication(tag);
      await session.setEnabled(true);
      
      // Listen for when a reader taps us
      session.on(HCESession.Events.HCE_STATE_READ, () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setStatus("success");
      });
    } catch (ex) {
      console.warn("HCE Error", ex);
      setStatus("error");
    }
  };

  const handleNfcTag = async (tag: any) => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStatus("success");

      // Attempt to extract NDEF payload (which we broadcast as Text)
      let uid = tag.id || "unknown-tag";
      if (tag.ndefMessage && tag.ndefMessage.length > 0) {
        uid = Ndef.text.decodePayload(tag.ndefMessage[0].payload);
      }
      
      console.log("Found NFC Tag Data. UID:", uid);
      
      // Fetch user profile from Firestore
      const profile = await getUserProfile(uid);
      
      const displayName = profile?.displayName || "Unknown User";
      const handle = profile?.username ? `@${profile.username}` : `@user_${uid.substring(0, 4)}`;
      const avatar = (profile as any)?.avatarUrl || displayName.substring(0, 1).toUpperCase();
      const publicKey = profile?.stellarPublicKey || "";
      
      setTimeout(() => {
        router.replace({
          pathname: "/send",
          params: {
            id: uid,
            name: displayName,
            handle: handle,
            avatar: avatar,
            color: "#4ECDC4",
            publicKey: publicKey
          }
        });
      }, 800);
      
    } catch (ex) {
      console.warn("Tag Processing Error", ex);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setStatus("error");
    }
  };

  const animatedStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: pulse1.value }],
    opacity: 1 - (pulse1.value - 1) * 2,
  }));
  const animatedStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: pulse2.value }],
    opacity: 1 - (pulse2.value - 1) * 2,
  }));
  const animatedStyle3 = useAnimatedStyle(() => ({
    transform: [{ scale: pulse3.value }],
    opacity: 1 - (pulse3.value - 1) * 2,
  }));

  const cancelScan = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await stopAllNfcActivity();
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.baseLight }} edges={["top", "bottom"]}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.lg, height: 56, zIndex: 10 }}>
        <TouchableOpacity onPress={cancelScan} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.white, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}>
          <Feather name="arrow-left" size={20} color={Colors.textLightPrimary} />
        </TouchableOpacity>
        <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "700", fontSize: 20 }]}>Tap to Pay</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Mode Selector */}
      <View style={{ flexDirection: 'row', marginHorizontal: Spacing.xl, marginTop: Spacing.md, backgroundColor: '#E2E8F0', borderRadius: 12, padding: 4, zIndex: 10 }}>
        <TouchableOpacity 
          onPress={() => { Haptics.selectionAsync(); setMode('scan'); }}
          style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: mode === 'scan' ? Colors.white : 'transparent', borderRadius: 8, shadowColor: mode === 'scan' ? '#000' : 'transparent', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }}>
          <Text style={{ fontWeight: mode === 'scan' ? '700' : '500', color: mode === 'scan' ? Colors.textLightPrimary : Colors.textLightSecondary }}>Send</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => { Haptics.selectionAsync(); setMode('broadcast'); }}
          style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: mode === 'broadcast' ? Colors.white : 'transparent', borderRadius: 8, shadowColor: mode === 'broadcast' ? '#000' : 'transparent', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }}>
          <Text style={{ fontWeight: mode === 'broadcast' ? '700' : '500', color: mode === 'broadcast' ? Colors.textLightPrimary : Colors.textLightSecondary }}>Receive</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: Spacing.xl }}>
        <View style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE, justifyContent: "center", alignItems: "center", marginBottom: Spacing.xxl * 2 }}>
          <Animated.View style={[{ position: "absolute", width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2, backgroundColor: status === "success" ? Colors.teal : Colors.primary }, animatedStyle1]} />
          <Animated.View style={[{ position: "absolute", width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2, backgroundColor: status === "success" ? Colors.teal : Colors.primary }, animatedStyle2]} />
          <Animated.View style={[{ position: "absolute", width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2, backgroundColor: status === "success" ? Colors.teal : Colors.primary }, animatedStyle3]} />
          
          <Animated.View entering={FadeInDown.springify()} style={{ width: CIRCLE_SIZE * 0.4, height: CIRCLE_SIZE * 0.4, borderRadius: CIRCLE_SIZE * 0.2, backgroundColor: Colors.white, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 8, zIndex: 10 }}>
            <Feather name={status === "success" ? "check" : mode === 'scan' ? "wifi" : "smartphone"} size={40} color={status === "success" ? Colors.teal : Colors.primary} style={status !== "success" && mode === 'scan' ? { transform: [{ rotate: "90deg" }] } : {}} />
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(200)} style={{ alignItems: "center" }}>
          <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, textAlign: "center", marginBottom: Spacing.sm }]}>
            {status === "success" 
              ? "Success!" 
              : status === "error" 
                ? (Platform.OS === 'ios' && mode === 'broadcast' ? "Not Supported on iPhone" : "NFC Not Supported") 
                : mode === 'scan' ? "Ready to Send" : "Ready to Receive"}
          </Text>
          <Text style={[Typography.bodyLarge, { color: Colors.textLightSecondary, textAlign: "center" }]}>
            {hasNfc === false 
              ? "Your device does not support NFC tapping or it's turned off." 
              : status === "success" 
                ? "Connecting securely..."
                : status === "error" && Platform.OS === 'ios' && mode === 'broadcast'
                  ? "Apple restricts iPhones from broadcasting NFC."
                  : mode === 'scan'
                    ? "Hold your phone near your friend's phone to pay them instantly."
                    : "Tell your friend to tap the back of this phone."}
          </Text>
        </Animated.View>
      </View>

      <View style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg }}>
        <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: Spacing.lg }}>
          <Feather name="lock" size={14} color={Colors.textLightSecondary} style={{ marginRight: Spacing.xs }} />
          <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>End-to-end encrypted near-field connection</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
