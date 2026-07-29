import { Prisma, type AdminCredentialScope } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  generateTemporaryPassword,
  hashAdminPassword,
  validatePermanentPassword,
  verifyAdminPassword,
} from "./passwords";

export async function createTemporaryAdminCredential(input: {
  userId: string;
  scopeType: AdminCredentialScope;
  resetByUserId?: string | null;
  manualTemporaryPassword?: string;
  miniAppId?: string | null;
  reason: string;
}) {
  const plaintext = input.manualTemporaryPassword ?? generateTemporaryPassword();
  if (input.manualTemporaryPassword) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: input.userId } });
    const errors = validatePermanentPassword(plaintext, { telegramUsername: user.username });
    if (errors.length) throw Response.json({ error: errors[0], code: "WEAK_TEMPORARY_PASSWORD" }, { status: 422 });
  }
  const passwordHash = await hashAdminPassword(plaintext);
  const now = new Date();
  const credential = await prisma.$transaction(async (tx) => {
    const existing = await tx.adminCredential.findUnique({
      where: { userId_scopeType: { userId: input.userId, scopeType: input.scopeType } },
    });
    const row = existing
      ? await tx.adminCredential.update({
          where: { id: existing.id },
          data: {
            passwordHash,
            temporaryPassword: true,
            mustChangePassword: true,
            passwordChangedAt: null,
            failedAttemptCount: 0,
            failedWindowStartedAt: null,
            lockedUntil: null,
            resetByUserId: input.resetByUserId ?? null,
            resetAt: now,
            credentialVersion: { increment: 1 },
          },
        })
      : await tx.adminCredential.create({ data: {
          userId: input.userId,
          scopeType: input.scopeType,
          passwordHash,
          temporaryPassword: true,
          mustChangePassword: true,
          resetByUserId: input.resetByUserId ?? null,
          resetAt: input.resetByUserId ? now : null,
        } });
    await tx.adminElevationSession.updateMany({
      where: { credentialId: row.id, revokedAt: null },
      data: { revokedAt: now },
    });
    await Promise.all([
      tx.adminAuditLog.create({ data: {
        miniAppId: input.miniAppId ?? null,
        actorUserId: input.resetByUserId ?? input.userId,
        action: existing ? "ADMIN_PASSWORD_RESET" : "ADMIN_CREDENTIAL_CREATED",
        targetType: "AdminCredential",
        targetId: row.id,
        metadata: { scopeType: input.scopeType, reason: input.reason, temporaryPasswordIssued: true },
      } }),
      tx.notification.create({ data: {
        userId: input.userId,
        type: "SYSTEM",
        title: existing ? "Administrator password reset" : "Temporary Administrator password issued",
        body: existing
          ? "Your Administrator password was reset. The new temporary password must be changed before full access."
          : "A temporary Administrator password is available through the protected onboarding flow.",
        data: { scopeType: input.scopeType },
      } }),
    ]);
    return row;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return { credential, plaintext };
}

export async function changeOwnAdminPassword(input: {
  userId: string;
  scopeType: AdminCredentialScope;
  miniAppId?: string | null;
  currentPassword: string;
  newPassword: string;
  tenantSlug?: string | null;
  miniAppName?: string | null;
  telegramUsername?: string | null;
}) {
  const credential = await prisma.adminCredential.findUniqueOrThrow({
    where: { userId_scopeType: { userId: input.userId, scopeType: input.scopeType } },
  });
  if (!await verifyAdminPassword(input.currentPassword, credential.passwordHash))
    throw Response.json({ error: "Current Administrator password is incorrect.", code: "INVALID_CURRENT_PASSWORD" }, { status: 401 });
  if (await verifyAdminPassword(input.newPassword, credential.passwordHash))
    throw Response.json({ error: "New password must be different from the current password.", code: "PASSWORD_REUSE" }, { status: 422 });
  const errors = validatePermanentPassword(input.newPassword, {
    tenantSlug: input.tenantSlug,
    miniAppName: input.miniAppName,
    telegramUsername: input.telegramUsername,
  });
  if (errors.length) throw Response.json({ error: errors[0], code: "PASSWORD_POLICY" }, { status: 422 });
  const passwordHash = await hashAdminPassword(input.newPassword);
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const updated = await tx.adminCredential.update({
      where: { id: credential.id },
      data: {
        passwordHash,
        passwordChangedAt: now,
        temporaryPassword: false,
        mustChangePassword: false,
        failedAttemptCount: 0,
        failedWindowStartedAt: null,
        lockedUntil: null,
        resetByUserId: null,
        credentialVersion: { increment: 1 },
      },
    });
    const revoked = await tx.adminElevationSession.updateMany({
      where: { credentialId: credential.id, revokedAt: null },
      data: { revokedAt: now },
    });
    await Promise.all([
      tx.adminAuditLog.create({ data: {
        miniAppId: input.miniAppId ?? null,
        actorUserId: input.userId,
        action: input.scopeType === "SUPER_ADMIN" ? "SUPER_ADMIN_PASSWORD_CHANGED" : "TENANT_ADMIN_PASSWORD_CHANGED",
        targetType: "AdminCredential",
        targetId: credential.id,
        metadata: { scopeType: input.scopeType, credentialVersion: updated.credentialVersion, elevatedSessionsRevoked: revoked.count },
      } }),
      tx.notification.create({ data: {
        userId: input.userId,
        type: "SYSTEM",
        title: input.scopeType === "SUPER_ADMIN" ? "Super Admin password changed" : "Administrator password changed",
        body: "Your Administrator password was changed and prior elevated sessions were revoked.",
        data: { scopeType: input.scopeType },
      } }),
    ]);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function clearAdminCredentialLockout(input: {
  targetUserId: string;
  actorUserId: string;
  scopeType: AdminCredentialScope;
  miniAppId?: string | null;
  reason: string;
}) {
  const credential = await prisma.adminCredential.findUniqueOrThrow({
    where: { userId_scopeType: { userId: input.targetUserId, scopeType: input.scopeType } },
  });
  await prisma.$transaction([
    prisma.adminCredential.update({ where: { id: credential.id }, data: {
      failedAttemptCount: 0, failedWindowStartedAt: null, lockedUntil: null,
    } }),
    prisma.adminAuditLog.create({ data: {
      miniAppId: input.miniAppId ?? null,
      actorUserId: input.actorUserId,
      action: "ADMIN_PASSWORD_LOCKOUT_CLEARED",
      targetType: "AdminCredential",
      targetId: credential.id,
      metadata: { scopeType: input.scopeType, reason: input.reason },
    } }),
    prisma.notification.create({ data: {
      userId: input.targetUserId,
      type: "SYSTEM",
      title: "Administrator lockout cleared",
      body: "A Super Admin cleared the temporary Administrator password lockout.",
      data: { scopeType: input.scopeType },
    } }),
  ]);
}
