import type { ReactNode } from "react";

export type Tone = "on-track" | "due-soon" | "overdue" | "neutral";

const TEXT: Record<Tone, string> = {
  "on-track": "text-garden-ink",
  "due-soon": "text-gold-ink",
  overdue: "text-brick",
  neutral: "text-muted",
};

const DOT: Record<Tone, string> = {
  "on-track": "bg-garden",
  "due-soon": "bg-gold",
  overdue: "bg-brick",
  neutral: "bg-rule-strong",
};

export function toneText(tone: Tone) {
  return TEXT[tone];
}

/** Status is always a word plus a color, never color alone. */
export function ToneBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase ${TEXT[tone]}`}>
      <span aria-hidden className={`size-2 rounded-full ${DOT[tone]}`} />
      {children}
    </span>
  );
}
