// Button and link styles, so actions look the same everywhere: small tracked capitals, like the
// labels on a stationery suite, and every variant the same height so they line up in a row.
// "quiet" is the exception: an inline text action ("Edit", "Answer") in sentence case.

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-[3px] border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const VARIANTS = {
  primary: "border-chocolate bg-chocolate text-ivory hover:border-cocoa hover:bg-cocoa",
  secondary: "border-rule-strong bg-paper text-chocolate hover:border-chocolate",
  quiet: "text-rose-ink hover:text-chocolate",
  danger: "border-brick/70 bg-paper text-brick hover:bg-brick-wash",
} as const;

const SIZES = {
  md: "px-5 py-2.5 text-[11.5px] uppercase tracking-[0.12em]",
  sm: "px-3 py-1.5 text-[10.5px] uppercase tracking-[0.1em]",
} as const;

export function buttonClass(variant: keyof typeof VARIANTS = "primary", size: keyof typeof SIZES = "md", extra = "") {
  const pad = variant === "quiet" ? "border-0 px-0 py-1 text-[13px]" : SIZES[size];
  return `${BASE} ${VARIANTS[variant]} ${pad} ${extra}`;
}
