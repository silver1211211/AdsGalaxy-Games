import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { developmentAuthAllowed } from "@/lib/development-auth";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ authenticated: false }, { status: 401 });
  const localDevelopment = session.source === "DEVELOPMENT";
  if (
    localDevelopment &&
    !developmentAuthAllowed(request.headers.get("host"))
  )
    return NextResponse.json({ authenticated: false }, { status: 401 });
  return NextResponse.json({
    authenticated: true,
    localDevelopment,
    user: {
      id: session.user.id,
      firstName: session.user.firstName,
      lastName: session.user.lastName,
      username: session.user.username,
      avatar: session.user.avatar,
    },
    miniApp: {
      id: session.miniApp.id,
      name: session.miniApp.name,
      slug: session.miniApp.slug,
    },
    role: session.role,
  });
}
