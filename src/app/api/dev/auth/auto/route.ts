import { NextResponse } from "next/server";
import { POST as createDevelopmentSession } from "@/app/api/dev/auth/session/route";
import {
  developmentAuthAllowed,
  developmentRole,
  validatedDevelopmentRedirect,
} from "@/lib/development-auth";
import { developmentDatabaseStatus } from "@/lib/development-diagnostics";
import { getSession, SESSION_COOKIE_NAME } from "@/lib/session";
import {
  createPreviewToken,
  directAccessRole,
  PREVIEW_COOKIE_NAME,
  previewCookie,
} from "@/lib/development-preview/context";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const host = request.headers.get("host");
  if (
    !developmentAuthAllowed(host) ||
    process.env.ALLOW_DEVELOPMENT_DIRECT_ACCESS !== "true"
  ) {
    return new NextResponse(null, { status: 404 });
  }
  const requestUrl = new URL(request.url);
  const loopbackBase = `${requestUrl.protocol}//${host}`;
  const requestedNext = requestUrl.searchParams.get("next") ?? "/games";
  const next = validatedDevelopmentRedirect(requestedNext);
  if (!next)
    return NextResponse.json(
      { error: "Invalid development redirect target.", code: "INVALID_NEXT" },
      { status: 400 },
    );
  const database = await developmentDatabaseStatus();
  if (database.databaseReachable && database.migrationsAvailable) {
    const existing = await getSession().catch(() => null);
    if (existing) return NextResponse.redirect(new URL(next, loopbackBase));
    const role =
      developmentRole(process.env.DEV_AUTH_DEFAULT_ROLE ?? "USER") ?? "USER";
    const bootstrapRequest = new Request(
      new URL("/api/dev/auth/session", request.url),
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          host: host ?? "",
          "user-agent": request.headers.get("user-agent") ?? "",
        },
        body: JSON.stringify({ role, next }),
      },
    );
    const result = await createDevelopmentSession(bootstrapRequest);
    if (result.ok) {
      const destination = new URL(next, loopbackBase);
      destination.searchParams.set("_dev_auth", "1");
      const response = NextResponse.redirect(destination);
      const applicationCookie = result.cookies.get(SESSION_COOKIE_NAME);
      if (!applicationCookie)
        return NextResponse.redirect(
          new URL(
            `/dev/access?next=${encodeURIComponent(next)}&error=session_cookie_missing`,
            loopbackBase,
          ),
        );
      response.cookies.set(applicationCookie);
      response.cookies.delete(PREVIEW_COOKIE_NAME);
      return response;
    }
    const failure = await result.json().catch(() => ({
      code: "SESSION_CREATION_FAILED",
    }));
    return NextResponse.redirect(
      new URL(
        `/dev/access?next=${encodeURIComponent(next)}&error=${encodeURIComponent(failure.code ?? "SESSION_CREATION_FAILED")}`,
        loopbackBase,
      ),
    );
  }
  if (process.env.DEV_PREVIEW_FALLBACK !== "true") {
    return NextResponse.redirect(
      new URL(`/dev/access?next=${encodeURIComponent(next)}`, loopbackBase),
    );
  }
  const destination = new URL(next, loopbackBase);
  destination.searchParams.set("_dev_auth", "1");
  const response = NextResponse.redirect(destination);
  response.cookies.set(previewCookie(createPreviewToken(directAccessRole())));
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
