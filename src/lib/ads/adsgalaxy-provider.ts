import { loadAdsGalaxySdk } from "./load-adsgalaxy-sdk";
import type { AdOutcome } from "./types";

export async function showAdsGalaxy(miniAppId: string, timeoutMs = 30_000): Promise<AdOutcome> {
  try {
    await loadAdsGalaxySdk(miniAppId);
    if (!window.showAdsGalaxy) return { status: "SDK_UNAVAILABLE" };
    const result = await Promise.race([
      window.showAdsGalaxy(),
      new Promise<never>((_, reject) => window.setTimeout(() => reject(Object.assign(new Error("Ad timeout"), { code: "TIMEOUT" })), timeoutMs))
    ]);
    const providerRequestId =
      result && typeof result === "object" && "request_id" in result
        ? String((result as { request_id?: unknown }).request_id || "")
        : "";
    if (!providerRequestId) return { status: "SDK_ERROR", code: "INVALID_RESPONSE", message: "Ads Galaxy did not return request_id" };
    return { status: "COMPLETED", providerRequestId, raw: result };
  } catch (cause) {
    const error = cause as { code?: string; message?: string };
    const known = ["NO_FILL", "INVALID_INIT_DATA", "APP_NOT_READY", "TIMEOUT", "SDK_UNAVAILABLE"] as const;
    const status = known.find((value) => value === error.code || value === error.message) ?? "SDK_ERROR";
    return { status, code: error.code, message: error.message };
  }
}
