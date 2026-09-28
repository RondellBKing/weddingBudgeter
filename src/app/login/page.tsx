import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/require-session";
import { safeNextPath } from "@/lib/auth/request";

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
    <main className="grid min-h-dvh place-items-center px-4 py-16">
      <div className="grid w-full max-w-sm gap-10">
        <header className="grid gap-3 text-center">
          <p className="label-caps">Rondell &amp; Capri</p>
          <h1 className="text-[52px] leading-none">
            Wedding <em className="italic">HQ</em>
          </h1>
          <p className="text-sm text-muted">Thursday, April 13, 2028</p>
        </header>

        <form action="/api/login" method="post" className="grid gap-5 border-t border-rule pt-8">
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
              className="w-full rounded-[2px] border border-rule-strong bg-paper px-3 py-3 text-base text-chocolate aria-[invalid=true]:border-brick"
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
            className="rounded-[2px] bg-chocolate px-6 py-3 text-sm font-medium tracking-[0.08em] text-ivory uppercase hover:bg-cocoa"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
