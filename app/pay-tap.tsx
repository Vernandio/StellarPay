import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Platform, NativeModules, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
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
import { Colors } from "../src/constants/colors";
import { Typography } from "../src/constants/typography";
import { Spacing } from "../src/constants/spacing";
import { getContentWidth, MOBILE_REFERENCE_WIDTH } from "../src/constants/layout";
import { useAuthStore } from "../src/store/authStore";
import { getUserProfile } from "../src/services/firebase/firestore";

// ── Safe NFC imports (prevent crashes in Expo Go / missing modules) ───

let NfcManager: any = {
  isSupported: async () => false,
  start: async () => {},
  setEventListener: () => {},
  cancelTechnologyRequest: async () => {},
  unregisterTagEvent: async () => {},
  registerTagEvent: async () => {},
  requestTechnology: async () => {},
  getTag: async () => null,
  isoDepHandler: { transceive: async (_: number[]) => [] },
};
let NfcEvents: any = { DiscoverTag: "DiscoverTag", SessionClosed: "SessionClosed" };
let NfcTech: any = { Ndef: "Ndef", IsoDep: "IsoDep" };
let NfcAdapter: any = { FLAG_READER_NFC_A: 0x1, FLAG_READER_SKIP_NDEF_CHECK: 0x80 };

const hasNativeNfc = !!NativeModules.NfcManager;
if (hasNativeNfc) {
  try {
    const NfcLib = require("react-native-nfc-manager");
    NfcManager = NfcLib.default || NfcLib;
    NfcEvents = NfcLib.NfcEvents || NfcEvents;
    NfcTech = NfcLib.NfcTech || NfcTech;
    NfcAdapter = NfcLib.NfcAdapter || NfcAdapter;
  } catch (err) {
    console.warn("Failed to load native NfcManager:", err);
  }
}

// HCE is only supported on Android with native modules installed
let HCESession: any = null;
let NFCTagType4NDEFContentType: any = null;
let NFCTagType4: any = null;
const hasHce = Platform.OS === "android" && !!NativeModules.Hce;

if (hasHce) {
  try {
    const HCE = require("react-native-hce");
    HCESession = HCE.HCESession;
    NFCTagType4NDEFContentType = HCE.NFCTagType4NDEFContentType;
    NFCTagType4 = HCE.NFCTagType4;
  } catch (err) {
    console.warn("Failed to load react-native-hce:", err);
  }
}

// ── Constants ─────────────────────────────────────────────────────────

// Sized off the phone-reference width (not the wider web app shell) so the
// pulse rings stay a sensible size instead of ballooning on desktop.
const CIRCLE_SIZE = Math.min(getContentWidth(), MOBILE_REFERENCE_WIDTH) * 0.6;

// Namespaces the NDEF text payload so the scanner can reject random NFC
// tags (transit cards, stickers) that also carry text records. Only the
// public Firebase UID goes over the air — never keys or secrets.
const NFC_PAYLOAD_PREFIX = "stellarpay:uid:";
const NFC_UID_REGEX = /stellarpay:uid:([A-Za-z0-9_-]+)/;

// ── Raw Type-4 NDEF read over IsoDep ──────────────────────────────────
// We deliberately bypass Android's NDEF stack. The platform's automatic
// "NDEF check" performs the SELECT-AID handshake itself, and the HCE
// service on the other side only accepts SELECT-AID once per session —
// after the platform's pass, every later read hits a dead applet (this is
// why reads worked on one phone, which cached the platform's first pass,
// and not the other). With FLAG_READER_SKIP_NDEF_CHECK the applet is
// untouched, and we run the whole conversation ourselves.
//
// Protocol (matches react-native-hce's CardService/NFCTagType4):
//   SELECT AID D2760000850101 → SELECT file E104 → READ BINARY.
// The NDEF file is [NLEN: 2 bytes][NDEF message: NLEN bytes].

const APDU_SELECT_APP = [0x00, 0xa4, 0x04, 0x00, 0x07, 0xd2, 0x76, 0x00, 0x00, 0x85, 0x01, 0x01, 0x00];
const APDU_SELECT_NDEF_FILE = [0x00, 0xa4, 0x00, 0x0c, 0x02, 0xe1, 0x04];
const apduReadBinary = (offset: number, length: number) => [0x00, 0xb0, (offset >> 8) & 0xff, offset & 0xff, length];

const apduOk = (resp: number[] | null | undefined) =>
  !!resp && resp.length >= 2 && resp[resp.length - 2] === 0x90 && resp[resp.length - 1] === 0x00;

const readNdefViaIsoDep = async (): Promise<string | null> => {
  const transceive = (apdu: number[]): Promise<number[]> =>
    NfcManager.isoDepHandler.transceive(apdu);

  let resp = await transceive(APDU_SELECT_APP);
  if (!apduOk(resp)) {
    console.warn("NFC read: SELECT AID rejected:", resp);
    return null;
  }

  resp = await transceive(APDU_SELECT_NDEF_FILE);
  if (!apduOk(resp)) {
    console.warn("NFC read: SELECT NDEF file rejected:", resp);
    return null;
  }

  resp = await transceive(apduReadBinary(0, 2));
  if (!apduOk(resp) || resp.length < 4) {
    console.warn("NFC read: NLEN read failed:", resp);
    return null;
  }
  const nlen = (resp[0] << 8) | resp[1];
  if (nlen === 0) {
    console.warn("NFC read: NDEF file is empty (NLEN=0)");
    return null;
  }

  const bytes: number[] = [];
  let offset = 2;
  const end = 2 + nlen;
  while (offset < end) {
    resp = await transceive(apduReadBinary(offset, Math.min(end - offset, 0xf0)));
    if (!apduOk(resp) || resp.length <= 2) {
      console.warn("NFC read: READ BINARY failed at offset", offset, resp);
      return null;
    }
    const data = resp.slice(0, resp.length - 2);
    bytes.push(...data);
    offset += data.length;
  }

  // The message bytes include NDEF record headers, but our payload is plain
  // ASCII inside them — a lossy byte→char decode is fine for regex matching.
  return String.fromCharCode(...bytes);
};

type Mode = "scan" | "broadcast";
type Status = "ready" | "scanning" | "broadcasting" | "found" | "success" | "error";

interface FoundUser {
  uid: string;
  displayName: string;
  handle: string;
  avatar: string;
  publicKey: string;
}

// ── Component ─────────────────────────────────────────────────────────

export default function PayTapScreen() {
  const [hasNfc, setHasNfc] = useState<boolean | null>(null);
  const [status, setStatus] = useState<Status>("ready");
  const [mode, setMode] = useState<Mode>("scan");
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  // Specific reason for the last scan failure, shown instead of the generic
  // error copy so the user knows what to fix (wrong screen, own account, …).
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  
  const { user } = useAuthStore();

  // ── Live-value refs (fix stale-closure bugs) ───────────────────────
  // `status`/`mode` state only updates on the next render, but the async
  // scanLoop / HCE listener closures live far longer than one render.
  // These refs give those closures a way to read the *current* value.
  const scanActiveRef = useRef(false);
  // Monotonic id per scan session: a restarted scan bumps it, so a lingering
  // older loop (awaiting a cancel/delay when the mode was toggled) sees the
  // mismatch and exits instead of fighting the new loop over the NFC session.
  const scanGenerationRef = useRef(0);
  const hceRemoveListenersRef = useRef<Array<() => void>>([]);

  // ── Pulse animation ───────────────────────────────────────────────

  const pulse1 = useSharedValue(1);
  const pulse2 = useSharedValue(1);
  const pulse3 = useSharedValue(1);

  useEffect(() => {
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

  // (Re)start the right NFC activity while the screen is focused — on mode
  // toggle, and when returning from /send. HCE and the reader fight with
  // other apps (e.g. Google Pay) and drain battery, so they must be fully
  // shut down the moment the screen loses focus.
  useFocusEffect(
    useCallback(() => {
      if (!hasNfc) return;

      setFoundUser(null);
      setErrorDetail(null);
      stopAllNfcActivity().then(() => {
        if (mode === "scan") {
          startNfcScan();
        } else {
          startNfcBroadcast();
        }
      });

      return () => {
        stopAllNfcActivity();
      };
    }, [mode, hasNfc])
  );

  // ── NFC lifecycle ─────────────────────────────────────────────────

  const stopAllNfcActivity = async () => {
    // Stop the scan loop from resuming itself and drop any stale HCE listeners.
    scanActiveRef.current = false;
    for (const removeListener of hceRemoveListenersRef.current) {
      try {
        removeListener();
      } catch (_) {}
    }
    hceRemoveListenersRef.current = [];

    try {
      if (hasNativeNfc) {
        NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
        NfcManager.setEventListener(NfcEvents.SessionClosed, null);
        await NfcManager.cancelTechnologyRequest().catch(() => {});
        await NfcManager.unregisterTagEvent().catch(() => {});
      }
      
      if (hasHce && HCESession) {
        try {
          const session = await HCESession.getInstance();
          await session.setEnabled(false);
        } catch (_) {}
      }
    } catch (_) {}
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

  // ── Scan mode (reader) ────────────────────────────────────────────

  const startNfcScan = async () => {
    const generation = ++scanGenerationRef.current;
    const isCurrent = () =>
      scanActiveRef.current && generation === scanGenerationRef.current;

    scanActiveRef.current = true;
    setStatus("scanning");

    try {
      await NfcManager.start();
      // Register the tag session ourselves so requestTechnology below doesn't
      // own it (and tear it down on a 1s-delayed timer that races with mode
      // toggles) — stopAllNfcActivity is the single cleanup point.
      //
      // TRUE reader mode, not foreground dispatch: enableReaderMode turns off
      // this phone's own card emulation, so the two phones stop discovering
      // each other in both directions. Without it, the broadcasting phone
      // also reads *us* (the "choose an app" popup) and the tug-of-war kills
      // the NDEF read mid-session.
      await NfcManager.registerTagEvent({
        isReaderModeEnabled: true,
        // NFC-A/IsoDep (what HCE Type-4 cards speak), and SKIP_NDEF_CHECK so
        // the platform doesn't burn the applet's one-shot SELECT before we
        // get to talk to it — see readNdefViaIsoDep above.
        readerModeFlags:
          NfcAdapter.FLAG_READER_NFC_A | NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK,
        // Generous presence-check delay so the OS doesn't ping (and drop)
        // the emulated card while we're reading it — short intervals are a
        // known cause of broken HCE reads on some devices
        readerModeDelay: 2500,
      });
    } catch (ex: any) {
      console.warn("NFC Start Error", ex);
      setStatus("error");
      return;
    }

    // Reader loop: each tap, connect over IsoDep and read the NDEF file
    // with raw APDUs (see readNdefViaIsoDep for why not the platform stack).
    while (isCurrent()) {
      try {
        await NfcManager.requestTechnology(NfcTech.IsoDep);
        if (!isCurrent()) break;

        const payloadText = await readNdefViaIsoDep();

        // Release the tag before any Firestore work so the connection isn't
        // held open while we do network I/O.
        await NfcManager.cancelTechnologyRequest().catch(() => {});
        await handleScannedPayload(payloadText);
      } catch (ex) {
        // Lands here when stopAllNfcActivity cancels a pending request, or
        // on a flaky half-tap. If we're still meant to scan, re-arm.
        if (!isCurrent()) break;
        await NfcManager.cancelTechnologyRequest().catch(() => {});
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
  };

  // ── Broadcast mode (HCE emulation) ────────────────────────────────

  const startNfcBroadcast = async () => {
    // HCE is Android-only
    if (Platform.OS !== "android") {
      setStatus("error");
      return;
    }

    // Guard: HCE native module must be available
    if (!hasHce || !HCESession || !NFCTagType4 || !NFCTagType4NDEFContentType) {
      console.warn("HCE native modules not available");
      setStatus("error");
      return;
    }
    
    setStatus("broadcasting");
    try {
      if (!user) {
        setStatus("error");
        return;
      }
      
      const tag = new NFCTagType4({
        type: NFCTagType4NDEFContentType.Text,
        content: NFC_PAYLOAD_PREFIX + user.uid,
        writable: false
      });
    
      const session = await HCESession.getInstance();
      // setApplication is async — it stores the tag content in the native
      // module. It MUST be awaited: enabling the service first races the
      // content write, and the card then serves an EMPTY NDEF file (reader
      // sees Type 4 + maxSize but no message). Whether the race is won is
      // sticky per device because the session is a singleton, which is why
      // this fails on one phone and works on the other.
      await session.setApplication(tag);
      await session.setEnabled(true);
      console.log("HCE broadcast enabled. Payload:", NFC_PAYLOAD_PREFIX + user.uid);

      // Drop any listeners from a previous broadcast session before adding
      // new ones, otherwise a single tap fires the callback multiple times
      // after the user has toggled Send/Receive a few times.
      for (const removeListener of hceRemoveListenersRef.current) {
        try {
          removeListener();
        } catch (_) {}
      }
      hceRemoveListenersRef.current = [
        // Debug visibility: fires when a reader powers up our emulated card
        session.on(HCESession.Events.HCE_STATE_CONNECTED, () => {
          console.log("HCE: reader connected");
        }),
        // Fires when the reader actually read our NDEF file
        session.on(HCESession.Events.HCE_STATE_READ, () => {
          console.log("HCE: payload read by scanner");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setStatus("success");
        }),
      ];
    } catch (ex) {
      console.warn("HCE Error", ex);
      setStatus("error");
    }
  };

  // ── Handle a scanned payload ──────────────────────────────────────

  const handleScannedPayload = async (payloadText: string | null) => {
    try {
      console.log("NFC payload read:", JSON.stringify(payloadText));

      const uid = payloadText?.match(NFC_UID_REGEX)?.[1] ?? null;

      // Not one of ours — stay armed so the user can simply tap again.
      if (!uid) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setErrorDetail(
          payloadText
            ? "We read the tag but found no StellarPay data. Make sure the other phone has the Receive tab open, then tap again."
            : "Couldn't read the other phone. Make sure it's on the Receive tab, then hold the phones back-to-back for a second."
        );
        setStatus("error");
        return;
      }

      if (uid === user?.uid) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setErrorDetail("That phone is broadcasting your own account. Both phones need to be logged into different accounts.");
        setStatus("error");
        return;
      }

      // Valid StellarPay payload — stop re-arming and look up the profile.
      scanActiveRef.current = false;
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setErrorDetail(null);
      setStatus("found");

      const recipient = await getUserProfile(uid);
      if (!recipient) {
        scanActiveRef.current = true;
        setErrorDetail("Read the device, but no StellarPay account matched it. Ask your friend to log in again.");
        setStatus("error");
        return;
      }
      if (!recipient.stellarPublicKey) {
        scanActiveRef.current = true;
        setErrorDetail(`${recipient.displayName || recipient.username} hasn't set up their wallet yet.`);
        setStatus("error");
        return;
      }

      const publicKey = recipient.stellarPublicKey;
      const displayName = recipient.displayName || recipient.username;
      const avatar = displayName.charAt(0).toUpperCase();

      setFoundUser({
        uid: recipient.uid,
        displayName,
        handle: `@${recipient.username}`,
        avatar,
        publicKey,
      });

      await stopAllNfcActivity();

      // Brief pause so the "found" state is visible before transitioning
      setTimeout(() => {
        router.push({
          pathname: "/send",
          params: {
            name: displayName,
            handle: `@${recipient.username}`,
            publicKey,
            uid: recipient.uid,
            avatar,
            color: Colors.primary,
          },
        });
      }, 900);
    } catch (ex) {
      console.warn("Tag Processing Error", ex);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorDetail("Something went wrong while reading. Tap again to retry.");
      setStatus("error");
    }
  };

  // ── Animated styles ───────────────────────────────────────────────

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

  // ── Derived display values ────────────────────────────────────────

  const pulseColor = status === "success" || status === "found" ? Colors.teal : Colors.primary;

  const centerIcon = (() => {
    if (status === "success") return "check";
    if (status === "found") return "user";
    if (mode === "scan") return "wifi";
    return "smartphone";
  })();

  const centerIconColor = status === "success" || status === "found" ? Colors.teal : Colors.primary;

  const headingText = (() => {
    if (status === "found" && foundUser) return foundUser.displayName;
    if (status === "success" && mode === "broadcast") return "Tapped!";
    if (status === "success") return "Found!";
    if (status === "error") {
      if (hasNfc === false) return "NFC Not Available";
      if (Platform.OS === "ios" && mode === "broadcast") return "Not Supported on iPhone";
      if (!hasHce && mode === "broadcast") return "HCE Not Available";
      if (mode === "scan") return "Not Recognized";
      return "Something Went Wrong";
    }
    return mode === "scan" ? "Ready to Send" : "Ready to Receive";
  })();

  const subText = (() => {
    if (hasNfc === false) return "Your device does not support NFC tapping or it's turned off.";
    if (status === "error" && errorDetail) return errorDetail;
    if (status === "found" && foundUser) return `${foundUser.handle} • Preparing payment...`;
    if (status === "success" && mode === "broadcast") return "Your friend has scanned your phone.";
    if (status === "success") return "Connecting securely...";
    if (status === "error" && Platform.OS === "ios" && mode === "broadcast") return "Apple restricts iPhones from broadcasting NFC.";
    if (status === "error" && !hasHce && mode === "broadcast") return "Install the development build to enable HCE broadcasting.";
    if (status === "error" && mode === "scan") return "That doesn't look like a StellarPay device.\nHold your phone near a friend's phone instead.";
    if (mode === "scan") return "Hold your phone near your friend's phone to pay them instantly.";
    return "Tell your friend to tap the back of this phone.";
  })();

  // ── Render ────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.baseLight }} edges={["top", "bottom"]}>
      {/* Header */}
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
          onPress={() => { Haptics.selectionAsync(); setMode('scan'); setStatus('ready'); setFoundUser(null); setErrorDetail(null); }}
          style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: mode === 'scan' ? Colors.white : 'transparent', borderRadius: 8, shadowColor: mode === 'scan' ? '#000' : 'transparent', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }}>
          <Text style={{ fontWeight: mode === 'scan' ? '700' : '500', color: mode === 'scan' ? Colors.textLightPrimary : Colors.textLightSecondary }}>Send</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => { Haptics.selectionAsync(); setMode('broadcast'); setStatus('ready'); setFoundUser(null); setErrorDetail(null); }}
          style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: mode === 'broadcast' ? Colors.white : 'transparent', borderRadius: 8, shadowColor: mode === 'broadcast' ? '#000' : 'transparent', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }}>
          <Text style={{ fontWeight: mode === 'broadcast' ? '700' : '500', color: mode === 'broadcast' ? Colors.textLightPrimary : Colors.textLightSecondary }}>Receive</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: Spacing.xl }}>
        <View style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE, justifyContent: "center", alignItems: "center", marginBottom: Spacing.xxl * 2 }}>
          <Animated.View style={[{ position: "absolute", width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2, backgroundColor: pulseColor }, animatedStyle1]} />
          <Animated.View style={[{ position: "absolute", width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2, backgroundColor: pulseColor }, animatedStyle2]} />
          <Animated.View style={[{ position: "absolute", width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2, backgroundColor: pulseColor }, animatedStyle3]} />
          
          <Animated.View entering={FadeInDown.springify()} style={{ width: CIRCLE_SIZE * 0.4, height: CIRCLE_SIZE * 0.4, borderRadius: CIRCLE_SIZE * 0.2, backgroundColor: Colors.white, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 8, zIndex: 10 }}>
            {status === "found" ? (
              <ActivityIndicator size="large" color={Colors.teal} />
            ) : (
              <Feather 
                name={centerIcon as any} 
                size={40} 
                color={centerIconColor} 
                style={status !== "success" && mode === 'scan' ? { transform: [{ rotate: "90deg" }] } : {}} 
              />
            )}
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(200)} style={{ alignItems: "center" }}>
          <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, textAlign: "center", marginBottom: Spacing.sm }]}>
            {headingText}
          </Text>
          <Text style={[Typography.bodyLarge, { color: Colors.textLightSecondary, textAlign: "center" }]}>
            {subText}
          </Text>
        </Animated.View>
      </View>

      {/* Footer */}
      <View style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg }}>
        <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: Spacing.lg }}>
          <Feather name="lock" size={14} color={Colors.textLightSecondary} style={{ marginRight: Spacing.xs }} />
          <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>End-to-end encrypted near-field connection</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}