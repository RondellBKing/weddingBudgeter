import Link from "next/link";
import type { ReactNode } from "react";
import { formatClockTime } from "@/lib/dates";
import { durationMinutes, formatDuration, type ScheduleRow } from "@/lib/domain/timeline";

// One day's run of show as a list: time, duration, what, where, who, vendor, notes.
// Stored items link to their edit page; derived rows (venue opening, vendor arrivals) say where
// they come from and link there instead.

const linkClass = "text-rose-ink underline-offset-4 hover:text-chocolate hover:underline";

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 grid-cols-[3.6rem_minmax(0,1fr)] items-baseline gap-x-1.5 sm:flex sm:gap-1.5">
      <dt className="label-caps shrink-0 text-[10px]">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

function Source({ row }: { row: ScheduleRow }) {
  if (row.source === "vendor" && row.vendor) {
    return (
      <p className="mt-1 text-[13px] text-muted">
        <Link href={`/vendors/${row.vendor.id}`} className={linkClass}>
          {row.vendor.name}
        </Link>
        <span> · arrival time from their vendor page</span>
      </p>
    );
  }
  if (row.source === "venue") {
    return (
      <p className="mt-1 text-[13px] text-muted">
        {row.location ? `${row.location} · ` : null}
        <Link href="/settings" className={linkClass}>
          from Settings
        </Link>
      </p>
    );
  }
  return null;
}

export function RunOfShow({
  rows,
  label,
  highlightTime = null,
  compact = false,
}: {
  rows: ScheduleRow[];
  label: string;
  /** Start time of the moment to set apart (the ceremony). */
  highlightTime?: string | null;
  compact?: boolean;
}) {
  return (
    <ol aria-label={label} className="grid">
      {rows.map((row) => {
        const minutes = durationMinutes(row.startTime, row.endTime);
        const isItem = row.source === "item" && row.itemId;
        const highlight = isItem && highlightTime !== null && row.startTime === highlightTime;
        const hasMeta = row.location || row.lead || row.involves || row.vendor;
        return (
          <li
            key={row.key}
            id={isItem ? `item-${row.itemId}` : undefined}
            className={`grid scroll-mt-24 grid-cols-[4.9rem_minmax(0,1fr)] gap-x-4 border-b border-rule last:border-b-0 sm:grid-cols-[7.25rem_minmax(0,1fr)_auto] sm:gap-x-6 target:bg-linen/70 ${
              compact ? "py-3" : "py-4 sm:py-5"
            } ${highlight ? "-mx-3 rounded-[3px] bg-linen/60 px-3 ring-1 ring-gold/40 sm:-mx-4 sm:px-4" : ""}`}
          >
            <div className="num leading-tight">
              <span className={`block font-display whitespace-nowrap ${compact ? "text-[18px]" : "text-[19px] sm:text-[23px]"}`}>
                {formatClockTime(row.startTime)}
              </span>
              {row.endTime ? <span className="block text-[12px] whitespace-nowrap text-cocoa">to {formatClockTime(row.endTime)}</span> : null}
              {minutes ? (
                <span className="mt-0.5 block text-[10.5px] font-medium tracking-[0.1em] whitespace-nowrap text-muted uppercase">
                  {formatDuration(minutes)}
                </span>
              ) : null}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                {isItem ? (
                  <Link href={`/timeline/${row.itemId}`} className="text-[16px] leading-snug text-chocolate hover:text-rose-ink">
                    {row.title}
                  </Link>
                ) : (
                  <span className="text-[16px] leading-snug text-cocoa">{row.title}</span>
                )}
                {highlight && !/ceremony/i.test(row.title) ? <span className="label-caps text-[10px] text-rose-ink">Ceremony time</span> : null}
                {row.isDemo ? <span className="text-[10px] font-semibold tracking-[0.12em] text-gold-ink uppercase">Demo</span> : null}
              </div>
              <Source row={row} />
              {isItem && hasMeta ? (
                <dl className="mt-1.5 grid gap-y-1 text-[13px] text-cocoa sm:flex sm:flex-wrap sm:gap-x-5">
                  {row.location ? <Meta label="Where">{row.location}</Meta> : null}
                  {row.lead ? <Meta label="Lead">{row.lead}</Meta> : null}
                  {row.involves ? <Meta label="With">{row.involves}</Meta> : null}
                  {row.vendor ? (
                    <Meta label="Vendor">
                      <Link href={`/vendors/${row.vendor.id}`} className={linkClass}>
                        {row.vendor.name}
                      </Link>
                    </Meta>
                  ) : null}
                </dl>
              ) : null}
              {isItem && row.notes ? <p className="mt-1.5 max-w-prose text-[13px] leading-relaxed whitespace-pre-line text-muted">{row.notes}</p> : null}
            </div>

            <div className="hidden pt-1 sm:block">
              {isItem ? (
                <Link href={`/timeline/${row.itemId}`} className="text-[12px] text-muted underline-offset-4 hover:text-rose-ink hover:underline">
                  Edit<span className="sr-only"> {row.title}</span>
                </Link>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
