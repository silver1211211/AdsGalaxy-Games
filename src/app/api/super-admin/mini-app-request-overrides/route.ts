import { z } from "zod";
import { requireSuperAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { assertProtectedJsonRequest } from "@/features/profile/security";
import { requireRecentAdminElevation } from "@/features/admin-security/elevation";

const schema = z.object({
  userId: z.string().cuid().optional(),
  requestId: z.string().cuid().optional(),
  reason: z.string().trim().min(10).max(500),
  expiresInDays: z.number().int().min(1).max(30).default(7),
}).refine((value) => value.userId || value.requestId, "Choose a user or request device");

export async function POST(request: Request) {
  try {
    assertProtectedJsonRequest(request);
    const auth = await requireSuperAdmin();
    await requireRecentAdminElevation({ userId: auth.userId, scopeType: "SUPER_ADMIN" });
    const input = schema.parse(await request.json());
    const source = input.requestId ? await prisma.miniAppRequest.findUnique({ where: { id: input.requestId }, select: { applicantUserId: true, deviceIdentifierHash: true } }) : null;
    if (input.requestId && !source) return Response.json({ error: "Request not found" }, { status: 404 });
    const item = await prisma.$transaction(async (tx) => {
      const override = await tx.miniAppRequestSubmissionOverride.create({ data: {
        userId: input.userId ?? source?.applicantUserId,
        deviceIdentifierHash: source?.deviceIdentifierHash,
        reason: input.reason,
        grantedByUserId: auth.userId,
        expiresAt: new Date(Date.now() + input.expiresInDays * 86_400_000),
      } });
      await tx.adminAuditLog.create({ data: { actorUserId: auth.userId, action: "MINI_APP_REQUEST_OVERRIDE_GRANTED", targetType: "MiniAppRequestSubmissionOverride", targetId: override.id, metadata: { reason: input.reason, expiresAt: override.expiresAt.toISOString(), userTargeted: Boolean(override.userId), deviceTargeted: Boolean(override.deviceIdentifierHash) } } });
      return override;
    });
    return Response.json({ id: item.id, expiresAt: item.expiresAt }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: error instanceof Error ? error.message : "Override could not be granted" }, { status: 422 });
  }
}
