import type { ReactNode } from "react";

/**
 * "Our *Budget*": the page's masthead. A small eyebrow on a gold rule, the serif title with the
 * descriptor word in italic, a hairline with a gold diamond, and the intro set as a serif deck.
 */
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
    <header className="grid gap-5 sm:gap-6">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div className="grid min-w-0 gap-3 sm:gap-4">
          {eyebrow ? (
            <p className="label-caps flex items-center gap-3 text-rose-ink">
              <span aria-hidden className="h-px w-8 bg-gold/70" />
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-[44px] leading-[0.98] tracking-[-0.015em] sm:text-[64px] lg:text-[76px]">
            {lead} <em className="italic">{word}</em>
          </h1>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
      <div aria-hidden className="flex items-center gap-3">
        <svg viewBox="0 0 12 12" className="size-2.5 shrink-0 fill-gold/80">
          <path d="M6 0 12 6 6 12 0 6z" />
        </svg>
        <span className="h-px flex-1 bg-rule-strong/80" />
      </div>
      {intro ? <p className="deck max-w-3xl">{intro}</p> : null}
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
