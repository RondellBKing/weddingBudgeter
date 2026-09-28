// Restore a backup made by `npm run backup`.
//
//   npm run restore -- <file>             restore into DATABASE_URL (must be empty and migrated)
//   npm run restore -- <file> --url <url> restore into another database
//   npm run restore -- <file> --verify    restore into RESTORE_DATABASE_URL (wiped first), then
//                                         re-read it and check every table matches the backup
//
// The target needs the schema first: DATABASE_URL=<target> npx prisma migrate deploy

import "dotenv/config";
import { readFile } from "node:fs/promises";
import type pg from "pg";
import { checksum, connect, dumpDatabase, latestMigration, tablesInDependencyOrder, type BackupFile } from "./lib/pg-dump";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function restoreInto(client: pg.Client, backup: BackupFile, wipeFirst: boolean) {
  const targetTables = await tablesInDependencyOrder(client);
  const missing = Object.keys(backup.data).filter((t) => !targetTables.includes(t));
  if (missing.length > 0) {
    throw new Error(`The target database has no table(s) ${missing.join(", ")}. Run prisma migrate deploy on it first.`);
  }
  const targetMigration = await latestMigration(client);
  if (backup.meta.migration && targetMigration !== backup.meta.migration) {
    console.warn(
      `Warning: backup was taken at schema ${backup.meta.migration}, target is at ${targetMigration}. ` +
        `Columns added since the backup will get their defaults.`,
    );
  }

  await client.query("BEGIN");
  try {
    if (wipeFirst) {
      await client.query(`TRUNCATE ${targetTables.map((t) => `"${t}"`).join(", ")} CASCADE`);
    } else {
      for (const t of targetTables) {
        const { rows } = await client.query<{ n: number }>(`SELECT count(*)::int AS n FROM "${t}"`);
        if (rows[0]!.n > 0) {
          throw new Error(
            `Refusing to restore: table ${t} already has ${rows[0]!.n} rows. Restore into an empty database.`,
          );
        }
      }
    }
    // Parents before children, so foreign keys are satisfied as rows arrive.
    for (const t of targetTables) {
      const rows = backup.data[t];
      if (!rows || rows.length === 0) continue;
      const cols = (
        await client.query<{ name: string }>(
          `SELECT column_name AS name FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
          [t],
        )
      ).rows.map((r) => `"${r.name}"`);
      await client.query(
        `INSERT INTO "${t}" (${cols.join(", ")})
         SELECT ${cols.join(", ")} FROM json_populate_recordset(NULL::"${t}", $1::json)`,
        [JSON.stringify(rows)],
      );
    }
    // Keep autoincrement counters ahead of restored ids.
    const serials = await client.query<{ t: string; c: string }>(
      `SELECT table_name AS t, column_name AS c FROM information_schema.columns
       WHERE table_schema = 'public' AND column_default LIKE 'nextval(%'`,
    );
    for (const { t, c } of serials.rows) {
      await client.query(
        `SELECT setval(pg_get_serial_sequence('"${t}"', '${c}'), coalesce((SELECT max("${c}") FROM "${t}"), 0) + 1, false)`,
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
}

async function main() {
  const file = process.argv[2];
  if (!file || file.startsWith("--")) throw new Error("Usage: npm run restore -- <backup.json> [--url <url>] [--verify]");
  const verify = process.argv.includes("--verify");
  const url = verify ? process.env.RESTORE_DATABASE_URL : (arg("--url") ?? process.env.DATABASE_URL);
  if (!url) throw new Error(verify ? "RESTORE_DATABASE_URL is not set." : "DATABASE_URL is not set (or pass --url).");
  if (verify && url === process.env.DATABASE_URL) {
    throw new Error("RESTORE_DATABASE_URL must be a different, disposable database: --verify wipes it.");
  }

  const backup = JSON.parse(await readFile(file, "utf8")) as BackupFile;
  if (backup.meta?.format !== "wedding-hq-backup") throw new Error(`${file} is not a Wedding HQ backup.`);
  for (const [t, info] of Object.entries(backup.meta.tables)) {
    if (checksum(backup.data[t]) !== info.sha256) throw new Error(`Backup file is damaged: table ${t} fails its checksum.`);
  }

  const client = await connect(url);
  try {
    await restoreInto(client, backup, verify);
    const total = Object.values(backup.meta.tables).reduce((s, t) => s + t.rows, 0);
    console.log(`Restored ${total} rows from ${backup.meta.createdAt}.`);

    if (verify) {
      const again = await dumpDatabase(client);
      const mismatched = Object.entries(backup.meta.tables).filter(
        ([t, info]) => again.meta.tables[t]?.sha256 !== info.sha256,
      );
      if (mismatched.length > 0) {
        throw new Error(`Restore check failed for: ${mismatched.map(([t]) => t).join(", ")}`);
      }
      console.log(`Verified: all ${Object.keys(backup.meta.tables).length} tables match the backup exactly.`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
