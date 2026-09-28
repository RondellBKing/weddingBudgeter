import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { EventInfo } from "@/lib/data/calendar";
import { daysBetween, formatDate, relativeDays, type CalendarDate } from "@/lib/dates";
import { groupByMonth, type AgendaItem } from "@/lib/domain/agenda";
import { formatCents } from "@/lib/money";
import { agendaHref, KIND } from "./kinds";

// The default view (and the best one on phones): everything still to come, month by month.

export function AgendaView({
  items,
  events,
  today,
  weddingDate,
  back,
}: {
  items: AgendaItem[];
  events: Map<string, EventInfo>;
  today: CalendarDate;
  weddingDate: CalendarDate;
  back: string;
}) {
  const months = groupByMonth(items.filter((i) => !i.done));
  if (months.length === 0) {
    return (
      <Card className="px-6 py-10 text-cocoa sm:px-9">
        Nothing left on the calendar. Add an appointment, or give a task a due date.
      </Card>
    );
  }
  return (
    <div className="grid gap-5">
      {months.map((m) => {
        const [monthName, year] = m.label.split(" ");
        return (
          <Card key={m.key} as="section" aria-label={m.label} className="grid gap-2 p-6 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-8 sm:p-8">
            <h2 className="leading-none">
              <span className="font-display text-[30px] italic">{monthName}</span>
              <span className="label-caps mt-1.5 block text-[10px]">{year}</span>
            </h2>
            <ol className="grid">
              {m.items.map((item) => {
                const isWedding = item.date === weddingDate;
                const kind = KIND[item.kind];
                const days = daysBetween(today, item.date);
                const event = events.get(item.id);
                const detail = [kind.label, event ? (event.timeLabel ?? "All day") : null, item.detail].filter(Boolean).join(" · ");
                return (
                  <li
                    key={item.id}
                    className={`grid grid-cols-[3rem_minmax(0,1fr)_auto] items-start gap-x-4 border-b border-rule py-3.5 first:pt-1 last:border-b-0 ${
                      isWedding ? "-mx-3 rounded-[3px] bg-linen/60 px-3 ring-1 ring-gold/40" : ""
                    }`}
                  >
                    <span className="text-center leading-none">
                      <span className="label-caps block text-[10px]">{formatDate(item.date, "weekday-short")}</span>
                      <span className="num mt-1 block font-display text-[26px]">{Number(item.date.slice(8))}</span>
                    </span>
                    <span className="min-w-0 pt-0.5">
                      <span className="flex items-start gap-2.5">
                        <span aria-hidden className={`mt-[7px] size-2 shrink-0 rounded-full ${kind.dot}`} />
                        <span className="min-w-0">
                          <Link
                            href={agendaHref(item.id, back)}
                            className={`block text-[15px] leading-snug hover:text-rose-ink ${isWedding ? "font-display text-xl" : ""}`}
                          >
                            {item.title}
                          </Link>
                          <span className="block text-xs text-muted">{detail}</span>
                        </span>
                      </span>
                    </span>
                    <span className="pt-0.5 text-right">
                      {item.amountCents != null ? <span className="num block text-sm">{formatCents(item.amountCents)}</span> : null}
                      {days <= 30 ? (
                        <span className={`block text-[10px] font-semibold tracking-[0.1em] whitespace-nowrap uppercase ${days < 0 ? "text-brick" : "text-gold-ink"}`}>
                          {relativeDays(days)}
                        </span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ol>
          </Card>
        );
      })}
    </div>
  );
}
