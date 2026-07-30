import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertProtectedJsonRequest,
  assertSameOrigin,
  normalizeHttpOrigin,
  trustedPublicOrigin,
} from "./security";

function request(headers: Record<string, string> = {}, url = "http://127.0.0.1:3010/api/super-admin/browser-login") {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: "{}",
  });
}

afterEach(() => vi.unstubAllEnvs());

describe("trusted public request origins", () => {
  it("uses matching NEXT_PUBLIC_APP_URL behind an internal Nginx URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://games.adsgalaxy.online/");
    const input = request({ origin: "https://games.adsgalaxy.online", host: "games.adsgalaxy.online", "x-forwarded-proto": "https" });
    expect(trustedPublicOrigin(input)).toBe("https://games.adsgalaxy.online");
    expect(() => assertProtectedJsonRequest(input)).not.toThrow();
  });

  it("uses x-forwarded-proto with Host when no configured URL exists", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    expect(trustedPublicOrigin(request({ host: "Games.AdsGalaxy.Online:443", "x-forwarded-proto": "https" })))
      .toBe("https://games.adsgalaxy.online");
  });

  it("prefers x-forwarded-host and uses only first forwarded values", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    const input = request({
      host: "internal.example",
      "x-forwarded-proto": "https, http",
      "x-forwarded-host": "Games.AdsGalaxy.Online:443, evil.example",
    });
    expect(trustedPublicOrigin(input)).toBe("https://games.adsgalaxy.online");
  });

  it("normalizes default ports and rejects malformed origins", () => {
    expect(normalizeHttpOrigin("https://Games.AdsGalaxy.Online:443/")).toBe("https://games.adsgalaxy.online");
    expect(normalizeHttpOrigin("http://example.com:80")).toBe("http://example.com");
    expect(normalizeHttpOrigin("not an origin")).toBeNull();
    expect(normalizeHttpOrigin("https://example.com/path")).toBeNull();
  });

  it.each([
    "https://evil.example",
    "https://games.adsgalaxy.online.evil.example",
    "not an origin",
  ])("rejects wrong or malformed browser Origin %s", (origin) => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://games.adsgalaxy.online");
    expect(() => assertProtectedJsonRequest(request({ origin }))).toThrowError(Response);
    try { assertProtectedJsonRequest(request({ origin })); } catch (error) {
      expect((error as Response).status).toBe(403);
    }
  });

  it("fails safely when configured public URL is malformed", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "not-a-url");
    const input = request({ origin: "https://games.adsgalaxy.online", "x-forwarded-host": "games.adsgalaxy.online", "x-forwarded-proto": "https" });
    expect(trustedPublicOrigin(input)).toBeNull();
    expect(() => assertProtectedJsonRequest(input)).toThrowError(Response);
  });

  it("does not let hostile forwarded headers override configured public URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://games.adsgalaxy.online");
    const input = request({ origin: "https://evil.example", "x-forwarded-host": "evil.example", "x-forwarded-proto": "https" });
    expect(trustedPublicOrigin(input)).toBe("https://games.adsgalaxy.online");
    expect(() => assertProtectedJsonRequest(input)).toThrowError(Response);
  });

  it("requires Origin for protected JSON browser login requests", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://games.adsgalaxy.online");
    expect(() => assertProtectedJsonRequest(request())).toThrowError(Response);
  });

  it("allows Referer fallback only when explicitly enabled", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://games.adsgalaxy.online");
    const input = request({ referer: "https://games.adsgalaxy.online/super-admin-login" });
    expect(() => assertSameOrigin(input, { requireOrigin: true })).toThrowError(Response);
    expect(() => assertSameOrigin(input, { requireOrigin: true, allowRefererFallback: true })).not.toThrow();
  });
});
