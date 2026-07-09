import React, { useState } from "react";
import {
  View, Text, Pressable, TextInput, Modal, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Colors } from "../src/constants/colors";
import { Typography } from "../src/constants/typography";
import { Spacing } from "../src/constants/spacing";
import { useAuth } from "../src/hooks/useAuth";
import { useAuthStore } from "../src/store/authStore";
import { auth } from "../src/services/firebase/config";
import { linkEmailToAccount } from "../src/services/firebase/auth";
import { updateUserProfile } from "../src/services/firebase/firestore";

type ProviderKey = "password" | "google.com" | "phone";

const PROVIDERS: { key: ProviderKey; icon: string; title: string; subtitle: string; linkable: boolean }[] = [
  { key: "password", icon: "mail", title: "Email & Password", subtitle: "Sign in with your email address", linkable: true },
  { key: "google.com", icon: "chrome", title: "Google", subtitle: "Sign in with your Google account", linkable: false },
  { key: "phone", icon: "smartphone", title: "Phone Number", subtitle: "Sign in with a one-time SMS code", linkable: false },
];

export default function LinkedAccountsScreen() {
  const { profile } = useAuth();
  const setProfile = useAuthStore((s) => s.setProfile);

  // Firebase's providerData is the source of truth for what's actually linked.
  const [linked, setLinked] = useState<string[]>(
    () => auth.currentUser?.providerData.map((p) => p.providerId) ?? []
  );

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState(profile?.email || "");
  const [password, setPassword] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshLinked = () => {
    const providers = auth.currentUser?.providerData.map((p) => p.providerId) ?? [];
    setLinked(providers);
    return providers;
  };

  const handleLinkEmail = async () => {
    if (!email.trim() || password.length < 6) {
      setError("Enter a valid email and a password of at least 6 characters.");
      return;
    }
    setIsLinking(true);
    setError(null);
    try {
      await linkEmailToAccount(email.trim(), password);
      const providers = refreshLinked();
      // Keep the Firestore profile's denormalized provider list in sync.
      if (profile) {
        await updateUserProfile(profile.uid, { authProviders: providers, email: email.trim() });
        setProfile({ ...profile, authProviders: providers, email: email.trim() });
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowEmailModal(false);
      setPassword("");
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const code = err?.code || "";
      if (code === "auth/email-already-in-use") setError("That email is already used by another account.");
      else if (code === "auth/requires-recent-login") setError("Please sign in again before linking a new method.");
      else if (code === "auth/provider-already-linked") setError("This account already has email sign-in.");
      else setError(err?.message || "Failed to link. Please try again.");
    } finally {
      setIsLinking(false);
    }
  };

  const openLink = (key: ProviderKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (key === "password") {
      setError(null);
      setShowEmailModal(true);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.baseLight }} edges={["top", "bottom"]}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: Spacing.lg,
          height: 56,
          backgroundColor: Colors.baseLight,
          borderBottomWidth: 1,
          borderBottomColor: Colors.borderLight,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{ width: 40, height: 40, justifyContent: "center", alignItems: "flex-start" }}
        >
          <Feather name="arrow-left" size={22} color={Colors.textLightPrimary} />
        </Pressable>
        <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary }]}>Linked Accounts</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg }} showsVerticalScrollIndicator={false}>
        <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginBottom: Spacing.lg, marginLeft: Spacing.xs }]}>
          Connect sign-in methods so you can always get back into your account.
        </Text>

        <View
          style={{
            backgroundColor: Colors.white,
            borderRadius: 20,
            paddingHorizontal: Spacing.lg,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.03,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          {PROVIDERS.map((p, idx) => {
            const isLinked = linked.includes(p.key);
            return (
              <View
                key={p.key}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: Spacing.md,
                  borderBottomWidth: idx === PROVIDERS.length - 1 ? 0 : 1,
                  borderBottomColor: Colors.borderLight,
                  minHeight: 56,
                }}
              >
                <View
                  style={{
                    width: 40, height: 40, borderRadius: 20,
                    backgroundColor: Colors.baseLight,
                    justifyContent: "center", alignItems: "center", marginRight: Spacing.md,
                  }}
                >
                  <Feather name={p.icon as any} size={18} color={Colors.textLightPrimary} />
                </View>
                <View style={{ flex: 1, paddingRight: Spacing.md }}>
                  <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "600" }]}>{p.title}</Text>
                  <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary }]}>{p.subtitle}</Text>
                </View>

                {isLinked ? (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Feather name="check-circle" size={16} color={Colors.teal} style={{ marginRight: 4 }} />
                    <Text style={[Typography.labelSmall, { color: Colors.teal, fontWeight: "600" }]}>Connected</Text>
                  </View>
                ) : p.linkable ? (
                  <Pressable
                    onPress={() => openLink(p.key)}
                    style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 9999, backgroundColor: "#000", minHeight: 36, justifyContent: "center" }}
                  >
                    <Text style={[Typography.labelSmall, { color: Colors.white, fontWeight: "700" }]}>Connect</Text>
                  </Pressable>
                ) : (
                  <Text style={[Typography.labelSmall, { color: Colors.textLightMuted }]}>Not connected</Text>
                )}
              </View>
            );
          })}
        </View>

        <View style={{ flexDirection: "row", alignItems: "flex-start", marginTop: Spacing.lg, paddingHorizontal: Spacing.xs }}>
          <Feather name="info" size={14} color={Colors.textLightMuted} style={{ marginTop: 2, marginRight: Spacing.sm }} />
          <Text style={[Typography.bodySmall, { color: Colors.textLightMuted, flex: 1 }]}>
            Connecting email & password lets you sign in even if you lose access to your other methods.
          </Text>
        </View>
      </ScrollView>

      {/* Link Email modal */}
      <Modal visible={showEmailModal} transparent animationType="fade" onRequestClose={() => setShowEmailModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}
        >
          <Pressable style={{ flex: 1 }} onPress={() => !isLinking && setShowEmailModal(false)} />
          <View
            style={{
              backgroundColor: Colors.baseLight,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: Spacing.lg,
              paddingBottom: Spacing.xxl,
            }}
          >
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderLightStrong, alignSelf: "center", marginBottom: Spacing.lg }} />
            <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary, marginBottom: Spacing.xs }]}>
              Add Email Sign-In
            </Text>
            <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginBottom: Spacing.lg }]}>
              Set an email and password you can use to sign in.
            </Text>

            <TextInput
              value={email}
              onChangeText={(t) => { setEmail(t); setError(null); }}
              placeholder="you@example.com"
              placeholderTextColor={Colors.textLightMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={{
                fontFamily: "Inter-Regular", fontSize: 16,
                backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.borderLight,
                borderRadius: 16, height: 56, paddingHorizontal: Spacing.md, color: Colors.textLightPrimary,
                marginBottom: Spacing.md,
              }}
            />
            <TextInput
              value={password}
              onChangeText={(t) => { setPassword(t); setError(null); }}
              placeholder="Create a password (min 6 characters)"
              placeholderTextColor={Colors.textLightMuted}
              secureTextEntry
              autoCapitalize="none"
              style={{
                fontFamily: "Inter-Regular", fontSize: 16,
                backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.borderLight,
                borderRadius: 16, height: 56, paddingHorizontal: Spacing.md, color: Colors.textLightPrimary,
              }}
            />

            {error && (
              <Text style={[Typography.bodySmall, { color: Colors.danger, marginTop: Spacing.sm, marginLeft: Spacing.xs }]}>
                {error}
              </Text>
            )}

            <Pressable
              onPress={handleLinkEmail}
              disabled={isLinking}
              style={{
                height: 56, borderRadius: 9999, justifyContent: "center", alignItems: "center",
                backgroundColor: "#000", opacity: isLinking ? 0.6 : 1, marginTop: Spacing.lg,
              }}
            >
              {isLinking ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={[Typography.labelLarge, { color: Colors.white }]}>Connect Email</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
