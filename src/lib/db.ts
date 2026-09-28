import "server-only";
import { createPrismaClient, type Db } from "./db-client";

// One client per server process (and one across hot reloads in development). Created on first
// use, so importing this module never needs DATABASE_URL (e.g. during `next build`).
const globalForPrisma = globalThis as unknown as { prisma?: Db };

function client(): Db {
  if (!globalForPrisma.prisma) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
    globalForPrisma.prisma = createPrismaClient(url);
  }
  return globalForPrisma.prisma;
}

export const prisma: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const c = client();
    const value = Reflect.get(c, prop, c);
    return typeof value === "function" ? value.bind(c) : value;
  },
});
