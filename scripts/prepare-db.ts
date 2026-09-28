// Runs during a production deploy on Vercel (`npm run vercel-build`):
//   1. apply database migrations, using the direct (unpooled) Neon connection when available;
//   2. load the wedding data if the database is brand new.
// Preview deployments skip this so they can never touch the production database.
// Run it by hand with PREPARE_DB=1.

import { spawnSync } from "node:child_process";

const production = process.env.VERCEL_ENV === "production" || process.env.PREPARE_DB === "1";

if (!production) {
  console.log(`prepare-db: skipped (VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"}).`);
  process.exit(0);
}

const direct = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;
if (!direct) {
  // First deploy before a database is attached: let the site build so the setup screen can
  // explain the next step. The app shows setup until the database is connected.
  console.warn("prepare-db: no DATABASE_URL yet. Connect the Neon database, then redeploy.");
  process.exit(0);
}

function run(cmd: string, args: string[]) {
  console.log(`prepare-db: ${cmd} ${args.join(" ")}`);
  const res = spawnSync(cmd, args, { stdio: "inherit", env: { ...process.env, DATABASE_URL: direct } });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

run("npx", ["prisma", "migrate", "deploy"]);
run("npx", ["tsx", "prisma/seed/index.ts", "--if-empty"]);
console.log("prepare-db: done.");
