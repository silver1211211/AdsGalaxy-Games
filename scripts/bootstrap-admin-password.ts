import { prisma } from "../src/lib/prisma";
import { hashAdminPassword } from "../src/features/admin-security/passwords";
import { configuredSuperAdminIdentifier } from "../src/features/super-admin/browser-auth-policy";

async function hiddenPrompt(label: string) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function")
    throw new Error("Run this command in an interactive TTY.");
  process.stdout.write(label);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  return new Promise<string>((resolve, reject) => {
    let value = "";
    const finish = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
      process.stdin.removeListener("data", onData);
    };
    const onData = (key: string) => {
      if (key === "\u0003") {
        finish();
        reject(new Error("Bootstrap cancelled."));
      } else if (key === "\r" || key === "\n") {
        finish();
        resolve(value);
      } else if (key === "\u007f" || key === "\b") {
        value = value.slice(0, -1);
      } else if (!/[\u0000-\u001f]/.test(key)) {
        value += key;
      }
    };
    process.stdin.on("data", onData);
  });
}

async function main() {
  const telegramId = configuredSuperAdminIdentifier(process.env.SUPER_ADMIN_TELEGRAM_IDS);
  if (!telegramId)
    throw new Error("SUPER_ADMIN_TELEGRAM_IDS must contain exactly one numeric ID.");
  const platformSlug = process.env.PLATFORM_MINI_APP_SLUG ?? "ads-galaxy";
  const user = await prisma.user.findFirst({
    where: {
      telegramId: BigInt(telegramId),
      status: "ACTIVE",
      memberships: {
        some: {
          role: "SUPER_ADMIN",
          status: "ACTIVE",
          miniApp: { slug: platformSlug, status: "ACTIVE" },
        },
      },
    },
    select: {
      id: true,
      memberships: {
        where: { role: "SUPER_ADMIN", status: "ACTIVE", miniApp: { slug: platformSlug } },
        select: { miniAppId: true },
        take: 1,
      },
    },
  });
  const membership = user?.memberships[0];
  if (!user || !membership)
    throw new Error("The configured active platform Super Admin could not be resolved.");

  const password = await hiddenPrompt("Temporary Super Admin password: ");
  const confirmation = await hiddenPrompt("Confirm temporary password: ");
  if (!password || password.length > 128 || password !== confirmation)
    throw new Error("Passwords did not match or were invalid.");
  const passwordHash = await hashAdminPassword(password);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const existing = await tx.adminCredential.findUnique({
      where: { userId_scopeType: { userId: user.id, scopeType: "SUPER_ADMIN" } },
    });
    const credential = existing
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
            resetAt: now,
            credentialVersion: { increment: 1 },
          },
        })
      : await tx.adminCredential.create({
          data: {
            userId: user.id,
            scopeType: "SUPER_ADMIN",
            passwordHash,
            temporaryPassword: true,
            mustChangePassword: true,
            resetAt: now,
          },
        });
    const [sessions, elevations] = await Promise.all([
      tx.appSession.updateMany({
        where: { userId: user.id, miniAppId: membership.miniAppId, revokedAt: null },
        data: { revokedAt: now },
      }),
      tx.adminElevationSession.updateMany({
        where: { userId: user.id, scopeType: "SUPER_ADMIN", revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
    await tx.adminAuditLog.create({
      data: {
        miniAppId: membership.miniAppId,
        actorUserId: user.id,
        action: existing ? "SUPER_ADMIN_BOOTSTRAP_PASSWORD_REPLACED" : "SUPER_ADMIN_BOOTSTRAP_PASSWORD_CREATED",
        targetType: "AdminCredential",
        targetId: credential.id,
        metadata: {
          temporaryPasswordIssued: true,
          mustChangePassword: true,
          sessionsRevoked: sessions.count,
          elevationsRevoked: elevations.count,
        },
      },
    });
  });
  process.stdout.write("Temporary Super Admin credential stored securely. Password change is required at first login.\n");
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Bootstrap failed"}\n`);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
