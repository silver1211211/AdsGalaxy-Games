export const SUPER_ADMIN_THEMES = ["LIGHT", "DARK"] as const;
export const SUPER_ADMIN_NAV_PATHS = ["/super-admin","/super-admin/tenants","/super-admin/mini-app-requests","/super-admin/administrators","/super-admin/users","/super-admin/games","/super-admin/sponsored-content","/super-admin/finance","/super-admin/integrations","/super-admin/settings"] as const;
export type SuperAdminTheme = (typeof SUPER_ADMIN_THEMES)[number];

const RESERVED_SLUGS = new Set([
  "api", "admin", "super-admin", "dev", "games", "wallet", "tasks",
  "profile", "request-mini-app", "terms", "privacy", "support", "manifest.webmanifest", "_next",
]);

export function normalizeTenantSlug(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export function validTenantSlug(value: string) {
  const slug = normalizeTenantSlug(value);
  return slug === value && slug.length >= 2 && slug.length <= 64 &&
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug) && !RESERVED_SLUGS.has(slug);
}

export function isSuperAdminTheme(value: unknown): value is SuperAdminTheme {
  return typeof value === "string" && (SUPER_ADMIN_THEMES as readonly string[]).includes(value);
}

export function maskedTelegramId(value: bigint) {
  const text = value.toString();
  return text.length <= 6 ? "••••••" : `${text.slice(0, 3)}•••${text.slice(-3)}`;
}

export function superAdminSectionActive(pathname: string, href: string) {
  return href === "/super-admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}
export function safeSponsoredUrl(value:string){try{const u=new URL(value);return u.protocol==="https:"?u.toString():null}catch{return null}}
export function memoryDistributionValid(a:number,b:number,c:number){return [a,b,c].every(Number.isInteger)&&a>=0&&b>=0&&c>=0&&a+b+c===100}
