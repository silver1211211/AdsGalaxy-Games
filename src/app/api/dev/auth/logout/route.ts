import { NextResponse } from "next/server";
import { developmentAuthAllowed } from "@/lib/development-auth";
import { sessionCookie } from "@/lib/session";
import { PREVIEW_COOKIE_NAME } from "@/lib/development-preview/context";
export async function POST(request: Request) {
  if (!developmentAuthAllowed(request.headers.get("host")))
    return new NextResponse(null, { status: 404 });
  const response = NextResponse.json({ redirect: "/dev/access" });
  response.cookies.set({ ...sessionCookie(""), maxAge: 0 });
  response.cookies.delete(PREVIEW_COOKIE_NAME);
  return response;
}
