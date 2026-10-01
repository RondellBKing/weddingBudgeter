import type { ReactNode } from "react";

/** One figure: a small capital label, the number set large in the serif, and a quiet line under it. */
export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="grid min-w-0 content-start gap-2 py-5">
      <span className="label-caps text-[10px]">{label}</span>
      <span className="num font-display text-[32px] leading-none font-medium sm:text-[36px]">{value}</span>
      {sub ? <span className="text-xs text-muted">{sub}</span> : null}
    </div>
  );
}

/** A row of stats on a sheet of paper, separated by hairlines; wraps to two columns on phones. */
export function StatRow({ children, label }: { children: ReactNode; label: string }) {
  return (
    <section
      aria-label={label}
      className="grid grid-cols-2 gap-x-6 rounded-[3px] border border-rule bg-paper px-6 shadow-[0_1px_2px_rgba(62,43,34,0.04),0_8px_24px_-16px_rgba(62,43,34,0.18)] sm:grid-cols-3 sm:px-7 lg:grid-cols-5 [&>*]:-mb-px [&>*]:border-b [&>*]:border-rule lg:[&>*]:mb-0 lg:[&>*]:border-b-0 lg:[&>*+*]:border-l lg:[&>*+*]:pl-6"
    >
      {children}
    </section>
  );
}
