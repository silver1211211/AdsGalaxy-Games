import { createHmac } from "crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { requireRecentAdminSession } from "./recent-auth";
import { testOxaPayConnection } from "./verification";
import {
  assertWalletEncryptionConfigured,
  decryptSecret,
  encryptSecret,
} from "../wallet/encryption";
import {
  automaticConversionPolicy,
  mapProviderStatus,
  safeSignupUrl,
} from "./policy";
import { oxaPayCallbackSignature, verifyOxaPayCallback } from "./security";

describe("OxaPay withdrawal policy", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("allows automatic 1:1 conversion only for approved USD stablecoins", () => {
    expect(automaticConversionPolicy("USDT").eligible).toBe(true);
    expect(automaticConversionPolicy("USDC").eligible).toBe(true);
    expect(automaticConversionPolicy("BTC").eligible).toBe(false);
    expect(automaticConversionPolicy("ETH").rate).toBeNull();
  });

  it("maps provider states without treating pending states as complete", () => {
    expect(mapProviderStatus("processing")).toBe("PROCESSING");
    expect(mapProviderStatus("pending")).toBe("PENDING");
    expect(mapProviderStatus("confirming")).toBe("CONFIRMING");
    expect(mapProviderStatus("confirmed")).toBe("CONFIRMED");
    expect(mapProviderStatus("surprise")).toBe("UNKNOWN");
  });

  it("verifies callback HMAC from the exact raw bytes", () => {
    const raw = Buffer.from('{"track_id":"1","status":"confirmed"}');
    const key = "tenant-payout-key";
    const signature = createHmac("sha512", key).update(raw).digest("hex");
    expect(oxaPayCallbackSignature(raw, key)).toBe(signature);
    expect(verifyOxaPayCallback(raw, signature, key)).toBe(true);
    expect(
      verifyOxaPayCallback(
        Buffer.from('{"status":"confirmed","track_id":"1"}'),
        signature,
        key,
      ),
    ).toBe(false);
    expect(verifyOxaPayCallback(raw, null, key)).toBe(false);
  });

  it("accepts only HTTPS OxaPay signup URLs", () => {
    expect(safeSignupUrl("https://oxapay.com/register")).toBeTruthy();
    expect(safeSignupUrl("https://docs.oxapay.com/help")).toBeTruthy();
    expect(safeSignupUrl("javascript:alert(1)")).toBeNull();
    expect(safeSignupUrl("https://example.com/affiliate")).toBeNull();
  });

  it("verifies a Payout API key with a read-only history request", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.method).toBe("GET");
      expect(init?.headers).toMatchObject({
        payout_api_key: "synthetic-payout-key",
        Accept: "application/json",
      });
      expect(init?.body).toBeUndefined();
      return Response.json({ data: [], status: 200 });
    });
    await expect(
      testOxaPayConnection(
        "synthetic-payout-key",
        fetcher as typeof fetch,
      ),
    ).resolves.toBe(true);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(String(fetcher.mock.calls[0][0])).toContain("/v1/payout?");
    expect(String(fetcher.mock.calls[0][0])).not.toContain(
      "synthetic-payout-key",
    );
  });

  it("classifies provider timeout, unavailability, and invalid JSON safely", async () => {
    const timeout = vi.fn(async () => {
      throw new DOMException("timed out", "TimeoutError");
    });
    await expect(
      testOxaPayConnection("synthetic-key", timeout as typeof fetch),
    ).rejects.toThrow("OXAPAY_TIMEOUT");
    await expect(
      testOxaPayConnection(
        "synthetic-key",
        vi.fn(async () => new Response("down", { status: 503 })) as typeof fetch,
      ),
    ).rejects.toThrow("OXAPAY_UNAVAILABLE");
    await expect(
      testOxaPayConnection(
        "synthetic-key",
        vi.fn(async () => new Response("not-json", { status: 200 })) as typeof fetch,
      ),
    ).rejects.toThrow("OXAPAY_UNEXPECTED_RESPONSE");
  });

  it("distinguishes invalid credentials and the wrong API key type", async () => {
    await expect(
      testOxaPayConnection(
        "synthetic-key",
        vi.fn(async () => new Response(null, { status: 401 })) as typeof fetch,
      ),
    ).rejects.toThrow("OXAPAY_INVALID_API_KEY");
    await expect(
      testOxaPayConnection(
        "synthetic-key",
        vi.fn(async () =>
          Response.json(
            { error: { type: "merchant_api_key", message: "wrong key type" } },
            { status: 400 },
          ),
        ) as typeof fetch,
      ),
    ).rejects.toThrow("OXAPAY_WRONG_API_KEY_TYPE");
  });

  it("encrypts credentials with authenticated encryption and stores no plaintext", () => {
    vi.stubEnv(
      "WALLET_ENCRYPTION_KEY",
      "synthetic-test-encryption-key-that-is-at-least-32-characters",
    );
    const plaintext = "synthetic-payout-api-key";
    const encrypted = encryptSecret(plaintext);
    expect(encrypted).not.toContain(plaintext);
    expect(decryptSecret(encrypted)).toBe(plaintext);
  });

  it("fails safely before storage when Wallet encryption is missing", () => {
    vi.stubEnv("WALLET_ENCRYPTION_KEY", "");
    expect(() => assertWalletEncryptionConfigured()).toThrow(
      "WALLET_ENCRYPTION_NOT_CONFIGURED",
    );
  });

  it("trusts signed local sessions only in development and keeps production recent-auth", () => {
    const oldSession = {
      createdAt: new Date(Date.now() - 31 * 60 * 1000),
      source: "LOCAL_DEVELOPMENT",
    };
    vi.stubEnv("NODE_ENV", "development");
    expect(() =>
      requireRecentAdminSession({
        appSession: oldSession,
        source: "DEVELOPMENT",
      }),
    ).not.toThrow();
    vi.stubEnv("NODE_ENV", "production");
    expect(() =>
      requireRecentAdminSession({
        appSession: oldSession,
        source: "DEVELOPMENT",
      }),
    ).toThrow();
  });
});
