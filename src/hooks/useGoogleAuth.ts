import { useEffect, useState, useCallback } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  signInWithGoogleToken,
  checkUserProfileExists,
} from "../services/firebase/auth";

// Completes the auth session and dismisses the in-app browser once Google
// redirects back to `stellarpay://`. Must run at module scope, before the
// component that opens the browser mounts.
WebBrowser.maybeCompleteAuthSession();

/**
 * Drives the "Continue with Google" flow end to end:
 *   1. Opens Google via expo-auth-session and gets an ID token.
 *   2. Exchanges it for a Firebase session (signInWithGoogleToken).
 *   3. Routes: existing profile → the app; brand-new user → onboarding
 *      (username + phone + PIN), which is where name/email get pre-filled.
 *
 * OAuth client IDs come from EXPO_PUBLIC_GOOGLE_CLIENT_ID (the Web client
 * registered as an authorized provider in Firebase). iOS/Android client IDs
 * are optional and only needed for native standalone/dev builds.
 */
export const useGoogleAuth = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  useEffect(() => {
    if (!response) return;

    if (response.type === "success") {
      const idToken =
        (response.params as any)?.id_token ??
        response.authentication?.idToken;
      if (idToken) {
        handleGoogleToken(idToken);
      } else {
        setError("Google did not return an ID token. Please try again.");
        setIsProcessing(false);
      }
    } else if (response.type === "error") {
      setError(response.error?.message || "Google sign-in failed.");
      setIsProcessing(false);
    } else {
      // "dismiss" / "cancel" — the user closed the sheet. Not an error.
      setIsProcessing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  const handleGoogleToken = async (idToken: string) => {
    try {
      const user = await signInWithGoogleToken(idToken);
      const hasProfile = await checkUserProfileExists(user.uid);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (hasProfile) {
        router.replace("/(tabs)");
      } else {
        router.replace("/(auth)/google-onboarding");
      }
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.message || "Failed to sign in with Google.");
    } finally {
      setIsProcessing(false);
    }
  };

  const promptGoogle = useCallback(async () => {
    if (!process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID) {
      setError(
        "Google sign-in isn't configured. Add EXPO_PUBLIC_GOOGLE_CLIENT_ID to .env."
      );
      return;
    }
    setError(null);
    setIsProcessing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await promptAsync();
    } catch (err: any) {
      setError(err.message || "Could not open Google sign-in.");
      setIsProcessing(false);
    }
  }, [promptAsync]);

  return { promptGoogle, isProcessing, error, isReady: !!request };
};
