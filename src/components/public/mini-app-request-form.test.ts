import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/components/public/mini-app-request-form.tsx"), "utf8");

describe("public Mini App request form surface", () => {
  it("contains the complete browser identity fields and device notice", () => {
    expect(source).toContain("Applicant name");
    expect(source).toContain("Telegram username (optional)");
    expect(source).toContain("Each device may submit only one active free Mini App request.");
  });
  it("does not render Telegram login, bot links, or a contact method field", () => {
    expect(source).not.toContain("Continue with Telegram");
    expect(source).not.toContain("startapp");
    expect(source).not.toContain("AdsGalaxyBot");
    expect(source).not.toContain("Contact method");
  });
  it("renders all three distinctly labelled live URL previews", () => {
    expect(source).toContain("Public Mini App URL:");
    expect(source).toContain("Administrator Login URL:");
    expect(source).toContain("Administrator Dashboard URL:");
    expect(source).not.toContain("<b>Administrator URL:</b>");
    expect(source).toContain("tenantUrls(");
    expect(source).toContain("Intended audience");
  });
  it("defaults both audience counts to zero and keeps all agreements mandatory", () => {
    expect(source).toContain("estimatedAudienceSize: 0");
    expect(source).toContain("expectedFirstWeekUsers: 0");
    expect(source.match(/<Agreement/g)?.length).toBe(5);
    expect(source).toContain('type="checkbox"');
    expect(source).toContain("required");
  });
});
