import { formatDate, type CalendarDate } from "@/lib/dates";
import type { Headroom, ProjectedHeadcount } from "@/lib/domain/headcount";
import { formatCents } from "@/lib/money";
import { ToneBadge, type Tone } from "@/components/ui/Tone";

/**
 * The headcount-vs-included meter. The headline is people of headroom left before the
 * contingency is gone, because every person above the included count is a payment.
 */
export function HeadcountCard({
  headroom,
  headcount,
  contingencyAvailable,
  overageDue,
}: {
  headroom: Headroom;
  headcount: ProjectedHeadcount;
  contingencyAvailable: number;
  overageDue: CalendarDate | null;
}) {
  const { includedHeadcount, breakEvenHeadcount, guestsUntilGone } = headroom;
  const hc = headcount.headcount;

  let tone: Tone = "on-track";
  let status = "On track";
  let big: string;
  let words: string;
  if (headroom.unlimited) {
    big = "—";
    words = "no per-person charge is set";
  } else if (guestsUntilGone === null) {
    tone = "overdue";
    status = "Over budget";
    big = formatCents(headroom.overBudgetCents);
    words = "over budget before counting any extra guests";
  } else if (guestsUntilGone >= 0) {
    big = guestsUntilGone.toLocaleString("en-US");
    words = guestsUntilGone === 1 ? "guest until the contingency is gone" : "guests until the contingency is gone";
    if (guestsUntilGone === 0) {
      tone = "due-soon";
      status = "Contingency fully used";
    } else if (guestsUntilGone < 10) {
      tone = "due-soon";
      status = "Getting close";
    }
  } else {
    tone = "overdue";
    status = "Over budget";
    big = (-guestsUntilGone).toLocaleString("en-US");
    words = `${-guestsUntilGone === 1 ? "guest" : "guests"} past break-even · ${formatCents(headroom.overBudgetCents)} over budget`;
  }

  // Track scale: from 100 people up to comfortably past break-even and the current count.
  const min = Math.max(0, Math.min(100, hc - 5));
  const max = Math.max(175, (breakEvenHeadcount ?? includedHeadcount) + 20, hc + 10);
  const pct = (n: number) => ((Math.min(Math.max(n, min), max) - min) / (max - min)) * 100;
  const pos = (n: number) => `${pct(n).toFixed(2)}%`;
  const be = breakEvenHeadcount ?? includedHeadcount;
  // "125 included" and "145 buffer gone" sit close together on a phone, and on any screen when
  // the scale is wide (a short guest list): then the second label drops onto its own line.
  const stagger = pct(be) - pct(includedHeadcount) < 26;

  return (
    <div className="grid gap-5">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className={`num font-display text-[64px] leading-[0.9] sm:text-[72px] ${tone === "overdue" ? "text-brick" : ""}`}>
            {big}
          </span>
          <span className="font-display text-2xl leading-tight text-cocoa italic">{words}</span>
        </div>
        <ToneBadge tone={tone}>{status}</ToneBadge>
      </div>

      <div className={`relative h-16 ${stagger ? "" : "sm:h-11"}`} aria-hidden>
        <div className="absolute inset-x-0 top-3.5 flex h-2 gap-0.5">
          <div className="h-full rounded-[1px] bg-linen" style={{ width: pos(includedHeadcount) }} />
          <div
            className="h-full rounded-[1px] bg-gold/55"
            style={{ width: `calc(${pos(be)} - ${pos(includedHeadcount)})` }}
          />
          <div
            className="h-full flex-1 rounded-[1px]"
            style={{ background: "repeating-linear-gradient(135deg, #9c3b2e 0 2px, #ead3cd 2px 6px)" }}
          />
        </div>
        <div className="absolute top-1.5 h-6 w-0.5 -translate-x-px bg-chocolate" style={{ left: pos(hc) }}>
          <span className="absolute -top-1 -left-[3px] size-2 rounded-full border-2 border-paper bg-chocolate" />
        </div>
        <span className="num absolute top-7 text-[11px] text-muted" style={{ left: 0 }}>
          {min}
        </span>
        <span className="num absolute top-7 -translate-x-1/2 text-[11px] whitespace-nowrap text-muted" style={{ left: pos(includedHeadcount) }}>
          {includedHeadcount} included
        </span>
        {breakEvenHeadcount !== null && breakEvenHeadcount !== includedHeadcount ? (
          <span
            className={`num absolute -translate-x-1/2 text-[11px] whitespace-nowrap text-muted top-12 ${stagger ? "" : "sm:top-7"}`}
            style={{ left: pos(breakEvenHeadcount) }}
          >
            {breakEvenHeadcount} buffer gone
          </span>
        ) : null}
        <span className="num absolute top-7 right-0 text-[11px] text-muted">{max}</span>
      </div>

      <dl className="grid grid-cols-1 border-t border-rule sm:grid-cols-3">
        <div className="grid gap-1 border-b border-rule py-3 sm:border-b-0">
          <dt className="label-caps">Headcount now</dt>
          <dd className="num text-xl">{hc.toLocaleString("en-US")}</dd>
        </div>
        <div className="grid gap-1 border-b border-rule py-3 sm:border-b-0">
          <dt className="label-caps">Overage{overageDue ? ` due ${formatDate(overageDue, "short")}` : ""}</dt>
          <dd className="num text-xl">{formatCents(headroom.overageCents)}</dd>
        </div>
        <div className="grid gap-1 py-3">
          <dt className="label-caps">Contingency left</dt>
          <dd className={`num text-xl ${contingencyAvailable < 0 ? "text-brick" : ""}`}>{formatCents(contingencyAvailable)}</dd>
        </div>
      </dl>

      <div className="grid gap-1 text-[13px] text-muted">
        <p>
          Every person after {includedHeadcount} costs {formatCents(headroom.perPersonAllInCents)}; a couple is{" "}
          {formatCents(headroom.perPersonAllInCents * 2)}.
          {headroom.unusedIncluded > 0
            ? ` ${headroom.unusedIncluded} included places are unused. The contract bills ${includedHeadcount} either way.`
            : ""}
        </p>
        <p>
          {headcount.source === "target"
            ? `Using your planned headcount of ${headcount.people} until the guest list is imported.`
            : `${headcount.people} people on the guest list who haven't declined.`}
          {headcount.vendorMeals > 0 ? ` Includes ${headcount.vendorMeals} vendor meals.` : ""}
        </p>
      </div>
    </div>
  );
}
