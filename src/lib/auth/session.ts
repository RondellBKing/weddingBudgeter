import { jwtVerify, SignJWT } from "jose";

// The session cookie is a signed token holding the session epoch. The proxy checks only the
// signature and expiry (no database). requireSession() also checks the epoch against the
// database, so "log out everywhere" takes effect on the next request.

export const SESSION_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;
/** Reissue the cookie when it's older than this, so phones in regular use never time out. */
export const SESSION_RENEW_AFTER_SECONDS = 7 * 24 * 60 * 60;

const ISSUER = "wedding-hq";

export function sessionCookieName(): string {
  return process.env.NODE_ENV === "production" ? "__Host-hq_session" : "hq_session";
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 random characters.");
  }
  return new TextEncoder().encode(secret);
}

export type Session = { epoch: number; issuedAt: number };

export async function createSessionToken(epoch: number): Promise<string> {
  return new SignJWT({ e: epoch })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { issuer: ISSUER, algorithms: ["HS256"] });
    if (typeof payload.e !== "number" || typeof payload.iat !== "number") return null;
    return { epoch: payload.e, issuedAt: payload.iat };
  } catch {
    return null;
  }
}

export function shouldRenew(session: Session, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  return nowSeconds - session.issuedAt > SESSION_RENEW_AFTER_SECONDS;
}
