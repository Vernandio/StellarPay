import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, TextInput, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Colors } from "../src/constants/colors";
import { Typography } from "../src/constants/typography";
import { Spacing } from "../src/constants/spacing";
import { useAuth } from "../src/hooks/useAuth";
import { useAuthStore } from "../src/store/authStore";
import { updateUserProfile, isUsernameAvailable } from "../src/services/firebase/firestore";

// Usernames are the public payment/search handle, so keep them URL-safe and
// lowercase. Allowed: a-z, 0-9, dot, underscore. 3-20 chars.
const USERNAME_RE = /^[a-z0-9._]{3,20}$/;
const normalizeUsername = (raw: string) =>
  raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "");

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export default function PersonalInformationScreen() {
  const { user, profile } = useAuth();
  const setProfile = useAuthStore((s) => s.setProfile);

  const originalUsername = profile?.username || "";
  const [displayName, setDisplayName] = useState(profile?.displayName || "");
  const [username, setUsername] = useState(originalUsername);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guards against a slow availability response overwriting a newer keystroke's
  // result (last-write-wins on the debounced check).
  const checkSeq = useRef(0);

  const usernameChanged = username !== originalUsername;

  // Debounced uniqueness check. Only runs when the username actually changed.
  useEffect(() => {
    if (!usernameChanged) {
      setUsernameStatus("idle");
      return;
    }
    if (!USERNAME_RE.test(username)) {
      setUsernameStatus("invalid");
      return;
    }
    if (!user) return;

    const seq = ++checkSeq.current;
    setUsernameStatus("checking");
    const t = setTimeout(async () => {
      try {
        const available = await isUsernameAvailable(username, user.uid);
        if (seq !== checkSeq.current) return; // superseded by a newer keystroke
        setUsernameStatus(available ? "available" : "taken");
      } catch {
        if (seq !== checkSeq.current) return;
        setUsernameStatus("idle"); // network hiccup — don't block, re-check on save
      }
    }, 450);
    return () => clearTimeout(t);
  }, [username, usernameChanged, user]);

  const handleSave = async () => {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setError("Display name can't be empty");
      return;
    }
    if (!user) return;

    // Validate the username only if it was changed.
    if (usernameChanged && !USERNAME_RE.test(username)) {
      setError("Username must be 3-20 characters: letters, numbers, . or _");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const updates: { displayName: string; username?: string } = { displayName: trimmedName };

      if (usernameChanged) {
        // Re-check right before writing to close the race between the debounced
        // check and someone else claiming the handle first.
        const available = await isUsernameAvailable(username, user.uid);
        if (!available) {
          setUsernameStatus("taken");
          setError(`@${username} is already taken`);
          setIsSaving(false);
          return;
        }
        updates.username = username;
      }

      await updateUserProfile(user.uid, updates);
      if (profile) setProfile({ ...profile, ...updates });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.message || "Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // A pending/invalid/taken username blocks saving so we never write a bad handle.
  const usernameBlocksSave = usernameChanged && usernameStatus !== "available";

  const usernameHint = (() => {
    switch (usernameStatus) {
      case "checking":
        return { text: "Checking availability…", color: Colors.textLightMuted };
      case "available":
        return { text: `@${username} is available`, color: Colors.teal };
      case "taken":
        return { text: `@${username} is already taken`, color: Colors.danger };
      case "invalid":
        return { text: "3-20 chars: letters, numbers, . or _", color: Colors.danger };
      default:
        return { text: "This is your public handle for payments & QR codes.", color: Colors.textLightMuted };
    }
  })();

  const ReadOnlyRow = ({ label, value }: { label: string; value: string }) => (
    <View
      style={{
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
      }}
    >
      <Text style={[Typography.labelSmall, { color: Colors.textLightMuted, marginBottom: 4 }]}>{label}</Text>
      <Text style={[Typography.bodyLarge, { color: Colors.textLightSecondary }]}>{value || "—"}</Text>
    </View>
  );

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
        <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, justifyContent: "center", alignItems: "flex-start" }}>
          <Feather name="arrow-left" size={22} color={Colors.textLightPrimary} />
        </Pressable>
        <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary }]}>Personal Information</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Display Name */}
        <View style={{ marginBottom: Spacing.lg }}>
          <Text style={[Typography.labelLarge, { color: Colors.textLightSecondary, marginBottom: Spacing.xs, marginLeft: Spacing.xs }]}>Display Name</Text>
          <TextInput
            value={displayName}
            onChangeText={(t) => {
              setDisplayName(t);
              setError(null);
            }}
            placeholder="Your name"
            placeholderTextColor={Colors.textLightMuted}
            autoCapitalize="words"
            autoCorrect={false}
            style={{
              fontFamily: "Inter-Regular",
              fontSize: 16,
              backgroundColor: Colors.white,
              borderWidth: 1,
              borderColor: error && !displayName.trim() ? Colors.danger : Colors.borderLight,
              borderRadius: 16,
              height: 56,
              paddingHorizontal: Spacing.md,
              color: Colors.textLightPrimary,
            }}
          />
          <Text style={[Typography.bodySmall, { color: Colors.textLightMuted, marginTop: Spacing.xs, marginLeft: Spacing.xs }]}>This is only used for display and doesn't affect your login.</Text>
        </View>

        {/* Username */}
        <View style={{ marginBottom: Spacing.xl }}>
          <Text style={[Typography.labelLarge, { color: Colors.textLightSecondary, marginBottom: Spacing.xs, marginLeft: Spacing.xs }]}>Username</Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: Colors.white,
              borderWidth: 1,
              borderColor: usernameStatus === "taken" || usernameStatus === "invalid" ? Colors.danger : usernameStatus === "available" ? Colors.teal : Colors.borderLight,
              borderRadius: 16,
              height: 56,
              paddingHorizontal: Spacing.md,
            }}
          >
            <Text style={{ fontFamily: "Inter-Regular", fontSize: 16, color: Colors.textLightMuted }}>@</Text>
            <TextInput
              value={username}
              onChangeText={(t) => {
                setUsername(normalizeUsername(t));
                setError(null);
              }}
              placeholder="username"
              placeholderTextColor={Colors.textLightMuted}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
              style={{
                flex: 1,
                fontFamily: "Inter-Regular",
                fontSize: 16,
                paddingHorizontal: 2,
                color: Colors.textLightPrimary,
              }}
            />
            {usernameStatus === "checking" && <ActivityIndicator size="small" color={Colors.textLightMuted} />}
            {usernameStatus === "available" && <Feather name="check-circle" size={20} color={Colors.teal} />}
            {usernameStatus === "taken" && <Feather name="x-circle" size={20} color={Colors.danger} />}
          </View>
          <Text style={[Typography.bodySmall, { color: usernameHint.color, marginTop: Spacing.xs, marginLeft: Spacing.xs }]}>{usernameHint.text}</Text>
        </View>

        {/* Read-only identity */}
        <View
          style={{
            backgroundColor: Colors.white,
            borderRadius: 20,
            paddingHorizontal: Spacing.lg,
            marginBottom: Spacing.lg,
          }}
        >
          <ReadOnlyRow label="Email" value={profile?.email || ""} />
          <View style={{ paddingVertical: Spacing.md }}>
            <Text style={[Typography.labelSmall, { color: Colors.textLightMuted, marginBottom: 4 }]}>Phone</Text>
            <Text style={[Typography.bodyLarge, { color: Colors.textLightSecondary }]}>{profile?.phone || "—"}</Text>
          </View>
        </View>

        {error && <Text style={[Typography.bodySmall, { color: Colors.danger, marginBottom: Spacing.md, marginLeft: Spacing.xs }]}>{error}</Text>}

        <Pressable
          onPress={handleSave}
          disabled={isSaving || usernameBlocksSave}
          style={{
            height: 56,
            borderRadius: 9999,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#000",
            opacity: isSaving || usernameBlocksSave ? 0.5 : 1,
          }}
        >
          {isSaving ? <ActivityIndicator color={Colors.white} /> : <Text style={[Typography.labelLarge, { color: Colors.white }]}>Save Changes</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
