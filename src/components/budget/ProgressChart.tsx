import { formatCents } from "@/lib/money";

// Payment progress per category, each against its own estimate: paid, committed but not yet
// paid, and the rest of the estimate, as one thin bar with the amounts written beside it.
// Anything over the estimate runs past the end in brick.

export type ProgressDatum = {
  name: string;
  paid: number;
  owed: number;
  open: number;
  over: number;
  estimate: number;
};

const SERIES = [
  { key: "paid", label: "Paid", className: "bg-desert-rose" },
  { key: "owed", label: "Committed, not yet paid", className: "bg-dusty-rose" },
  { key: "open", label: "Not yet committed", className: "bg-linen" },
  { key: "over", label: "Over estimate", className: "bg-brick" },
] as const;

function pct(part: number, whole: number) {
  return whole > 0 ? `${(part / whole) * 100}%` : "0%";
}

export function ProgressChart({ data }: { data: ProgressDatum[] }) {
  return (
    <div className="grid gap-5">
      <ul className="flex flex-wrap gap-x-5 gap-y-1.5" aria-label="Key">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-[12px] text-cocoa">
            <span aria-hidden className={`size-2.5 rounded-[2px] ring-1 ring-rule-strong/60 ${s.className}`} />
            {s.label}
          </li>
        ))}
      </ul>
      <ul className="grid">
        {data.map((d) => {
          const committed = d.paid + d.owed + d.over;
          const whole = Math.max(d.estimate, committed);
          return (
            <li
              key={d.name}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 border-b border-rule py-2.5 last:border-b-0 sm:grid-cols-[13rem_minmax(0,1fr)_10rem]"
            >
              <span className="min-w-0 text-[13.5px] leading-snug text-chocolate">{d.name}</span>
              <span
                role="img"
                aria-label={`${d.name}: ${formatCents(d.paid)} paid, ${formatCents(committed)} committed of ${formatCents(d.estimate)}${d.over > 0 ? `, ${formatCents(d.over)} over` : ""}`}
                className="col-span-2 row-start-2 flex h-2 overflow-hidden rounded-full bg-linen sm:col-span-1 sm:row-start-auto"
              >
                {SERIES.map((s) =>
                  d[s.key] > 0 ? <span key={s.key} className={`h-full ${s.className} [&+&]:border-l [&+&]:border-paper`} style={{ width: pct(d[s.key], whole) }} /> : null,
                )}
              </span>
              <span className="num text-right text-[12.5px] whitespace-nowrap text-cocoa">
                {formatCents(committed)} <span className="text-muted">of {formatCents(d.estimate)}</span>
                {d.over > 0 ? <span className="block text-[11px] font-semibold tracking-[0.08em] text-brick uppercase">{formatCents(d.over)} over</span> : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
