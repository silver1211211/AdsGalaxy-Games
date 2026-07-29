import { z } from "zod";
import { normalizeTenantSlug, validTenantSlug } from "../super-admin/policy";

export const REQUEST_CATEGORIES = ["COMMUNITY", "ENTERTAINMENT", "EDUCATION", "BUSINESS", "CREATOR", "GAMING", "OTHER"] as const;
export const PROMOTION_CHANNELS = ["TELEGRAM_CHANNEL", "TELEGRAM_GROUP", "TELEGRAM_BOT", "TIKTOK", "INSTAGRAM", "YOUTUBE", "X", "FACEBOOK", "WEBSITE", "OTHER"] as const;
const meaningful = (value: string) => new Set(value.toLowerCase().replace(/[^a-z0-9]/g, "")).size >= 6;
export function normalizeRequestSlug(value: string) { return normalizeTenantSlug(value); }
export function validRequestSlug(value: string) {
  return value.length >= 5 && value.length <= 40 && /[a-z]/.test(value) && validTenantSlug(value) &&
    !["request-mini-app", "terms", "privacy", "support"].includes(value);
}
export function safeContactUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (!url.username && !url.password) ? url.toString() : null;
  } catch { return null; }
}
const url = z.string().trim().max(500).refine((value) => Boolean(safeContactUrl(value)), "Use a safe HTTPS or Telegram link");
export const requestSchema = z.object({
  applicantName: z.string().trim().min(2).max(160),
  telegramUsername: z.string().trim().max(64).regex(/^@?[A-Za-z0-9_]{5,64}$/).optional().or(z.literal("")),
  proposedName: z.string().trim().min(3).max(100),
  requestedSlug: z.string().trim().min(5).max(40),
  description: z.string().trim().min(30).max(500),
  intendedAudience: z.string().trim().min(20).max(500),
  category: z.enum(REQUEST_CATEGORIES),
  contactMethod: z.string().trim().min(3).max(160),
  primaryPromotionChannel: z.enum(PROMOTION_CHANNELS),
  primaryPromotionUrl: url,
  estimatedAudienceSize: z.number().int().min(0).max(100_000_000),
  expectedFirstWeekUsers: z.number().int().min(1).max(10_000_000),
  promotionPlan: z.string().trim().min(100).max(2000).refine(meaningful, "Promotion plan must contain meaningful detail"),
  additionalLinks: z.array(url).max(5).default([]),
  acknowledgements: z.object({ review: z.literal(true), genuineUsers: z.literal(true), inactivity: z.literal(true), rewards: z.literal(true), terms: z.literal(true) }).strict(),
  idempotencyKey: z.string().uuid(),
}).strict();
export function publicReference() {
  return `MAR-${crypto.randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`;
}
