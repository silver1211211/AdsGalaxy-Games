import { generateTemporaryPassword, hashAdminPassword } from "@/features/admin-security/passwords";
import { assertProtectedJsonRequest, rateLimit } from "@/features/profile/security";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export async function POST(request: Request, { params }: { params: Promise<{ publicReference: string }> }) {
  try {
    assertProtectedJsonRequest(request);
    const auth = await requireSession();
    const { publicReference } = await params;
    rateLimit(`request-admin-password:${auth.userId}`, 3, 60 * 60_000);
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashAdminPassword(temporaryPassword);
    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.miniAppRequest.findFirst({
        where: { publicReference, applicantUserId: auth.userId },
      });
      if (!item || item.status !== "APPROVED" || !item.createdMiniAppId)
        throw new Error("ADMIN_PASSWORD_NOT_AVAILABLE");
      const membership = await tx.miniAppMembership.findUnique({
        where: { miniAppId_userId: { miniAppId: item.createdMiniAppId, userId: auth.userId } },
      });
      if (!membership || membership.role !== "ADMIN" || membership.status !== "ACTIVE")
        throw new Error("ADMIN_PASSWORD_NOT_AVAILABLE");
      if (item.adminCredentialRevealedAt) throw new Error("TEMPORARY_PASSWORD_ALREADY_VIEWED");
      const existing = await tx.adminCredential.findUnique({
        where: { userId_scopeType: { userId: auth.userId, scopeType: "TENANT_ADMIN" } },
      });
      if (existing) {
        await tx.miniAppRequest.update({ where: { id: item.id }, data: {
          adminCredentialIssuedAt: item.adminCredentialIssuedAt ?? existing.createdAt,
          adminCredentialRevealedAt: new Date(),
        } });
        return { existing: true, credentialId: existing.id };
      }
      const credential = await tx.adminCredential.create({ data: {
        userId: auth.userId,
        scopeType: "TENANT_ADMIN",
        passwordHash,
        temporaryPassword: true,
        mustChangePassword: true,
      } });
      const now = new Date();
      await Promise.all([
        tx.miniAppRequest.update({ where: { id: item.id }, data: {
          adminCredentialIssuedAt: now,
          adminCredentialRevealedAt: now,
        } }),
        tx.adminAuditLog.create({ data: {
          miniAppId: item.createdMiniAppId,
          actorUserId: auth.userId,
          action: "TEMPORARY_ADMIN_PASSWORD_REVEALED",
          targetType: "AdminCredential",
          targetId: credential.id,
          metadata: { requestId: item.id, issuedAndRevealedOnce: true },
        } }),
        tx.notification.create({ data: {
          userId: auth.userId,
          type: "SYSTEM",
          title: "Temporary Administrator password issued",
          body: "Your temporary Administrator password was shown once. Change it before managing your Mini App.",
          data: { publicReference },
        } }),
      ]);
      return { existing: false, credentialId: credential.id };
    }, { isolationLevel: "Serializable" });
    if (result.existing) return Response.json({
      ok: true,
      existingCredential: true,
      message: "Your existing Administrator password applies to this tenant. No new password was issued.",
    });
    return Response.json({ ok: true, temporaryPassword });
  } catch (error) {
    if (error instanceof Response) return error;
    const code = error instanceof Error ? error.message : "ADMIN_PASSWORD_NOT_AVAILABLE";
    return Response.json({
      error: code === "TEMPORARY_PASSWORD_ALREADY_VIEWED"
        ? "Temporary password already viewed. Ask a Super Admin for a reset if it was lost."
        : "Temporary Administrator password is not available.",
      code,
    }, { status: code === "TEMPORARY_PASSWORD_ALREADY_VIEWED" ? 409 : 403 });
  }
}
