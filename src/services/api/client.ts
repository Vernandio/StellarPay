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

const DEV_API_URL = `http://${localIp}:5000`;
const PROD_API_URL = "https://api.stellarpay.com";

const API_BASE = __DEV__ ? DEV_API_URL : PROD_API_URL;

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
export { DEV_API_URL };
