import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const login = readFileSync(join(process.cwd(), "src/components/super-admin/browser-login-form.tsx"), "utf8");
const shell = readFileSync(join(process.cwd(), "src/components/super-admin/super-admin-shell.tsx"), "utf8");

describe("Super Admin browser UI", () => {
  it("submits only a password and never renders or sends an identifier", () => {
    expect(login).toContain("Super Admin Login");
    expect(login).toContain("Enter the secure platform password to continue.");
    expect(login).toContain("JSON.stringify({ password })");
    expect(login).not.toContain("numeric ID");
    expect(login).not.toContain("identifier");
    expect(login).not.toContain("Telegram Mini App authentication is not required");
    expect(login.match(/<input/g)?.length).toBe(1);
  });
  it("separates HTTP parsing failures from actual network failures", () => {
    expect(login).toContain("Sign-in could not be completed. Try again.");
    expect(login).toContain("The secure login service could not be reached. Try again.");
    expect(login).toContain("parseBrowserLoginResponse");
  });
  it("keeps the Light and Dark theme switch visible in the top header", () => {
    expect(shell).toContain('<ThemeSwitch theme={theme} onChange={changeTheme} compact/>');
    expect(shell).not.toContain('ml-auto hidden sm:block');
    expect(shell).toContain('"Light"');
    expect(shell).toContain('"Dark"');
  });
});
