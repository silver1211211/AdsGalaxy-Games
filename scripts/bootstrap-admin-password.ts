import { prisma } from "../src/lib/prisma";
import { createTemporaryAdminCredential } from "../src/features/admin-security/credentials";

function argument(name: string) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const reference = argument("user");
  if (!reference) throw new Error("Usage: npm run admin:bootstrap-password -- --user=<trusted-user-id|telegram-id|username>");
  const scopeType = argument("scope") === "tenant" ? "TENANT_ADMIN" : "SUPER_ADMIN";
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { id: reference },
        ...( /^\d+$/.test(reference) ? [{ telegramId: BigInt(reference) }] : []),
        { username: reference.replace(/^@/, "") },
      ],
      status: "ACTIVE",
      memberships: { some: { role: scopeType === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN", status: "ACTIVE" } },
    },
    select: { id: true },
  });
  if (!user) throw new Error(`An active trusted ${scopeType === "SUPER_ADMIN" ? "Super Admin" : "tenant Administrator"} User could not be resolved.`);
  const result = await createTemporaryAdminCredential({
    userId: user.id,
    scopeType,
    reason: `Secure ${scopeType} bootstrap`,
  });
  process.stdout.write(`Temporary ${scopeType === "SUPER_ADMIN" ? "Super Admin" : "tenant Administrator"} password (shown once): ${result.plaintext}\n`);
  process.stdout.write("Change it immediately after Administrator verification.\n");
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Bootstrap failed"}\n`);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
