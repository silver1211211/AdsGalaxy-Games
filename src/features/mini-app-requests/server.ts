import { Prisma, type MiniAppRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { provisionTenant } from "@/features/super-admin/tenant-provisioning";
import { normalizeRequestSlug, publicReference, requestSchema, validRequestSlug } from "./policy";
import { createStatusAccessToken, hashStatusAccessToken, requestBlocksAnother } from "./device";
import { generateTemporaryPassword, hashAdminPassword } from "@/features/admin-security/passwords";

export async function slugAvailability(raw: string, currentRequestId?: string) {
  const slug = normalizeRequestSlug(raw);
  if (slug !== raw || slug.length < 5 || slug.length > 40 || !/[a-z]/.test(slug) || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug))
    return { slug, status: "INVALID_FORMAT" as const, available: false };
  if (!validRequestSlug(slug)) return { slug, status: "RESERVED" as const, available: false };
  const [tenant, reservation] = await Promise.all([
    prisma.miniApp.findUnique({ where: { slug }, select: { id: true } }),
    prisma.miniAppSlugReservation.findUnique({ where: { slug }, select: { requestId: true, status: true, releaseAt: true } }),
  ]);
  if (tenant) return { slug, status: "ALREADY_IN_USE" as const, available: false };
  if (reservation && reservation.requestId !== currentRequestId) {
    if (reservation.status === "RELEASED" || (reservation.status === "RELEASE_SCHEDULED" && reservation.releaseAt && reservation.releaseAt <= new Date()))
      return { slug, status: "AVAILABLE" as const, available: true };
    return { slug, status: "PENDING_REQUEST" as const, available: false };
  }
  return { slug, status: "AVAILABLE" as const, available: true };
}

export async function submitMiniAppRequest(userId: string | null, deviceIdentifierHash: string, raw: unknown, abuseIpHash?: string) {
  const input = requestSchema.parse(raw), slug = normalizeRequestSlug(input.requestedSlug);
  const statusAccessToken = createStatusAccessToken();
  if (slug !== input.requestedSlug || !validRequestSlug(slug)) throw new Error("INVALID_SLUG");
  return prisma.$transaction(async (tx) => {
    const existingByKey = await tx.miniAppRequest.findUnique({ where: { idempotencyKey: input.idempotencyKey }, include: { reservation: true } });
    if (existingByKey) {
      if (existingByKey.applicantUserId !== userId || existingByKey.deviceIdentifierHash !== deviceIdentifierHash) throw new Error("IDEMPOTENCY_CONFLICT");
      return { request: existingByKey, statusAccessToken: null };
    }
    const user = userId ? await tx.user.findUnique({ where: { id: userId } }) : null;
    if (userId && (!user || user.status !== "ACTIVE")) throw new Error("APPLICANT_UNAVAILABLE");
    const ownership = [...(userId ? [{ applicantUserId: userId }] : []), { deviceIdentifierHash }];
    const conflicts = await tx.miniAppRequest.findMany({ where: { OR: ownership }, select: { status: true, createdMiniApp: { select: { status: true } } } });
    if (conflicts.some((item) => requestBlocksAnother(item.status, item.createdMiniApp?.status))) {
      const override = await tx.miniAppRequestSubmissionOverride.findFirst({ where: { consumedAt: null, expiresAt: { gt: new Date() }, OR: [...(userId ? [{ userId }] : []), { deviceIdentifierHash }] }, orderBy: { createdAt: "desc" } });
      if (!override) throw new Error("ACTIVE_REQUEST_EXISTS");
      await tx.miniAppRequestSubmissionOverride.update({ where: { id: override.id }, data: { consumedAt: new Date() } });
      await tx.adminAuditLog.create({ data: { actorUserId: userId ?? undefined, action: "MINI_APP_REQUEST_OVERRIDE_CONSUMED", targetType: "MiniAppRequestSubmissionOverride", targetId: override.id, metadata: { userMatched: override.userId === userId, deviceMatched: override.deviceIdentifierHash === deviceIdentifierHash } } });
    }
    if (await tx.miniApp.count({ where: { slug } })) throw new Error("SLUG_UNAVAILABLE");
    const request = await tx.miniAppRequest.create({ data: {
      publicReference: publicReference(), applicantUserId: userId,
      applicantName: user ? `${user.firstName} ${user.lastName ?? ""}`.trim() : input.applicantName,
      telegramUsername: user?.username ?? (input.telegramUsername || null),
      requestOrigin: user ? "TELEGRAM" : "WEB", statusAccessTokenHash: hashStatusAccessToken(statusAccessToken),
      proposedName: input.proposedName, requestedSlug: slug,
      description: input.description, intendedAudience: input.intendedAudience, category: input.category,
      primaryPromotionChannel: input.primaryPromotionChannel, primaryPromotionUrl: input.primaryPromotionUrl,
      estimatedAudienceSize: input.estimatedAudienceSize, expectedFirstWeekUsers: input.expectedFirstWeekUsers,
      promotionPlan: input.promotionPlan, additionalLinks: input.additionalLinks, idempotencyKey: input.idempotencyKey, deviceIdentifierHash,
      publicStatusMessage: "Your request has been received and is waiting for review.", expiresAt: new Date(Date.now() + 90 * 86_400_000),
      reservation: { create: { slug } },
      events: { create: { nextStatus: "SUBMITTED", actorUserId: userId, publicMessage: "Request submitted" } },
    }, include: { reservation: true } });
    await Promise.all([
      tx.adminAuditLog.create({ data: { actorUserId: userId ?? undefined, action: "MINI_APP_REQUEST_SUBMITTED", targetType: "MiniAppRequest", targetId: request.id, after: { publicReference: request.publicReference, slug }, metadata: abuseIpHash ? { abuseIpHash } : undefined } }),
      ...(userId ? [tx.notification.create({ data: { userId, title: "Mini App request submitted", body: `${request.publicReference} is waiting for platform review.`, data: { publicReference: request.publicReference } } })] : []),
    ]);
    const reviewers = await tx.miniAppMembership.findMany({ where: { role: "SUPER_ADMIN", status: "ACTIVE" }, select: { userId: true }, distinct: ["userId"] });
    if (reviewers.length) await tx.notification.createMany({ data: reviewers.map((reviewer) => ({ userId: reviewer.userId, title: "New Mini App request", body: `${request.publicReference}: ${request.proposedName}`, data: { requestId: request.id } })) });
    return { request, statusAccessToken };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function applicantRequest(input: { userId?: string | null; reference: string; deviceIdentifierHash?: string; statusAccessTokenHash?: string }) {
  const request = await prisma.miniAppRequest.findFirst({ where: {
    publicReference: input.reference,
    OR: [
      ...(input.userId ? [{ applicantUserId: input.userId }] : []),
      ...(input.deviceIdentifierHash && input.statusAccessTokenHash ? [{ deviceIdentifierHash: input.deviceIdentifierHash, statusAccessTokenHash: input.statusAccessTokenHash }] : []),
    ],
  },
    include: { createdMiniApp: true, messages: { where: { visibility: "PUBLIC" }, orderBy: { createdAt: "asc" } }, events: { orderBy: { createdAt: "asc" } } } });
  if (!request) return null;
  const [credential, membership] = request.createdMiniAppId && input.userId ? await Promise.all([
    prisma.adminCredential.findUnique({ where: { userId_scopeType: { userId: input.userId, scopeType: "TENANT_ADMIN" } }, select: {
      temporaryPassword: true, mustChangePassword: true, passwordChangedAt: true,
    } }),
    prisma.miniAppMembership.findUnique({ where: { miniAppId_userId: { miniAppId: request.createdMiniAppId, userId: input.userId } }, select: { role: true, status: true } }),
  ]) : [null, null];
  const { deviceIdentifierHash: _deviceIdentifierHash, statusAccessTokenHash: _statusAccessTokenHash, ...safeRequest } = request;
  return {
    ...safeRequest,
    adminAccess: {
      eligible: request.status === "APPROVED" && membership?.role === "ADMIN" && membership.status === "ACTIVE",
      credentialConfigured: Boolean(credential),
      temporaryPasswordActive: Boolean(credential?.temporaryPassword),
      mustChangePassword: Boolean(credential?.mustChangePassword),
      passwordChangedAt: credential?.passwordChangedAt ?? null,
      temporaryPasswordViewed: Boolean(request.adminCredentialRevealedAt),
    },
  };
}

export async function transitionRequest(input: {
  requestId: string; actorUserId: string; action: "START_REVIEW" | "REQUEST_INFORMATION" | "REJECT" | "CANCEL";
  publicMessage?: string; privateNote?: string; responseDeadline?: Date;
}) {
  const allowed: Record<typeof input.action, MiniAppRequestStatus[]> = {
    START_REVIEW: ["SUBMITTED"], REQUEST_INFORMATION: ["SUBMITTED", "UNDER_REVIEW"],
    REJECT: ["SUBMITTED", "UNDER_REVIEW", "INFORMATION_REQUIRED"], CANCEL: ["SUBMITTED", "UNDER_REVIEW", "INFORMATION_REQUIRED"],
  };
  const next: Record<typeof input.action, MiniAppRequestStatus> = {
    START_REVIEW: "UNDER_REVIEW", REQUEST_INFORMATION: "INFORMATION_REQUIRED", REJECT: "REJECTED", CANCEL: "CANCELED",
  };
  return prisma.$transaction(async (tx) => {
    const current = await tx.miniAppRequest.findUniqueOrThrow({ where: { id: input.requestId } });
    if (!allowed[input.action].includes(current.status)) throw new Error("INVALID_STATE");
    if (["REQUEST_INFORMATION", "REJECT"].includes(input.action) && (!input.publicMessage || input.publicMessage.trim().length < 10)) throw new Error("PUBLIC_MESSAGE_REQUIRED");
    const status = next[input.action], now = new Date();
    const request = await tx.miniAppRequest.update({ where: { id: current.id }, data: {
      status, assignedReviewerId: current.assignedReviewerId ?? input.actorUserId,
      publicStatusMessage: input.publicMessage ?? (status === "UNDER_REVIEW" ? "Your request is currently being reviewed." : current.publicStatusMessage),
      privateReviewNote: input.privateNote ?? current.privateReviewNote,
      reviewStartedAt: status === "UNDER_REVIEW" ? now : current.reviewStartedAt,
      rejectedAt: status === "REJECTED" ? now : current.rejectedAt, canceledAt: status === "CANCELED" ? now : current.canceledAt,
      messages: input.publicMessage || input.privateNote ? { create: [
        ...(input.publicMessage ? [{ senderType: "SUPER_ADMIN" as const, senderUserId: input.actorUserId, message: input.publicMessage, visibility: "PUBLIC" as const }] : []),
        ...(input.privateNote ? [{ senderType: "SUPER_ADMIN" as const, senderUserId: input.actorUserId, message: input.privateNote, visibility: "PRIVATE" as const }] : []),
      ] } : undefined,
      events: { create: { previousStatus: current.status, nextStatus: status, actorUserId: input.actorUserId, publicMessage: input.publicMessage,
        metadata: input.responseDeadline ? { responseDeadline: input.responseDeadline.toISOString() } : undefined } },
    } });
    if (status === "REJECTED" || status === "CANCELED") await tx.miniAppSlugReservation.update({ where: { requestId: current.id },
      data: { status: "RELEASE_SCHEDULED", releaseAt: new Date(now.getTime() + 7 * 86_400_000) } });
    if (current.applicantUserId) await tx.notification.create({ data: { userId: current.applicantUserId, title: status === "INFORMATION_REQUIRED" ? "More information needed" : status === "REJECTED" ? "Mini App request decision" : "Mini App request updated",
      body: input.publicMessage ?? `Your request is now ${status.toLowerCase().replaceAll("_", " ")}.`, data: { publicReference: current.publicReference } } });
    await Promise.all([
      tx.adminAuditLog.create({ data: { actorUserId: input.actorUserId, action: `MINI_APP_REQUEST_${input.action}`, targetType: "MiniAppRequest", targetId: current.id,
        before: { status: current.status }, after: { status }, metadata: { privateNotePresent: Boolean(input.privateNote) } } }),
    ]);
    return request;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function respondToInformation(userId: string, reference: string, message: string) {
  if (message.trim().length < 20 || message.length > 2000) throw new Error("INVALID_RESPONSE");
  return prisma.$transaction(async (tx) => {
    const current = await tx.miniAppRequest.findFirst({ where: { publicReference: reference, applicantUserId: userId } });
    if (!current || current.status !== "INFORMATION_REQUIRED") throw new Error("INVALID_STATE");
    const request = await tx.miniAppRequest.update({ where: { id: current.id }, data: { status: "UNDER_REVIEW",
      publicStatusMessage: "Your response was received and review has resumed.",
      messages: { create: { senderType: "APPLICANT", senderUserId: userId, message: message.trim(), visibility: "PUBLIC" } },
      events: { create: { previousStatus: current.status, nextStatus: "UNDER_REVIEW", actorUserId: userId, publicMessage: "Applicant responded" } } } });
    await tx.adminAuditLog.create({ data: { actorUserId: userId, action: "MINI_APP_REQUEST_APPLICANT_RESPONDED", targetType: "MiniAppRequest", targetId: current.id } });
    const reviewers = await tx.miniAppMembership.findMany({ where: { role: "SUPER_ADMIN", status: "ACTIVE" }, select: { userId: true }, distinct: ["userId"] });
    if (reviewers.length) await tx.notification.createMany({ data: reviewers.map((reviewer) => ({ userId: reviewer.userId, title: "Applicant responded", body: `${current.publicReference} has new information.`, data: { requestId: current.id } })) });
    return request;
  });
}

export async function approveRequest(requestId: string, actorUserId: string, administratorTelegramId: string) {
  if (!/^\d{5,20}$/.test(administratorTelegramId)) throw new Error("ADMINISTRATOR_ID_REQUIRED");
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashAdminPassword(temporaryPassword);
  return prisma.$transaction(async (tx) => {
    const current = await tx.miniAppRequest.findUnique({ where: { id: requestId }, include: { applicant: true, reservation: true, createdMiniApp: true } });
    if (!current) throw new Error("REQUEST_NOT_FOUND");
    if (current.createdMiniApp) return { request: current, tenant: current.createdMiniApp };
    if (!["SUBMITTED", "UNDER_REVIEW", "INFORMATION_REQUIRED"].includes(current.status)) throw new Error("INVALID_STATE");
    if (!current.reservation || current.reservation.status !== "RESERVED" || current.reservation.slug !== current.requestedSlug) throw new Error("RESERVATION_INVALID");
    if (await tx.miniApp.count({ where: { slug: current.requestedSlug } })) throw new Error("SLUG_UNAVAILABLE");
    const telegramId = BigInt(administratorTelegramId);
    const existingAdministrator = await tx.user.findUnique({ where: { telegramId } });
    if (existingAdministrator && ["BANNED", "DELETED"].includes(existingAdministrator.status))
      throw new Error("ADMINISTRATOR_UNAVAILABLE");
    const administrator = existingAdministrator
      ? await tx.user.update({ where: { id: existingAdministrator.id }, data: { status: "ACTIVE" } })
      : await tx.user.create({ data: {
          telegramId, firstName: current.applicantName || "Tenant Administrator",
          referralCode: crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase(),
        } });
    const provisioned = await provisionTenant(tx, { name: current.proposedName, slug: current.requestedSlug, description: current.description,
      administratorUserId: administrator.id, actorUserId });
    const now = new Date();
    const existingCredential = await tx.adminCredential.findUnique({
      where: { userId_scopeType: { userId: administrator.id, scopeType: "TENANT_ADMIN" } },
    });
    if (!existingCredential) await tx.adminCredential.create({ data: {
      userId: administrator.id, scopeType: "TENANT_ADMIN", passwordHash,
      temporaryPassword: true, mustChangePassword: true, resetByUserId: actorUserId, resetAt: now,
    } });
    const request = await tx.miniAppRequest.update({ where: { id: current.id }, data: { status: "APPROVED", approvedAt: now,
      applicantUserId: current.applicantUserId ?? administrator.id,
      assignedReviewerId: current.assignedReviewerId ?? actorUserId, createdMiniAppId: provisioned.tenant.id,
      adminCredentialIssuedAt: existingCredential?.createdAt ?? now,
      adminCredentialRevealedAt: existingCredential ? current.adminCredentialRevealedAt : now,
      publicStatusMessage: "Approved. Your Mini App is ready. Complete secure Administrator password setup before managing it.",
      events: { create: { previousStatus: current.status, nextStatus: "APPROVED", actorUserId, publicMessage: "Tenant created" } } } });
    await tx.miniAppSlugReservation.update({ where: { requestId: current.id }, data: { status: "CONVERTED", convertedMiniAppId: provisioned.tenant.id } });
    await Promise.all([
      tx.notification.create({ data: { userId: administrator.id, title: "Your Mini App is ready", body: `${current.proposedName} was approved. Use the protected Administrator login and change any temporary password immediately.`, data: { slug: current.requestedSlug, publicReference: current.publicReference } } }),
      tx.adminAuditLog.create({ data: { miniAppId: provisioned.tenant.id, actorUserId, action: "MINI_APP_REQUEST_APPROVED", targetType: "MiniAppRequest", targetId: current.id,
        before: { status: current.status }, after: { status: "APPROVED", tenantId: provisioned.tenant.id, administratorUserId: administrator.id, credentialCreated: !existingCredential } } }),
    ]);
    return { request, tenant: provisioned.tenant, temporaryPassword: existingCredential ? null : temporaryPassword };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
