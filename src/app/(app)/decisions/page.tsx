import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageTitle } from "@/components/ui/PageTitle";
import { loadDecisions } from "@/lib/data/decisions";
import { formatDate } from "@/lib/dates";
import { PARTNER_LABEL } from "@/lib/labels";

export const metadata = { title: "Decisions" };

export default async function DecisionsPage() {
  const decisions = await loadDecisions();
  return (
    <div className="grid gap-8 sm:gap-10">
      <PageTitle
        word="Decisions"
        eyebrow="Plan"
        intro="Our own paper trail: what we chose, when, and why."
        actions={
          <Link href="/decisions/new" className={buttonClass("primary")}>
            Record a decision
          </Link>
        }
      />
      {decisions.length === 0 ? (
        <EmptyState icon="decisions" title="Nothing" word="decided yet">
          <p>Write down each big choice as you make it, so you both remember what you agreed and why.</p>
          <div>
            <Link href="/decisions/new" className={buttonClass("primary")}>
              Record a decision
            </Link>
          </div>
        </EmptyState>
      ) : (
        <Card className="px-6 sm:px-9">
          <ol className="grid">
            {decisions.map((d) => (
              <li key={d.id} className="grid gap-2 border-b border-rule py-7 last:border-b-0 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-8">
                <p className="leading-none">
                  <span className="font-display text-[26px] italic">{formatDate(d.decidedOn, "month-day")}</span>
                  <span className="label-caps mt-1.5 block text-[10px]">{d.decidedOn.slice(0, 4)}</span>
                </p>
                <div className="grid gap-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h2 className="font-display text-2xl leading-snug">{d.title}</h2>
                    <Link href={`/decisions/${d.id}`} className="text-[13px] text-rose-ink hover:text-chocolate">
                      Edit<span className="sr-only"> {d.title}</span>
                    </Link>
                  </div>
                  <p className="max-w-prose whitespace-pre-line text-cocoa">{d.decision}</p>
                  {d.rationale ? <p className="max-w-prose text-sm whitespace-pre-line text-muted">Why: {d.rationale}</p> : null}
                  <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                    <span className="label-caps text-[10px] leading-[1.9] text-rose-ink">
                      Decided by {PARTNER_LABEL[d.decidedBy]}
                    </span>
                    {d.vendor ? (
                      <Link href={`/vendors/${d.vendor.id}`} className="text-cocoa underline-offset-4 hover:text-rose-ink hover:underline">
                        {d.vendor.name}
                      </Link>
                    ) : null}
                    {d.budgetItem ? (
                      <Link href={`/budget/items/${d.budgetItem.id}`} className="text-cocoa underline-offset-4 hover:text-rose-ink hover:underline">
                        Budget: {d.budgetItem.description}
                      </Link>
                    ) : null}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}
