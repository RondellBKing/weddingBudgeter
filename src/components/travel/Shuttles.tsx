import Link from "next/link";
import { deleteShuttle } from "@/app/(app)/travel/actions";
import { ConfirmButton } from "@/components/form/ConfirmButton";
import { Tag } from "@/components/guests/bits";
import { Icon } from "@/components/ui/Icon";
import type { ShuttleView } from "@/lib/data/travel";
import { addDays, formatClockTime, formatDate, type CalendarDate } from "@/lib/dates";
import type { ShuttleDay } from "@/lib/domain/travel";
import { Reveal, RowEditor } from "./RowEditor";
import { ShuttleForm, type ShuttleValues } from "./TravelForms";

type Option = { value: string; label: string };

function dayTag(date: CalendarDate, weddingDate: CalendarDate): string | null {
  if (date === weddingDate) return "Wedding day";
  if (date === addDays(weddingDate, -1)) return "Rehearsal day";
  if (date === addDays(weddingDate, 1)) return "Day after";
  return null;
}

function values(r: ShuttleView): ShuttleValues {
  return {
    date: r.date,
    departTime: r.departTime,
    fromPlace: r.fromPlace,
    toPlace: r.toPlace,
    seats: r.seats === null ? "" : String(r.seats),
    vendorId: r.vendor?.id ?? "",
    notes: r.notes ?? "",
  };
}

function Run({ r }: { r: ShuttleView }) {
  return (
    <div className="grid gap-x-5 gap-y-1 sm:grid-cols-[6.25rem_minmax(0,1fr)] sm:items-baseline">
      <p className="num font-display text-[24px] leading-none">{formatClockTime(r.departTime)}</p>
      <div className="grid gap-1">
        <p className="flex flex-wrap items-center gap-x-2 text-[15px]">
          <span>{r.fromPlace}</span>
          <Icon name="arrow" size={14} className="shrink-0 text-muted" />
          <span className="sr-only">to</span>
          <span>{r.toPlace}</span>
        </p>
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-cocoa">
          <span className={`num ${r.seats === null ? "text-muted" : ""}`}>{r.seats === null ? "Seats not set" : `${r.seats} seats`}</span>
          {r.vendor ? (
            <Link href={`/vendors/${r.vendor.id}`} className="text-rose-ink underline-offset-4 hover:text-chocolate hover:underline">
              {r.vendor.name}
            </Link>
          ) : null}
          {r.isDemo ? <Tag tone="demo">Demo</Tag> : null}
        </p>
        {r.notes ? <p className="text-[13px] whitespace-pre-line text-muted">{r.notes}</p> : null}
      </div>
    </div>
  );
}

export function Shuttles({
  days,
  weddingDate,
  vendors,
}: {
  days: Array<ShuttleDay<ShuttleView>>;
  weddingDate: CalendarDate;
  vendors: Option[];
}) {
  const blank: ShuttleValues = { date: weddingDate, departTime: "", fromPlace: "", toPlace: "", seats: "", vendorId: "", notes: "" };
  return (
    <div className="grid gap-7">
      {days.length === 0 ? (
        <p className="max-w-prose text-[15px] leading-relaxed text-cocoa">
          No shuttle runs yet. Add each pickup as you plan it: hotel to the ceremony, and back again at the end of the night.
          Times are New York time on the day.
        </p>
      ) : (
        days.map((d) => {
          const tag = dayTag(d.date, weddingDate);
          return (
            <section key={d.date} aria-label={formatDate(d.date, "weekday-long")} className="grid">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule-strong pb-2">
                <h3 className="text-[22px] leading-tight">
                  {formatDate(d.date, "weekday-long")}
                  {tag ? <span className="label-caps ml-3 align-middle text-[10px] text-rose-ink">{tag}</span> : null}
                </h3>
                <span className="num text-xs text-muted">
                  {d.runs.length} {d.runs.length === 1 ? "run" : "runs"}
                  {d.seats > 0 ? ` · ${d.seats} seats` : ""}
                </span>
              </div>
              <ul>
                {d.runs.map((r) => (
                  <li key={r.id} className="border-b border-rule py-4 last:border-b-0">
                    <RowEditor
                      label={`the ${formatClockTime(r.departTime)} run from ${r.fromPlace}`}
                      editor={
                        <div className="grid gap-5">
                          <ShuttleForm id={r.id} values={values(r)} vendors={vendors} idPrefix={`shuttle-${r.id}-`} />
                          <div className="border-t border-rule pt-4">
                            <ConfirmButton action={deleteShuttle.bind(null, r.id)} question="Delete this shuttle run?" confirmLabel="Yes, delete">
                              Delete run
                            </ConfirmButton>
                          </div>
                        </div>
                      }
                    >
                      <Run r={r} />
                    </RowEditor>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
      <Reveal label="Add a shuttle run" defaultOpen={days.length === 0}>
        <ShuttleForm id={null} values={blank} vendors={vendors} idPrefix="add-shuttle-" />
      </Reveal>
    </div>
  );
}
