// `npm run hash-password` → prints the APP_PASSWORD_HASH value for Vercel and .env.
//
// The hash is argon2id (bcrypt would silently ignore everything after 72 bytes of a long
// passphrase). It's printed base64-encoded because raw argon2 hashes contain "$", which .env
// loaders try to expand as variables.

import { hash } from "@node-rs/argon2";
import { createInterface } from "node:readline";

const MIN_LENGTH = 16;

async function readPassphrase(): Promise<string> {
  if (!process.stdin.isTTY) {
    // Piped input: `echo "long passphrase here" | npm run hash-password`
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks).toString("utf8").replace(/\r?\n$/, "");
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const ask = (q: string) =>
    new Promise<string>((resolve) => {
      const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
      let prompted = false;
      out._writeToOutput = (s: string) => {
        if (!prompted) {
          out.output.write(s);
          prompted = true;
        }
      };
      rl.question(q, (answer) => {
        out.output.write("\n");
        resolve(answer);
      });
    });
  const first = await ask("Passphrase: ");
  const second = await ask("Same passphrase again: ");
  rl.close();
  if (first !== second) throw new Error("The two entries didn't match.");
  return first;
}

async function main() {
  const passphrase = await readPassphrase();
  if (passphrase.length < MIN_LENGTH) {
    throw new Error(`Use a passphrase of at least ${MIN_LENGTH} characters (four or five random words is ideal).`);
  }
  // OWASP-recommended argon2id parameters: 19 MiB memory, 2 iterations.
  const hashed = await hash(passphrase, { memoryCost: 19_456, timeCost: 2, parallelism: 1 });
  console.log("\nAPP_PASSWORD_HASH=" + Buffer.from(hashed, "utf8").toString("base64"));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
