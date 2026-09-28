import Link from "next/link";
import type { ReactNode } from "react";
import { HeadcountCard } from "@/components/dashboard/HeadcountCard";
import { Card, CardHeading } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Meter } from "@/components/ui/Meter";
import { Divider, Sprig } from "@/components/ui/Ornaments";
import { PageTitle } from "@/components/ui/PageTitle";
import { Legend, Ring } from "@/components/ui/Ring";
import { ToneBadge, toneText, type Tone } from "@/components/ui/Tone";
import { loadDashboard } from "@/lib/data/dashboard";
import { daysBetween, formatDate, greetingFor, relativeDays, type DueState } from "@/lib/dates";
import type { AgendaKind } from "@/lib/domain/agenda";
import { formatCents, formatPercent } from "@/lib/money";

export const metadata = { title: "Dashboard" };

const KIND: Record<AgendaKind, { label: string; dot: string }> = {
  milestone: { label: "Milestone", dot: "bg-desert-rose" },
  payment: { label: "Payment", dot: "bg-gold" },
  event: { label: "Appointment", dot: "bg-garden" },
  task: { label: "Task", dot: "border border-desert-rose bg-paper" },
};

function stateTone(state: DueState): Tone {
  return state === "overdue" ? "overdue" : state === "due-soon" ? "due-soon" : "neutral";
}

function MoreLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-[13px] text-rose-ink hover:text-chocolate">
      {children}
      <Icon name="arrow" size={14} />
    </Link>
  );
}

export default async function DashboardPage() {
  const d = await loadDashboard();
  const { plan } = d;
  const { settings, budget, headroom, headcount, today } = plan;
  const committedUnpaid = Math.max(0, budget.committed - budget.paid);
  const next = plan.nextPayments[0];
  const weeks = Math.floor(d.daysToGo / 7);

  return (
    <div className="grid gap-8 sm:gap-10">
      <PageTitle
        word="Dashboard"
        eyebrow={greetingFor(settings.timezone)}
        intro={`${formatDate(today, "weekday-long")}. Here's where the wedding stands today.`}
      />

      {/* The save-the-date */}
      <Card framed as="section" aria-label="The wedding" className="overflow-hidden px-6 py-12 text-center sm:px-12 sm:py-14">
        <Sprig className="pointer-events-none absolute -top-3 -left-8 w-44 opacity-90 sm:w-60" />
        <Sprig flip="xy" className="pointer-events-none absolute -right-8 -bottom-3 w-44 opacity-90 sm:w-60" />
        <div className="relative mx-auto grid max-w-2xl justify-items-center gap-5">
          <p className="label-caps tracking-[0.28em] text-rose-ink">The wedding of</p>
          <h2 className="text-[46px] leading-[0.95] sm:text-[76px]">
            {settings.partnerOneName} <em className="text-rose-ink italic">&amp;</em> {settings.partnerTwoName}
          </h2>
          <Divider className="w-40 sm:w-56" />
          <p className="text-[12px] font-medium tracking-[0.3em] text-cocoa uppercase">
            {formatDate(settings.weddingDate, "weekday-long").replace(/, /g, " · ")}
          </p>
          <p className="font-display text-xl text-balance text-cocoa italic sm:text-2xl">
            {settings.venueName}, {settings.venueAddress.replace(/ (?=\S+,)/, "\u00a0")}
          </p>

          <dl className="mt-4 grid w-full max-w-md grid-cols-3 border-y border-rule">
            {[
              [d.daysToGo, "days"],
              [weeks, "weeks"],
              [d.untilWedding.months, "months"],
            ].map(([n, label], i) => (
              <div key={label} className={`grid gap-1 py-4 ${i > 0 ? "border-l border-rule" : ""}`}>
                <dt className="sr-only">{label}</dt>
                <dd className="num font-display text-4xl leading-none sm:text-5xl">{Number(n).toLocaleString("en-US")}</dd>
                <dd className="label-caps text-[10px]">{label}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-muted">
            {d.untilWedding.months} months and {d.untilWedding.days} days to go. Rehearsal dinner the evening before.
          </p>
        </div>
      </Card>

      {d.tasksDueSoon.length > 0 || d.overduePayments.length > 0 ? (
        <Card className="grid gap-4 border-l-2 border-l-brick p-6 sm:p-7" aria-labelledby="attention-h">
          <CardHeading id="attention-h" title="Needs attention" action={<MoreLink href="/tasks">Tasks</MoreLink>} />
          <ul className="grid">
            {d.overduePayments.map((p) => (
              <li key={p.payment.id} className="flex items-baseline justify-between gap-4 border-b border-rule py-2.5 last:border-b-0">
                <span className="min-w-0">
                  Pay {p.item.vendorName ?? p.item.description}
                  {p.amountCents != null ? <span className="num text-cocoa"> · {formatCents(p.amountCents)}</span> : null}
                </span>
                <ToneBadge tone="overdue">{relativeDays(p.daysUntil)}</ToneBadge>
              </li>
            ))}
            {d.tasksDueSoon.map((t) => (
              <li key={t.id} className="flex items-baseline justify-between gap-4 border-b border-rule py-2.5 last:border-b-0">
                <span className="min-w-0">{t.title}</span>
                <ToneBadge tone={t.state === "overdue" ? "overdue" : "due-soon"}>{relativeDays(t.daysUntil)}</ToneBadge>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* At a glance */}
      <div className="grid gap-5 lg:grid-cols-12">
        <Card className="grid gap-6 p-6 sm:p-7 lg:col-span-7" aria-labelledby="budget-h">
          <CardHeading id="budget-h" title="Budget" action={<MoreLink href="/budget">Budget</MoreLink>} />
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <Ring
              total={Math.max(budget.totalBudget, budget.committed)}
              label={`Budget: ${formatCents(budget.paid)} paid, ${formatCents(committedUnpaid)} committed but not yet paid, ${formatCents(budget.uncommitted)} not yet committed.`}
              segments={[
                { label: "Paid", value: budget.paid, className: "stroke-desert-rose", display: formatCents(budget.paid) },
                { label: "Committed, not yet paid", value: committedUnpaid, className: "stroke-dusty-rose", display: formatCents(committedUnpaid) },
              ]}
            >
              <div className="grid gap-0.5">
                <span className="num font-display text-3xl leading-none">{formatPercent(budget.committed, budget.totalBudget)}</span>
                <span className="text-[11px] text-muted">committed</span>
              </div>
            </Ring>
            <div className="grid w-full min-w-0 gap-4">
              <p className="text-sm text-cocoa">
                <span className="num font-display text-3xl text-chocolate">{formatCents(budget.committed)}</span> committed of{" "}
                <span className="num">{formatCents(budget.totalBudget)}</span>
                <span className="num text-muted"> · {formatPercent(budget.paid, budget.totalBudget)} paid</span>
              </p>
              <Legend
                items={[
                  { label: "Paid", value: formatCents(budget.paid), swatch: "bg-desert-rose" },
                  { label: "Committed, not yet paid", value: formatCents(committedUnpaid), swatch: "bg-dusty-rose" },
                  { label: "Not yet committed", value: formatCents(budget.uncommitted), swatch: "bg-linen border border-rule-strong" },
                ]}
              />
            </div>
          </div>
          <p className="flex flex-wrap items-center gap-x-2 border-t border-rule pt-4 text-[13px] text-cocoa">
            <span className="label-caps text-[10px]">Contingency</span>
            <span className={`num ${budget.contingency.available < 0 ? "text-brick" : ""}`}>
              {formatCents(budget.contingency.available)} of {formatCents(budget.contingency.estimate)} left
            </span>
          </p>
        </Card>

        <div className="grid gap-5 lg:col-span-5">
          <Card className="grid content-start gap-4 p-6" aria-labelledby="next-pay-h">
            <CardHeading id="next-pay-h" title="Next payment" action={<MoreLink href="/budget">Schedule</MoreLink>} />
            {next ? (
              <div className="grid gap-2">
                <p className="num font-display text-[44px] leading-none">
                  {next.amountCents === null ? "TBD" : formatCents(next.amountCents)}
                </p>
                <p className="text-[15px]">{next.item.vendorName ?? next.item.description}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-sm text-cocoa">{formatDate(next.payment.dueDate, "weekday-medium")}</span>
                  <ToneBadge tone={stateTone(next.state)}>{relativeDays(next.daysUntil)}</ToneBadge>
                </div>
              </div>
            ) : (
              <p className="text-cocoa">Everything is paid.</p>
            )}
          </Card>

          <Card className="grid content-start gap-4 p-6" aria-labelledby="sizing-h">
            <CardHeading id="sizing-h" title="Dresses & sizing due" action={<MoreLink href="/party">Party</MoreLink>} />
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className={`num font-display text-[44px] leading-none ${d.sizing.tone === "overdue" ? "text-brick" : ""}`}>
                {Math.abs(d.sizing.daysLeft).toLocaleString("en-US")}
              </span>
              <span className="font-display text-lg text-cocoa italic">
                {d.sizing.daysLeft >= 0 ? "days until " : "days since "}
                {formatDate(d.sizing.deadline, "weekday-medium")}
              </span>
            </div>
            <ToneBadge tone={d.sizing.tone}>
              {d.sizing.allIn
                ? "Every style and size is in"
                : [
                    d.sizing.notSubmitted > 0 ? `${d.sizing.notSubmitted} of ${d.sizing.dressWearers} dresses outstanding` : null,
                    d.sizing.suitsOutstanding > 0 ? `${d.sizing.suitsOutstanding} suit measurements` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
            </ToneBadge>
          </Card>
        </div>

        <Card className="grid content-start gap-5 p-6 sm:p-7 lg:col-span-7" aria-labelledby="headcount-h">
          <CardHeading
            id="headcount-h"
            title={`Headcount & the venue's ${settings.includedHeadcount}`}
            action={<MoreLink href="/guests">Guests</MoreLink>}
          />
          <HeadcountCard
            headroom={headroom}
            headcount={headcount}
            contingencyAvailable={budget.contingency.available}
            overageDue={d.overageDue}
          />
        </Card>

        <Card className="grid content-start gap-6 p-6 sm:p-7 lg:col-span-5" aria-labelledby="progress-h">
          <CardHeading id="progress-h" title="Planning progress" action={<MoreLink href="/tasks">Tasks</MoreLink>} />
          <div className="flex items-center gap-5">
            <Ring
              size={112}
              thickness={8}
              total={d.tasks.total}
              label={`Checklist: ${d.tasks.done} of ${d.tasks.total} tasks done`}
              segments={[{ label: "Done", value: d.tasks.done, className: "stroke-garden", display: String(d.tasks.done) }]}
            >
              <span className="num font-display text-2xl leading-none">{formatPercent(d.tasks.done, d.tasks.total)}</span>
            </Ring>
            <div className="grid gap-1">
              <p className="font-display text-2xl leading-tight">
                {d.tasks.done} of {d.tasks.total} <em className="italic">done</em>
              </p>
              <p className="text-sm text-muted">
                {d.nextTask ? `Next: ${d.nextTask.title}` : "Nothing left on the checklist."}
              </p>
            </div>
          </div>
          <div className="grid gap-5 border-t border-rule pt-5">
            <Meter label="Wedding party attire ready" value={d.attire.ready} max={d.attire.total} fill="bg-dusty-rose" />
            <Meter
              label="Guests seated"
              value={d.seating.seated}
              max={d.seating.total}
              detail={d.seating.total === 0 ? "No guest list yet" : undefined}
            />
          </div>
        </Card>

        <Card className="grid content-start gap-5 p-6 sm:p-7 lg:col-span-7" aria-labelledby="upcoming-h">
          <CardHeading id="upcoming-h" title="Coming up" action={<MoreLink href="/calendar">Calendar</MoreLink>} />
          {d.agenda.length === 0 ? (
            <p className="text-cocoa">Nothing on the calendar for the next four months.</p>
          ) : (
            <ol className="grid">
              {d.agenda.map((item, i) => {
                const kind = KIND[item.kind];
                const last = i === d.agenda.length - 1;
                return (
                  <li key={item.id} className="grid grid-cols-[3.25rem_1rem_minmax(0,1fr)] gap-x-3">
                    <div className="pt-0.5 text-right">
                      <p className="label-caps text-[10px] leading-none">{formatDate(item.date, "month-day").split(" ")[0]}</p>
                      <p className="num font-display text-[26px] leading-tight">{item.date.slice(8).replace(/^0/, "")}</p>
                    </div>
                    <div className="relative flex justify-center" aria-hidden>
                      <span className={`relative z-10 mt-2 size-2.5 rounded-full ${kind.dot}`} />
                      {!last ? <span className="absolute top-5 bottom-0 w-px bg-rule" /> : null}
                    </div>
                    <div className={`min-w-0 ${last ? "" : "pb-5"}`}>
                      <p className="text-[15px] leading-snug">{item.title}</p>
                      <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted">
                        <span>{kind.label}</span>
                        {item.amountCents != null ? <span className="num">· {formatCents(item.amountCents)}</span> : null}
                        {item.time ? <span>· {item.time}</span> : null}
                        <span className={toneText(stateTone(item.state))}>· {relativeDays(daysBetween(today, item.date)).toLowerCase()}</span>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>

        <Card className="grid content-start gap-4 p-6 sm:p-7 lg:col-span-5" aria-labelledby="payments-h">
          <CardHeading id="payments-h" title="Payment schedule" action={<MoreLink href="/budget">Budget</MoreLink>} />
          {plan.nextPayments.length === 0 ? (
            <p className="text-cocoa">Nothing left to pay.</p>
          ) : (
            <ul className="grid">
              {plan.nextPayments.map((p) => (
                <li key={p.payment.id} className="flex items-baseline justify-between gap-4 border-b border-rule py-3 last:border-b-0">
                  <span className="min-w-0">
                    <span className="block text-sm">{formatDate(p.payment.dueDate, "medium")}</span>
                    <span className="block text-xs text-muted">
                      {p.payment.kind === "OVERAGE"
                        ? "Headcount overage (estimate)"
                        : p.payment.kind === "SERVICE_CHARGE"
                          ? "Maître d' service charge"
                          : `Payment ${p.payment.sequence ?? ""} of ${p.item.payments.length}`}
                    </span>
                  </span>
                  <span className="num shrink-0 text-right">
                    <span className="block">{p.amountCents === null ? "TBD" : formatCents(p.amountCents)}</span>
                    <span className={`block text-[10.5px] font-semibold tracking-[0.1em] uppercase ${toneText(stateTone(p.state))}`}>
                      {relativeDays(p.daysUntil)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="grid content-start gap-5 p-6 sm:p-7 lg:col-span-7" aria-labelledby="vendors-h">
          <CardHeading id="vendors-h" title="Vendors" action={<MoreLink href="/vendors">Vendors</MoreLink>} />
          <p className="font-display text-2xl leading-snug">
            {d.categoriesBooked} of {d.categoriesTotal} <em className="italic">booked</em>
          </p>
          {(() => {
            const parts = [
              { key: "BOOKED", label: "Booked", cls: "bg-garden" },
              { key: "QUOTED", label: "Quoted", cls: "bg-desert-rose" },
              { key: "CONTACTED", label: "Contacted", cls: "bg-dusty-rose" },
              { key: "RESEARCHING", label: "Researching", cls: "bg-linen border border-rule-strong" },
            ];
            const total = parts.reduce((s, p) => s + (d.vendorStatus[p.key] ?? 0), 0);
            return (
              <div className="grid gap-3">
                <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-[2px] bg-linen" role="img" aria-label={parts.map((p) => `${d.vendorStatus[p.key] ?? 0} ${p.label.toLowerCase()}`).join(", ")}>
                  {total > 0
                    ? parts.map((p) =>
                        (d.vendorStatus[p.key] ?? 0) > 0 ? (
                          <span key={p.key} className={`h-full ${p.cls}`} style={{ flexGrow: d.vendorStatus[p.key] }} />
                        ) : null,
                      )
                    : null}
                </div>
                <ul className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-cocoa">
                  {parts.map((p) => (
                    <li key={p.key} className="flex items-center gap-2">
                      <span aria-hidden className={`size-2.5 rounded-[2px] ${p.cls}`} />
                      <span className="num">{d.vendorStatus[p.key] ?? 0}</span> {p.label.toLowerCase()}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}
          {d.stillNeeded.length > 0 ? (
            <div className="grid gap-2 border-t border-rule pt-4">
              <p className="label-caps text-[10px]">Nobody booked yet</p>
              <ul className="flex flex-wrap gap-2">
                {d.stillNeeded.map((c) => (
                  <li key={c} className="rounded-full border border-rule-strong px-3 py-1 text-[12px] text-cocoa">
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>

        <Card className="grid content-start gap-4 p-6 sm:p-7 lg:col-span-5" aria-labelledby="appts-h">
          <CardHeading id="appts-h" title="Appointments" action={<MoreLink href="/calendar">Calendar</MoreLink>} />
          {d.appointments.length === 0 ? (
            <p className="text-sm text-cocoa">Nothing booked in the next 30 days.</p>
          ) : (
            <ul className="grid">
              {d.appointments.map((a) => (
                <li key={a.id} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-3 border-b border-rule py-3 last:border-b-0">
                  <span className="text-center leading-none">
                    <span className="label-caps block text-[10px]">{formatDate(a.date, "weekday-short")}</span>
                    <span className="num mt-1 block font-display text-2xl">{Number(a.date.slice(8))}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] leading-snug">{a.title}</span>
                    <span className="block text-xs text-muted">
                      {[formatDate(a.date, "month-day"), a.time, a.location, a.vendorName].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

