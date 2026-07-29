import { z } from "zod";

const CONTROL_OR_INVISIBLE = /[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/u;
const IMPERSONATION = /\b(official\s+)?(admin|administrator|support|moderator)\b/i;
export const SUPPORTED_LOCALES = ["en-US"] as const;

export function normalizeDisplayName(value: string) {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim();
}

export function effectiveDisplayName(profileName: string | null | undefined, user: {
  firstName?: string | null; lastName?: string | null; username?: string | null;
}) {
  const override = profileName ? normalizeDisplayName(profileName) : "";
  if (override) return override;
  const telegramName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return telegramName || user.username || "Player";
}

export function initials(name: string) {
  const parts = normalizeDisplayName(name).split(" ").filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts.at(-1)?.[0]}` : parts[0]?.slice(0, 2) || "P").toUpperCase();
}

const displayName = z.string().transform(normalizeDisplayName)
  .refine(value => value.length >= 2 && value.length <= 40, "Display name must be 2–40 characters.")
  .refine(value => !CONTROL_OR_INVISIBLE.test(value), "Display name contains unsupported characters.")
  .refine(value => !IMPERSONATION.test(value), "This display name could be mistaken for an official role.");

const bio = z.string().transform(value => value.normalize("NFKC").trim())
  .refine(value => value.length <= 160, "Bio must be 160 characters or fewer.")
  .refine(value => !CONTROL_OR_INVISIBLE.test(value), "Bio contains unsupported characters.");

export function isValidTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export const profileUpdateSchema = z.object({
  displayNameOverride: z.union([displayName, z.literal(""), z.null()]).optional(),
  bio: z.union([bio, z.literal(""), z.null()]).optional()
}).strict();

export const preferenceSchema = z.object({
  walletRewardsNotifications: z.boolean().optional(),
  taskUpdatesNotifications: z.boolean().optional(),
  announcementsNotifications: z.boolean().optional(),
  soundEnabled: z.boolean().optional()
}).strict().refine(value => Object.keys(value).length > 0, "At least one preference is required.");

export const notificationSchema = z.object({
  walletRewardsNotifications: z.boolean().optional(),
  taskUpdatesNotifications: z.boolean().optional(),
  announcementsNotifications: z.boolean().optional()
}).strict();

export function deviceLabel(userAgent: string | null) {
  if (!userAgent) return "Unknown device";
  const browser = /Telegram/i.test(userAgent) ? "Telegram" : /Edg\//.test(userAgent) ? "Edge" :
    /Chrome\//.test(userAgent) ? "Chrome" : /Firefox\//.test(userAgent) ? "Firefox" :
      /Safari\//.test(userAgent) ? "Safari" : "Browser";
  const platform = /Android/i.test(userAgent) ? "Android" : /iPhone|iPad/i.test(userAgent) ? "iOS" :
    /Windows/i.test(userAgent) ? "Windows" : /Mac OS/i.test(userAgent) ? "macOS" : /Linux/i.test(userAgent) ? "Linux" : "";
  return `${browser}${platform ? ` on ${platform}` : ""}`;
}

export function avatarMimeAllowed(bytes: Uint8Array, mime: string) {
  const png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const webp = String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return (mime === "image/png" && png) || (mime === "image/jpeg" && jpeg) || (mime === "image/webp" && webp);
}
