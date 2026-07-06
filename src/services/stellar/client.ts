import { Horizon } from "@stellar/stellar-sdk";
import { ACTIVE_NETWORK, USDC_ASSET } from "../../constants/stellar";

// Singleton Horizon server instance
let _server: Horizon.Server | null = null;

export const getHorizonServer = (): Horizon.Server => {
  if (!_server) {
    _server = new Horizon.Server(ACTIVE_NETWORK.horizonUrl);
  }
  return _server;
};

export const loadAccount = async (publicKey: string) => {
  const server = getHorizonServer();
  return server.loadAccount(publicKey);
};

export const getAccountBalances = async (publicKey: string) => {
  const account = await loadAccount(publicKey);
  return account.balances;
};

export const getXLMBalance = async (publicKey: string): Promise<string> => {
  const balances = await getAccountBalances(publicKey);
  const xlm = balances.find((b) => b.asset_type === "native");
  return xlm?.balance ?? "0";
};

export const getUSDCBalance = async (publicKey: string): Promise<string> => {
  const balances = await getAccountBalances(publicKey);
  const usdc = balances.find(
    (b) =>
      b.asset_type === "credit_alphanum4" &&
      (b as any).asset_code === USDC_ASSET.code
  );
  return usdc?.balance ?? "0";
};

export const getPaymentHistory = async (publicKey: string, limit = 20) => {
  const server = getHorizonServer();
  return server.payments().forAccount(publicKey).limit(limit).order("desc").call();
};

export const streamPayments = (
  publicKey: string,
  onPayment: (payment: any) => void
) => {
  const server = getHorizonServer();
  return server
    .payments()
    .forAccount(publicKey)
    .cursor("now")
    .stream({ onmessage: onPayment });
};
