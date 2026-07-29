import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ authenticated: false }, { status: 401 });
  return NextResponse.json({
    authenticated: true,
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
