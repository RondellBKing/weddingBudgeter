import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { ToneBadge } from "@/components/ui/Tone";
import { rsvpDisplay, type RsvpStatus } from "@/lib/domain/guests";

/** RSVP as a word with its color: attending (garden), pending (gold), declined (quiet). */
export function RsvpBadge({ status }: { status: RsvpStatus | null }) {
  const r = rsvpDisplay(status);
  return <ToneBadge tone={r.tone}>{r.label}</ToneBadge>;
}

const TAG = {
  plain: "border border-rule-strong text-cocoa",
  rose: "bg-dusty-rose/30 text-chocolate",
  gold: "border border-gold/60 text-gold-ink",
  demo: "border border-dashed border-rule-strong text-muted",
} as const;

/** Small pill for flags like "Child" or "Wedding party". */
export function Tag({ children, tone = "plain" }: { children: ReactNode; tone?: keyof typeof TAG }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-px text-[11px] leading-[18px] whitespace-nowrap ${TAG[tone]}`}>
      {children}
    </span>
  );
}

/** A round check (done) or an open ring with a dot (needs a look), for checklists. */
export function CheckMark({ ok, label }: { ok: boolean; label: string }) {
  return ok ? (
    <span role="img" aria-label={label} className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-garden text-paper">
      <Icon name="check" size={12} strokeWidth={2.4} />
    </span>
  ) : (
    <span role="img" aria-label={label} className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-gold">
      <span className="size-1.5 rounded-full bg-gold" />
    </span>
  );
}
