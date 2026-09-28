import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "../db";
import { sessionCookieName, verifySessionToken, type Session } from "./session";

/** The current session, or null. Checks the signature and the database epoch. Once per request. */
export const getSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(sessionCookieName())?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  const state = await prisma.authState.findUnique({ where: { id: 1 }, select: { sessionEpoch: true } });
  if (!state || state.sessionEpoch !== session.epoch) return null;
  return session;
});

/**
 * The real gate. Call it at the top of every data-access function, Server Action and route
 * handler. The proxy only makes redirects fast; it is not what protects the data.
 */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
