"use server";

import { hash } from "@node-rs/argon2";
import { randomBytes } from "node:crypto";
import { authConfigured } from "@/lib/auth/config";

export type SetupState =
  | { ok: false; message: string }
  | { ok: true; passwordHash: string; sessionSecret: string };

const MIN_LENGTH = 16;

/**
 * Turns a passphrase into the two values Vercel needs. Nothing is stored: the passphrase is
 * hashed and handed back to the person setting up. Refuses once sign-in is configured.
 */
export async function makeSecrets(_prev: SetupState, form: FormData): Promise<SetupState> {
  if (authConfigured()) return { ok: false, message: "Setup is already finished." };
  const a = String(form.get("passphrase") ?? "");
  const b = String(form.get("confirm") ?? "");
  if (a.length < MIN_LENGTH) return { ok: false, message: `Use at least ${MIN_LENGTH} characters. Four or five random words works well.` };
  if (a.length > 512) return { ok: false, message: "That's too long." };
  if (a !== b) return { ok: false, message: "The two entries don't match." };
  const hashed = await hash(a, { memoryCost: 19_456, timeCost: 2, parallelism: 1 });
  return {
    ok: true,
    passwordHash: Buffer.from(hashed, "utf8").toString("base64"),
    sessionSecret: randomBytes(48).toString("base64url"),
  };
}
