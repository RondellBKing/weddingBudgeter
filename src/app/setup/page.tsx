import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Divider, Monogram, Sprig } from "@/components/ui/Ornaments";
import { authConfigured } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { SetupForm } from "./SetupForm";

export const metadata = { title: "Set up" };
export const dynamic = "force-dynamic";

type DbState = "missing" | "not-ready" | "ready";

async function databaseState(): Promise<DbState> {
  if (!process.env.DATABASE_URL) return "missing";
  try {
    return (await prisma.weddingSettings.findUnique({ where: { id: 1 }, select: { id: true } })) ? "ready" : "not-ready";
  } catch {
    return "not-ready";
  }
}

function Step({ n, done, current, title, children }: { n: number; done: boolean; current: boolean; title: string; children?: ReactNode }) {
  return (
    <li className={`grid grid-cols-[2rem_minmax(0,1fr)] gap-3 ${current ? "" : "opacity-80"}`}>
      <span
        aria-hidden
        className={`grid size-7 place-items-center rounded-full border text-sm ${
          done ? "border-garden bg-garden text-paper" : current ? "border-desert-rose text-rose-ink" : "border-rule-strong text-muted"
        }`}
      >
        {done ? <Icon name="check" size={14} strokeWidth={2.2} /> : n}
      </span>
      <div className="grid gap-2 pt-0.5">
        <p className={`text-[15px] ${current ? "font-medium" : ""}`}>
          {title}
          <span className="sr-only">{done ? " (done)" : current ? " (next)" : ""}</span>
        </p>
        {current && children ? <div className="grid gap-3 text-sm leading-relaxed text-cocoa">{children}</div> : null}
      </div>
    </li>
  );
}

/** One-time setup: only reachable until sign-in is configured. */
export default async function SetupPage() {
  if (authConfigured()) notFound();
  const db = await databaseState();
  const dbDone = db === "ready";

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <Card framed as="div" className="w-full max-w-lg overflow-hidden px-7 pt-12 pb-10 sm:px-12">
        <Sprig className="pointer-events-none absolute -top-2 -left-8 w-40 opacity-90" />
        <Sprig flip="xy" className="pointer-events-none absolute -right-8 -bottom-2 w-40 opacity-90" />
        <header className="relative grid justify-items-center gap-4 text-center">
          <Monogram first="Rondell" second="Capri" size="lg" />
          <p className="label-caps tracking-[0.28em] text-rose-ink">One-time setup</p>
          <h1 className="text-[40px] leading-none">
            Set up your <em className="italic">planner</em>
          </h1>
          <Divider className="w-36" />
        </header>

        <ol className="relative mt-8 grid gap-6">
          <Step n={1} done={dbDone} current={!dbDone} title="Connect the database">
            {db === "missing" ? (
              <p>
                In Vercel, open this project, go to <strong>Storage</strong>, choose <strong>Neon</strong> (free), create
                a database and connect it to this project. Then go to <strong>Deployments</strong>, open the menu on the
                latest one and choose <strong>Redeploy</strong>. Come back to this page when it finishes.
              </p>
            ) : (
              <p>
                The database is connected but not set up yet. In Vercel, go to <strong>Deployments</strong> and choose{" "}
                <strong>Redeploy</strong> on the latest one. That creates the tables and loads your wedding details.
                Then reload this page.
              </p>
            )}
          </Step>
          <Step n={2} done={false} current={dbDone} title="Choose your passphrase">
            <SetupForm />
          </Step>
          <Step n={3} done={false} current={false} title="Sign in" />
        </ol>
      </Card>
    </main>
  );
}
