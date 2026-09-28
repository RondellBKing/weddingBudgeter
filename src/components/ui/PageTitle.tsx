import type { ReactNode } from "react";

/** "Our *Dashboard*": serif page title with the descriptor word in italic, plus an optional intro. */
export function PageTitle({
  word,
  lead = "Our",
  eyebrow,
  intro,
}: {
  word: string;
  lead?: string;
  eyebrow?: string;
  intro?: ReactNode;
}) {
  return (
    <header className="grid gap-3">
      {eyebrow ? <p className="label-caps text-rose-ink">{eyebrow}</p> : null}
      <h1 className="text-[42px] leading-[1.02] tracking-[-0.01em] sm:text-[56px] lg:text-[64px]">
        {lead} <em className="italic">{word}</em>
      </h1>
      {intro ? <p className="max-w-2xl text-[15px] leading-relaxed text-cocoa">{intro}</p> : null}
    </header>
  );
}

/** Section heading, same pattern at a smaller size. */
export function SectionTitle({ lead, word, eyebrow, id }: { lead?: string; word: string; eyebrow?: string; id?: string }) {
  return (
    <div className="grid gap-1.5">
      {eyebrow ? <p className="label-caps">{eyebrow}</p> : null}
      <h2 id={id} className="text-[26px] leading-tight sm:text-[30px]">
        {lead ? `${lead} ` : null}
        <em className="italic">{word}</em>
      </h2>
    </div>
  );
}
