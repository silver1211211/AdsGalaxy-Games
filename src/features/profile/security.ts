const attempts = new Map<string, { count: number; resetAt: number }>();

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const url = new URL(request.url);
  if (new URL(origin).host !== url.host) throw new Response("Forbidden", { status: 403 });
}

export function assertProtectedJsonRequest(request: Request, maximumBytes = 4096) {
  if (!request.headers.get("origin")) throw new Response("Forbidden", { status: 403 });
  assertSameOrigin(request);
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
