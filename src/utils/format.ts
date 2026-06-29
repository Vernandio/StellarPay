// Format currency amounts for display
export const formatAmount = (
  amount: string | number,
  currency = "USD",
  decimals = 2
): string => {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0.00";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

// Truncate Stellar public key for display — NEVER show full key in UI
export const truncateAddress = (address: string, chars = 4): string => {
  if (!address || address.length < chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

// Format XLM amounts (7 decimal places max)
export const formatXLM = (amount: string): string => {
  const num = parseFloat(amount);
  return isNaN(num) ? "0.0000000" : num.toFixed(7).replace(/\.?0+$/, "");
};

// Validate Stellar public key (starts with G, 56 chars)
export const isValidStellarAddress = (address: string): boolean =>
  /^G[A-Z2-7]{55}$/.test(address);

// Format relative time (e.g. "2 min ago")
export const formatRelativeTime = (date: Date): string => {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};
