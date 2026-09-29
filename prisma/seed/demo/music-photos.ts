import type { Prisma } from "../../../src/generated/prisma/client";
import type { Db } from "../../../src/lib/db-client";

// Sample rows for this section (isDemo = true). Filled in by the section itself.

export async function seedDemoMusicPhotos(db: Db): Promise<Record<string, number>> {
  void db;
  return {};
}

/** Runs inside wipeDemo's transaction, before demo guests and vendors are removed. */
export async function wipeDemoMusicPhotos(tx: Prisma.TransactionClient): Promise<Record<string, number>> {
  void tx;
  return {};
}
