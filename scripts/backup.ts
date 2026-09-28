// `npm run backup` → backups/wedding-hq-<UTC timestamp>.json
// `npm run backup -- --out some/file.json` to choose the path.
// Reads DATABASE_URL (or --url). Never writes to the database.

import "dotenv/config";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { connect, dumpDatabase } from "../src/lib/backup";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const url = arg("--url") ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (or pass --url).");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const out = resolve(arg("--out") ?? `backups/wedding-hq-${stamp}.json`);

  const client = await connect(url);
  try {
    const backup = await dumpDatabase(client);
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, JSON.stringify(backup, null, 1) + "\n", { mode: 0o600 });
    await chmod(out, 0o600);
    const total = Object.values(backup.meta.tables).reduce((s, t) => s + t.rows, 0);
    console.log(`Backed up ${total} rows from ${Object.keys(backup.data).length} tables to ${out}`);
    console.log(`Schema version: ${backup.meta.migration ?? "unknown"}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
