import { randomBytes } from "crypto";
import { createInterface } from "readline/promises";
import { stdin, stdout } from "process";
import { loadEnvConfig } from "@next/env";
import { prisma } from "../src/lib/prisma";
import { hashAdminPassword } from "../src/features/admin-security/passwords";
import {
  tenantAdminBootstrapAllowed,
  tenantAdminCredentialState,
} from "../src/features/tenant-admin/bootstrap-policy";
import { isValidTenantSlug } from "../src/features/tenant-admin/boundary";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

function argument(name: string) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((value) => value.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function hidden(prompt: string) {
  if (!stdin.isTTY || !stdout.isTTY || typeof stdin.setRawMode !== "function")
    throw new Error("A secure interactive terminal is required.");
  stdout.write(prompt);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");
  return new Promise<string>((resolve, reject) => {
    let value = "";
    const finish = () => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
    };
    const onData = (key: string) => {
      if (key === "\u0003") {
        finish();
        reject(new Error("Cancelled."));
      } else if (key === "\r" || key === "\n") {
        finish();
        resolve(value);
      } else if (key === "\u007f" || key === "\b") {
        value = value.slice(0, -1);
      } else if (key >= " ") {
        value += key;
      }
    };
    stdin.on("data", onData);
  });
}

async function main() {
  const slug = argument("slug")?.trim();
  const telegramId = argument("telegram-id")?.trim();
  if (!slug || !isValidTenantSlug(slug) || !telegramId || !/^\d{5,20}$/.test(telegramId))
    throw new Error("Usage: npm run tenant:bootstrap-admin -- --slug <slug> --telegram-id <numeric-id>");

  const tenant = await prisma.miniApp.findUnique({
    where: { slug },
    select: {
      id: true, name: true, slug: true, status: true,
      memberships: {
        where: { role: "ADMIN", status: "ACTIVE" },
        select: { userId: true },
      },
    },
  });
  const target = await prisma.user.findUnique({
    where: { telegramId: BigInt(telegramId) },
    select: { id: true, status: true },
  });
  const policy = tenantAdminBootstrapAllowed({
    tenantExists: Boolean(tenant),
    tenantStatus: tenant?.status,
    targetUserStatus: target?.status,
    activeAdminUserIds: tenant?.memberships.map((item) => item.userId) ?? [],
    targetUserId: target?.id,
  });
  if (!policy.ok) throw new Error(policy.code);
  if (!tenant) throw new Error("TENANT_NOT_FOUND");

  console.log(`Tenant name: ${tenant.name}`);
  console.log(`Tenant slug: ${tenant.slug}`);
  console.log(`Tenant status: ${tenant.status}`);
  console.log(`Target Telegram ID: ${telegramId}`);
  const prompt = createInterface({ input: stdin, output: stdout });
  const confirmation = await prompt.question(`Type ${tenant.slug} to confirm provisioning: `);
  prompt.close();
  if (confirmation !== tenant.slug) throw new Error("Confirmation was not provided.");

  const password = await hidden("Temporary Administrator password: ");
  const repeated = await hidden("Repeat temporary Administrator password: ");
  if (!password || password !== repeated) throw new Error("Passwords did not match.");
  const passwordHash = await hashAdminPassword(password);

  await prisma.$transaction(async (tx) => {
    const user = target
      ? await tx.user.update({ where: { id: target.id }, data: { status: "ACTIVE" } })
      : await tx.user.create({
          data: {
            telegramId: BigInt(telegramId),
            firstName: "Tenant Administrator",
            referralCode: randomBytes(8).toString("hex").toUpperCase(),
          },
        });
    const membership = await tx.miniAppMembership.upsert({
      where: { miniAppId_userId: { miniAppId: tenant.id, userId: user.id } },
      create: { miniAppId: tenant.id, userId: user.id, role: "ADMIN", status: "ACTIVE" },
      update: { role: "ADMIN", status: "ACTIVE" },
    });
    const state = tenantAdminCredentialState(passwordHash, user.id);
    const existing = await tx.adminCredential.findUnique({
      where: { userId_scopeType: { userId: user.id, scopeType: "TENANT_ADMIN" } },
    });
    const credential = existing
      ? await tx.adminCredential.update({
          where: { id: existing.id },
          data: { ...state, credentialVersion: { increment: 1 } },
        })
      : await tx.adminCredential.create({
          data: { userId: user.id, scopeType: "TENANT_ADMIN", ...state },
        });
    const now = new Date();
    await Promise.all([
      tx.appSession.updateMany({
        where: { miniAppId: tenant.id, userId: user.id, revokedAt: null },
        data: { revokedAt: now },
      }),
      tx.adminElevationSession.updateMany({
        where: { miniAppId: tenant.id, userId: user.id, scopeType: "TENANT_ADMIN", revokedAt: null },
        data: { revokedAt: now },
      }),
      tx.adminAuditLog.create({
        data: {
          miniAppId: tenant.id,
          actorUserId: user.id,
          action: "EXISTING_TENANT_ADMIN_BOOTSTRAPPED",
          targetType: "MiniAppMembership",
          targetId: membership.id,
          metadata: { credentialId: credential.id, sessionsRevoked: true },
        },
      }),
    ]);
  }, { isolationLevel: "Serializable" });
  console.log("Administrator provisioned. The temporary password was not printed and must be changed at first login.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Provisioning failed.");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
