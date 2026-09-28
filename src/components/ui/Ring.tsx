import type { ReactNode } from "react";

// Thin ring chart, rendered on the server as SVG. Segments are separated by a 2px gap in the
// surface color, and the legend beside it carries every label and value (the lighter palette
// colors are too pale to be read on their own).

export type RingSegment = { label: string; value: number; className: string; display?: string };

export function Ring({
  segments,
  size = 152,
  thickness = 10,
  total: totalOverride,
  label,
  children,
}: {
  segments: RingSegment[];
  /** What a full circle stands for. Defaults to the sum of the segments. */
  total?: number;
  size?: number;
  thickness?: number;
  /** Accessible summary of the whole chart. */
  label: string;
  /** Centered content. */
  children?: ReactNode;
}) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const sum = segments.reduce((s, x) => s + Math.max(0, x.value), 0);
  const total = Math.max(totalOverride ?? sum, sum);
  // Surface-colored gaps between segments (and at the ends when the ring isn't full).
  const gap = segments.filter((s) => s.value > 0).length > 1 || total > sum ? 2 : 0;
  let offset = 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={label}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={thickness} className="stroke-linen" />
        {total > 0
          ? segments.map((s) => {
              if (s.value <= 0) return null;
              const len = (s.value / total) * c;
              const dash = Math.max(len - gap, 0.5);
              const el = (
                <circle
                  key={s.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  strokeWidth={thickness}
                  className={s.className}
                  strokeDasharray={`${dash} ${c - dash}`}
                  strokeDashoffset={-offset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                >
                  <title>{`${s.label}: ${s.display ?? s.value}`}</title>
                </circle>
              );
              offset += len;
              return el;
            })
          : null}
      </svg>
      {children ? <div className="absolute inset-0 grid place-items-center text-center">{children}</div> : null}
    </div>
  );
}

/** Legend rows: swatch, label, value. Always shown next to a ring. */
export function Legend({ items }: { items: Array<{ label: string; value: string; swatch: string; note?: string }> }) {
  return (
    <ul className="grid min-w-0 flex-1 gap-2.5">
      {items.map((i) => (
        <li key={i.label} className="grid grid-cols-[10px_minmax(0,1fr)_auto] items-baseline gap-x-2.5 border-b border-rule pb-2.5 text-sm last:border-b-0">
          <span aria-hidden className={`size-2.5 translate-y-px rounded-[2px] ${i.swatch}`} />
          <span className="min-w-0 text-cocoa">
            {i.label}
            {i.note ? <span className="block text-xs text-muted">{i.note}</span> : null}
          </span>
          <span className="num text-chocolate">{i.value}</span>
        </li>
      ))}
    </ul>
  );
}
