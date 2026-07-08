import React, { useState, useMemo } from "react";
import { View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Keyboard, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { Colors } from "../src/constants/colors";
import { Typography } from "../src/constants/typography";
import { Spacing } from "../src/constants/spacing";
import { getUserByPublicKey } from "../src/services/firebase/firestore";
import { useTransactions } from "../src/hooks/useTransactions";
import { ActivityIndicator } from "react-native";

export default function PayOnchainScreen() {
  const [address, setAddress] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);
  const { activities } = useTransactions();

  const recentAddresses = useMemo(() => {
    const addresses = new Set<string>();
    const list: Array<{ address: string; display: string }> = [];
    
    for (const act of activities) {
      if (act.type === "sent" && act.destinationAddress && act.title.startsWith("To G")) {
        if (!addresses.has(act.destinationAddress)) {
          addresses.add(act.destinationAddress);
          list.push({
            address: act.destinationAddress,
            display: act.title.replace("To ", ""),
          });
        }
      }
    }
    return list.slice(0, 5); // show up to 5 recent
  }, [activities]);

  const handlePaste = async () => {
    Haptics.selectionAsync();
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        setAddress(text.trim());
      }
    } catch (e) {
      console.warn("Failed to read clipboard", e);
    }
  };

  const handleNext = async () => {
    Keyboard.dismiss();
    Haptics.selectionAsync();
    
    setIsQuerying(true);
    try {
      const user = await getUserByPublicKey(address);
      
      if (user) {
        router.push({
          pathname: "/send",
          params: {
            name: user.displayName || user.username,
            handle: `@${user.username}`,
            publicKey: address,
            uid: user.uid,
            avatar: (user.displayName || user.username).charAt(0).toUpperCase(),
            color: Colors.primary,
          }
        });
      } else {
        const shortAddress = `${address.slice(0, 4)}...${address.slice(-4)}`;
        router.push({
          pathname: "/send",
          params: {
            name: "External Wallet",
            handle: shortAddress,
            publicKey: address,
            avatar: "W",
            color: "#64748B",
          }
        });
      }
    } catch (e) {
      console.warn("Failed to lookup address", e);
      const shortAddress = `${address.slice(0, 4)}...${address.slice(-4)}`;
      router.push({
        pathname: "/send",
        params: {
          name: "External Wallet",
          handle: shortAddress,
          publicKey: address,
          avatar: "W",
          color: "#64748B",
        }
      });
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.baseLight }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.lg, height: 56 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.white, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}>
            <Feather name="arrow-left" size={20} color={Colors.textLightPrimary} />
          </TouchableOpacity>
          <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "700", fontSize: 20 }]}>Send Onchain</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={{ flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl }}>


          <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.md, marginLeft: 4 }]}>
            Destination Address
          </Text>

          <View style={{ backgroundColor: Colors.white, borderRadius: 16, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, marginBottom: Spacing.lg, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="G..."
              placeholderTextColor={Colors.textLightSecondary}
              style={[Typography.mono, { color: Colors.textLightPrimary, fontSize: 16, minHeight: 80, paddingRight: 32 }]}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              selectionColor={Colors.teal}
            />
            {address.length > 0 && (
              <TouchableOpacity onPress={() => setAddress("")} style={{ position: "absolute", right: 12, top: 12, padding: Spacing.xs }}>
                <Feather name="x-circle" size={18} color={Colors.textLightSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity onPress={handlePaste} style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", backgroundColor: Colors.white, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: 99, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 }}>
            <Feather name="clipboard" size={16} color={Colors.textLightPrimary} style={{ marginRight: Spacing.xs }} />
            <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700" }]}>Paste</Text>
          </TouchableOpacity>

          <View style={{ flex: 1, marginTop: Spacing.xl }}>
            {recentAddresses.length > 0 && (
              <>
                <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.md, marginLeft: 4 }]}>
                  Recently Paid
                </Text>
                
                <View style={{ backgroundColor: Colors.white, borderRadius: 16, padding: Spacing.sm, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}>
                  {recentAddresses.map((item, idx) => (
                    <TouchableOpacity 
                      key={item.address}
                      onPress={() => setAddress(item.address)}
                      style={{ flexDirection: "row", alignItems: "center", paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm, borderBottomWidth: idx === recentAddresses.length - 1 ? 0 : 1, borderBottomColor: Colors.borderLight }}
                    >
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.baseLight, justifyContent: "center", alignItems: "center", marginRight: Spacing.md }}>
                        <Feather name="link" size={18} color={Colors.textLightPrimary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[Typography.bodyLarge, { color: Colors.textLightPrimary, fontFamily: "Inter-Medium" }]}>{item.display}</Text>
                      </View>
                      <Feather name="chevron-right" size={18} color={Colors.textLightSecondary} />
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>

          {/* Action Button */}
          <View style={{ paddingVertical: Spacing.lg }}>
            <TouchableOpacity
              onPress={handleNext}
              style={{
                backgroundColor: "#111111",
                borderRadius: 99,
                paddingVertical: Spacing.lg,
                alignItems: "center",
                opacity: address.length > 10 ? 1 : 0.5,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 4
              }}
              disabled={address.length <= 10 || isQuerying}
            >
              {isQuerying ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={[Typography.labelLarge, { color: Colors.white, fontWeight: "700", fontSize: 16 }]}>Next</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
