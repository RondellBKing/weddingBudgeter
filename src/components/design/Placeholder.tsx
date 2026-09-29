// The designed stand-in for an inspiration item with no image (or one that won't load): a soft
// wash of a palette color, an invitation-style inner frame, and the title in serif.

export type Tint = { background: string; frame: string; ink: string };

export function InspirationPlaceholder({
  title,
  tint,
  heading = false,
}: {
  title: string;
  tint: Tint;
  /** True when this is the card's only title (no image), so it's the heading too. */
  heading?: boolean;
}) {
  const Title = heading ? "h3" : "p";
  return (
    <div
      className="relative grid size-full place-items-center overflow-hidden px-5 py-6 text-center"
      style={{ background: tint.background, color: tint.ink }}
    >
      <span aria-hidden className="pointer-events-none absolute inset-2.5 rounded-[2px] border" style={{ borderColor: tint.frame }} />
      <span aria-hidden className="pointer-events-none absolute inset-[13px] rounded-[1px] border opacity-50" style={{ borderColor: tint.frame }} />
      <div className="relative grid justify-items-center gap-3">
        <Title className="line-clamp-5 font-display text-[19px] leading-[1.15] font-medium italic sm:text-[25px]">{title}</Title>
        <svg aria-hidden viewBox="0 0 40 8" className="w-10" style={{ fill: tint.frame, stroke: tint.frame }}>
          <path d="M0 4h15" strokeWidth={0.8} />
          <path d="M20 0.5 23.5 4 20 7.5 16.5 4z" />
          <path d="M25 4h15" strokeWidth={0.8} />
        </svg>
      </div>
    </div>
  );
}
