import { describe, expect, it } from "vitest";
import {
  adminPasswordNeedsRehash,
  generateTemporaryPassword,
  hashAdminPassword,
  validatePermanentPassword,
  verifyAdminPassword,
} from "./passwords";

describe("Administrator password policy", () => {
  it("creates unique high-entropy temporary passwords without ambiguous characters", () => {
    const generated = new Set(Array.from({ length: 100 }, generateTemporaryPassword));
    expect(generated.size).toBe(100);
    for (const password of generated) expect(password).toMatch(/^AG-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  });

  it("rejects shared defaults, weak sequences, identity words, and temporary patterns", () => {
    expect(validatePermanentPassword("1234")).not.toHaveLength(0);
    expect(validatePermanentPassword("1111111111")).not.toHaveLength(0);
    expect(validatePermanentPassword("AG-7KQ9-N4TX-P2AA")).not.toHaveLength(0);
    expect(validatePermanentPassword("my-galaxy-secure-pass", { tenantSlug: "my-galaxy" })).not.toHaveLength(0);
    expect(validatePermanentPassword("correct horse battery staple")).toEqual([]);
  });

  it("uses salted bcrypt hashes and verifies without exposing the password", async () => {
    const one = await hashAdminPassword("correct horse battery staple");
    const two = await hashAdminPassword("correct horse battery staple");
    expect(one).not.toBe(two);
    expect(one).not.toContain("correct horse battery staple");
    expect(await verifyAdminPassword("correct horse battery staple", one)).toBe(true);
    expect(await verifyAdminPassword("wrong", one)).toBe(false);
    expect(adminPasswordNeedsRehash(one)).toBe(false);
  }, 15_000);
});
