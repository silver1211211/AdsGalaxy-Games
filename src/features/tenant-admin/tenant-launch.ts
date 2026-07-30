import { isValidTenantSlug } from "./boundary";

export function miniAppSlugForPath(pathname: string, platformSlug: string) {
  let first = "";
  try { first = decodeURIComponent(pathname.split("/").filter(Boolean)[0] ?? ""); }
  catch { return platformSlug; }
  return isValidTenantSlug(first) ? first : platformSlug;
}

export function telegramTenantContextMatches(tenantSlug: string, signedStartParam?: string) {
  return !signedStartParam || signedStartParam === tenantSlug;
}

export function tenantPublicState(input: { exists: boolean; status?: string; maintenanceMode?: boolean }) {
  if (!input.exists) return "NOT_FOUND" as const;
  if (input.status !== "ACTIVE" || input.maintenanceMode) return "UNAVAILABLE" as const;
  return "ACTIVE" as const;
}
