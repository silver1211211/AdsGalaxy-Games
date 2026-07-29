import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

const telegramUserSchema = z.object({
  id: z.number().int().positive(),
  first_name: z.string().min(1).max(128),
  last_name: z.string().max(128).optional(),
  username: z.string().max(64).optional(),
  language_code: z.string().max(10).optional(),
  photo_url: z.string().url().optional(),
  is_premium: z.boolean().optional()
});

export type ValidatedTelegramUser = z.infer<typeof telegramUserSchema>;

export function validateTelegramInitData(initData: string, botToken: string): ValidatedTelegramUser {
  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");
  if (!receivedHash) throw new Error("Missing Telegram signature");
  params.delete("hash");
  const authDate = Number(params.get("auth_date"));
  if (!authDate || Date.now() / 1000 - authDate > 3600) throw new Error("Expired Telegram session");
  const checkString = [...params.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`).join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expected = createHmac("sha256", secret).update(checkString).digest("hex");
  if (expected.length !== receivedHash.length ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(receivedHash))) {
    throw new Error("Invalid Telegram signature");
  }
  return telegramUserSchema.parse(JSON.parse(params.get("user") ?? "{}"));
}
