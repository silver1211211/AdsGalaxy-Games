import { describe, expect, it } from "vitest";
import { middlewareExcluded } from "./middleware";

describe("development auth middleware exclusions", () => {
  it("excludes authentication, access, manifest, internals, and assets", () => {
    expect(middlewareExcluded("/api/dev/auth/auto")).toBe(true);
    expect(middlewareExcluded("/api/dev/auth/status")).toBe(true);
    expect(middlewareExcluded("/api/auth/session")).toBe(true);
    expect(middlewareExcluded("/dev/access")).toBe(true);
    expect(middlewareExcluded("/manifest.webmanifest")).toBe(true);
    expect(middlewareExcluded("/_next/static/chunk.js")).toBe(true);
    expect(middlewareExcluded("/icon.png")).toBe(true);
  });

  it("does not exclude protected game routes", () => {
    expect(middlewareExcluded("/games")).toBe(false);
    expect(middlewareExcluded("/games/tap-collector")).toBe(false);
  });
});
