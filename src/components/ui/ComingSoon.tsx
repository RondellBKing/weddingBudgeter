/** Placeholder for a module that's planned but not built yet. */
export function ComingSoon({ phase, items }: { phase: number; items: string[] }) {
  return (
    <section className="grid max-w-2xl gap-4 border-y border-rule py-6">
      <p className="label-caps">Coming in phase {phase}</p>
      <ul className="grid gap-2 text-cocoa">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span aria-hidden className="mt-2.5 h-px w-4 shrink-0 bg-dusty-rose" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
