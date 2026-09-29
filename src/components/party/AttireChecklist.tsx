import { TickBox } from "@/components/ui/TickBox";
import { formatDate } from "@/lib/dates";
import type { ChecklistStep } from "@/lib/domain/party";

/** Asked → said yes → style → sizing → ordered → arrived → altered → ready, with dates. */
export function AttireChecklist({ steps }: { steps: ChecklistStep[] }) {
  const next = steps.find((s) => !s.done);
  return (
    <ol className="grid" aria-label="Attire steps">
      {steps.map((s) => {
        const isNext = s === next;
        return (
          <li
            key={s.key}
            className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-baseline gap-x-3 border-b border-rule py-2.5 last:border-b-0"
          >
            <span className="translate-y-0.5">
              <TickBox checked={s.done} next={isNext} size="sm" />
            </span>
            <span className={`min-w-0 ${s.done ? "text-chocolate" : "text-cocoa"}`}>
              {s.label}
              {s.detail ? <span className="text-muted"> · {s.detail}</span> : null}
              <span className="sr-only">{s.done ? ": done" : ": not yet"}</span>
              {isNext ? <span className="label-caps ml-2 text-[10px] text-rose-ink">Next</span> : null}
            </span>
            <span className="num text-right text-[13px] text-muted">
              {s.date ? formatDate(s.date, "medium") : s.done ? "" : "—"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
