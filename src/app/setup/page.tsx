import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Divider, Monogram, Sprig } from "@/components/ui/Ornaments";
import { authConfigured } from "@/lib/auth/config";
import { SetupForm } from "./SetupForm";

export const metadata = { title: "Set up" };
export const dynamic = "force-dynamic";

/** One-time setup: only reachable until the passphrase and session secret are configured. */
export default function SetupPage() {
  if (authConfigured()) notFound();
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
        <div className="relative mt-8">
          <SetupForm />
        </div>
      </Card>
    </main>
  );
}
