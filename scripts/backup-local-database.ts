import postgres from "postgres";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const sourceUrl = new URL(process.env.DATABASE_URL);
  const source = sourceUrl.pathname.replace(/^\//, "");
  if (!/^[a-zA-Z0-9_]+$/.test(source)) throw new Error("Unsafe database name");
  const suffix = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const backup = `${source}_backup_${suffix}`;
  sourceUrl.pathname = "/postgres";
  sourceUrl.search = "";
  const sql = postgres(sourceUrl.toString(), { max: 1 });
  await sql.unsafe(`CREATE DATABASE "${backup}" WITH TEMPLATE "${source}"`);
  process.stdout.write(`LOCAL_BACKUP_DATABASE=${backup}\n`);
  await sql.end();
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Backup failed"}\n`);
  process.exitCode = 1;
});
