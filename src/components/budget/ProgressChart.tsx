"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCents } from "@/lib/money";

// Payment progress per category: paid, committed but not yet paid, and the rest of the
// estimate, as thin stacked horizontal bars. Anything over the estimate shows in brick.

export type ProgressDatum = {
  name: string;
  paid: number;
  owed: number;
  open: number;
  over: number;
  estimate: number;
};

const SERIES = [
  { key: "paid", label: "Paid", color: "#b5706b" },
  { key: "owed", label: "Committed, not yet paid", color: "#d9a3a0" },
  { key: "open", label: "Not yet committed", color: "#efe3d8" },
  { key: "over", label: "Over estimate", color: "#9c3b2e" },
] as const;

function TooltipBox({ active, payload }: { active?: boolean; payload?: Array<{ payload: ProgressDatum }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]!.payload;
  return (
    <div className="grid gap-1 rounded-[3px] border border-rule bg-paper px-3 py-2 text-xs shadow-[0_8px_24px_-12px_rgba(62,43,34,0.35)]">
      <p className="text-[13px] font-medium text-chocolate">{d.name}</p>
      <p className="num text-cocoa">Estimate {formatCents(d.estimate)}</p>
      {SERIES.map((s) =>
        d[s.key] > 0 ? (
          <p key={s.key} className="num flex items-center gap-2 text-cocoa">
            <span aria-hidden className="size-2 rounded-[2px]" style={{ background: s.color }} />
            {s.label}: {formatCents(d[s.key])}
          </p>
        ) : null,
      )}
    </div>
  );
}

export function ProgressChart({ data }: { data: ProgressDatum[] }) {
  const height = data.length * 30 + 12;
  return (
    <div className="grid gap-4">
      <ul className="flex flex-wrap gap-x-5 gap-y-1.5" aria-label="Key">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-[12px] text-cocoa">
            <span aria-hidden className="size-2.5 rounded-[2px] ring-1 ring-rule-strong/60" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>
      <div style={{ height }} role="img" aria-label="Payment progress by category. The categories table below lists every amount.">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }} barSize={10}>
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <YAxis
              type="category"
              dataKey="name"
              width={176}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "#5c4033" }}
              tickFormatter={(v: string) => (v.length > 24 ? `${v.slice(0, 23)}…` : v)}
            />
            <Tooltip content={<TooltipBox />} cursor={{ fill: "rgba(239, 227, 216, 0.55)" }} />
            {SERIES.map((s) => (
              <Bar key={s.key} dataKey={s.key} stackId="a" fill={s.color} stroke="#fffcf8" strokeWidth={1.5} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
