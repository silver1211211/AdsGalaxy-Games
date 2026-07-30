import { randomBytes } from "crypto";
import { compare, getRounds, hash } from "bcryptjs";

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_HASH_ROUNDS = Number(process.env.ADMIN_PASSWORD_BCRYPT_ROUNDS ?? 12);

const COMMON_PASSWORDS = new Set([
  "1234", "123456", "12345678", "123456789", "1234567890",
  "password", "password1", "password123", "admin", "administrator",
  "qwerty", "qwerty123", "letmein", "welcome", "welcome123",
  "iloveyou", "monkey", "dragon", "football",
]);
const TEMP_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateTemporaryPassword() {
  const bytes = randomBytes(12);
  const characters = Array.from(bytes, (value) => TEMP_ALPHABET[value % TEMP_ALPHABET.length]);
  return `AG-${characters.slice(0, 4).join("")}-${characters.slice(4, 8).join("")}-${characters.slice(8, 12).join("")}`;
}

export function validatePermanentPassword(password: string, context?: {
  tenantSlug?: string | null;
  miniAppName?: string | null;
  telegramUsername?: string | null;
}) {
  const errors: string[] = [];
  const normalized = password.toLocaleLowerCase();
  if (password.length < PASSWORD_MIN_LENGTH) errors.push(`Use at least ${PASSWORD_MIN_LENGTH} characters.`);
  if (password.length > PASSWORD_MAX_LENGTH) errors.push(`Use no more than ${PASSWORD_MAX_LENGTH} characters.`);
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password))
    errors.push("Include both letters and numbers.");
  if (COMMON_PASSWORDS.has(normalized)) errors.push("Choose a password that is not commonly used.");
  if (/^(.)\1{5,}$/.test(password) || /(?:012345|123456|234567|345678|456789|987654)/.test(normalized))
    errors.push("Avoid repeated or sequential characters.");
  if (/^AG-(?:[A-Z2-9]{4}-){2}[A-Z2-9]{4}$/i.test(password))
    errors.push("Choose a permanent password instead of a temporary-password pattern.");
  for (const value of [context?.tenantSlug, context?.miniAppName, context?.telegramUsername]) {
    const candidate = value?.trim().toLocaleLowerCase();
    if (candidate && candidate.length >= 3 && normalized.includes(candidate))
      errors.push("Do not include your tenant name, tenant path, or Telegram username.");
  }
  return [...new Set(errors)];
}

export async function hashAdminPassword(password: string) {
  return hash(password, PASSWORD_HASH_ROUNDS);
}

export async function verifyAdminPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export function adminPasswordNeedsRehash(passwordHash: string) {
  try {
    return getRounds(passwordHash) !== PASSWORD_HASH_ROUNDS;
  } catch {
    return true;
  }
}
