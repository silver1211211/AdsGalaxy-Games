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

export function isGenericAdminPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

async function hasValidSignedSession(request: NextRequest) {
  const token = request.cookies.get(APPLICATION_SESSION_COOKIE_NAME)?.value;
  const secret = process.env.APP_SESSION_SECRET;
  if (!token || !secret || secret.length < 32) return false;
  const [body, signature] = token.split(".");
  if (!body || !signature) return false;
  try {
    const decodeBase64Url = (value: string) => {
      const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
      return atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
    };
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const signatureBytes = Uint8Array.from(
      decodeBase64Url(signature),
      (character) => character.charCodeAt(0),
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      new TextEncoder().encode(body),
    );
    if (!valid) return false;
    const json = decodeBase64Url(body);
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === "number" && payload.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
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
    if (!(await hasValidSignedSession(request)) && !preview) {
      const home = request.nextUrl.clone();
      home.pathname = "/";
      home.search = "";
      return NextResponse.redirect(home);
    }
    return NextResponse.next();
  }
  if (isGenericAdminPath(request.nextUrl.pathname)) {
    const home = request.nextUrl.clone();
    home.pathname = "/";
    home.search = "";
    return NextResponse.redirect(home);
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
