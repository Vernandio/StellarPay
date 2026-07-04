import { View, Text, ScrollView, Pressable, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "../../src/constants/colors";
import { Typography } from "../../src/constants/typography";
import { Spacing } from "../../src/constants/spacing";
import { useAuth } from "../../src/hooks/useAuth";
import { useWallet } from "../../src/hooks/useWallet";
import { truncateAddress } from "../../src/utils/format";
import { signOut } from "../../src/services/firebase/auth";

export default function ProfileScreen() {
  const { profile } = useAuth();
  const { publicKey } = useWallet();

  const handleSignOut = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await signOut();
    router.replace("/(auth)/landing");
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.baseLight }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false} bounces={false}>
        
        {/* Dark Header */}
        <View style={{ backgroundColor: "#111111", paddingBottom: 60, paddingTop: 70, paddingHorizontal: Spacing.lg, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, alignItems: "center" }}>
          <View style={{ width: "100%", alignItems: "flex-end", marginBottom: Spacing.md }}>
            <Pressable>
              <Feather name="settings" size={24} color={Colors.white} />
            </Pressable>
          </View>

          {/* Avatar */}
          <View style={{ marginBottom: Spacing.md }}>
            <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.surface, justifyContent: "center", alignItems: "center", overflow: "hidden", borderWidth: 3, borderColor: "rgba(255,255,255,0.1)" }}>
              {/* Replace with actual image in a real app */}
              <Feather name="user" size={40} color={Colors.white} />
            </View>
            <View style={{ position: "absolute", bottom: 0, right: 0, backgroundColor: Colors.white, width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }}>
              <Feather name="camera" size={16} color={Colors.textLightPrimary} />
            </View>
          </View>

          <Text style={[Typography.headingLarge, { color: Colors.white, marginBottom: Spacing.xs }]}>
            {profile?.displayName || "Alex Chen"}
          </Text>
          
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={[Typography.bodyMedium, { color: Colors.textSecondary, marginRight: Spacing.sm }]}>
              @{profile?.username || "alex.stellar"}
            </Text>
            <View style={{ backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, flexDirection: "row", alignItems: "center" }}>
              <Feather name="check" size={12} color={Colors.white} style={{ marginRight: 4 }} />
              <Text style={[Typography.labelSmall, { color: Colors.white }]}>Verified</Text>
            </View>
          </View>
        </View>

        {/* Content Section overlapping the header */}
        <View style={{ paddingHorizontal: Spacing.lg, marginTop: -30 }}>
          
          {/* Stellar Account Card */}
          <View style={{ backgroundColor: Colors.white, borderRadius: 20, padding: Spacing.lg, marginBottom: Spacing.lg, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700", marginBottom: Spacing.xs }]}>Stellar Account</Text>
              <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, letterSpacing: 1 }]}>
                {publicKey ? truncateAddress(publicKey) : "GB...Z3YB"}
              </Text>
            </View>
            <Pressable style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.baseLight, justifyContent: "center", alignItems: "center" }}>
              <Feather name="copy" size={18} color={Colors.textLightPrimary} />
            </Pressable>
          </View>

          {/* Stellar Card */}
          <LinearGradient colors={["#333333", "#111111", "#000000"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: Spacing.xl, marginBottom: Spacing.xl, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.xl }}>
              <Text style={[Typography.labelLarge, { color: "rgba(255,255,255,0.8)", fontWeight: "600", letterSpacing: 1 }]}>STELLAR CARD</Text>
              <Feather name="wifi" size={24} color={Colors.white} style={{ transform: [{ rotate: "90deg" }] }} />
            </View>
            <View style={{ marginBottom: Spacing.xl }}>
              <Text style={[Typography.headingLarge, { color: Colors.white, letterSpacing: 2, marginBottom: Spacing.xs }]}>
                {publicKey ? `${publicKey.slice(0, 4)}  ••••  ••••  ${publicKey.slice(-4)}` : "••••  ••••  ••••  8325"}
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
              <View>
                <Text style={[Typography.labelSmall, { color: "rgba(255,255,255,0.6)", marginBottom: 4 }]}>CARDHOLDER</Text>
                <Text style={[Typography.labelLarge, { color: Colors.white, fontWeight: "600", textTransform: "uppercase" }]}>{profile?.displayName || "ALEX CHEN"}</Text>
              </View>
              <View>
                <Text style={[Typography.labelSmall, { color: "rgba(255,255,255,0.6)", marginBottom: 4 }]}>EXP</Text>
                <Text style={[Typography.labelLarge, { color: Colors.white, fontWeight: "600" }]}>12/28</Text>
              </View>
              <View style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 8, justifyContent: "center", alignItems: "center" }}>
                <Text style={{ color: Colors.white, fontWeight: "bold", fontStyle: "italic", fontSize: 16 }}>STELLAR</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Menu Block 1 */}
          <View style={{ backgroundColor: Colors.white, borderRadius: 24, paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}>
            {[
              { icon: "user", title: "Personal Information" },
              { icon: "link-2", title: "Linked Accounts" },
              { icon: "shield", title: "Security" },
              { icon: "sliders", title: "Preferences" },
            ].map((item, idx) => (
              <Pressable key={idx} style={{ flexDirection: "row", alignItems: "center", paddingVertical: Spacing.lg, borderBottomWidth: idx === 3 ? 0 : 1, borderBottomColor: Colors.borderLight }}>
                <Feather name={item.icon as any} size={22} color={Colors.textLightPrimary} style={{ marginRight: Spacing.md }} />
                <Text style={[Typography.labelLarge, { flex: 1, color: Colors.textLightPrimary, fontWeight: "600" }]}>{item.title}</Text>
                <Feather name="chevron-right" size={20} color={Colors.textLightSecondary} />
              </Pressable>
            ))}
          </View>

          {/* Menu Block 2 */}
          <View style={{ backgroundColor: Colors.white, borderRadius: 24, paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}>
            {[
              { icon: "headphones", title: "Support" },
              { icon: "info", title: "About StellarPay" },
            ].map((item, idx) => (
              <Pressable key={idx} style={{ flexDirection: "row", alignItems: "center", paddingVertical: Spacing.lg, borderBottomWidth: idx === 1 ? 0 : 1, borderBottomColor: Colors.borderLight }}>
                <Feather name={item.icon as any} size={22} color={Colors.textLightPrimary} style={{ marginRight: Spacing.md }} />
                <Text style={[Typography.labelLarge, { flex: 1, color: Colors.textLightPrimary, fontWeight: "600" }]}>{item.title}</Text>
                <Feather name="chevron-right" size={20} color={Colors.textLightSecondary} />
              </Pressable>
            ))}
          </View>

          {/* Log Out */}
          <Pressable
            onPress={handleSignOut}
            style={{ backgroundColor: "#111111", borderRadius: 99, paddingVertical: Spacing.lg, flexDirection: "row", justifyContent: "center", alignItems: "center" }}
          >
            <Text style={[Typography.labelLarge, { color: Colors.white, fontWeight: "700", marginRight: Spacing.sm }]}>Log Out</Text>
            <Feather name="log-out" size={18} color={Colors.white} />
          </Pressable>

        </View>
      </ScrollView>
    </View>
  );
}
