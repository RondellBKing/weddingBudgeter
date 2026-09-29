import type { DecorStatus, DecorTone } from "@/lib/domain/design";

const TEXT: Record<DecorTone, string> = {
  neutral: "text-muted",
  progress: "text-rose-ink",
  "on-track": "text-garden-ink",
  "due-soon": "text-gold-ink",
  overdue: "text-brick",
};

const DOT: Record<DecorTone, string> = {
  neutral: "border border-rule-strong",
  progress: "bg-dusty-rose",
  "on-track": "bg-garden",
  "due-soon": "bg-gold",
  overdue: "bg-brick",
};

export function decorToneText(tone: DecorTone) {
  return TEXT[tone];
}

export function DecorDot({ tone }: { tone: DecorTone }) {
  return <span aria-hidden className={`inline-block size-2 shrink-0 rounded-full ${DOT[tone]}`} />;
}

/** A décor item's status: always the word, with a dot in its color. */
export function DecorStatusBadge({ status }: { status: DecorStatus }) {
  return (
    <span className={`inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] whitespace-nowrap uppercase ${TEXT[status.tone]}`}>
      <DecorDot tone={status.tone} />
      {status.label}
    </span>
  );
}
