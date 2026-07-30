import { prisma } from "../src/lib/prisma";

const slug = (process.argv.find((value) => value.startsWith("--slug="))?.slice(7) ?? "").trim().toLowerCase();
if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])$/.test(slug))
  throw new Error("Usage: npx tsx scripts/audit-tenant.ts --slug=silver");

async function main() {
  const now = new Date();
  const tenant = await prisma.miniApp.findUnique({
    where: { slug },
    select: {
      id: true, name: true, slug: true, status: true, createdAt: true, updatedAt: true,
      inactivityReason: true, inactivitySuspendedAt: true, inactivityResumeAt: true,
      sourceRequest: { select: { approvedAt: true } },
      adminSettings: { select: { maintenanceMode: true, maintenanceMessage: true } },
      botConfiguration: {
        select: { botId: true, botUsername: true, validationStatus: true, configuredAt: true },
      },
      memberships: {
        select: {
          id: true, role: true, status: true,
          user: {
            select: {
              id: true, username: true, status: true,
              adminCredentials: {
                select: {
                  id: true, scopeType: true, mustChangePassword: true, temporaryPassword: true,
                  lockedUntil: true, credentialVersion: true,
                },
              },
              appSessions: {
                where: { revokedAt: null, expiresAt: { gt: now } },
                select: { id: true, miniAppId: true, membershipId: true, source: true, expiresAt: true },
              },
              adminElevationSessions: {
                where: { revokedAt: null, expiresAt: { gt: now } },
                select: { id: true, miniAppId: true, scopeType: true, expiresAt: true },
              },
            },
          },
        },
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!tenant) {
    console.log(JSON.stringify({ slug, exists: false }, null, 2));
    return;
  }
  console.log(JSON.stringify({
    exists: true,
    tenant: {
      id: tenant.id, name: tenant.name, slug: tenant.slug, status: tenant.status,
      active: tenant.status === "ACTIVE",
      suspension: {
        reason: tenant.inactivityReason,
        suspendedAt: tenant.inactivitySuspendedAt,
        resumeAt: tenant.inactivityResumeAt,
      },
      maintenance: tenant.adminSettings,
      createdAt: tenant.createdAt,
      approvedAt: tenant.sourceRequest?.approvedAt ?? null,
      updatedAt: tenant.updatedAt,
    },
    botConfiguration: tenant.botConfiguration ?? null,
    memberships: tenant.memberships,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Tenant audit failed.");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
