export type AdContext = "games_home_sponsored" | "memory_match_money_claim" | "memory_match_coin_claim";
export type AdOutcome =
  | { status: "COMPLETED"; providerRequestId: string; raw?: unknown }
  | { status: "NO_FILL" | "INVALID_INIT_DATA" | "APP_NOT_READY" | "TIMEOUT" | "SDK_UNAVAILABLE" | "SDK_ERROR"; code?: string; message?: string };

declare global {
  interface Window {
    showAdsGalaxy?: () => Promise<unknown>;
  }
}
