import { z } from "zod";
import { requireTenantAdmin } from "@/features/tenant-admin/auth";
import { prisma } from "@/lib/prisma";
import {
  apiError,
  assertSameOrigin,
  rateLimit,
} from "@/features/profile/security";
const schema = z.object({ reason: z.string().trim().min(5).max(300) }).strict();
export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string; userId: string }> },
) {
  try {
    assertSameOrigin(request);
    const { tenantSlug, userId } = await params,
      auth = await requireTenantAdmin(tenantSlug);
    rateLimit(`admin-ban:${auth.userId}`);
    const { reason } = schema.parse(await request.json());
    if (userId === auth.userId)
      return Response.json(
        { error: "You cannot ban yourself.", code: "FORBIDDEN" },
        { status: 409 },
      );
    const member = await prisma.miniAppMembership.findUnique({
      where: { miniAppId_userId: { miniAppId: auth.miniAppId, userId } },
    });
    if (!member || member.role !== "USER")
      return Response.json(
        { error: "User not found.", code: "USER_NOT_FOUND" },
        { status: 404 },
      );
    if (member.status === "SUSPENDED")
      return Response.json(
        { error: "User is already banned.", code: "USER_ALREADY_BANNED" },
        { status: 409 },
      );
    await prisma.$transaction([
      prisma.miniAppMembership.update({
        where: { id: member.id },
        data: {
          status: "SUSPENDED",
          bannedById: auth.userId,
          bannedAt: new Date(),
          banReason: reason,
          unbannedById: null,
          unbannedAt: null,
        },
      }),
      prisma.appSession.updateMany({
        where: { miniAppId: auth.miniAppId, userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      prisma.adminAuditLog.create({
        data: {
          miniAppId: auth.miniAppId,
          actorUserId: auth.userId,
          action: "USER_BANNED",
          targetType: "MiniAppMembership",
          targetId: member.id,
          metadata: { reason },
        },
      }),
    ]);
    return Response.json({ banned: true });
  } catch (e) {
    return apiError(e, "Could not ban user.");
  }
}
