import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { developmentAuthAllowed } from "@/lib/development-auth";
import { developmentDatabaseStatus } from "@/lib/development-diagnostics";
import { getSession, SESSION_COOKIE_NAME, sessionCookie } from "@/lib/session";
export async function GET(request: Request) {
  const hostAccepted = developmentAuthAllowed(request.headers.get("host"));
  if (!hostAccepted) return new NextResponse(null, { status: 404 });
  const sessionCookiePresent = Boolean(
      (await cookies()).get(SESSION_COOKIE_NAME)?.value,
    ),
    database = await developmentDatabaseStatus();
  let sessionValid = false,
    sessionUserId: null | string = null,
    sessionMiniAppId: null | string = null,
    membershipRole: null | string = null,
    miniAppName: null | string = null;
  if (database.migrationsAvailable) {
    try {
      const session = await getSession();
      if (session?.source === "DEVELOPMENT") {
        sessionValid = true;
        sessionUserId = session.userId;
        sessionMiniAppId = session.miniAppId;
        membershipRole = session.role;
        miniAppName = session.miniApp.name;
      }
    } catch (error) {
      console.error(
        "Development auth session diagnostic failed",
        error instanceof Error ? error.message : error,
      );
    }
  }
  const options = sessionCookie("");
  return NextResponse.json(
    {
      developmentAuthEnabled: true,
      nodeEnvironment: process.env.NODE_ENV,
      hostAccepted,
      ...database,
      sessionCookiePresent,
      sessionValid,
      sessionUserId,
      sessionMiniAppId,
      membershipRole,
      miniAppName,
      cookieName: SESSION_COOKIE_NAME,
      cookieSecure: options.secure,
      cookieSameSite: options.sameSite,
      cookiePath: options.path,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
