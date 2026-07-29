export function requireRecentAdminSession(input: {
  appSession: { createdAt: Date; source: string };
  source?: string;
}) {
  if (
    process.env.NODE_ENV === "development" &&
    input.source === "DEVELOPMENT" &&
    input.appSession.source === "LOCAL_DEVELOPMENT"
  )
    return;
  if (Date.now() - input.appSession.createdAt.getTime() > 30 * 60 * 1000)
    throw new Response(
      JSON.stringify({
        ok: false,
        error: {
          message: "Please verify your Admin session before connecting OxaPay.",
          code: "RECENT_AUTH_REQUIRED",
        },
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
}
