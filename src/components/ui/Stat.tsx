import type { ReactNode } from "react";

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="grid min-w-0 content-start gap-2 py-4">
      <span className="label-caps">{label}</span>
      <span className="num text-[26px] leading-none font-normal tracking-tight sm:text-[30px]">{value}</span>
      {sub ? <span className="text-xs text-muted">{sub}</span> : null}
    </div>
  );
}

/** A row of stats separated by hairlines; wraps to two columns on phones. */
export function StatRow({ children, label }: { children: ReactNode; label: string }) {
  return (
    <section
      aria-label={label}
      className="grid grid-cols-2 gap-x-6 border-y border-rule sm:grid-cols-3 lg:grid-cols-5 [&>*]:border-b [&>*]:border-rule lg:[&>*]:border-b-0"
    >
      {children}
    </section>
  );
}
