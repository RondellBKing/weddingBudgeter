import Link from "next/link";
import type { ReactNode } from "react";
import { PrintButton } from "@/components/ui/PrintButton";
import { Icon } from "@/components/ui/Icon";
import { requireSession } from "@/lib/auth/require-session";
import { loadBinder } from "@/lib/data/timeline";
import { addDays, formatClockTime, formatDate, type CalendarDate } from "@/lib/dates";
import {
  afterMidnight,
  daySchedule,
  durationMinutes,
  formatDuration,
  timelineDays,
  type ScheduleRow,
} from "@/lib/domain/timeline";
import { telHref } from "@/lib/domain/vendor-contact";
import { VENDOR_CATEGORY_LABEL } from "@/lib/domain/vendors";
import { printCss } from "@/components/ui/print-css";

export const metadata = { title: "Day-of Binder" };

// Printing hides the app around this page; see printCss.
const PRINT_CSS = printCss(
  "binder-print",
  `
  .binder-print a { text-decoration: none !important; }
  /* Chromium can overlap grid rows at a page break, so the long lists flow as blocks on paper. */
  .binder-print article, .binder-print article > section, .binder-print .print-flow,
  .binder-print ol, .binder-print ul { display: block !important; }
  .binder-print article > * + * { margin-top: 0.28in !important; }
  .binder-print article > section > * + *, .binder-print .print-flow > * + * { margin-top: 6px !important; }`,
);

const linkClass = "text-rose-ink underline-offset-4 hover:text-chocolate hover:underline";

function SectionHeading({ id, lead, word, aside }: { id: string; lead: string; word: string; aside?: ReactNode }) {
  return (
    <div className="print-rule flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule-strong pb-2 break-after-avoid">
      <h2 id={id} className="text-[28px] leading-tight print:text-[16pt]">
        {lead} <em className="italic">{word}</em>
      </h2>
      {aside ? <span className="num text-[12px] text-muted print:text-[8.5pt]">{aside}</span> : null}
    </div>
  );
}

function Who({ row }: { row: ScheduleRow }) {
  const bits: Array<[string, ReactNode]> = [];
  if (row.location) bits.push(["Where", row.location]);
  if (row.lead) bits.push(["Lead", row.lead]);
  if (row.involves) bits.push(["With", row.involves]);
  if (row.source === "item" && row.vendor) bits.push(["Vendor", row.vendor.name]);
  if (bits.length === 0) return null;
  return (
    <dl className="grid content-start gap-0.5 text-[12.5px] text-cocoa print:text-[8.5pt]">
      {bits.map(([label, value]) => (
        <div key={label} className="grid min-w-0 grid-cols-[3.6rem_minmax(0,1fr)] items-baseline gap-x-1.5 sm:flex print:flex">

          <dt className="label-caps shrink-0 text-[9.5px] print:text-[6.5pt]">{label}</dt>
          <dd className="min-w-0 break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Schedule({ rows, label }: { rows: ScheduleRow[]; label: string }) {
  return (
    <ol aria-label={label} className="grid">
      {rows.map((row) => {
        const minutes = durationMinutes(row.startTime, row.endTime);
        return (
          <li
            key={row.key}
            className="print-hair grid grid-cols-[5.25rem_minmax(0,1fr)] gap-x-4 gap-y-1.5 border-b border-rule py-2.5 break-inside-avoid sm:grid-cols-[6.5rem_minmax(0,1fr)_minmax(0,15rem)] print:grid-cols-[1in_minmax(0,1fr)_2.4in] print:gap-x-3 print:py-[5px]"
          >
            <span className="num row-span-2 leading-tight sm:row-span-1 print:row-span-1">
              <span className="block text-[15px] font-medium whitespace-nowrap print:text-[10pt]">{formatClockTime(row.startTime)}</span>
              {row.endTime ? (
                <span className="block text-[11.5px] whitespace-nowrap text-muted print:text-[8pt]">to {formatClockTime(row.endTime)}</span>
              ) : null}
              {minutes ? <span className="block text-[11.5px] whitespace-nowrap text-muted print:text-[8pt]">{formatDuration(minutes)}</span> : null}
            </span>
            <span className="min-w-0">
              <span className="block text-[14.5px] leading-snug print:text-[10pt]">{row.title}</span>
              {row.source === "vendor" && row.vendor ? (
                <span className="block text-[12px] text-muted print:text-[8pt]">{row.vendor.name}</span>
              ) : null}
              {row.notes ? (
                <span className="block text-[12px] leading-snug whitespace-pre-line text-muted print:text-[8pt]">{row.notes}</span>
              ) : null}
            </span>
            <span className="col-start-2 min-w-0 sm:col-start-auto">
              <Who row={row} />
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function dayTitle(date: CalendarDate): string {
  return formatDate(date, "weekday-long").replace(/, \d{4}$/, "");
}

export default async function BinderPage() {
  await requireSession();
  const { plan, items, vendors, arrivals, rainPlan, party } = await loadBinder();
  const { settings, today } = plan;
  const wedding = settings.weddingDate;
  const [rehearsal, , after] = timelineDays(wedding);
  const common = { items, weddingDate: wedding, vendors: arrivals, venueAccessTime: settings.venueAccessTime, venueName: settings.venueName };
  const weddingRows = daySchedule({ date: wedding, ...common });
  const nextRows = daySchedule({ date: addDays(wedding, 1), ...common });
  const night = afterMidnight(nextRows, settings.venueAccessTime);
  const nightKeys = new Set(night.map((r) => r.key));
  const afterRows = nextRows.filter((r) => !nightKeys.has(r.key));
  const rehearsalRows = daySchedule({ date: rehearsal.date, ...common });
  const sides = [...new Set(party.map((m) => m.side))].map((side) => ({ side, members: party.filter((m) => m.side === side) }));

  return (
    <div className="binder-print grid gap-8 print:gap-6">
      <style>{PRINT_CSS}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/timeline" className="inline-flex items-center gap-1.5 text-[13px] text-rose-ink hover:text-chocolate">
          <Icon name="arrow" size={14} className="rotate-180" />
          Back to the timeline
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-[13px] text-muted sm:inline">Letter, portrait. Print one for the coordinator and one for each of you.</span>
          <PrintButton />
        </div>
      </div>

      <article className="grid gap-10 rounded-[3px] border border-rule bg-paper px-5 py-8 shadow-[0_1px_2px_rgba(62,43,34,0.04),0_8px_24px_-16px_rgba(62,43,34,0.18)] sm:px-10 sm:py-12 print:gap-7 print:border-0 print:bg-white print:p-0">
        <header className="print-rule grid justify-items-center gap-2 border-b border-rule pb-7 text-center print:pb-4">
          <p className="label-caps text-rose-ink">Day-of binder</p>
          <h1 className="text-[40px] leading-none sm:text-[52px] print:text-[26pt]">
            {settings.partnerOneName} <em className="italic">&amp;</em> {settings.partnerTwoName}
          </h1>
          <p className="text-[13px] tracking-[0.18em] text-cocoa uppercase print:text-[9pt]">
            {formatDate(wedding, "weekday-long")} · {settings.venueName}
          </p>
          <p className="num text-[13px] text-muted print:text-[9pt]">Printed {formatDate(today, "medium")}. All times are local to the venue.</p>
        </header>

        {/* At a glance */}
        <section aria-labelledby="glance-h" className="grid gap-4">
          <SectionHeading id="glance-h" lead="At a" word="glance" />
          <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-[14px] sm:grid-cols-4 print:grid-cols-4 print:text-[9.5pt]">
            <div className="col-span-2 grid content-start gap-1">
              <dt className="label-caps text-[10px]">Venue</dt>
              <dd>
                {settings.venueName}
                <span className="block text-cocoa">{settings.venueAddress}</span>
              </dd>
            </div>
            <div className="grid content-start gap-1">
              <dt className="label-caps text-[10px]">Vendors from</dt>
              <dd className="num">{formatClockTime(settings.venueAccessTime)}</dd>
            </div>
            <div className="grid content-start gap-1">
              <dt className="label-caps text-[10px]">Ceremony</dt>
              <dd className="num">{settings.ceremonyTime ? formatClockTime(settings.ceremonyTime) : <span className="text-muted">Not set yet</span>}</dd>
            </div>
          </dl>
        </section>

        {/* Wedding-day run of show */}
        <section aria-labelledby="show-h" className="grid gap-3">
          <SectionHeading id="show-h" lead="Run of" word="show" aside={dayTitle(wedding)} />
          {weddingRows.length === 0 ? (
            <p className="text-cocoa">
              Nothing on the wedding day yet. Build it on the <Link href="/timeline" className={linkClass}>timeline</Link>.
            </p>
          ) : (
            <Schedule rows={weddingRows} label="Wedding day" />
          )}
          {night.length > 0 ? (
            <div className="print-flow grid gap-1 pt-2">
              <h3 className="label-caps break-after-avoid">After midnight · {dayTitle(addDays(wedding, 1))}</h3>
              <Schedule rows={night} label="After midnight" />
            </div>
          ) : null}
        </section>

        {/* Vendor contact sheet */}
        <section aria-labelledby="vendors-h" className="grid gap-3 break-before-page">
          <SectionHeading
            id="vendors-h"
            lead="Vendor"
            word="contacts"
            aside={`${vendors.length} booked · ${vendors.reduce((n, v) => n + v.mealsRequired, 0)} vendor meals`}
          />
          {vendors.length === 0 ? (
            <p className="text-cocoa">No booked vendors yet.</p>
          ) : (
            <div className="print-flow grid">
              <div
                aria-hidden
                className="label-caps hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)_5.5rem_3.5rem] gap-x-4 pb-1 text-[10px] sm:grid print:grid print:text-[6.5pt]"
              >
                <span>Vendor</span>
                <span>Contact</span>
                <span>Arrives</span>
                <span className="text-right">Meals</span>
              </div>
              <ul className="grid">
                {vendors.map((v) => (
                  <li
                    key={v.id}
                    className="print-hair grid grid-cols-2 gap-x-4 gap-y-1.5 border-b border-rule py-2.5 break-inside-avoid sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)_5.5rem_3.5rem] print:grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)_5.5rem_3.5rem] print:py-[5px] print:text-[9pt]"
                  >
                    <span className="col-span-2 min-w-0 sm:col-span-1 print:col-span-1">
                      <span className="block text-[14.5px] leading-snug print:text-[10pt]">{v.name}</span>
                      <span className="block text-[12px] text-muted print:text-[8pt]">{VENDOR_CATEGORY_LABEL[v.category]}</span>
                    </span>
                    <span className="col-span-2 min-w-0 text-[13px] leading-snug sm:col-span-1 print:col-span-1 print:text-[9pt]">
                      {v.contactName ? <span className="block">{v.contactName}</span> : null}
                      {v.phone ? (
                        <a href={telHref(v.phone)} className={`num block ${linkClass}`}>
                          {v.phone}
                        </a>
                      ) : null}
                      {v.email ? (
                        <a href={`mailto:${v.email}`} className={`block break-all ${linkClass}`}>
                          {v.email}
                        </a>
                      ) : null}
                      {!v.contactName && !v.phone && !v.email ? <span className="text-muted italic">No contact details yet</span> : null}
                    </span>
                    <span className="num text-[13px] print:text-[9pt]">
                      <span className="label-caps mr-1.5 text-[9.5px] sm:hidden print:hidden">Arrives</span>
                      {v.arrivalTime ? formatClockTime(v.arrivalTime) : <span className="text-muted">Not set</span>}
                    </span>
                    <span className="num text-right text-[13px] sm:text-right print:text-[9pt]">
                      <span className="label-caps mr-1.5 text-[9.5px] sm:hidden print:hidden">Meals</span>
                      {v.mealsRequired}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Wedding party */}
        <section aria-labelledby="party-h" className="grid gap-3">
          <SectionHeading id="party-h" lead="Wedding" word="party" aside={`${party.length} attendants`} />
          {party.length === 0 ? (
            <p className="text-cocoa">No wedding party yet.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 sm:gap-8 print:grid-cols-2 print:gap-6">
              {sides.map(({ side, members }) => (
                <section key={side} aria-label={side} className="grid content-start gap-1">
                  <h3 className="label-caps">{side}</h3>
                  <ul className="grid">
                    {members.map((m) => (
                      <li key={m.id} className="print-hair grid gap-0.5 border-b border-rule py-2 break-inside-avoid print:py-[4px]">
                        <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <span className={`text-[14.5px] print:text-[10pt] ${m.isPlaceholder ? "text-muted italic" : ""}`}>{m.name}</span>
                          {m.isPlaceholder ? null : <span className="text-[12px] text-muted print:text-[8pt]">{m.role}</span>}
                        </span>
                        <span className="flex flex-wrap gap-x-4 text-[12.5px] text-cocoa print:text-[8.5pt]">
                          {m.phone ? (
                            <a href={telHref(m.phone)} className={`num ${linkClass}`}>
                              {m.phone}
                            </a>
                          ) : null}
                          {m.email ? (
                            <a href={`mailto:${m.email}`} className={`break-all ${linkClass}`}>
                              {m.email}
                            </a>
                          ) : null}
                          {!m.phone && !m.email ? <span className="text-muted">No phone or email yet</span> : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </section>

        {/* Rain plan */}
        <section aria-labelledby="rain-h" className="grid gap-3 break-inside-avoid">
          <SectionHeading id="rain-h" lead="Rain" word="plan" />
          {rainPlan ? (
            <p className="max-w-prose text-[14.5px] leading-relaxed whitespace-pre-line print:text-[10pt]">{rainPlan}</p>
          ) : (
            <p className="text-cocoa">
              No rain plan yet. Write one on the <Link href="/timeline" className={linkClass}>timeline</Link>.
            </p>
          )}
        </section>

        {rehearsalRows.length > 0 ? (
          <section aria-labelledby="rehearsal-h" className="grid gap-3 break-inside-avoid">
            <SectionHeading id="rehearsal-h" lead="Rehearsal" word="day" aside={dayTitle(rehearsal.date)} />
            <Schedule rows={rehearsalRows} label="Rehearsal day" />
          </section>
        ) : null}

        {afterRows.length > 0 ? (
          <section aria-labelledby="after-h" className="grid gap-3 break-inside-avoid">
            <SectionHeading id="after-h" lead="The day" word="after" aside={dayTitle(after.date)} />
            <Schedule rows={afterRows} label="The day after" />
          </section>
        ) : null}
      </article>
    </div>
  );
}
