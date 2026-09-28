/** "Our *Dashboard*": serif title with the descriptor word in italic. */
export function PageTitle({ word, lead = "Our", eyebrow }: { word: string; lead?: string; eyebrow?: string }) {
  return (
    <header className="grid gap-3">
      {eyebrow ? <p className="label-caps">{eyebrow}</p> : null}
      <h1 className="text-[44px] leading-[1.02] sm:text-[60px] md:text-[68px]">
        {lead} <em className="italic">{word}</em>
      </h1>
    </header>
  );
}

/** Section heading, same pattern at a smaller size. */
export function SectionTitle({ lead, word, eyebrow, id }: { lead?: string; word: string; eyebrow?: string; id?: string }) {
  return (
    <div className="grid gap-1.5">
      {eyebrow ? <p className="label-caps">{eyebrow}</p> : null}
      <h2 id={id} className="text-[28px] leading-tight sm:text-[34px]">
        {lead ? `${lead} ` : null}
        <em className="italic">{word}</em>
      </h2>
    </div>
  );
}
