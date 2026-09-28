import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { ToneBadge, type Tone } from "@/components/ui/Tone";
import type { Impact } from "@/lib/domain/guests";
import { formatCents } from "@/lib/money";

export const STEPS = [
  { key: "file", label: "Your file" },
  { key: "columns", label: "Columns" },
  { key: "review", label: "Review" },
  { key: "done", label: "Done" },
] as const;
export type StepKey = (typeof STEPS)[number]["key"];

/** 1 Your file · 2 Columns · 3 Review · 4 Done */
export function StepTrail({ current }: { current: StepKey }) {
  const at = STEPS.findIndex((s) => s.key === current);
  return (
    <ol aria-label="Import steps" className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {STEPS.map((s, i) => {
        const done = i < at;
        const here = i === at;
        return (
          <li key={s.key} aria-current={here ? "step" : undefined} className="flex items-center gap-3">
            {i > 0 ? <span aria-hidden className={`h-px w-5 sm:w-10 ${done || here ? "bg-gold/60" : "bg-rule-strong"}`} /> : null}
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className={`grid size-7 place-items-center rounded-full border text-[12px] ${
                  here
                    ? "border-chocolate bg-chocolate text-ivory"
                    : done
                      ? "border-garden bg-garden text-paper"
                      : "border-rule-strong text-muted"
                }`}
              >
                {done ? <Icon name="check" size={13} strokeWidth={2.2} /> : <span className="num">{i + 1}</span>}
              </span>
              <span className={`text-[12px] font-medium tracking-[0.1em] uppercase ${here ? "text-chocolate" : "text-muted"} ${here ? "" : "max-sm:sr-only"}`}>
                {s.label}
                {done ? <span className="sr-only"> (done)</span> : null}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function headroomStatus(impact: Impact): { tone: Tone; label: string; words: string } {
  const h = impact.headroom;
  if (h.unlimited) return { tone: "on-track", label: "On track", words: "No per-person charge is set" };
  if (h.guestsUntilGone === null) return { tone: "overdue", label: "Over budget", words: `${formatCents(h.overBudgetCents)} over budget before any extra guests` };
  if (h.guestsUntilGone < 0) {
    const n = -h.guestsUntilGone;
    return { tone: "overdue", label: "Over budget", words: `${n} ${n === 1 ? "guest" : "guests"} past break-even` };
  }
  const n = h.guestsUntilGone;
  const words = `${n} ${n === 1 ? "guest" : "guests"} until the contingency is gone`;
  if (n === 0) return { tone: "due-soon", label: "Contingency fully used", words };
  if (n < 10) return { tone: "due-soon", label: "Getting close", words };
  return { tone: "on-track", label: "On track", words };
}

function Metric({ label, after, before, same, emphasis }: { label: string; after: ReactNode; before: ReactNode; same: boolean; emphasis?: string }) {
  return (
    <div className="grid content-start gap-1.5 py-4 sm:py-0">
      <span className="label-caps text-[10px]">{label}</span>
      <span className={`num font-display text-[40px] leading-none ${emphasis ?? ""}`}>{after}</span>
      <span className="text-[12.5px] text-muted">{same ? "No change" : <>Now {before}</>}</span>
    </div>
  );
}

const untilLabel = (i: Impact) => {
  const u = i.headroom.guestsUntilGone;
  if (i.headroom.unlimited) return "—";
  if (u === null) return "Over";
  return u < 0 ? `−${-u}` : String(u);
};

/** Headcount, overage and headroom before and after the import, with the result's status. */
export function ImpactCompare({ before, after }: { before: Impact; after: Impact }) {
  const status = headroomStatus(after);
  const hc = after.headcount;
  const rule = after.headroom;
  return (
    <div className="grid gap-5">
      <div className="grid divide-y divide-rule sm:grid-cols-3 sm:gap-6 sm:divide-y-0">
        <Metric
          label="Headcount after import"
          after={hc.headcount}
          before={before.headcount.headcount}
          same={hc.headcount === before.headcount.headcount && hc.source === before.headcount.source}
        />
        <Metric
          label={`Overage above ${rule.includedHeadcount}`}
          after={formatCents(rule.overageCents)}
          before={formatCents(before.headroom.overageCents)}
          same={rule.overageCents === before.headroom.overageCents}
        />
        <Metric
          label="Guests until the contingency is gone"
          after={untilLabel(after)}
          before={untilLabel(before)}
          same={untilLabel(after) === untilLabel(before)}
          emphasis={status.tone === "overdue" ? "text-brick" : undefined}
        />
      </div>
      <div className="grid gap-2 border-t border-rule pt-4">
        <ToneBadge tone={status.tone}>
          {status.label} · {status.words}
        </ToneBadge>
        <p className="text-[13px] leading-relaxed text-muted">
          {hc.source === "guest-list"
            ? `${hc.people} ${hc.people === 1 ? "person" : "people"} on the list who haven't declined (pending counts as coming)`
            : `No guest list yet, so the plan keeps using the planned headcount of ${hc.people}`}
          {hc.vendorMeals > 0 ? `, plus ${hc.vendorMeals} vendor meals` : ""}. The venue includes {rule.includedHeadcount}; each
          person above that is {formatCents(rule.perPersonAllInCents)}.
          {before.headcount.source === "target" && hc.source === "guest-list"
            ? ` Until now the plan used the planned headcount of ${before.headcount.people}; from here on it follows the list.`
            : ""}
        </p>
      </div>
    </div>
  );
}
