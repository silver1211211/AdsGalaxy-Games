export const OXAPAY_API_BASE = "https://api.oxapay.com/v1";
export const OXAPAY_CATALOG_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const USD_STABLECOINS = new Set(["USDT", "USDC"]);

export function automaticConversionPolicy(symbol: string) {
  return USD_STABLECOINS.has(symbol.toUpperCase())
    ? { eligible: true, source: "PLATFORM_USD_STABLECOIN_1_TO_1", rate: "1" }
    : { eligible: false, source: null, rate: null };
}

export function maskApiKey(value: string) {
  return value.length <= 8
    ? "••••••••"
    : `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

export function safeSignupUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      (url.hostname === "oxapay.com" || url.hostname.endsWith(".oxapay.com"))
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function mapProviderStatus(value: unknown) {
  switch (String(value).toLowerCase()) {
    case "pending":
      return "PENDING" as const;
    case "processing":
      return "PROCESSING" as const;
    case "confirming":
      return "CONFIRMING" as const;
    case "confirmed":
    case "complete":
    case "completed":
      return "CONFIRMED" as const;
    case "rejected":
      return "REJECTED" as const;
    case "canceled":
    case "cancelled":
      return "CANCELED" as const;
    default:
      return "UNKNOWN" as const;
  }
}
