import { Card, CardHeading } from "@/components/ui/Card";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { Icon } from "@/components/ui/Icon";
import { Meter } from "@/components/ui/Meter";
import { PageTitle } from "@/components/ui/PageTitle";
import { ToneBadge } from "@/components/ui/Tone";
import { loadVendorsPage } from "@/lib/data/pages";
import { formatClockTime, formatDate, relativeDays } from "@/lib/dates";
import { coverage, VENDOR_CATEGORY_LABEL, VENDOR_STATUS_LABEL } from "@/lib/domain/vendors";
import { formatCents } from "@/lib/money";

export const metadata = { title: "Vendors" };

export default async function VendorsPage() {
  const { vendors } = await loadVendorsPage();
  const cover = coverage(vendors);
  const bookedCount = cover.filter((c) => c.booked.length > 0).length;
  const booked = vendors.filter((v) => v.status === "BOOKED");
  const others = vendors.filter((v) => v.status !== "BOOKED");

  return (
    <div className="grid gap-8 sm:gap-10">
      <PageTitle
        word="Vendors"
        eyebrow="People"
        intro={`${bookedCount} of ${cover.length} categories booked. Everyone we hire, what we owe them, and what we still need to ask.`}
      />

      {booked.map((v) => (
        <Card key={v.id} framed className="grid gap-8 p-7 sm:p-9 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="relative grid content-start gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="label-caps text-rose-ink">{VENDOR_CATEGORY_LABEL[v.category]}</span>
              <ToneBadge tone="on-track">{VENDOR_STATUS_LABEL[v.status]}</ToneBadge>
            </div>
            <h2 className="text-[34px] leading-tight sm:text-[40px]">{v.name}</h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {v.contractSignedOn ? (
                <div className="grid gap-0.5">
                  <dt className="label-caps text-[10px]">Contract signed</dt>
                  <dd>{formatDate(v.contractSignedOn, "long")}</dd>
                </div>
              ) : null}
              {v.arrivalTime ? (
                <div className="grid gap-0.5">
                  <dt className="label-caps text-[10px]">Arrives</dt>
                  <dd>{formatClockTime(v.arrivalTime)}</dd>
                </div>
              ) : null}
              <div className="grid gap-0.5">
                <dt className="label-caps text-[10px]">Vendor meals</dt>
                <dd>{v.mealsRequired}</dd>
              </div>
            </dl>
            {v.notes ? <p className="max-w-prose text-sm leading-relaxed text-cocoa">{v.notes}</p> : null}
          </div>

          <div className="relative grid content-start gap-5 border-rule lg:border-l lg:pl-8">
            <div className="grid gap-1">
              <span className="label-caps text-[10px]">Paid so far</span>
              <p className="num font-display text-[40px] leading-none">
                {formatCents(v.paid)} <span className="text-lg text-muted">of {formatCents(v.committed)}</span>
              </p>
            </div>
            <Meter label="Payments made" value={v.paidCount} max={v.paymentCount} fill="bg-desert-rose" />
            {v.nextDue ? (
              <p className="flex flex-wrap items-baseline gap-x-2 text-sm text-cocoa">
                <span className="label-caps text-[10px]">Next</span>
                <span className="num">
                  {v.nextDue.amountCents === null ? "TBD" : formatCents(v.nextDue.amountCents)} on{" "}
                  {formatDate(v.nextDue.payment.dueDate, "medium")}
                </span>
                <span className="text-gold-ink">({relativeDays(v.nextDue.daysUntil).toLowerCase()})</span>
              </p>
            ) : null}
          </div>

          {v.questions.length > 0 ? (
            <div className="relative grid gap-3 border-t border-rule pt-6 lg:col-span-2">
              <CardHeading title={`Questions for the ${VENDOR_CATEGORY_LABEL[v.category].toLowerCase()}`} />
              <ul className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
                {v.questions.map((q) => (
                  <li key={q.id} className="flex gap-3 text-sm">
                    <span
                      aria-hidden
                      className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border ${q.answer ? "border-garden bg-garden text-paper" : "border-rule-strong"}`}
                    >
                      {q.answer ? <Icon name="check" size={11} strokeWidth={2.2} /> : null}
                    </span>
                    <span className="min-w-0">
                      <span className={q.answer ? "text-muted" : "text-chocolate"}>{q.text}</span>
                      {q.answer ? <span className="block text-cocoa">{q.answer}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      ))}

      <Card className="grid gap-5 p-6 sm:p-7" aria-labelledby="coverage-h">
        <CardHeading id="coverage-h" title="Who we still need" />
        <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-[3px] border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-3">
          {cover.map((c) => {
            const done = c.booked.length > 0;
            return (
              <li key={c.category} className={`flex items-center justify-between gap-3 px-4 py-3.5 ${done ? "bg-paper" : "bg-ivory/60"}`}>
                <span className="min-w-0">
                  <span className="block text-[15px]">{c.label}</span>
                  <span className="block truncate text-xs text-muted">
                    {done ? c.booked.join(", ") : c.inProgress > 0 ? `${c.inProgress} in progress` : "Not started"}
                  </span>
                </span>
                {done ? (
                  <ToneBadge tone="on-track">Booked</ToneBadge>
                ) : (
                  <span className="text-[10.5px] font-semibold tracking-[0.12em] text-muted uppercase">Needed</span>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      {others.length > 0 ? (
        <Card className="grid gap-4 p-6 sm:p-7" aria-labelledby="others-h">
          <CardHeading id="others-h" title="In conversation" />
          <ul className="grid">
            {others.map((v) => (
              <li key={v.id} className="flex items-baseline justify-between gap-4 border-b border-rule py-3 last:border-b-0">
                <span className="min-w-0">
                  <span className="block">{v.name}</span>
                  <span className="block text-xs text-muted">{VENDOR_CATEGORY_LABEL[v.category]}</span>
                </span>
                <span className="text-right text-sm text-cocoa">
                  {VENDOR_STATUS_LABEL[v.status]}
                  {v.quotedCents ? <span className="num block text-xs text-muted">Quote {formatCents(v.quotedCents)}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <ComingSoon
        phase={2}
        items={[
          "Add vendors, contacts, quotes and contracts",
          "A page per vendor with payments, tasks, appointments and a call log",
          "Tick off questions during calls",
        ]}
      />
    </div>
  );
}
