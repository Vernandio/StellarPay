import { useState, useCallback } from "react";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { signInWithCustomToken } from "@firebase/auth";
import { auth } from "../services/firebase/config";
import { checkUserProfileExists } from "../services/firebase/auth";
import { API_BASE } from "../services/api/client";

// Completes the auth session and dismisses the in-app browser once the
// backend redirects back to the app. Must run at module scope, before the
// component that opens the browser mounts.
WebBrowser.maybeCompleteAuthSession();

/**
 * Drives the "Continue with Google" flow end to end — via the backend.
 *
 * WHY not expo-auth-session's Google provider: Google's web OAuth client
 * rejects exp:// (Expo Go) and custom-scheme (stellarpay://) redirect URIs,
 * so the in-app flow can never complete. Instead:
 *   1. Open `${API_BASE}/api/auth/google/start` in the auth browser.
 *   2. Google redirects to the backend's https callback (which it accepts);
 *      the backend verifies the ID token, mints a Firebase custom token,
 *      and 303-redirects to our deep link with `?token=`.
 *   3. signInWithCustomToken, then route: existing profile → the app;
 *      brand-new user → Google onboarding (username + phone + PIN).
 *
 * Setup (one-time): the backend callback URL must be listed under
 * "Authorized redirect URIs" on the Google web client.
 */
export const useGoogleAuth = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const promptGoogle = useCallback(async () => {
    setError(null);
    setIsProcessing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const returnUrl = AuthSession.makeRedirectUri({ path: "google-auth" });
      const startUrl = `${API_BASE}/api/auth/google/start?redirect=${encodeURIComponent(returnUrl)}`;

      const result = await WebBrowser.openAuthSessionAsync(startUrl, returnUrl);

      if (result.type !== "success" || !("url" in result) || !result.url) {
        // "dismiss" / "cancel" — the user closed the sheet. Not an error.
        setIsProcessing(false);
        return;
      }

      // RN's URL lacks searchParams — parse the deep link manually
      const errMatch = result.url.match(/[?&]error=([^&#]+)/);
      if (errMatch) throw new Error(decodeURIComponent(errMatch[1]));

      const tokenMatch = result.url.match(/[?&]token=([^&#]+)/);
      if (!tokenMatch) throw new Error("Google sign-in did not return a token. Please try again.");

      const customToken = decodeURIComponent(tokenMatch[1]);
      const { user } = await signInWithCustomToken(auth, customToken);

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
  }, []);

  return { promptGoogle, isProcessing, error, isReady: true };
};
