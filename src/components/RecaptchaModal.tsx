import React, { useState, forwardRef, useImperativeHandle } from "react";
import { Modal, StyleSheet, View, ActivityIndicator, Pressable, Text } from "react-native";
import { WebView } from "react-native-webview";
import { Feather } from "@expo/vector-icons";
import { Colors } from "../constants/colors";
import { Typography } from "../constants/typography";

export interface RecaptchaModalRef {
  verify: () => Promise<string>;
}

interface RecaptchaModalProps {
  siteKey: string;
  baseUrl: string;
}

export const RecaptchaModal = forwardRef<RecaptchaModalRef, RecaptchaModalProps>(
  ({ siteKey: propSiteKey, baseUrl }, ref) => {
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [resolver, setResolver] = useState<((token: string) => void) | null>(null);
    const [rejecter, setRejecter] = useState<((err: Error) => void) | null>(null);

    // Read custom site key from environment, fallback to Firebase's default invisible site key
    const siteKey = process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY || propSiteKey;

    useImperativeHandle(ref, () => ({
      verify: () => {
        return new Promise<string>((resolve, reject) => {
          setResolver(() => resolve);
          setRejecter(() => reject);
          setVisible(true);
          setLoading(true);
        });
      },
    }));

    const handleMessage = (event: any) => {
      try {
        const token = event.nativeEvent.data;
        if (token === "expired" || token === "error") {
          rejecter?.(new Error("reCAPTCHA verification failed or expired"));
        } else if (token) {
          resolver?.(token);
        }
      } catch (err: any) {
        rejecter?.(err);
      } finally {
        setVisible(false);
      }
    };

    const handleClose = () => {
      rejecter?.(new Error("User cancelled reCAPTCHA verification"));
      setVisible(false);
    };

    const handleBypass = () => {
      // Firebase allows mock tokens for test phone numbers configured in the Firebase Console
      resolver?.("mock-token-for-test-numbers");
      setVisible(false);
    };

    // Lightweight HTML page mounting the reCAPTCHA invisible widget
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://www.google.com/recaptcha/api.js?onload=onloadCallback&render=explicit" async defer></script>
          <style>
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background-color: #0F0E23;
            }
          </style>
          <script>
            function onCaptchaSuccess(token) {
              window.ReactNativeWebView.postMessage(token);
            }
            function onCaptchaError() {
              window.ReactNativeWebView.postMessage("error");
            }
            function onCaptchaExpired() {
              window.ReactNativeWebView.postMessage("expired");
            }
            
            // Render and trigger invisible verification automatically
            function onloadCallback() {
              grecaptcha.render('recaptcha-element', {
                'sitekey': '${siteKey}',
                'callback': onCaptchaSuccess,
                'expired-callback': onCaptchaExpired,
                'error-callback': onCaptchaError,
                'size': 'invisible',
                'theme': 'dark'
              });
              grecaptcha.execute();
            }
          </script>
        </head>
        <body>
          <div id="recaptcha-element"></div>
        </body>
      </html>
    `;

    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
        <View style={styles.container}>
          <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={[Typography.headingMedium, { color: Colors.textPrimary }]}>
                Security Verification
              </Text>
              <Pressable onPress={handleClose} style={styles.closeButton}>
                <Feather name="x" size={24} color={Colors.textSecondary} />
              </Pressable>
            </View>

            {/* WebView housing reCAPTCHA */}
            <View style={styles.webContainer}>
              <WebView
                originWhitelist={["*"]}
                source={{ html: htmlContent, baseUrl }}
                onMessage={handleMessage}
                onLoadEnd={() => setLoading(false)}
                javaScriptEnabled
                domStorageEnabled
                style={{ backgroundColor: "#0F0E23" }}
              />
              {loading && (
                <View style={styles.loader}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                </View>
              )}
            </View>

            {/* Bypass/Test Mode Footer */}
            <View style={styles.footer}>
              <Pressable onPress={handleBypass} style={styles.bypassButton}>
                <Text style={styles.bypassText}>Bypass reCAPTCHA (For Firebase Test Numbers)</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: "#1A1930",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: "70%",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  closeButton: {
    padding: 4,
  },
  webContainer: {
    flex: 1,
    position: "relative",
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0F0E23",
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
    backgroundColor: "#13122A",
    alignItems: "center",
  },
  bypassButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "rgba(123, 97, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(123, 97, 255, 0.2)",
  },
  bypassText: {
    color: Colors.primary,
    fontWeight: "600",
    fontSize: 14,
  },
});
