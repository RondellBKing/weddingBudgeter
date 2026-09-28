// `npm run seed:demo` adds sample rows; `npm run demo:wipe` removes every sample row.

import "dotenv/config";
import { createPrismaClient } from "../../src/lib/db-client";
import { seedDemo, wipeDemo } from "./demo";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set.");
const wipe = process.argv.includes("--wipe");

function isLocal(connectionString: string): boolean {
  const host = new URL(connectionString).hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

async function main() {
  const db = createPrismaClient(url!);
  try {
    if (wipe) {
      console.log("Removed demo rows:", await wipeDemo(db));
      return;
    }
    if (!isLocal(url!) && process.env.ALLOW_DEMO_SEED !== "1") {
      console.error(
        "Refusing to add demo data to a non-local database. Demo guests would change the real headcount " +
          "and the venue overage payment. If this is a dev branch, set ALLOW_DEMO_SEED=1.",
      );
      process.exitCode = 1;
      return;
    }
    const existing = await db.guest.count({ where: { isDemo: true } });
    if (existing > 0) {
      console.log("Demo data is already loaded. Run `npm run demo:wipe` first to reload it.");
      return;
    }
    console.log("Added demo rows:", await seedDemo(db));
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
