// ── API Client ────────────────────────────────────────────────────────
// Thin HTTP wrapper for calling the Express.js backend.
// Automatically attaches the Firebase ID token as a Bearer header
// on every request.
// ──────────────────────────────────────────────────────────────────────

import { auth } from "../firebase/config";
import Constants from "expo-constants";

// Dynamically extract the host computer's IP from the Expo manifest.
// This prevents "network request failed" errors when your IP changes.
let localIp = "localhost";
const hostUri = Constants.expoConfig?.hostUri;
if (hostUri) {
  const ip = hostUri.split(":")[0];
  if (ip && !ip.startsWith("10.") && !ip.startsWith("127.")) {
    localIp = ip;
  }
}

export const API_BASE = process.env.EXPO_PUBLIC_API_URL || `http://${localIp}:5000`;

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const token = await auth.currentUser?.getIdToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const apiClient = {
  post: async <T = any>(path: string, body: object = {}): Promise<T> => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `API error: ${res.status}`);
      }
      return data as T;
    } catch (err: any) {
      if (err.message === "Network request failed") {
        throw new Error(
          `Unable to connect to the backend server. Please verify that the Express backend is running on: ${API_BASE}`
        );
      }
      throw err;
    }
  },

  // Like `post`, but does not throw on non-2xx — returns the status and parsed
  // body so the caller can branch on structured error responses (e.g. the PIN
  // lockout flow). Still throws on genuine network failure.
  postRaw: async (
    path: string,
    body: object = {}
  ): Promise<{ ok: boolean; status: number; data: any }> => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    } catch (err: any) {
      if (err.message === "Network request failed") {
        throw new Error(
          `Unable to connect to the backend server. Please verify that the Express backend is running on: ${API_BASE}`
        );
      }
      throw err;
    }
  },

  get: async <T = any>(path: string): Promise<T> => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}${path}`, {
        method: "GET",
        headers,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `API error: ${res.status}`);
      }
      return data as T;
    } catch (err: any) {
      if (err.message === "Network request failed") {
        throw new Error(
          `Unable to connect to the backend server. Please verify that the Express backend is running on: ${API_BASE}`
        );
      }
      throw err;
    }
  },
};
