import { describe, expect, it } from "vitest";
import { memoryDistributionValid, normalizeTenantSlug, safeSponsoredUrl, SUPER_ADMIN_NAV_PATHS, validTenantSlug, superAdminSectionActive } from "./policy";

describe("Super Admin policy", () => {
  it("normalizes safe tenant slugs and rejects reserved or traversal values", () => {
    expect(normalizeTenantSlug(" Example Tenant ")).toBe("example-tenant");
    expect(validTenantSlug("example-tenant")).toBe(true);
    expect(validTenantSlug("super-admin")).toBe(false);
    expect(validTenantSlug("../tenant")).toBe(false);
  });
  it("keeps nested navigation sections active", () => {
    expect(superAdminSectionActive("/super-admin/tenants/1", "/super-admin/tenants")).toBe(true);
    expect(superAdminSectionActive("/super-admin/users", "/super-admin")).toBe(false);
  });
  it("includes the Mini App request review workspace",()=>{expect(SUPER_ADMIN_NAV_PATHS).toHaveLength(10);expect(SUPER_ADMIN_NAV_PATHS).toContain("/super-admin/mini-app-requests")});
  it("rejects unsafe sponsored destinations",()=>{expect(safeSponsoredUrl("https://example.com/promo")).toBeTruthy();expect(safeSponsoredUrl("javascript:alert(1)")).toBeNull();expect(safeSponsoredUrl("data:text/html,x")).toBeNull()});
  it("requires Memory Match distributions to total 100",()=>{expect(memoryDistributionValid(50,20,30)).toBe(true);expect(memoryDistributionValid(50,20,31)).toBe(false)});
});
