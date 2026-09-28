import Link from "next/link";
import { formatCents } from "@/lib/money";

/** Shown at the top of every page when the money doesn't add up. */
export function BudgetBanner({
  overBudgetCents,
  contractedOverBudgetCents,
  totalBudgetCents,
}: {
  overBudgetCents: number;
  contractedOverBudgetCents: number;
  totalBudgetCents: number;
}) {
  if (overBudgetCents <= 0 && contractedOverBudgetCents <= 0) return null;
  const contracts = contractedOverBudgetCents > 0;
  return (
    <div role="alert" className="border-b border-brick/30 bg-brick-wash">
      <div className="mx-auto flex max-w-6xl flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 text-sm text-brick sm:px-8">
        <strong className="text-[11px] font-semibold tracking-[0.14em] uppercase">Over budget</strong>
        <span>
          {contracts
            ? `Signed contracts alone are ${formatCents(contractedOverBudgetCents)} over the ${formatCents(totalBudgetCents)} budget.`
            : `The plan is ${formatCents(overBudgetCents)} over budget. The contingency is used up.`}
        </span>
        <Link href="/budget" className="underline underline-offset-4">
          See the budget
        </Link>
      </div>
    </div>
  );
}

export function DemoBanner() {
  return (
    <div className="border-b border-gold/40 bg-linen">
      <div className="mx-auto flex max-w-6xl flex-wrap items-baseline gap-x-3 px-4 py-2 text-[13px] text-gold-ink sm:px-8">
        <strong className="text-[11px] font-semibold tracking-[0.14em] uppercase">Demo data</strong>
        <span>Some rows are sample data and are included in these numbers. Remove them with npm run demo:wipe.</span>
      </div>
    </div>
  );
}
