import { Prisma } from "@prisma/client";
import { z } from "zod";
import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin, rateLimit } from "@/features/profile/security";
import { submitMiniAppRequest } from "@/features/mini-app-requests/server";
import {
  hashDeviceIdentifier,
  hashRequestIp,
  hashStatusAccessToken,
  requestStatusCookieName,
  REQUEST_DEVICE_COOKIE,
  REQUEST_DEVICE_MAX_AGE,
} from "@/features/mini-app-requests/device";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await getSession();
    const jar = await cookies();
    const rawDevice = jar.get(REQUEST_DEVICE_COOKIE)?.value;
    if (!rawDevice)
      return Response.json({ error: "Secure device verification is required. Refresh and try again.", code: "DEVICE_REQUIRED" }, { status: 428 });
    const deviceIdentifierHash = hashDeviceIdentifier(rawDevice);
    const ipHash = hashRequestIp(request);
    rateLimit(`mini-app-request-device:${deviceIdentifierHash}`, 3, 60 * 60_000);
    rateLimit(`mini-app-request-ip:${ipHash}`, 12, 60 * 60_000);
    if (session && session.source !== "DEVELOPMENT")
      rateLimit(`mini-app-request-user:${session.userId}`, 3, 60 * 60_000);
    const result = await submitMiniAppRequest(
      session?.source === "DEVELOPMENT" ? null : (session?.userId ?? null),
      deviceIdentifierHash,
      await request.json(),
      ipHash,
    );
    const response = Response.json({
      publicReference: result.request.publicReference,
      proposedName: result.request.proposedName,
      requestedSlug: result.request.requestedSlug,
      status: result.request.status,
      submittedAt: result.request.submittedAt,
      statusAccessToken: result.statusAccessToken,
      protectedStatusPath: result.statusAccessToken
        ? `/request-mini-app/status/${result.request.publicReference}?access=${encodeURIComponent(result.statusAccessToken)}`
        : `/request-mini-app/status/${result.request.publicReference}`,
    }, { status: 201 });
    if (result.statusAccessToken)
      response.headers.append("Set-Cookie", `${requestStatusCookieName(result.request.publicReference)}=${result.statusAccessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${REQUEST_DEVICE_MAX_AGE}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
    return response;
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof z.ZodError)
      return Response.json({ error: error.issues[0]?.message ?? "Invalid request.", code: "INVALID_INPUT" }, { status: 422 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      return Response.json({ error: "That Mini App path is already reserved.", code: "CONFLICT" }, { status: 409 });
    const message = error instanceof Error ? error.message : "";
    const map: Record<string, string> = {
      INVALID_SLUG: "Choose a valid available Mini App path.",
      ACTIVE_REQUEST_EXISTS: "This device or Telegram account already has an active Mini App request.",
      SLUG_UNAVAILABLE: "That Mini App path is unavailable.",
      APPLICANT_UNAVAILABLE: "Your account cannot submit a request.",
    };
    return Response.json({ error: map[message] ?? "Could not submit request.", code: message || "INTERNAL_ERROR" }, { status: message === "ACTIVE_REQUEST_EXISTS" || message === "SLUG_UNAVAILABLE" ? 409 : 422 });
  }
}

export async function GET() {
  try {
    const session = await getSession();
    const jar = await cookies();
    const rawDevice = jar.get(REQUEST_DEVICE_COOKIE)?.value;
    const deviceIdentifierHash = rawDevice ? hashDeviceIdentifier(rawDevice) : undefined;
    if (!session && !deviceIdentifierHash) return Response.json({ items: [] });
    const candidates = await prisma.miniAppRequest.findMany({
      where: { OR: [...(session ? [{ applicantUserId: session.userId }] : []), ...(deviceIdentifierHash ? [{ deviceIdentifierHash }] : [])] },
      select: { publicReference: true, applicantUserId: true, deviceIdentifierHash: true, statusAccessTokenHash: true, proposedName: true, requestedSlug: true, status: true, publicStatusMessage: true, submittedAt: true, updatedAt: true, createdMiniApp: { select: { slug: true } } },
      orderBy: { createdAt: "desc" },
    });
    const items = candidates.filter((item) => {
      if (session && item.applicantUserId === session.userId) return true;
      const token = jar.get(requestStatusCookieName(item.publicReference))?.value;
      return Boolean(deviceIdentifierHash && item.deviceIdentifierHash === deviceIdentifierHash && token && hashStatusAccessToken(token) === item.statusAccessTokenHash);
    }).map(({ applicantUserId: _a, deviceIdentifierHash: _d, statusAccessTokenHash: _t, ...item }) => item);
    return Response.json({ items });
  } catch {
    return Response.json({ error: "Could not load requests." }, { status: 500 });
  }
}
