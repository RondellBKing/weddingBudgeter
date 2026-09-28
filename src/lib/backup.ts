// Plain-Postgres backup helpers, shared by the backup/restore scripts and the Settings download.
// No Prisma here: the dump is every column of every table, exactly as Postgres stores it, so it
// restores faithfully even across app changes.

import { createHash } from "node:crypto";
import pg from "pg";

/** Tables that are never backed up (login attempts hold IPs and are only useful for an hour). */
export const EXCLUDED_TABLES = new Set(["_prisma_migrations", "LoginAttempt"]);

export async function connect(url: string): Promise<pg.Client> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  // Timestamps come out in UTC so dumps are byte-for-byte comparable.
  await client.query("SET TIME ZONE 'UTC'");
  return client;
}

/** Public tables in foreign-key order: every table comes after the tables it references. */
export async function tablesInDependencyOrder(client: pg.Client): Promise<string[]> {
  const tables = (
    await client.query<{ name: string }>(
      `SELECT table_name AS name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`,
    )
  ).rows
    .map((r) => r.name)
    .filter((t) => !EXCLUDED_TABLES.has(t));

  const deps = new Map<string, Set<string>>(tables.map((t) => [t, new Set<string>()]));
  const fks = await client.query<{ child: string; parent: string }>(
    `SELECT c.conrelid::regclass::text AS child, c.confrelid::regclass::text AS parent
     FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace
     WHERE c.contype = 'f' AND n.nspname = 'public'`,
  );
  const unquote = (s: string) => s.replace(/^"(.*)"$/, "$1");
  for (const { child, parent } of fks.rows) {
    const c = unquote(child);
    const p = unquote(parent);
    if (c !== p && deps.has(c) && deps.has(p)) deps.get(c)!.add(p);
  }

  const ordered: string[] = [];
  const done = new Set<string>();
  const visiting = new Set<string>();
  const visit = (t: string) => {
    if (done.has(t)) return;
    if (visiting.has(t)) throw new Error(`Foreign-key cycle involving ${t}`);
    visiting.add(t);
    for (const p of deps.get(t)!) visit(p);
    visiting.delete(t);
    done.add(t);
    ordered.push(t);
  };
  tables.forEach(visit);
  return ordered;
}

export async function dumpTable(client: pg.Client, table: string): Promise<unknown[]> {
  const res = await client.query<{ rows: unknown[] }>(
    `SELECT coalesce(json_agg(t), '[]'::json) AS rows FROM (SELECT * FROM "${table}" ORDER BY 1) t`,
  );
  return res.rows[0]!.rows;
}

export async function latestMigration(client: pg.Client): Promise<string | null> {
  const res = await client.query<{ name: string }>(
    `SELECT migration_name AS name FROM _prisma_migrations
     WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
     ORDER BY migration_name DESC LIMIT 1`,
  );
  return res.rows[0]?.name ?? null;
}

export function checksum(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export type BackupFile = {
  meta: {
    format: "wedding-hq-backup";
    version: 1;
    createdAt: string;
    migration: string | null;
    tables: Record<string, { rows: number; sha256: string }>;
  };
  data: Record<string, unknown[]>;
};

/** Read every table inside one read-only snapshot, so the backup is consistent. */
export async function dumpDatabase(client: pg.Client): Promise<BackupFile> {
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  try {
    const tables = await tablesInDependencyOrder(client);
    const data: Record<string, unknown[]> = {};
    const meta: BackupFile["meta"] = {
      format: "wedding-hq-backup",
      version: 1,
      createdAt: new Date().toISOString(),
      migration: await latestMigration(client),
      tables: {},
    };
    for (const t of tables) {
      data[t] = await dumpTable(client, t);
      meta.tables[t] = { rows: data[t].length, sha256: checksum(data[t]) };
    }
    await client.query("COMMIT");
    return { meta, data };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
}
