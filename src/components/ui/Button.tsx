// Button and link styles, so actions look the same everywhere.

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-[3px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const VARIANTS = {
  primary: "bg-chocolate text-ivory hover:bg-cocoa uppercase tracking-[0.08em]",
  secondary: "border border-rule-strong bg-paper text-chocolate hover:border-chocolate",
  quiet: "text-rose-ink hover:text-chocolate",
  danger: "border border-brick/70 bg-paper text-brick hover:bg-brick-wash",
} as const;

const SIZES = {
  md: "px-5 py-2.5 text-[13px]",
  sm: "px-3 py-1.5 text-[12px]",
} as const;

export function buttonClass(variant: keyof typeof VARIANTS = "primary", size: keyof typeof SIZES = "md", extra = "") {
  const pad = variant === "quiet" ? "px-0 py-1 text-[13px]" : SIZES[size];
  return `${BASE} ${VARIANTS[variant]} ${pad} ${extra}`;
}
