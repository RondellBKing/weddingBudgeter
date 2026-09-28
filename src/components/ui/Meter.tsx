import { percentInt } from "@/lib/money";

/** Thin horizontal progress meter with a label and a count. */
export function Meter({
  label,
  value,
  max,
  detail,
  fill = "bg-desert-rose",
}: {
  label: string;
  value: number;
  max: number;
  detail?: string;
  fill?: string;
}) {
  const pct = percentInt(value, max);
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="label-caps">{label}</span>
        <span className="num text-sm text-cocoa">{detail ?? `${value} of ${max}`}</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-[1px] bg-linen"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <div className={`h-full ${fill}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
