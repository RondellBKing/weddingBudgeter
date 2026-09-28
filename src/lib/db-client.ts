import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/** Create a Prisma client for a connection string. Scripts use this directly; the app uses src/lib/db.ts. */
export function createPrismaClient(connectionString: string) {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export type Db = ReturnType<typeof createPrismaClient>;
