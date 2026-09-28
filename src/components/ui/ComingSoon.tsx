/** Quiet note about what a page will do once its phase is built. */
export function ComingSoon({ phase, items }: { phase: number; items: string[] }) {
  return (
    <aside className="grid gap-3 rounded-[3px] border border-dashed border-rule-strong px-5 py-5 sm:px-6">
      <p className="label-caps">Coming in phase {phase}</p>
      <ul className="grid gap-1.5 text-sm text-cocoa">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span aria-hidden className="mt-[0.6em] h-px w-3 shrink-0 bg-desert-rose" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
