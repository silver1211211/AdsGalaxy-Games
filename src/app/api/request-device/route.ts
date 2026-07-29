import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import {
  REQUEST_DEVICE_COOKIE,
  REQUEST_DEVICE_MAX_AGE,
  validDeviceIdentifier,
} from "@/features/mini-app-requests/device";

const schema = z.object({ recoveryIdentifier: z.string().uuid().optional() }).strict();

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.source === "DEVELOPMENT")
    return NextResponse.json({ error: "Telegram authentication required" }, { status: 401 });
  const input = schema.parse(await request.json());
  const identifier = validDeviceIdentifier(input.recoveryIdentifier)
    ? input.recoveryIdentifier!
    : crypto.randomUUID();
  const response = NextResponse.json({ identifier });
  response.cookies.set({
    name: REQUEST_DEVICE_COOKIE,
    value: identifier,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: REQUEST_DEVICE_MAX_AGE,
  });
  return response;
}
