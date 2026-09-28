import "server-only";
import { prisma } from "../db";

// Stored in the database because serverless instances don't share memory.
// Per-IP limit stops guessing from one place; the global cap stops guessing from many places,
// and is set high enough that someone else can't easily lock the two of you out.

const PER_IP_FAILURES = 5;
const PER_IP_WINDOW_MS = 15 * 60 * 1000;
const GLOBAL_FAILURES = 30;
const GLOBAL_WINDOW_MS = 60 * 60 * 1000;
const KEEP_MS = 7 * 24 * 60 * 60 * 1000;

export async function isLoginBlocked(ip: string, now = new Date()): Promise<boolean> {
  const [ipFailures, globalFailures] = await Promise.all([
    prisma.loginAttempt.count({
      where: { ip, ok: false, at: { gte: new Date(now.getTime() - PER_IP_WINDOW_MS) } },
    }),
    prisma.loginAttempt.count({
      where: { ok: false, at: { gte: new Date(now.getTime() - GLOBAL_WINDOW_MS) } },
    }),
  ]);
  return ipFailures >= PER_IP_FAILURES || globalFailures >= GLOBAL_FAILURES;
}

export async function recordLoginAttempt(ip: string, ok: boolean, now = new Date()): Promise<void> {
  await prisma.$transaction([
    prisma.loginAttempt.create({ data: { ip, ok, at: now } }),
    prisma.loginAttempt.deleteMany({ where: { at: { lt: new Date(now.getTime() - KEEP_MS) } } }),
  ]);
}
