import { NextResponse, type NextRequest } from "next/server";
import {
  developmentAuthAllowed,
  developmentRouteVisible,
} from "./lib/development-auth";
import {
  APPLICATION_SESSION_COOKIE_NAME,
  DEVELOPMENT_PREVIEW_COOKIE_NAME,
} from "./lib/access-cookie-names";

export function middlewareExcluded(pathname: string) {
  return (
    pathname.startsWith("/api/dev/auth/") ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/webhooks/adsgalaxy/") ||
    pathname === "/dev/access" ||
    pathname === "/manifest.webmanifest" ||
    pathname.startsWith("/_next/") ||
    /\.(?:css|js|map|png|jpe?g|gif|webp|svg|ico|woff2?|ttf)$/i.test(pathname)
  );
}

export function middleware(request: NextRequest) {
  if (middlewareExcluded(request.nextUrl.pathname)) return NextResponse.next();
  const localDirect =
    developmentAuthAllowed(request.headers.get("host")) &&
    process.env.ALLOW_DEVELOPMENT_DIRECT_ACCESS === "true";
  const preview =
    localDirect && request.cookies.has(DEVELOPMENT_PREVIEW_COOKIE_NAME);
  const protectedApi = [
    "/api/wallet",
    "/api/admin/wallet",
    "/api/reward-claims",
    "/api/tasks",
    "/api/games",
  ].some((prefix) => request.nextUrl.pathname.startsWith(prefix));
  if (preview && protectedApi) {
    return NextResponse.json(
      {
        code: "DEVELOPMENT_PREVIEW_ONLY",
        message: "This action requires a database-backed development session.",
      },
      { status: 409 },
    );
  }
  const isGamePage =
    request.nextUrl.pathname === "/games" ||
    request.nextUrl.pathname.startsWith("/games/");
  if (isGamePage) {
    if (
      localDirect &&
      !request.cookies.has(APPLICATION_SESSION_COOKIE_NAME) &&
      !request.cookies.has(DEVELOPMENT_PREVIEW_COOKIE_NAME)
    ) {
      if (request.nextUrl.searchParams.get("_dev_auth") === "1") {
        const access = request.nextUrl.clone();
        access.pathname = "/dev/access";
        access.search = "";
        access.searchParams.set("next", request.nextUrl.pathname);
        access.searchParams.set("error", "session_cookie_not_accepted");
        return NextResponse.redirect(access);
      }
      const auto = request.nextUrl.clone();
      auto.pathname = "/api/dev/auth/auto";
      auto.search = "";
      auto.searchParams.set(
        "next",
        `${request.nextUrl.pathname}${request.nextUrl.search}`,
      );
      return NextResponse.redirect(auto);
    }
    return NextResponse.next();
  }
  const isDevelopmentRoute =
    request.nextUrl.pathname.startsWith("/dev/") ||
    request.nextUrl.pathname.startsWith("/api/dev/");
  if (!isDevelopmentRoute) return NextResponse.next();
  const isAccessPage = request.nextUrl.pathname === "/dev/access";
  if (
    !(isAccessPage
      ? developmentRouteVisible(request.headers.get("host"))
      : developmentAuthAllowed(request.headers.get("host")))
  ) {
    return new NextResponse(null, { status: 404 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)",
  ],
};
