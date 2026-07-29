import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;
export async function provisionTenant(tx: Tx, input: {
  name: string; slug: string; description?: string; administratorUserId?: string; actorUserId: string;
}) {
  const platform = await tx.platformConfiguration.findUnique({ where: { id: "platform" } });
  const defaults = (platform?.newTenantDefaults ?? {}) as Record<string, unknown>;
  const tenant = await tx.miniApp.create({ data: { name: input.name, slug: input.slug, status: "ACTIVE" } });
  await Promise.all([
    tx.tenantAdminSettings.create({ data: { miniAppId: tenant.id, description: input.description } }),
    tx.memoryMatchSettings.create({ data: { miniAppId: tenant.id } }),
    tx.quizSettings.create({ data: { miniAppId: tenant.id } }),
    tx.tapCollectorSettings.create({ data: { miniAppId: tenant.id } }),
    tx.mazeRunnerSettings.create({ data: { miniAppId: tenant.id } }),
    tx.walletSettings.create({ data: { miniAppId: tenant.id,
      ...(typeof defaults.pointsPerDollar === "number" ? { pointsPerDollar: Math.max(1, Math.trunc(defaults.pointsPerDollar)) } : {}),
      ...(typeof defaults.minimumWithdrawal === "number" ? { minimumWithdrawal: defaults.minimumWithdrawal } : {}),
      ...(typeof defaults.maximumWithdrawal === "number" ? { maximumWithdrawal: defaults.maximumWithdrawal } : {}) } }),
    tx.taskSettings.create({ data: { miniAppId: tenant.id } }),
    tx.adsGalaxyConfiguration.create({ data: { miniAppId: tenant.id, enabled: false, status: "NOT_CONFIGURED" } }),
  ]);
  let membership = null;
  if (input.administratorUserId) membership = await tx.miniAppMembership.upsert({
    where: { miniAppId_userId: { miniAppId: tenant.id, userId: input.administratorUserId } },
    create: { miniAppId: tenant.id, userId: input.administratorUserId, role: "ADMIN" },
    update: { role: "ADMIN", status: "ACTIVE" },
  });
  await tx.adminAuditLog.create({ data: { miniAppId: tenant.id, actorUserId: input.actorUserId, action: "TENANT_CREATED",
    targetType: "MiniApp", targetId: tenant.id, after: { name: tenant.name, slug: tenant.slug, status: tenant.status, administratorAssigned: Boolean(membership) } } });
  return { tenant, membership };
}
