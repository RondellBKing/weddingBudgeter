import Link from "next/link";
import type { ReactNode } from "react";
import { BudgetBanner, DemoBanner } from "@/components/shell/Banners";
import { BottomNavLinks, SidebarLinks } from "@/components/shell/NavLinks";
import { Monogram, Sprig } from "@/components/ui/Ornaments";
import { requireSession } from "@/lib/auth/require-session";
import { loadPlan, NotSeededError, type Plan } from "@/lib/data/plan";
import { daysBetween, formatDate } from "@/lib/dates";

export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireSession();

  let plan: Plan | null = null;
  try {
    plan = await loadPlan();
  } catch (err) {
    if (!(err instanceof NotSeededError)) throw err;
  }

  if (!plan) {
    return (
      <main className="mx-auto grid max-w-xl gap-4 px-4 py-24">
        <h1 className="text-5xl">
          Almost <em className="italic">ready</em>
        </h1>
        <p className="text-cocoa">
          The database is empty. Run <code className="num">npm run seed</code> to load the wedding details, then
          reload this page.
        </p>
      </main>
    );
  }

  const { settings, budget, today } = plan;
  const daysToGo = daysBetween(today, settings.weddingDate);
  const names = `${settings.partnerOneName} & ${settings.partnerTwoName}`;

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[16.5rem_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-[3px] focus:bg-chocolate focus:px-4 focus:py-2 focus:text-ivory"
      >
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-dvh flex-col overflow-y-auto bg-chocolate px-4 py-8 text-ivory md:flex">
        {/* The masthead */}
        <Link href="/" className="grid justify-items-center gap-3 px-2 text-center">
          <Monogram first={settings.partnerOneName} second={settings.partnerTwoName} tone="dark" />
          <span className="grid gap-1.5">
            <span className="font-display text-[23px] leading-tight">
              {settings.partnerOneName} <em className="text-dusty-rose italic">&amp;</em> {settings.partnerTwoName}
            </span>
            <span className="text-[10px] font-medium tracking-[0.28em] text-gold-light uppercase">
              {formatDate(settings.weddingDate, "long")}
            </span>
          </span>
        </Link>
        <div aria-hidden className="mx-6 mt-6 flex items-center gap-2.5">
          <span className="h-px flex-1 bg-gold-light/30" />
          <svg viewBox="0 0 12 12" className="size-2 fill-gold-light/70">
            <path d="M6 0 12 6 6 12 0 6z" />
          </svg>
          <span className="h-px flex-1 bg-gold-light/30" />
        </div>

        <div className="mt-6">
          <SidebarLinks />
        </div>

        <div className="relative mt-8 overflow-hidden rounded-[3px] border border-ivory/10 bg-ivory/[0.04] px-4 pt-4 pb-5">
          <Sprig className="pointer-events-none absolute -right-10 -bottom-5 w-28 opacity-40" flip="x" />
          <p className="text-[10px] font-medium tracking-[0.2em] text-gold-light uppercase">Countdown</p>
          <p className="num mt-1.5 font-display text-[44px] leading-none">{daysToGo.toLocaleString("en-US")}</p>
          <p className="mt-1 font-display text-[15px] text-ivory/75 italic">days until we say I do</p>
        </div>
      </aside>

      <div className="min-w-0 pb-24 md:pb-0">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-chocolate px-4 py-3 text-ivory md:hidden">
          <Link href="/" className="flex items-center gap-2.5">
            <Monogram first={settings.partnerOneName} second={settings.partnerTwoName} size="sm" tone="dark" />
            <span className="font-display text-lg leading-none">{names}</span>
          </Link>
          <span className="num text-right text-xs leading-tight text-ivory/70">
            <span className="block font-display text-lg text-ivory">{daysToGo.toLocaleString("en-US")}</span>
            days to go
          </span>
        </header>

        <BudgetBanner
          overBudgetCents={budget.overBudgetCents}
          contractedOverBudgetCents={budget.contractedOverBudgetCents}
          totalBudgetCents={budget.totalBudget}
        />
        {plan.hasDemoData ? <DemoBanner /> : null}
        <main id="main" className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-12 lg:px-12">
          {children}
        </main>
      </div>

      <BottomNavLinks />
    </div>
  );
}
