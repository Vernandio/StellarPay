import React, { useState } from "react";
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
import { updateUserProfile } from "../src/services/firebase/firestore";

export default function PersonalInformationScreen() {
  const { user, profile } = useAuth();
  const setProfile = useAuthStore((s) => s.setProfile);

  const [displayName, setDisplayName] = useState(profile?.displayName || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const trimmed = displayName.trim();
    if (!trimmed) {
      setError("Display name can't be empty");
      return;
    }
    if (!user) return;

    setIsSaving(true);
    setError(null);
    try {
      await updateUserProfile(user.uid, { displayName: trimmed });
      if (profile) setProfile({ ...profile, displayName: trimmed });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.message || "Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const ReadOnlyRow = ({ label, value }: { label: string; value: string }) => (
    <View
      style={{
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
      }}
    >
      <Text style={[Typography.labelSmall, { color: Colors.textLightMuted, marginBottom: 4 }]}>
        {label}
      </Text>
      <Text style={[Typography.bodyLarge, { color: Colors.textLightSecondary }]}>
        {value || "—"}
      </Text>
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
        <Pressable
          onPress={() => router.back()}
          style={{ width: 40, height: 40, justifyContent: "center", alignItems: "flex-start" }}
        >
          <Feather name="arrow-left" size={22} color={Colors.textLightPrimary} />
        </Pressable>
        <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary }]}>
          Personal Information
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg }} showsVerticalScrollIndicator={false}>
        <View style={{ marginBottom: Spacing.xl }}>
          <Text
            style={[
              Typography.labelLarge,
              { color: Colors.textLightSecondary, marginBottom: Spacing.xs, marginLeft: Spacing.xs },
            ]}
          >
            Display Name
          </Text>
          <TextInput
            value={displayName}
            onChangeText={(t) => { setDisplayName(t); setError(null); }}
            placeholder="Your name"
            placeholderTextColor={Colors.textLightMuted}
            autoCapitalize="words"
            autoCorrect={false}
            style={{
              fontFamily: "Inter-Regular",
              fontSize: 16,
              backgroundColor: Colors.white,
              borderWidth: 1,
              borderColor: error ? Colors.danger : Colors.borderLight,
              borderRadius: 16,
              height: 56,
              paddingHorizontal: Spacing.md,
              color: Colors.textLightPrimary,
            }}
          />
          {error && (
            <Text style={[Typography.bodySmall, { color: Colors.danger, marginTop: Spacing.xs, marginLeft: Spacing.xs }]}>
              {error}
            </Text>
          )}
          <Text style={[Typography.bodySmall, { color: Colors.textLightMuted, marginTop: Spacing.xs, marginLeft: Spacing.xs }]}>
            This is only used for display and doesn't affect your username or login.
          </Text>
        </View>

        <View
          style={{
            backgroundColor: Colors.white,
            borderRadius: 20,
            paddingHorizontal: Spacing.lg,
            marginBottom: Spacing.xl,
          }}
        >
          <ReadOnlyRow label="Username" value={profile?.username ? `@${profile.username}` : ""} />
          <ReadOnlyRow label="Email" value={profile?.email || ""} />
          <View style={{ paddingVertical: Spacing.md }}>
            <Text style={[Typography.labelSmall, { color: Colors.textLightMuted, marginBottom: 4 }]}>
              Phone
            </Text>
            <Text style={[Typography.bodyLarge, { color: Colors.textLightSecondary }]}>
              {profile?.phone || "—"}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleSave}
          disabled={isSaving}
          style={{
            height: 56,
            borderRadius: 9999,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#000",
            opacity: isSaving ? 0.6 : 1,
          }}
        >
          {isSaving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={[Typography.labelLarge, { color: Colors.white }]}>Save Changes</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
