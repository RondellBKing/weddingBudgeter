import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/require-session";
import { authConfigured } from "@/lib/auth/config";
import { safeNextPath } from "@/lib/auth/request";
import { Icon } from "@/components/ui/Icon";
import { Monogram, Sprig } from "@/components/ui/Ornaments";

export const metadata = { title: "Sign in" };

const MESSAGES: Record<string, { text: string; tone: "error" | "info" }> = {
  wrong: { text: "That passphrase didn't match. Try again.", tone: "error" },
  locked: { text: "Too many attempts. Wait 15 minutes, then try again.", tone: "error" },
  setup: { text: "The app isn't set up yet. Run npm run seed first.", tone: "error" },
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (!authConfigured()) redirect("/setup");
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : "/");

  let signedIn = false;
  try {
    signedIn = (await getSession()) !== null;
  } catch {
    signedIn = false;
  }
  if (signedIn) redirect(next);

  const error = typeof params.error === "string" ? MESSAGES[params.error] : undefined;
  const info =
    params.signedOut === "everywhere"
      ? "Signed out on every device."
      : params.signedOut
        ? "Signed out."
        : undefined;

  return (
    <main className="grid min-h-dvh md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      {/* The cover */}
      <section className="relative grid place-items-center overflow-hidden bg-chocolate px-8 py-14 text-center text-ivory md:py-10">
        <Sprig className="pointer-events-none absolute -top-4 -left-10 w-56 opacity-30 md:w-80" />
        <Sprig flip="xy" className="pointer-events-none absolute -right-10 -bottom-4 w-56 opacity-25 md:w-80" />
        <span aria-hidden className="pointer-events-none absolute inset-4 rounded-[2px] border border-gold-light/20" />
        <header className="relative grid justify-items-center gap-5">
          <Monogram first="Rondell" second="Capri" size="lg" tone="dark" />
          <p className="font-display text-[20px] text-ivory/80 italic">The wedding of</p>
          <h1 className="text-[52px] leading-[0.92] tracking-[-0.015em] sm:text-[72px] lg:text-[88px]">
            Rondell <em className="text-dusty-rose italic">&amp;</em>
            <br className="hidden sm:block" /> Capri
          </h1>
          <div aria-hidden className="flex w-48 items-center gap-3">
            <span className="h-px flex-1 bg-gold-light/50" />
            <svg viewBox="0 0 12 12" className="size-2.5 fill-gold-light">
              <path d="M6 0 12 6 6 12 0 6z" />
            </svg>
            <span className="h-px flex-1 bg-gold-light/50" />
          </div>
          <p className="text-[11px] font-medium tracking-[0.3em] text-ivory/90 uppercase">Thursday · April 13 · 2028</p>
          <p className="font-display text-[19px] text-ivory/75 italic">The Estate at Florentine Gardens</p>
        </header>
      </section>

      {/* Sign in */}
      <section className="grid place-items-center px-6 py-12 sm:px-10">
        <div className="grid w-full max-w-sm gap-8">
          <div className="grid gap-3">
            <p className="label-caps flex items-center gap-3 text-rose-ink">
              <span aria-hidden className="h-px w-8 bg-gold/70" />
              The planning journal
            </p>
            <h2 className="text-[44px] leading-none">
              Welcome <em className="italic">back</em>
            </h2>
            <p className="deck">One passphrase for the two of you.</p>
          </div>

          <form action="/api/login" method="post" className="grid gap-4">
            <input type="hidden" name="next" value={next} />
            <div className="grid gap-2">
              <label htmlFor="password" className="label-caps">
                Passphrase
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                autoFocus
                aria-invalid={error?.tone === "error" ? true : undefined}
                aria-describedby={error || info ? "login-message" : undefined}
                className="w-full rounded-[3px] border border-rule-strong bg-paper px-4 py-3 text-base text-chocolate transition-colors focus:border-desert-rose aria-[invalid=true]:border-brick"
              />
            </div>
            {error || info ? (
              <p
                id="login-message"
                role={error ? "alert" : "status"}
                className={`text-sm ${error ? "text-brick" : "text-garden-ink"}`}
              >
                {error?.text ?? info}
              </p>
            ) : null}
            <button
              type="submit"
              className="mt-1 rounded-[3px] bg-chocolate px-6 py-3.5 text-[13px] font-medium tracking-[0.16em] text-ivory uppercase transition-colors hover:bg-cocoa"
            >
              Open our planner
            </button>
          </form>
          <p className="flex items-center gap-2 border-t border-rule pt-5 text-xs text-muted">
            <Icon name="lock" size={14} />
            Private. For the two of us only.
          </p>
        </div>
      </section>
    </main>
  );
}
