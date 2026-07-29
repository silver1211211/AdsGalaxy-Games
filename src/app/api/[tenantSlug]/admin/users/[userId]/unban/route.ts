import { z } from "zod";
import { requireTenantAdmin } from "@/features/tenant-admin/auth";
import { prisma } from "@/lib/prisma";
import {
  apiError,
  assertSameOrigin,
  rateLimit,
} from "@/features/profile/security";
const schema = z.object({}).strict();
export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string; userId: string }> },
) {
  try {
    assertSameOrigin(request);
    schema.parse(await request.json());
    const { tenantSlug, userId } = await params,
      auth = await requireTenantAdmin(tenantSlug);
    rateLimit(`admin-unban:${auth.userId}`);
    const member = await prisma.miniAppMembership.findUnique({
      where: { miniAppId_userId: { miniAppId: auth.miniAppId, userId } },
    });
    if (!member || member.role !== "USER")
      return Response.json(
        { error: "User not found.", code: "USER_NOT_FOUND" },
        { status: 404 },
      );
    if (member.status !== "SUSPENDED")
      return Response.json(
        { error: "User is not banned.", code: "USER_NOT_BANNED" },
        { status: 409 },
      );
    await prisma.$transaction([
      prisma.miniAppMembership.update({
        where: { id: member.id },
        data: {
          status: "ACTIVE",
          unbannedById: auth.userId,
          unbannedAt: new Date(),
        },
      }),
      prisma.adminAuditLog.create({
        data: {
          miniAppId: auth.miniAppId,
          actorUserId: auth.userId,
          action: "USER_UNBANNED",
          targetType: "MiniAppMembership",
          targetId: member.id,
        },
      }),
    ]);
    return Response.json({ unbanned: true });
  } catch (e) {
    return apiError(e, "Could not unban user.");
  }
}
