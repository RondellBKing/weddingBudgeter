import Link from "next/link";
import { Card, CardHeading } from "@/components/ui/Card";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { Meter } from "@/components/ui/Meter";
import { PageTitle } from "@/components/ui/PageTitle";
import { Legend, Ring } from "@/components/ui/Ring";
import { Stat } from "@/components/ui/Stat";
import { loadPlan } from "@/lib/data/plan";
import { daysBetween, dueState, formatDate, relativeDays } from "@/lib/dates";
import { resolvePaymentAmount, type CategoryTotals } from "@/lib/domain/budget";
import { formatCents, formatPercent } from "@/lib/money";

export const metadata = { title: "Budget" };

const cell = "px-3 py-3.5 text-right num align-baseline";

function categoryStatus(c: CategoryTotals, contingencyAvailable: number) {
  if (c.isContingency) return { text: `${formatCents(contingencyAvailable)} available`, cls: "text-gold-ink" };
  if (c.overrun > 0) return { text: `Over by ${formatCents(c.overrun)}`, cls: "text-brick font-medium" };
  if (c.committed > 0) return { text: "Under contract", cls: "text-garden-ink" };
  return { text: "Nothing booked yet", cls: "text-muted" };
}

export default async function BudgetPage() {
  const plan = await loadPlan();
  const { budget, headroom, settings } = plan;
  const contingency = budget.contingency;
  const others = budget.categories.filter((c) => !c.isContingency);
  const largest = others.reduce((a, b) => (b.estimateCents > a.estimateCents ? b : a), others[0]);
  const restEstimate = budget.allocated - (largest?.estimateCents ?? 0) - contingency.estimate;
  const claims = contingency.overruns + contingency.spentDirectly;

  return (
    <div className="grid gap-8 sm:gap-10">
      <PageTitle
        word="Budget"
        eyebrow="Money"
        intro={`Our ${formatCents(budget.totalBudget)} plan. Every deposit and installment is a scheduled payment, so paid and remaining are always worked out for you.`}
      />

      <Card className="px-6 sm:px-7">
        <div className="grid grid-cols-2 gap-x-6 sm:grid-cols-3 lg:grid-cols-5 [&>*]:border-b [&>*]:border-rule lg:[&>*]:border-b-0">
          <Stat label="Total budget" value={formatCents(budget.totalBudget)} sub={`${budget.categories.length} categories`} />
          <Stat label="Committed" value={formatCents(budget.committed)} sub={`${formatPercent(budget.committed, budget.totalBudget)} of budget`} />
          <Stat label="Paid" value={formatCents(budget.paid)} sub={`${formatPercent(budget.paid, budget.totalBudget)} of budget`} />
          <Stat label="Left to pay" value={formatCents(budget.leftToPay)} sub="on signed contracts" />
          <Stat label="Uncommitted" value={formatCents(budget.uncommitted)} sub="not yet contracted" />
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-12">
        <Card className="grid gap-6 p-6 sm:p-7 lg:col-span-7" aria-labelledby="share-h">
          <CardHeading id="share-h" title="Where it goes" />
          <h2 className="text-[30px] leading-tight sm:text-[34px]">
            {largest?.name ?? "Venue"} is <em className="italic">{formatPercent(largest?.estimateCents ?? 0, budget.totalBudget)}</em> of the budget
          </h2>
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <Ring
              size={168}
              total={budget.totalBudget}
              label={`${largest?.name}: ${formatCents(largest?.estimateCents ?? 0)}. Everything else: ${formatCents(restEstimate)}. Contingency: ${formatCents(contingency.estimate)}. Not assigned: ${formatCents(budget.unallocated)}.`}
              segments={[
                { label: largest?.name ?? "Venue", value: largest?.estimateCents ?? 0, className: "stroke-dusty-rose" },
                { label: "Everything else", value: restEstimate, className: "stroke-desert-rose" },
                { label: "Contingency", value: contingency.estimate, className: "stroke-cocoa" },
              ]}
            >
              <div className="grid gap-0.5">
                <span className="num font-display text-3xl leading-none">{formatCents(budget.totalBudget)}</span>
                <span className="text-[11px] text-muted">total</span>
              </div>
            </Ring>
            <Legend
              items={[
                { label: largest?.name ?? "Venue", value: formatCents(largest?.estimateCents ?? 0), swatch: "bg-dusty-rose", note: formatPercent(largest?.estimateCents ?? 0, budget.totalBudget) },
                { label: `Other ${others.length - 1} categories`, value: formatCents(restEstimate), swatch: "bg-desert-rose", note: formatPercent(restEstimate, budget.totalBudget) },
                { label: "Contingency buffer", value: formatCents(contingency.estimate), swatch: "bg-cocoa", note: formatPercent(contingency.estimate, budget.totalBudget) },
                ...(budget.unallocated !== 0
                  ? [{ label: "Not assigned to a category", value: formatCents(budget.unallocated), swatch: "bg-linen border border-rule-strong", note: "Bridesmaids' dresses are handled separately" }]
                  : []),
              ]}
            />
          </div>
        </Card>

        <Card className="grid content-start gap-5 p-6 sm:p-7 lg:col-span-5" aria-labelledby="cont-h">
          <CardHeading id="cont-h" title="Contingency buffer" />
          <div className="grid gap-1">
            <p className={`num font-display text-[52px] leading-none ${contingency.available < 0 ? "text-brick" : ""}`}>
              {formatCents(contingency.available)}
            </p>
            <p className="text-sm text-muted">uncommitted headroom, of {formatCents(contingency.estimate)}</p>
          </div>
          <Meter
            label="Claimed so far"
            value={claims}
            max={contingency.estimate}
            detail={formatCents(claims)}
            fill={claims > contingency.estimate ? "bg-brick" : "bg-gold"}
          />
          <p className="text-sm leading-relaxed text-cocoa">
            Anything that comes in over its estimate is paid from here, and so is every guest above{" "}
            {settings.includedHeadcount}.{" "}
            {headroom.guestsUntilGone !== null && headroom.guestsUntilGone >= 0
              ? `Right now it covers ${headroom.guestsUntilGone} more guests.`
              : "It's used up."}
          </p>
          <Link href="/guests" className="text-[13px] text-rose-ink hover:text-chocolate">
            Headcount details →
          </Link>
        </Card>
      </div>

      <Card className="p-6 sm:p-7" aria-labelledby="cats-h">
        <CardHeading id="cats-h" title="Categories" />
        <ul className="mt-2 sm:hidden">
          {budget.categories.map((c) => {
            const status = categoryStatus(c, contingency.available);
            return (
              <li key={c.id} className={`grid gap-0.5 border-b border-rule py-3.5 last:border-b-0 ${c.isContingency ? "-mx-3 bg-linen/40 px-3" : ""}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className={c.isContingency ? "border-l-2 border-gold pl-2" : ""}>{c.name}</span>
                  <span className="num">{formatCents(c.estimateCents)}</span>
                </div>
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className={status.cls}>{status.text}</span>
                  {c.committed > 0 ? (
                    <span className="num text-muted">
                      {formatCents(c.paid)} paid of {formatCents(c.committed)}
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
        <table className="mt-4 w-full text-sm max-sm:hidden">
          <thead>
            <tr className="border-b border-chocolate/70 text-left">
              <th className="label-caps py-2 pr-3 font-medium">Category</th>
              <th className="label-caps px-3 py-2 text-right font-medium">Estimate</th>
              <th className="label-caps px-3 py-2 text-right font-medium">Committed</th>
              <th className="label-caps px-3 py-2 text-right font-medium">Paid</th>
              <th className="label-caps px-3 py-2 text-right font-medium">Left to pay</th>
              <th className="label-caps py-2 pl-3 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {budget.categories.map((c) => {
              const status = categoryStatus(c, contingency.available);
              return (
                <tr
                  key={c.id}
                  className={`border-b border-rule last:border-b-0 ${c.isContingency ? "bg-linen/40" : ""}`}
                >
                  <td className="py-3.5 pr-3 align-baseline">
                    <span className={c.isContingency ? "border-l-2 border-gold pl-2" : ""}>{c.name}</span>
                  </td>
                  <td className={cell}>{formatCents(c.estimateCents)}</td>
                  <td className={cell}>{c.committed ? formatCents(c.committed) : "—"}</td>
                  <td className={cell}>{c.paid ? formatCents(c.paid) : "—"}</td>
                  <td className={cell}>{c.leftToPay ? formatCents(c.leftToPay) : "—"}</td>
                  <td className={`${cell} pr-0 ${status.cls}`}>{status.text}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card className="p-6 sm:p-7" aria-labelledby="sched-h">
        <CardHeading id="sched-h" title="Payment schedule" />
        <ul className="mt-2 grid">
          {plan.items
            .flatMap((item) => item.payments.map((p) => ({ p, item })))
            .sort((a, b) => (a.p.dueDate < b.p.dueDate ? -1 : a.p.dueDate > b.p.dueDate ? 1 : (a.p.sequence ?? 0) - (b.p.sequence ?? 0)))
            .map(({ p, item }) => {
              const amount = resolvePaymentAmount(p, { headcountOverageCents: headroom.overageCents });
              const days = daysBetween(plan.today, p.dueDate);
              const state = dueState(p.dueDate, plan.today);
              return (
                <li key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 border-b border-rule py-3.5 last:border-b-0 sm:grid-cols-[9.5rem_minmax(0,1fr)_auto]">
                  <span className="num text-sm text-cocoa max-sm:col-span-2">{formatDate(p.dueDate, "weekday-medium")}</span>
                  <span className="min-w-0">
                    <span className="block">{item.vendorName ?? item.description}</span>
                    <span className="block text-xs text-muted">
                      {p.kind === "OVERAGE"
                        ? "Headcount overage · recalculates as the guest list changes"
                        : p.kind === "SERVICE_CHARGE"
                          ? "Maître d' service charge · mandatory, not a tip"
                          : `Payment ${p.sequence ?? ""} of ${item.payments.length}${p.notes ? ` · ${p.notes}` : ""}`}
                    </span>
                  </span>
                  <span className="num text-right">
                    <span className="block">{amount === null ? "TBD" : (p.isEstimate && !p.paidDate ? "est. " : "") + formatCents(amount)}</span>
                    {p.paidDate ? (
                      <span className="block text-[10.5px] font-semibold tracking-[0.1em] text-garden-ink uppercase">
                        Paid {formatDate(p.paidDate, "month-day")}
                      </span>
                    ) : (
                      <span
                        className={`block text-[10.5px] font-semibold tracking-[0.1em] uppercase ${state === "overdue" ? "text-brick" : state === "due-soon" ? "text-gold-ink" : "text-muted"}`}
                      >
                        {relativeDays(days)}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
        </ul>
      </Card>

      <ComingSoon
        phase={1}
        items={[
          "Edit estimates, add budget items and record payments as you make them",
          "Payments grouped by month for cash flow, and progress per category",
          "CSV export",
        ]}
      />
    </div>
  );
}
