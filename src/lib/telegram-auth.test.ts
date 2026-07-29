import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import { validateTelegramInitData } from "./telegram-auth";

function signedInitData(botToken: string, authDate: number) {
  const values = new URLSearchParams({
    auth_date: String(authDate),
    query_id: "test-query",
    user: JSON.stringify({ id: 123456, first_name: "Ada", username: "ada" })
  });
  const checkString = [...values.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  values.set("hash", createHmac("sha256", secret).update(checkString).digest("hex"));
  return values.toString();
}

describe("Telegram authentication", () => {
  it("accepts fresh correctly signed init data", () => {
    const data = signedInitData("test-bot-token", Math.floor(Date.now() / 1000));
    expect(validateTelegramInitData(data, "test-bot-token")).toMatchObject({ id: 123456, first_name: "Ada" });
  });
  it("rejects tampering and expired sessions", () => {
    const valid = signedInitData("test-bot-token", Math.floor(Date.now() / 1000));
    expect(() => validateTelegramInitData(valid.replace("Ada", "Eve"), "test-bot-token")).toThrow();
    const expired = signedInitData("test-bot-token", Math.floor(Date.now() / 1000) - 7200);
    expect(() => validateTelegramInitData(expired, "test-bot-token")).toThrow("Expired");
  });
});
