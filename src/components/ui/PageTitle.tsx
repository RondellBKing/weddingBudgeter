import type { ReactNode } from "react";

/** "Our *Dashboard*": serif page title with the descriptor word in italic, plus an optional intro. */
export function PageTitle({
  word,
  lead = "Our",
  eyebrow,
  intro,
  actions,
}: {
  word: string;
  lead?: string;
  eyebrow?: string;
  intro?: ReactNode;
  /** Buttons or links shown beside the title on wide screens, under it on phones. */
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
      <div className="grid min-w-0 gap-3">
        {eyebrow ? <p className="label-caps text-rose-ink">{eyebrow}</p> : null}
        <h1 className="text-[42px] leading-[1.02] tracking-[-0.01em] sm:text-[56px] lg:text-[64px]">
          {lead} <em className="italic">{word}</em>
        </h1>
        {intro ? <p className="max-w-2xl text-[15px] leading-relaxed text-cocoa">{intro}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
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
