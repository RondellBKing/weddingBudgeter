import Link from "next/link";
import { HeadcountCard } from "@/components/dashboard/HeadcountCard";
import { Meter } from "@/components/ui/Meter";
import { PageTitle, SectionTitle } from "@/components/ui/PageTitle";
import { Stat, StatRow } from "@/components/ui/Stat";
import { ToneBadge, toneText, type Tone } from "@/components/ui/Tone";
import { loadDashboard } from "@/lib/data/dashboard";
import { formatDate, relativeDays } from "@/lib/dates";
import { formatCents, formatPercent } from "@/lib/money";

export const metadata = { title: "Dashboard" };

const PAYMENT_LABELS: Record<string, string> = {
  DEPOSIT: "Deposit",
  INSTALLMENT: "Installment",
  FINAL: "Final payment",
  OVERAGE: "Headcount overage",
  SERVICE_CHARGE: "Service charge (mandatory)",
  GRATUITY: "Tip",
  OTHER: "Payment",
};

export default async function DashboardPage() {
  const d = await loadDashboard();
  const { plan } = d;
  const { settings, budget, headroom, headcount } = plan;
  const sizingTone: Tone = d.sizing.tone;

  return (
    <div className="grid gap-12 sm:gap-14">
      <div className="grid gap-4">
        <PageTitle word="Dashboard" eyebrow={`${settings.partnerOneName} & ${settings.partnerTwoName}`} />
        <p className="flex flex-col gap-x-4 gap-y-0.5 text-sm text-cocoa sm:flex-row sm:flex-wrap">
          <span>{formatDate(settings.weddingDate, "weekday-long")}</span>
          <span aria-hidden className="hidden text-desert-rose sm:inline">·</span>
          <span>{settings.venueName}</span>
          <span aria-hidden className="hidden text-desert-rose sm:inline">·</span>
          <span>{settings.venueAddress}</span>
        </p>
        <p className="flex flex-wrap items-baseline gap-3">
          <span className="num font-display text-[72px] leading-none sm:text-[88px]">
            {d.daysToGo.toLocaleString("en-US")}
          </span>
          <span className="label-caps">days to go</span>
        </p>
      </div>

      <StatRow label="Budget summary">
        <Stat label="Total budget" value={formatCents(budget.totalBudget)} sub={`${budget.categories.length} categories`} />
        <Stat label="Committed" value={formatCents(budget.committed)} sub="under contract" />
        <Stat label="Paid" value={formatCents(budget.paid)} sub={`${formatPercent(budget.paid, budget.totalBudget)} of budget`} />
        <Stat label="Left to pay" value={formatCents(budget.leftToPay)} sub="on signed contracts" />
        <Stat label="Uncommitted" value={formatCents(budget.uncommitted)} sub="not yet contracted" />
      </StatRow>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-12">
        <section className="grid content-start gap-4" aria-labelledby="headcount-h">
          <p id="headcount-h" className="label-caps">
            Headcount vs. the venue&apos;s included {settings.includedHeadcount}
          </p>
          <HeadcountCard
            headroom={headroom}
            headcount={headcount}
            contingencyAvailable={budget.contingency.available}
            overageDue={d.overageDue}
          />
        </section>

        <div className="grid content-start gap-10">
          <section className="grid gap-4" aria-labelledby="sizing-h">
            <p id="sizing-h" className="label-caps">
              Dress selection &amp; sizing deadline
            </p>
            <div className="grid gap-3 border-y border-rule py-5">
              <p className="flex flex-wrap items-baseline gap-3">
                <span className={`num font-display text-[56px] leading-none ${d.sizing.tone === "overdue" ? "text-brick" : ""}`}>
                  {Math.abs(d.sizing.daysLeft).toLocaleString("en-US")}
                </span>
                <span className="font-display text-xl text-cocoa italic">
                  {d.sizing.daysLeft >= 0 ? "days until " : "days since "}
                  {formatDate(d.sizing.deadline, "weekday-medium")}
                </span>
              </p>
              <ToneBadge tone={sizingTone}>
                {d.sizing.notSubmitted === 0
                  ? "Everyone has submitted"
                  : `${d.sizing.notSubmitted} of ${d.sizing.dressWearers} haven't sent sizing`}
              </ToneBadge>
            </div>
          </section>

          <section className="grid gap-5" aria-label="Progress">
            <Meter
              label="Wedding party attire ready"
              value={d.attire.ready}
              max={d.attire.total}
              fill="bg-dusty-rose"
            />
            <Meter
              label="Guests seated"
              value={d.seating.seated}
              max={d.seating.total}
              detail={d.seating.total === 0 ? "No guest list yet" : undefined}
            />
            <Meter label="Tasks complete" value={d.tasks.done} max={d.tasks.total} fill="bg-garden" />
          </section>
        </div>
      </div>

      <section className="grid gap-5" aria-labelledby="payments-h">
        <SectionTitle lead="Next" word="Payments" eyebrow="Payment schedule" id="payments-h" />
        {plan.nextPayments.length === 0 ? (
          <p className="text-cocoa">Nothing left to pay.</p>
        ) : (
          <ul className="border-b border-rule">
            {plan.nextPayments.map((p) => {
              const tone: Tone = p.state === "overdue" ? "overdue" : p.state === "due-soon" ? "due-soon" : "neutral";
              const total = p.item.payments.length;
              return (
                <li
                  key={p.payment.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 border-t border-rule py-4 sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:items-baseline"
                >
                  <span className="num col-span-2 text-[13px] text-cocoa sm:col-span-1">
                    {formatDate(p.payment.dueDate, "weekday-medium")}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px]">{p.item.vendorName ?? p.item.description}</span>
                    <span className="block text-xs text-muted">
                      {p.payment.sequence ? `Payment ${p.payment.sequence} of ${total} · ` : ""}
                      {PAYMENT_LABELS[p.payment.kind] ?? "Payment"}
                      {p.payment.isEstimate ? " · estimate" : ""}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="num block text-base">
                      {p.amountCents === null ? "TBD" : (p.payment.isEstimate ? "est. " : "") + formatCents(p.amountCents)}
                    </span>
                    <span className={`block text-[11px] font-semibold tracking-[0.12em] uppercase ${toneText(tone)}`}>
                      {relativeDays(p.daysUntil)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="grid gap-5" aria-labelledby="tasks-h">
        <SectionTitle lead="This" word="Week" eyebrow="Overdue and due in the next 7 days" id="tasks-h" />
        {d.tasksDueSoon.length === 0 ? (
          <div className="grid gap-1 border-y border-rule py-5">
            <p className="text-cocoa">Nothing overdue or due this week.</p>
            {d.nextTask ? (
              <p className="text-sm text-muted">
                Next up: {d.nextTask.title}, {formatDate(d.nextTask.dueDate, "weekday-medium")} (
                {relativeDays(d.nextTask.daysUntil).toLowerCase()}).
              </p>
            ) : null}
          </div>
        ) : (
          <ul className="border-b border-rule">
            {d.tasksDueSoon.map((t) => (
              <li key={t.id} className="flex items-baseline justify-between gap-4 border-t border-rule py-3">
                <span className="min-w-0">{t.title}</span>
                <span
                  className={`num shrink-0 text-[11px] font-semibold tracking-[0.12em] uppercase ${toneText(t.state === "overdue" ? "overdue" : "due-soon")}`}
                >
                  {relativeDays(t.daysUntil)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/tasks" className="text-sm text-rose-ink underline underline-offset-4">
          All tasks
        </Link>
      </section>
    </div>
  );
}
