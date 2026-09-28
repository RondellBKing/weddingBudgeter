// Stationery details: the couple's monogram, a botanical sprig, and a small gold divider.

/** Initials in a fine double gold ring, like the crest on an invitation. */
export function Monogram({ first, second, size = "md" }: { first: string; second: string; size?: "sm" | "md" | "lg" }) {
  const dims = { sm: "size-11 text-base", md: "size-14 text-xl", lg: "size-24 text-4xl" }[size];
  const inset = size === "lg" ? "inset-[5px]" : "inset-[3px]";
  return (
    <span
      aria-hidden
      className={`relative inline-grid shrink-0 place-items-center rounded-full border border-gold/70 font-display text-chocolate ${dims}`}
    >
      <span className={`absolute ${inset} rounded-full border border-gold/35`} />
      <span className="relative leading-none">
        {first.charAt(0).toUpperCase()}
        <em className="mx-[0.06em] text-[0.8em] text-rose-ink italic">&amp;</em>
        {second.charAt(0).toUpperCase()}
      </span>
    </span>
  );
}

/** Thin gold rule with a small diamond at its center. */
export function Divider({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`flex items-center gap-3 ${className}`}>
      <span className="h-px flex-1 bg-gold/35" />
      <svg viewBox="0 0 12 12" className="size-2.5 fill-gold/70">
        <path d="M6 0 12 6 6 12 0 6z" />
      </svg>
      <span className="h-px flex-1 bg-gold/35" />
    </div>
  );
}

// A eucalyptus-style sprig: leaves placed along a curved stem, with rose buds at the tip.
// Generated from the curve so it stays clean at any size.
type Pt = [number, number];
const P0: Pt = [6, 74];
const P1: Pt = [52, 72];
const P2: Pt = [100, 42];
const P3: Pt = [152, 12];

function bezier(t: number): Pt {
  const u = 1 - t;
  return [
    u * u * u * P0[0] + 3 * u * u * t * P1[0] + 3 * u * t * t * P2[0] + t * t * t * P3[0],
    u * u * u * P0[1] + 3 * u * u * t * P1[1] + 3 * u * t * t * P2[1] + t * t * t * P3[1],
  ];
}

function tangentAngle(t: number): number {
  const u = 1 - t;
  const dx = 3 * u * u * (P1[0] - P0[0]) + 6 * u * t * (P2[0] - P1[0]) + 3 * t * t * (P3[0] - P2[0]);
  const dy = 3 * u * u * (P1[1] - P0[1]) + 6 * u * t * (P2[1] - P1[1]) + 3 * t * t * (P3[1] - P2[1]);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

const LEAVES = Array.from({ length: 11 }, (_, i) => {
  const t = 0.08 + i * 0.075;
  const side = i % 2 === 0 ? 1 : -1;
  const [x, y] = bezier(t);
  const angle = tangentAngle(t);
  const rad = ((angle + 90 * side) * Math.PI) / 180;
  const offset = 6.5 * (1 - t * 0.35);
  const scale = 1 - t * 0.45;
  return {
    cx: +(x + Math.cos(rad) * offset).toFixed(2),
    cy: +(y + Math.sin(rad) * offset).toFixed(2),
    rx: +(9 * scale).toFixed(2),
    ry: +(3.6 * scale).toFixed(2),
    rotate: +(angle + side * 38).toFixed(1),
    tone: i % 3 === 0 ? "fill-garden/55" : "fill-garden/38",
  };
});

const FLIPS = { x: "scaleX(-1)", y: "scaleY(-1)", xy: "scale(-1, -1)" } as const;

export function Sprig({ className = "", flip }: { className?: string; flip?: keyof typeof FLIPS }) {
  const d = `M${P0[0]} ${P0[1]} C${P1[0]} ${P1[1]} ${P2[0]} ${P2[1]} ${P3[0]} ${P3[1]}`;
  return (
    <svg
      viewBox="0 0 160 80"
      aria-hidden
      className={className}
      style={flip ? { transform: FLIPS[flip] } : undefined}
    >
      <path d={d} fill="none" className="stroke-cocoa/35" strokeWidth={1.1} strokeLinecap="round" />
      {LEAVES.map((l, i) => (
        <ellipse
          key={i}
          cx={l.cx}
          cy={l.cy}
          rx={l.rx}
          ry={l.ry}
          transform={`rotate(${l.rotate} ${l.cx} ${l.cy})`}
          className={l.tone}
        />
      ))}
      <circle cx={P3[0] + 1} cy={P3[1] - 1} r={4.2} className="fill-dusty-rose/80" />
      <circle cx={P3[0] - 6} cy={P3[1] + 5} r={3} className="fill-desert-rose/55" />
      <circle cx={P3[0] + 5} cy={P3[1] + 6} r={1.8} className="fill-gold/60" />
    </svg>
  );
}
