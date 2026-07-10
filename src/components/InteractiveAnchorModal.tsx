import React, { useState, useEffect, useRef } from "react";
import { Modal, View, Text, StyleSheet, ActivityIndicator, Pressable, Platform } from "react-native";
import { WebView } from "react-native-webview";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Colors } from "../constants/colors";
import { Typography } from "../constants/typography";
import { Spacing } from "../constants/spacing";
import { useAuthStore } from "../store/authStore";
import {
  fetchStellarToml,
  authenticateSEP10,
  initiateInteractiveDeposit,
  initiateInteractiveWithdraw,
  pollTransactionStatus,
  sendWithdrawalPayment,
  AnchorTransaction,
} from "../services/stellar/anchor";
import { setupUSDCTrustline, checkUSDCTrustlineExists } from "../services/stellar/wallet";
import { USDC_ASSET } from "../constants/stellar";
interface InteractiveAnchorModalProps {
  visible: boolean;
  onClose: () => void;
  transactionType: "deposit" | "withdraw";
  onSuccess?: () => void;
}

export const InteractiveAnchorModal: React.FC<InteractiveAnchorModalProps> = ({
  visible,
  onClose,
  transactionType,
  onSuccess,
}) => {
  const { user, profile } = useAuthStore();
  const [initLoading, setInitLoading] = useState(true);
  const [progressText, setProgressText] = useState("Connecting to Anchor...");
  const [interactiveUrl, setInteractiveUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const isPayingRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      cleanup();
      return;
    }

    startAnchorFlow();

    return () => {
      cleanup();
    };
  }, [visible, transactionType]);

  const cleanup = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setInitLoading(true);
    setInteractiveUrl(null);
    setError(null);
    setShowSuccessOverlay(false);
    isPayingRef.current = false;
  };

  const startAnchorFlow = async () => {
    if (!user || !profile || !profile.stellarPublicKey) {
      setError("Your account isn't ready yet. Please try again in a moment.");
      setInitLoading(false);
      return;
    }

    try {
      const anchorDomain = "testanchor.stellar.org";
      const publicKey = profile.stellarPublicKey;

      // Step 1: Parse stellar.toml
      setProgressText("Getting things ready...");
      const config = await fetchStellarToml(anchorDomain);
      if (!config.webAuthEndpoint || !config.transferServer) {
        throw new Error("This service is temporarily unavailable. Please try again later.");
      }

      // Step 2: Authenticate via SEP-10
      setProgressText("Verifying your identity...");
      const token = await authenticateSEP10(user.uid, publicKey, config.webAuthEndpoint);

      // Step 2.5: Ensure USDC Trustline is established
      setProgressText("Checking your account...");
      const trustlineExists = await checkUSDCTrustlineExists(publicKey);
      if (!trustlineExists) {
        setProgressText("Setting up your account...");
        await setupUSDCTrustline(user.uid, publicKey);
      }

      // Step 3: Initiate Interactive Transaction via SEP-24
      setProgressText("Starting your transfer...");
      let response;
      if (transactionType === "deposit") {
        response = await initiateInteractiveDeposit(config.transferServer, token, publicKey);
      } else {
        response = await initiateInteractiveWithdraw(config.transferServer, token, publicKey);
      }

      setInteractiveUrl(response.url);
      setInitLoading(false);

      if (Platform.OS === "web") {
        window.open(response.url, "_blank");
      }

      // Step 4: Start polling transaction status
      startPolling(config.transferServer, token, response.id);
    } catch (err: any) {
      console.error("Stellar Anchor Flow Error:", err);
      if (err.response) {
        console.error("AxiosError Status:", err.response.status);
        console.error("AxiosError Headers:", JSON.stringify(err.response.headers));
        console.error("AxiosError Data:", JSON.stringify(err.response.data));
      }
      setError(err.message || "Couldn't start the transfer. Please try again.");
      setInitLoading(false);
    }
  };

  const startPolling = (transferServer: string, token: string, transactionId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = (setInterval as any)(async () => {
      // Don't poll while automatically submitting a withdrawal payment transaction
      if (isPayingRef.current) return;

      try {
        const tx: AnchorTransaction = await pollTransactionStatus(
          transferServer,
          token,
          transactionId
        );

        console.log(`SEP-24 Polling Status for ${transactionId}:`, tx.status);

        if (tx.status === "completed") {
          handleSuccess();
        } else if (tx.status === "pending_user_transfer_start" && transactionType === "withdraw") {
          // Automatic offramp transaction processing
          await handleAutomaticWithdrawalPayment(tx);
        } else if (tx.status === "error" || tx.status === "no_market" || tx.status === "too_small") {
          throw new Error(`Anchor transaction error: ${tx.status}`);
        }
      } catch (err: any) {
        console.error("Polling Error:", err);
        setError(err.message || "Transfer failed. Please try again.");
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    }, 5000);
  };

  const handleAutomaticWithdrawalPayment = async (tx: AnchorTransaction) => {
    if (isPayingRef.current) return;
    isPayingRef.current = true;

    try {
      if (!user || !profile || !profile.stellarPublicKey) return;
      if (!tx.withdraw_anchor_account || !tx.amount_in || !tx.withdraw_memo) {
        throw new Error("Missing withdrawal transfer details from Anchor response");
      }

      setProgressText("Processing your withdrawal...");
      setInitLoading(true);

      console.log("Submitting withdrawal payment of", tx.amount_in, USDC_ASSET.code, "to", tx.withdraw_anchor_account);

      await sendWithdrawalPayment({
        uid: user.uid,
        publicKey: profile.stellarPublicKey,
        destinationAddress: tx.withdraw_anchor_account,
        amount: tx.amount_in,
        assetCode: USDC_ASSET.code,
        memoValue: tx.withdraw_memo,
        memoType: tx.withdraw_memo_type || "text",
      });

      setInitLoading(false);
      setProgressText("Almost done — confirming your transfer...");
      isPayingRef.current = false;
    } catch (err: any) {
      console.error("Automatic Withdrawal Payment Error:", err);
      setError(err.message || "Couldn't process your withdrawal. Please try again.");
      isPayingRef.current = false;
    }
  };

  const handleSuccess = async () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowSuccessOverlay(true);

    setTimeout(() => {
      onClose();
      if (onSuccess) onSuccess();
    }, 3000);
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <Animated.View
          entering={SlideInDown.duration(300)}
          exiting={SlideOutDown.duration(300)}
          style={styles.modalCard}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[Typography.headingMedium, { color: Colors.textPrimary }]}>
              {transactionType === "deposit" ? "Add Money" : "Withdraw"}
            </Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={24} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {/* Main Body */}
          <View style={styles.body}>
            {initLoading && (
              <View style={styles.overlayCenter}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={[Typography.bodyMedium, styles.progressText]}>
                  {progressText}
                </Text>
              </View>
            )}

            {error && (
              <View style={styles.overlayCenter}>
                <Feather name="alert-circle" size={48} color={Colors.danger} />
                <Text style={[Typography.headingMedium, { color: Colors.textPrimary, marginTop: Spacing.md }]}>
                  Transaction Failed
                </Text>
                <Text style={[Typography.bodyMedium, styles.errorText]}>
                  {error}
                </Text>
                <Pressable onPress={startAnchorFlow} style={styles.retryButton}>
                  <Text style={[Typography.labelLarge, { color: Colors.white }]}>Retry Connection</Text>
                </Pressable>
              </View>
            )}

            {!initLoading && !error && interactiveUrl && (
              Platform.OS === "web" ? (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: Spacing.xl }}>
                  <Feather name="external-link" size={48} color={Colors.primary} style={{ marginBottom: Spacing.md }} />
                  <Text style={[Typography.headingMedium, { color: Colors.textPrimary, textAlign: "center" }]}>
                    Portal Opened in New Tab
                  </Text>
                  <Text style={[Typography.bodyMedium, { color: Colors.textSecondary, textAlign: "center", marginTop: Spacing.sm, paddingHorizontal: Spacing.lg, lineHeight: 20 }]}>
                    Please complete your deposit/withdrawal details in the secure page that was opened.
                  </Text>
                  <Pressable
                    onPress={() => window.open(interactiveUrl, "_blank")}
                    style={{ marginTop: Spacing.xl, height: 48, paddingHorizontal: Spacing.lg, borderRadius: 24, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center", minWidth: 200 }}
                  >
                    <Text style={[Typography.labelLarge, { color: Colors.white, fontWeight: "600" }]}>Reopen Payment Page</Text>
                  </Pressable>
                </View>
              ) : (
                <WebView
                  source={{ uri: interactiveUrl }}
                  style={styles.webview}
                  javaScriptEnabled
                  domStorageEnabled
                  startInLoadingState
                  renderLoading={() => (
                    <View style={styles.webViewLoader}>
                      <ActivityIndicator size="large" color={Colors.primary} />
                    </View>
                  )}
                />
              )
            )}

            {/* Success Overlay */}
            {showSuccessOverlay && (
              <Animated.View
                entering={FadeIn}
                exiting={FadeOut}
                style={styles.successOverlay}
              >
                <View style={styles.successCard}>
                  <View style={styles.checkCircle}>
                    <Feather name="check" size={54} color={Colors.white} />
                  </View>
                  <Text style={[Typography.headingLarge, { color: Colors.textPrimary, marginTop: Spacing.xl }]}>
                    Transfer Successful!
                  </Text>
                  <Text style={[Typography.bodyMedium, { color: Colors.textSecondary, textAlign: "center", marginTop: Spacing.sm }]}>
                    {transactionType === "deposit"
                      ? "Money has been added to your balance."
                      : "Your withdrawal has been processed."}
                  </Text>
                </View>
              </Animated.View>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#111026",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: "90%",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  closeButton: {
    padding: Spacing.xs,
  },
  body: {
    flex: 1,
    backgroundColor: "#0B0A1C",
    position: "relative",
  },
  webview: {
    flex: 1,
    backgroundColor: "#0B0A1C",
  },
  webViewLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0B0A1C",
    justifyContent: "center",
    alignItems: "center",
  },
  overlayCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
    backgroundColor: "#0B0A1C",
  },
  progressText: {
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    textAlign: "center",
  },
  errorText: {
    color: Colors.danger,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: Spacing.xl,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0B0A1C",
    justifyContent: "center",
    alignItems: "center",
  },
  successCard: {
    alignItems: "center",
    padding: Spacing.xxl,
  },
  checkCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.teal,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
});
