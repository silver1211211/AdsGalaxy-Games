const attempts = new Map<string, { count: number; resetAt: number }>();

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

export function normalizeHttpOrigin(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash)
      return null;
    return url.origin.toLowerCase();
  } catch {
    return null;
  }
}

export function trustedPublicOrigin(request: Request): string | null {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return normalizeHttpOrigin(configured);

  const protocol = firstHeaderValue(request.headers.get("x-forwarded-proto"))?.toLowerCase();
  const forwardedHost = firstHeaderValue(request.headers.get("x-forwarded-host"));
  const host = firstHeaderValue(request.headers.get("host"));
  if (protocol === "http" || protocol === "https") {
    for (const candidate of [forwardedHost, host]) {
      if (!candidate || /[\s/@?#]/.test(candidate)) continue;
      const origin = normalizeHttpOrigin(`${protocol}://${candidate}`);
      if (origin) return origin;
    }
  }
  try {
    return normalizeHttpOrigin(new URL(request.url).origin);
  } catch {
    return null;
  }
}

function requestOrigin(request: Request, allowRefererFallback: boolean) {
  const supplied = request.headers.get("origin");
  if (supplied) return normalizeHttpOrigin(supplied);
  if (!allowRefererFallback) return null;
  const referer = request.headers.get("referer");
  if (!referer) return null;
  try {
    return normalizeHttpOrigin(new URL(referer).origin);
  } catch {
    return null;
  }
}

export function assertSameOrigin(request: Request, options?: {
  requireOrigin?: boolean;
  allowRefererFallback?: boolean;
}) {
  const supplied = requestOrigin(request, options?.allowRefererFallback === true);
  if (!supplied) {
    if (options?.requireOrigin || request.headers.has("origin"))
      throw new Response("Request origin could not be verified.", { status: 403 });
    return;
  }
  const trusted = trustedPublicOrigin(request);
  if (!trusted || supplied !== trusted)
    throw new Response("Request origin could not be verified.", { status: 403 });
}

export function assertProtectedJsonRequest(request: Request, maximumBytes = 4096, options?: {
  allowRefererFallback?: boolean;
}) {
  assertSameOrigin(request, {
    requireOrigin: true,
    allowRefererFallback: options?.allowRefererFallback,
  });
  const contentType = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (contentType !== "application/json") throw new Response("Unsupported media type", { status: 415 });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > maximumBytes)
    throw new Response("Request body is too large", { status: 413 });
}

export function rateLimit(key: string, maximum = 12, windowMs = 60_000) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (current.count >= maximum) throw new Response("Too many requests", { status: 429 });
  current.count += 1;
}

export function apiError(error: unknown, fallback: string) {
  if (error instanceof Response) return error;
  return Response.json({ error: fallback }, { status: 422 });
}
