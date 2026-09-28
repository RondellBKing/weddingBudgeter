import { Card } from "@/components/ui/Card";
import { percentInt } from "@/lib/money";
import type { SeatingCounts } from "@/lib/domain/seating";

/** Live counts across the top of the seating pages. Works in server and client components. */
export function SeatingSummary({ counts }: { counts: SeatingCounts }) {
  const over = counts.overCapacity.length;
  const cells: Array<{ value: number; label: string; tone?: "brick" }> = [
    { value: counts.guests, label: "guests coming" },
    { value: counts.seated, label: "seated" },
    { value: counts.unassigned, label: "still to seat" },
    { value: counts.tables, label: counts.tables === 1 ? "table" : "tables" },
    { value: counts.seats, label: "seats" },
    { value: over, label: over === 1 ? "table over capacity" : "tables over capacity", tone: over > 0 ? "brick" : undefined },
  ];
  const pct = percentInt(counts.seated, counts.guests);
  return (
    <Card as="section" aria-label="Seating at a glance" className="overflow-hidden p-0">
      <dl className="grid grid-cols-3 gap-px bg-rule xl:grid-cols-6">
        {cells.map((c) => (
          <div key={c.label} className="grid content-start gap-1.5 bg-paper px-4 py-4 sm:px-6 sm:py-5">
            <dt className={`order-last text-[13px] ${c.tone === "brick" ? "font-medium text-brick" : "text-muted"}`}>{c.label}</dt>
            <dd className={`num font-display text-[30px] leading-none sm:text-[38px] ${c.tone === "brick" ? "text-brick" : ""}`}>
              {c.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-2 border-t border-rule px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="label-caps">Seated</span>
          <span className="num text-sm text-cocoa">
            {counts.seated} of {counts.guests} guests
            {counts.seats > 0 ? ` · ${counts.openSeats} open ${counts.openSeats === 1 ? "seat" : "seats"}` : ""}
          </span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-[1px] bg-linen"
          role="meter"
          aria-label="Guests seated"
          aria-valuemin={0}
          aria-valuemax={counts.guests}
          aria-valuenow={counts.seated}
        >
          <div className="h-full bg-desert-rose transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
        {over > 0 ? (
          <p className="text-[13px] text-brick">
            <span className="font-semibold tracking-[0.12em] uppercase">Over capacity:</span>{" "}
            {counts.overCapacity.map((t) => `${t.label} (by ${t.over})`).join(", ")}
          </p>
        ) : null}
        {counts.declinedSeated > 0 ? (
          <p className="text-[13px] text-gold-ink">
            {counts.declinedSeated === 1 ? "1 guest who declined still has a seat." : `${counts.declinedSeated} guests who declined still have seats.`}{" "}
            They&apos;re marked at their tables; remove them to free the seats.
          </p>
        ) : null}
      </div>
    </Card>
  );
}
