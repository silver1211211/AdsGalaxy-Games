const DEFAULT_APP_URL = "https://games.adsgalaxy.online";

export type TenantUrls = {
  public: string;
  administratorLogin: string;
  administratorDashboard: string;
};

export function normalizeAppBaseUrl(value?: string | null) {
  const candidate = value?.trim() || DEFAULT_APP_URL;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:")
      return DEFAULT_APP_URL;
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/+$/, "");
  } catch {
    return DEFAULT_APP_URL;
  }
}

export function tenantUrls(
  tenantSlug: string,
  baseUrl = process.env.NEXT_PUBLIC_APP_URL,
): TenantUrls {
  const base = normalizeAppBaseUrl(baseUrl);
  const slug = encodeURIComponent(tenantSlug);
  return {
    public: `${base}/${slug}`,
    administratorLogin: `${base}/${slug}/admin/login`,
    administratorDashboard: `${base}/${slug}/admin`,
  };
}
