import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/require-session";
import { safeNextPath } from "@/lib/auth/request";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Divider, Monogram, Sprig } from "@/components/ui/Ornaments";

export const metadata = { title: "Sign in" };

const MESSAGES: Record<string, { text: string; tone: "error" | "info" }> = {
  wrong: { text: "That passphrase didn't match. Try again.", tone: "error" },
  locked: { text: "Too many attempts. Wait 15 minutes, then try again.", tone: "error" },
  setup: { text: "The app isn't set up yet. Run npm run seed first.", tone: "error" },
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
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
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="grid w-full max-w-md gap-6">
        <Card framed as="div" className="overflow-hidden px-7 pt-14 pb-10 sm:px-12">
          <Sprig className="pointer-events-none absolute -top-2 -left-8 w-40 opacity-90" />
          <Sprig flip="xy" className="pointer-events-none absolute -right-8 -bottom-2 w-40 opacity-90" />

          <header className="relative grid justify-items-center gap-4 text-center">
            <Monogram first="Rondell" second="Capri" size="lg" />
            <p className="label-caps tracking-[0.28em] text-rose-ink">The wedding planner of</p>
            <h1 className="text-[44px] leading-none sm:text-[52px]">
              Rondell <em className="text-rose-ink italic">&amp;</em> Capri
            </h1>
            <Divider className="w-36" />
            <p className="text-[11px] font-medium tracking-[0.3em] text-cocoa uppercase">Thursday · April 13 · 2028</p>
          </header>

          <form action="/api/login" method="post" className="relative mt-10 grid gap-4">
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
                className="w-full rounded-[3px] border border-rule-strong bg-ivory/50 px-4 py-3 text-base text-chocolate transition-colors focus:border-desert-rose focus:bg-paper aria-[invalid=true]:border-brick"
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
        </Card>
        <p className="flex items-center justify-center gap-2 text-xs text-muted">
          <Icon name="lock" size={14} />
          Private. For the two of us only.
        </p>
      </div>
    </main>
  );
}
