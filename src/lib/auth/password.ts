import "server-only";
import { verify } from "@node-rs/argon2";

// APP_PASSWORD_HASH holds an argon2id hash, base64-encoded. The encoding matters: a raw argon2
// hash is full of "$" characters, which .env loaders treat as variable references.

function storedHash(): string {
  const encoded = process.env.APP_PASSWORD_HASH;
  if (!encoded) throw new Error("APP_PASSWORD_HASH is not set. Run `npm run hash-password`.");
  const hash = Buffer.from(encoded, "base64").toString("utf8");
  if (!hash.startsWith("$argon2id$")) {
    throw new Error("APP_PASSWORD_HASH is not a base64-encoded argon2id hash. Run `npm run hash-password`.");
  }
  return hash;
}

export async function verifyPassword(candidate: string): Promise<boolean> {
  if (!candidate || candidate.length > 1024) return false;
  try {
    return await verify(storedHash(), candidate);
  } catch (err) {
    if (err instanceof Error && err.message.includes("APP_PASSWORD_HASH")) throw err;
    return false;
  }
}
