import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

function loadEnvironmentFile(name: string) {
  try {
    for (const line of readFileSync(resolve(process.cwd(), name), "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
      if (!match || process.env[match[1]] !== undefined) continue;
      let value = match[2];
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
        value = value.slice(1, -1);
      process.env[match[1]] = value;
    }
  } catch {
    // Optional environment file.
  }
}

loadEnvironmentFile(".env.local");
loadEnvironmentFile(".env");

if (process.env.NODE_ENV === "production") {
  console.error("Tenant testing is unavailable in production.");
  process.exit(1);
}

const prisma = new PrismaClient();
const argument = process.argv[2]?.trim().toLowerCase();

async function main() {
 try {
  const tenants = await prisma.miniApp.findMany({
    where: { status: { not: "ARCHIVED" } },
    select: { name: true, slug: true, status: true },
    orderBy: { name: "asc" },
  });
  if (!argument || argument === "--list") {
    console.log("Available local tenants:");
    for (const tenant of tenants)
      console.log(`  ${tenant.slug.padEnd(24)} ${tenant.status.padEnd(8)} ${tenant.name}`);
    console.log("\nUse: npm run dev:tenant -- <tenant-slug>");
    process.exit(0);
  }
  if (!/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(argument)) {
    console.error("Invalid tenant slug.");
    process.exit(1);
  }
  const tenant = tenants.find((item) => item.slug === argument);
  if (!tenant) {
    console.error(`Tenant '${argument}' does not exist or is archived.`);
    console.error("Run: npm run dev:tenant -- --list");
    process.exit(1);
  }
  if (tenant.status !== "ACTIVE") {
    console.error(`Tenant '${argument}' is ${tenant.status}. Resume it before Admin testing.`);
    process.exit(1);
  }
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const next = `/${tenant.slug}/admin`;
  console.log(`Testing tenant: ${tenant.name} (${tenant.slug})`);
  console.log(`Open: ${base}/dev/access?next=${encodeURIComponent(next)}`);
  console.log("Choose Administrator. The local session will be scoped to this tenant.");
 } finally {
   await prisma.$disconnect();
 }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Tenant testing failed.");
  process.exitCode = 1;
});
