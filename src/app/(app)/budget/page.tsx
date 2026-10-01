import Link from "next/link";
import { AddCategoryForm } from "@/components/budget/AddCategoryForm";
import { CategoryTable } from "@/components/budget/CategoryTable";
import { ItemsTable } from "@/components/budget/ItemsTable";
import { MarkPaidForm } from "@/components/budget/MarkPaidForm";
import { ProgressChart } from "@/components/budget/ProgressChart";
import { buttonClass } from "@/components/ui/Button";
import { Card, CardHeading } from "@/components/ui/Card";
import { Meter } from "@/components/ui/Meter";
import { PageTitle } from "@/components/ui/PageTitle";
import { Legend, Ring } from "@/components/ui/Ring";
import { Stat, StatRow } from "@/components/ui/Stat";
import { Tabs } from "@/components/ui/Tabs";
import { ToneBadge } from "@/components/ui/Tone";
import { loadPlan } from "@/lib/data/plan";
import { daysBetween, dueState, formatDate, relativeDays } from "@/lib/dates";
import { itemTableRows, scheduleByMonth } from "@/lib/domain/payments";
import { PAYMENT_KIND_LABEL } from "@/lib/labels";
import { centsToInputValue, formatCents, formatPercent } from "@/lib/money";
import { markPaid, markUnpaid } from "./actions";

export const metadata = { title: "Budget" };

type View = "overview" | "items" | "schedule";

export default async function BudgetPage({ searchParams }: PageProps<"/budget">) {
  const sp = await searchParams;
  const view: View = sp.view === "items" || sp.view === "schedule" ? sp.view : "overview";
  const plan = await loadPlan();
  const { budget, settings } = plan;

  return (
    <div className="grid gap-8 sm:gap-10">
      <PageTitle
        word="Budget"
        eyebrow="Money"
        intro={`Our ${formatCents(budget.totalBudget)} plan. Every deposit and installment is a scheduled payment, so paid and remaining are always worked out for you.`}
        actions={
          <>
            <Link href="/budget/items/new" className={buttonClass("primary")}>
              Add budget item
            </Link>
          </>
        }
      />

      <StatRow label="Budget totals">
        <Stat label="Total budget" value={formatCents(budget.totalBudget)} sub={`${budget.categories.length} categories`} />
        <Stat label="Committed" value={formatCents(budget.committed)} sub={`${formatPercent(budget.committed, budget.totalBudget)} of budget`} />
        <Stat label="Paid" value={formatCents(budget.paid)} sub={`${formatPercent(budget.paid, budget.totalBudget)} of budget`} />
        <Stat label="Left to pay" value={formatCents(budget.leftToPay)} sub="on signed contracts" />
        <Stat label="Uncommitted" value={formatCents(budget.uncommitted)} sub="not yet contracted" />
      </StatRow>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Tabs
          label="Budget views"
          current={view}
          items={[
            { key: "overview", label: "Overview", href: "/budget" },
            { key: "items", label: "Items", href: "/budget?view=items" },
            { key: "schedule", label: "Payments", href: "/budget?view=schedule" },
          ]}
        />
        <div className="flex flex-wrap gap-4 text-[13px]">
          <a href="/budget/export/items" className="text-rose-ink hover:text-chocolate">
            Download items (CSV)
          </a>
          <a href="/budget/export/payments" className="text-rose-ink hover:text-chocolate">
            Download payments (CSV)
          </a>
        </div>
      </div>

      {view === "overview" ? <Overview plan={plan} includedHeadcount={settings.includedHeadcount} /> : null}
      {view === "items" ? <Items plan={plan} /> : null}
      {view === "schedule" ? <Schedule plan={plan} show={sp.show === "all" || sp.show === "paid" ? sp.show : "upcoming"} /> : null}
    </div>
  );
}

type Plan = Awaited<ReturnType<typeof loadPlan>>;

function Overview({ plan, includedHeadcount }: { plan: Plan; includedHeadcount: number }) {
  const { budget, headroom } = plan;
  const contingency = budget.contingency;
  const others = budget.categories.filter((c) => !c.isContingency);
  const largest = others.reduce((a, b) => (b.estimateCents > a.estimateCents ? b : a), others[0]);
  const restEstimate = budget.allocated - (largest?.estimateCents ?? 0) - contingency.estimate;
  const claims = contingency.overruns + contingency.spentDirectly;
  const overs = others.filter((c) => c.overrun > 0);

  return (
    <>
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
                {
                  label: largest?.name ?? "Venue",
                  value: largest?.estimateCents ?? 0,
                  className: "stroke-dusty-rose",
                  display: formatCents(largest?.estimateCents ?? 0),
                },
                { label: "Everything else", value: restEstimate, className: "stroke-desert-rose", display: formatCents(restEstimate) },
                { label: "Contingency", value: contingency.estimate, className: "stroke-cocoa", display: formatCents(contingency.estimate) },
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
                  ? [{ label: "Not assigned to a category", value: formatCents(budget.unallocated), swatch: "bg-linen border border-rule-strong", note: "Part of the total that no category has claimed" }]
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
          {overs.length > 0 ? (
            <ul className="grid gap-1 text-sm">
              {overs.map((c) => (
                <li key={c.id} className="flex justify-between gap-3">
                  <span className="text-cocoa">{c.name}</span>
                  <span className="num text-brick">Over by {formatCents(c.overrun)}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="text-sm leading-relaxed text-cocoa">
            Anything that comes in over its estimate is paid from here, and so is every guest above {includedHeadcount}.{" "}
            {headroom.guestsUntilGone !== null && headroom.guestsUntilGone >= 0
              ? `Right now it covers ${headroom.guestsUntilGone} more guests.`
              : "It's used up."}
          </p>
          <Link href="/guests" className="text-[13px] text-rose-ink hover:text-chocolate">
            Headcount details →
          </Link>
        </Card>
      </div>

      <Card className="grid gap-5 p-6 sm:p-7" aria-labelledby="progress-h">
        <CardHeading id="progress-h" title="Progress by category" />
        <ProgressChart
          data={budget.categories.map((c) => {
            const within = Math.min(c.committed, c.estimateCents);
            return {
              name: c.name,
              estimate: c.estimateCents,
              paid: Math.min(c.paid, within),
              owed: Math.max(0, within - c.paid),
              open: Math.max(0, c.estimateCents - c.committed),
              over: c.isContingency ? 0 : c.overrun,
            };
          })}
        />
      </Card>

      <Card className="grid gap-6 p-6 sm:p-7" aria-labelledby="cats-h">
        <CardHeading id="cats-h" title="Categories" />
        <CategoryTable
          contingencyAvailable={contingency.available}
          rows={budget.categories.map((c) => ({
            id: c.id,
            name: c.name,
            estimateCents: c.estimateCents,
            committed: c.committed,
            paid: c.paid,
            leftToPay: c.leftToPay,
            overrun: c.overrun,
            isContingency: c.isContingency,
            isClosed: c.isClosed,
            itemCount: c.itemCount,
          }))}
        />
        <p className="text-[13px] text-muted">
          Click a name or estimate to change it. Close a category once everything in it is bought: whatever is left of
          its estimate goes back to the contingency.
        </p>
        <div className="border-t border-rule pt-5">
          <AddCategoryForm />
        </div>
      </Card>
    </>
  );
}

function Items({ plan }: { plan: Plan }) {
  const names = new Map(plan.budget.categories.map((c) => [c.id, c.name]));
  const rows = itemTableRows(plan.items, plan.budget.itemTotals, names);
  const vendors = Array.from(
    new Map(plan.items.filter((i) => i.vendorId).map((i) => [i.vendorId!, { id: i.vendorId!, name: i.vendorName ?? "Vendor" }])).values(),
  );
  return (
    <Card className="p-6 sm:p-7" aria-label="Budget items">
      <ItemsTable rows={rows} categories={plan.budget.categories.map((c) => ({ id: c.id, name: c.name }))} vendors={vendors} />
    </Card>
  );
}

function Schedule({ plan, show }: { plan: Plan; show: "upcoming" | "all" | "paid" }) {
  const months = scheduleByMonth(plan.items, { headcountOverageCents: plan.headroom.overageCents }, show);
  const names = new Map(plan.budget.categories.map((c) => [c.id, c.name]));
  return (
    <div className="grid gap-5">
      <Tabs
        label="Which payments"
        current={show}
        items={[
          { key: "upcoming", label: "Still to pay", href: "/budget?view=schedule" },
          { key: "paid", label: "Paid", href: "/budget?view=schedule&show=paid" },
          { key: "all", label: "All", href: "/budget?view=schedule&show=all" },
        ]}
      />
      {months.length === 0 ? (
        <Card className="p-8 text-center text-cocoa">{show === "paid" ? "Nothing paid yet." : "Nothing left to pay."}</Card>
      ) : (
        months.map((m) => {
          const [monthName, year] = m.label.split(" ");
          return (
            <Card key={m.key} as="section" aria-label={m.label} className="grid gap-4 p-6 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-8 sm:p-8">
              <div className="grid content-start gap-2">
                <h2 className="leading-none">
                  <span className="font-display text-[30px] italic">{monthName}</span>
                  <span className="label-caps mt-1.5 block text-[10px]">{year}</span>
                </h2>
                <p className="num text-sm text-cocoa">
                  {m.dueCents > 0 ? <span className="block">{formatCents(m.dueCents)} due</span> : null}
                  {m.paidCents > 0 ? <span className="block text-garden-ink">{formatCents(m.paidCents)} paid</span> : null}
                  {m.unknownCount > 0 ? <span className="block text-muted">+ {m.unknownCount} amount TBD</span> : null}
                </p>
              </div>
              <ol className="grid">
                {m.rows.map(({ payment: p, item, amountCents }) => {
                  const state = dueState(p.dueDate, plan.today);
                  const days = daysBetween(plan.today, p.dueDate);
                  return (
                    <li key={p.id} className="grid gap-2 border-b border-rule py-4 first:pt-0 last:border-b-0 last:pb-0">
                      <div className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-start gap-x-4">
                        <span className="text-center leading-none">
                          <span className="label-caps block text-[10px]">{formatDate(p.dueDate, "weekday-short")}</span>
                          <span className="num mt-1 block font-display text-[26px]">{Number(p.dueDate.slice(8))}</span>
                        </span>
                        <span className="min-w-0 pt-0.5">
                          <Link href={`/budget/items/${item.id}`} className="block text-[15px] leading-snug hover:underline">
                            {item.vendorName ?? item.description}
                          </Link>
                          <span className="block text-xs text-muted">
                            {PAYMENT_KIND_LABEL[p.kind as keyof typeof PAYMENT_KIND_LABEL] ?? "Payment"}
                            {p.sequence ? ` · ${p.sequence} of ${item.payments.length}` : ""} · {names.get(item.categoryId)}
                          </span>
                        </span>
                        <span className="pt-0.5 text-right">
                          <span className="num block">
                            {amountCents === null ? "TBD" : `${p.isEstimate && !p.paidDate ? "est. " : ""}${formatCents(amountCents)}`}
                          </span>
                          {p.paidDate ? (
                            <ToneBadge tone="on-track">Paid {formatDate(p.paidDate, "month-day")}</ToneBadge>
                          ) : (
                            <ToneBadge tone={state === "overdue" ? "overdue" : state === "due-soon" ? "due-soon" : "neutral"}>
                              {relativeDays(days)}
                            </ToneBadge>
                          )}
                        </span>
                      </div>
                      <div className="pl-[4rem]">
                        {p.paidDate ? (
                          <form action={markUnpaid.bind(null, p.id)}>
                            <button type="submit" className="text-[13px] text-rose-ink hover:text-chocolate">
                              Mark unpaid
                            </button>
                          </form>
                        ) : (
                          <details>
                            <summary className="cursor-pointer text-[13px] font-medium text-rose-ink">Mark paid</summary>
                            <div className="mt-3 rounded-[3px] border border-rule bg-ivory/50 p-4">
                              <MarkPaidForm
                                id={`s-${p.id}`}
                                action={markPaid.bind(null, p.id)}
                                today={plan.today}
                                amount={amountCents === null ? "" : centsToInputValue(amountCents)}
                                amountHint={p.amountRule ? "Pre-filled with today's headcount amount. Paying locks it in." : undefined}
                              />
                            </div>
                          </details>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </Card>
          );
        })
      )}
    </div>
  );
}
