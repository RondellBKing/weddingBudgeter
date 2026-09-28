import Link from "next/link";

/** Link-based view switcher ("List · Board", "Month · Agenda"). The URL holds the state. */
export function Tabs({ items, current, label }: { items: Array<{ key: string; label: string; href: string }>; current: string; label: string }) {
  return (
    <nav aria-label={label} className="inline-flex rounded-[3px] border border-rule-strong bg-paper p-0.5">
      {items.map((t) => {
        const active = t.key === current;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-[2px] px-3.5 py-1.5 text-[12px] font-medium tracking-[0.06em] uppercase transition-colors ${
              active ? "bg-chocolate text-ivory" : "text-cocoa hover:text-chocolate"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
