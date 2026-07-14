import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { signInWithCustomToken } from "@firebase/auth";
import { auth } from "../src/services/firebase/config";
import { checkUserProfileExists } from "../src/services/firebase/auth";
import { isGoogleAuthInFlight } from "../src/hooks/useGoogleAuth";
import { Colors } from "../src/constants/colors";

/**
 * Landing route for the Google OAuth deep link
 * (stellarpay://google-auth?token=...). Without this screen the router
 * shows "Unmatched Route" while useGoogleAuth finishes the sign-in.
 *
 * Warm flow (normal case): useGoogleAuth's openAuthSessionAsync captured
 * the same redirect and completes the sign-in itself — this screen only
 * shows a spinner until the hook navigates away.
 *
 * Cold start (app was killed mid-flow): nothing is waiting on the
 * redirect, so this screen completes the sign-in from the token itself.
 */
export default function GoogleAuthRedirect() {
  const { token } = useLocalSearchParams<{ token?: string }>();

  useEffect(() => {
    (async () => {
      if (isGoogleAuthInFlight()) return;

      try {
        if (token) {
          const { user } = await signInWithCustomToken(auth, String(token));
          const hasProfile = await checkUserProfileExists(user.uid);
          router.replace(hasProfile ? "/(tabs)" : "/(auth)/google-onboarding");
          return;
        }
      } catch (err) {
        console.warn("google-auth deep link sign-in failed:", err);
      }
      router.replace("/");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: Colors.baseLight,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}
