import type { ReactNode } from "react";
import { requireSession } from "@/lib/auth/require-session";
import { loadPlan, NotSeededError, type Plan } from "@/lib/data/plan";
import { BudgetBanner, DemoBanner } from "@/components/shell/Banners";
import { BottomNavLinks, SidebarLinks } from "@/components/shell/NavLinks";

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

  const { settings, budget } = plan;

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh overflow-y-auto border-r border-rule px-6 py-8 md:block">
        <div className="mb-10 grid gap-1">
          <p className="font-display text-2xl leading-tight">
            {settings.partnerOneName} <em className="text-rose-ink italic">&amp;</em> {settings.partnerTwoName}
          </p>
          <p className="label-caps">Wedding HQ</p>
        </div>
        <SidebarLinks />
      </aside>

      <div className="min-w-0 pb-24 md:pb-0">
        <BudgetBanner
          overBudgetCents={budget.overBudgetCents}
          contractedOverBudgetCents={budget.contractedOverBudgetCents}
          totalBudgetCents={budget.totalBudget}
        />
        {plan.hasDemoData ? <DemoBanner /> : null}
        <main id="main" className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
          {children}
        </main>
      </div>

      <BottomNavLinks />
    </div>
  );
}
