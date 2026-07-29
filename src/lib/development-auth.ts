import type { MembershipRole } from "@prisma/client";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
export const DEVELOPMENT_ROLES = ["USER", "ADMIN", "SUPER_ADMIN"] as const;

export function normalizedHost(hostHeader: string | null) {
  if (!hostHeader) return null;
  try {
    const url = new URL(`http://${hostHeader}`);
    return url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  } catch {
    return null;
  }
}

export function developmentAuthAllowed(
  hostHeader: string | null,
  env: NodeJS.ProcessEnv = process.env,
) {
  if (
    !developmentRouteVisible(hostHeader, env) ||
    env.ALLOW_DEVELOPMENT_AUTH !== "true"
  )
    return false;
  return true;
}

export function developmentRouteVisible(
  hostHeader: string | null,
  env: NodeJS.ProcessEnv = process.env,
) {
  if (env.NODE_ENV !== "development") return false;
  const host = normalizedHost(hostHeader);
  if (!host || !LOCAL_HOSTS.has(host)) return false;
  const configured = new Set(
    (env.DEV_AUTH_ALLOWED_HOSTS ?? "localhost,127.0.0.1,[::1]")
      .split(",")
      .map((value) =>
        value
          .trim()
          .replace(/^\[|\]$/g, "")
          .toLowerCase(),
      )
      .filter((value) => LOCAL_HOSTS.has(value)),
  );
  return configured.has(host);
}

export function classifyDevelopmentDatabaseError(error: unknown) {
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";
  const message = error instanceof Error ? error.message : String(error);
  if (code === "P2021" || code === "P2022") return "MISSING_TABLES" as const;
  if (
    code === "P1000" ||
    code === "P1001" ||
    code === "P1012" ||
    code === "P1013"
  )
    return "UNREACHABLE" as const;
  if (
    /reach database|connection refused|econnrefused|database_diagnostic_timeout|connect timed out/i.test(
      message,
    )
  ) {
    return "UNREACHABLE" as const;
  }
  return "UNKNOWN" as const;
}

export function developmentRole(value: unknown): MembershipRole | null {
  return typeof value === "string" &&
    (DEVELOPMENT_ROLES as readonly string[]).includes(value)
    ? (value as MembershipRole)
    : null;
}

export function safeDevelopmentRedirect(value: unknown) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f]/.test(value)
  )
    return "/games";
  try {
    const decoded = decodeURIComponent(value);
    if (
      !decoded.startsWith("/") ||
      decoded.startsWith("//") ||
      decoded.includes("\\") ||
      /^[a-z]+:/i.test(decoded.slice(1))
    )
      return "/games";
    return decoded;
  } catch {
    return "/games";
  }
}

export function validatedDevelopmentRedirect(value: unknown) {
  if (typeof value !== "string") return null;
  const safe = safeDevelopmentRedirect(value);
  return safe === value ? safe : null;
}

export function developmentAdminTenantSlug(value: unknown) {
  const safe = validatedDevelopmentRedirect(value);
  if (!safe) return null;
  const match = safe.match(
    /^\/([a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?)\/admin(?:\/|$)/,
  );
  return match?.[1] ?? null;
}

export function developmentIdentity(env: NodeJS.ProcessEnv = process.env) {
  const telegramId = env.DEV_AUTH_TELEGRAM_ID ?? "999000001";
  if (!/^\d{6,20}$/.test(telegramId))
    throw new Error("Invalid development Telegram identity configuration");
  return {
    telegramId: BigInt(telegramId),
    username: env.DEV_AUTH_USERNAME ?? "local_developer",
    firstName: env.DEV_AUTH_FIRST_NAME ?? "Local",
    lastName: env.DEV_AUTH_LAST_NAME ?? "Developer",
    miniAppSlug: env.DEV_AUTH_MINI_APP_SLUG ?? "local-development",
    miniAppName: env.DEV_AUTH_MINI_APP_NAME ?? "Local Development Mini App",
  };
}

export function developmentSuperAdminIdentity(env: NodeJS.ProcessEnv = process.env) {
  const telegramId = env.DEV_SUPER_ADMIN_TELEGRAM_ID ?? "999000003";
  if (!/^\d{6,20}$/.test(telegramId))
    throw new Error("Invalid development Super Admin identity configuration");
  return {
    ...developmentIdentity(env),
    telegramId: BigInt(telegramId),
    username: env.DEV_SUPER_ADMIN_USERNAME ?? "local_super_admin",
    firstName: env.DEV_SUPER_ADMIN_FIRST_NAME ?? "Local",
    lastName: env.DEV_SUPER_ADMIN_LAST_NAME ?? "SuperAdmin",
  };
}
