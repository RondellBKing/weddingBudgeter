// Is sign-in configured? Both secrets must be present and well formed. Until they are, the
// app shows the one-time setup screen instead of anything else. No database access here, so
// the proxy can call it on every request.

export function authConfigured(): boolean {
  const secret = process.env.SESSION_SECRET;
  const hash = process.env.APP_PASSWORD_HASH;
  if (!secret || secret.length < 32 || !hash) return false;
  try {
    return Buffer.from(hash, "base64").toString("utf8").startsWith("$argon2id$");
  } catch {
    return false;
  }
}
