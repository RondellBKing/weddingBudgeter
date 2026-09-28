import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import type { EventInfo } from "@/lib/data/calendar";
import { formatDate, type CalendarDate } from "@/lib/dates";
import type { AgendaItem } from "@/lib/domain/agenda";
import { daysWithItems, monthGrid, monthTitle, shiftMonth, WEEKDAY_SHORT, type MonthKey } from "@/lib/domain/calendar-grid";
import { formatCents } from "@/lib/money";
import { agendaHref, KIND } from "./kinds";

// Month view. Wide screens get a Sunday-to-Saturday grid with a small chip per item; phones
// get the same month as a short list of the days that have something on them.

const monthHref = (m: MonthKey) => `/calendar?view=month&month=${m}`;

function shortAmount(cents: number): string {
  return formatCents(cents, { cents: "never" });
}

export function MonthView({
  month,
  items,
  events,
  today,
  weddingDate,
}: {
  month: MonthKey;
  items: AgendaItem[];
  events: Map<string, EventInfo>;
  today: CalendarDate;
  weddingDate: CalendarDate;
}) {
  const back = monthHref(month);
  const weeks = monthGrid(month, items);
  const days = daysWithItems(month, items);
  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  const [name, year] = monthTitle(month).split(" ");
  const thisMonth = today.slice(0, 7);
  const weddingMonth = weddingDate.slice(0, 7);

  return (
    <Card as="section" aria-label={monthTitle(month)} className="overflow-hidden">
      {/* Month header and navigation */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-rule px-5 py-5 sm:px-7">
        <h2 className="flex items-baseline gap-3 leading-none">
          <span className="font-display text-[34px] italic sm:text-[40px]">{name}</span>
          <span className="label-caps text-[11px]">{year}</span>
        </h2>
        <nav aria-label="Months" className="flex flex-wrap items-center gap-2">
          <Link
            href={monthHref(prev)}
            className="inline-flex items-center gap-1.5 rounded-[3px] border border-rule-strong px-3 py-1.5 text-[12.5px] text-cocoa hover:border-chocolate hover:text-chocolate"
          >
            <Icon name="arrow" size={13} className="rotate-180" />
            <span className="sr-only">Previous month, </span>
            {formatDate(`${prev}-01` as CalendarDate, "month-year").split(" ")[0]!.slice(0, 3)}
          </Link>
          {month !== thisMonth ? (
            <Link href={monthHref(thisMonth)} className="rounded-[3px] px-2.5 py-1.5 text-[12.5px] text-rose-ink hover:text-chocolate">
              Today
            </Link>
          ) : null}
          {month !== weddingMonth ? (
            <Link href={monthHref(weddingMonth)} className="rounded-[3px] px-2.5 py-1.5 text-[12.5px] text-rose-ink hover:text-chocolate">
              Wedding month
            </Link>
          ) : null}
          <Link
            href={monthHref(next)}
            className="inline-flex items-center gap-1.5 rounded-[3px] border border-rule-strong px-3 py-1.5 text-[12.5px] text-cocoa hover:border-chocolate hover:text-chocolate"
          >
            <span className="sr-only">Next month, </span>
            {formatDate(`${next}-01` as CalendarDate, "month-year").split(" ")[0]!.slice(0, 3)}
            <Icon name="arrow" size={13} />
          </Link>
        </nav>
      </div>

      {/* Wide screens: the grid */}
      <div className="hidden md:block">
        <div aria-hidden className="grid grid-cols-7 border-b border-rule bg-ivory/50">
          {WEEKDAY_SHORT.map((d) => (
            <span key={d} className="label-caps px-2.5 py-2 text-[10px]">
              {d}
            </span>
          ))}
        </div>
        <ol className="grid grid-cols-7">
          {weeks.flat().map((cell, i) => {
            const isToday = cell.date === today;
            const isWedding = cell.date === weddingDate;
            const day = Number(cell.date.slice(8));
            return (
              <li
                key={cell.date}
                aria-label={formatDate(cell.date, "weekday-long")}
                className={`group relative flex min-h-[7.25rem] min-w-0 flex-col gap-1.5 border-rule p-1.5 pb-2 ${i % 7 !== 6 ? "border-r" : ""} ${
                  i < weeks.length * 7 - 7 ? "border-b" : ""
                } ${cell.inMonth ? "" : "bg-ivory/55"} ${isWedding ? "bg-linen/45 shadow-[inset_0_0_0_1px_rgba(184,145,47,0.55)]" : ""}`}
              >
                <div className="flex items-start justify-between gap-1 px-1 pt-0.5">
                  <span
                    className={`num grid h-6 min-w-6 place-items-center rounded-full font-display text-[17px] leading-none ${
                      isToday ? "bg-chocolate px-1.5 text-ivory" : cell.inMonth ? "text-chocolate" : "text-muted/80"
                    }`}
                  >
                    {day}
                  </span>
                  {isToday ? <span className="pt-1 text-[9.5px] font-semibold tracking-[0.12em] text-rose-ink uppercase">Today</span> : null}
                  {isWedding ? (
                    <span className="flex items-center gap-1 pt-1 text-[9.5px] font-semibold tracking-[0.12em] text-gold-ink uppercase">
                      <svg aria-hidden viewBox="0 0 12 12" className="size-2 fill-gold">
                        <path d="M6 0 12 6 6 12 0 6z" />
                      </svg>
                      Wedding day
                    </span>
                  ) : null}
                  {cell.inMonth && !isToday && !isWedding ? (
                    <Link
                      href={`/calendar/new?date=${cell.date}&back=${encodeURIComponent(back)}`}
                      className="grid size-6 place-items-center rounded-full text-[15px] leading-none text-muted opacity-0 group-hover:opacity-100 hover:bg-linen hover:text-chocolate focus:opacity-100"
                    >
                      <span aria-hidden>+</span>
                      <span className="sr-only">Add an appointment on {formatDate(cell.date, "long")}</span>
                    </Link>
                  ) : null}
                </div>
                {cell.items.length > 0 ? (
                  <ul className="grid gap-1">
                    {cell.items.map((item) => (
                      <li key={item.id} className="min-w-0">
                        <Chip item={item} event={events.get(item.id)} back={back} />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Phones: only the days with something on them */}
      <div className="md:hidden">
        {days.length === 0 ? (
          <p className="px-5 py-8 text-sm text-cocoa">Nothing on the calendar in {monthTitle(month)}.</p>
        ) : (
          <ol className="grid">
            {days.map((d) => {
              const isToday = d.date === today;
              const isWedding = d.date === weddingDate;
              return (
                <li
                  key={d.date}
                  className={`grid grid-cols-[3rem_minmax(0,1fr)] gap-x-4 border-b border-rule px-5 py-4 last:border-b-0 ${isWedding ? "bg-linen/50" : ""}`}
                >
                  <span className="text-center leading-none">
                    <span className="label-caps block text-[10px]">{formatDate(d.date, "weekday-short")}</span>
                    <span
                      className={`num mx-auto mt-1 grid size-9 place-items-center rounded-full font-display text-[24px] ${isToday ? "bg-chocolate text-ivory" : ""}`}
                    >
                      {Number(d.date.slice(8))}
                    </span>
                    {isToday ? <span className="mt-1 block text-[9px] font-semibold tracking-[0.12em] text-rose-ink uppercase">Today</span> : null}
                  </span>
                  <ul className="grid gap-2.5 pt-0.5">
                    {isWedding ? (
                      <li className="text-[10px] font-semibold tracking-[0.14em] text-gold-ink uppercase">Wedding day</li>
                    ) : null}
                    {d.items.map((item) => {
                      const kind = KIND[item.kind];
                      const event = events.get(item.id);
                      return (
                        <li key={item.id} className="flex items-start gap-2.5">
                          <span aria-hidden className={`mt-[7px] size-2 shrink-0 rounded-full ${kind.dot}`} />
                          <span className="min-w-0 flex-1">
                            <Link
                              href={agendaHref(item.id, back)}
                              className={`block text-[15px] leading-snug ${item.done ? "text-muted line-through decoration-rule-strong" : "hover:text-rose-ink"}`}
                            >
                              {item.title}
                            </Link>
                            <span className="block text-xs text-muted">
                              {[
                                kind.label,
                                event ? (event.timeLabel ?? "All day") : null,
                                item.kind === "payment" ? item.detail : null,
                                item.done ? "Done" : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                            {!item.done && item.state === "overdue" ? (
                              <span className="block text-[10px] font-semibold tracking-[0.1em] text-brick uppercase">Overdue</span>
                            ) : null}
                          </span>
                          {item.amountCents != null ? <span className="num shrink-0 text-sm">{formatCents(item.amountCents)}</span> : null}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </Card>
  );
}

function Chip({ item, event, back }: { item: AgendaItem; event?: EventInfo; back: string }) {
  const kind = KIND[item.kind];
  const amount = item.kind === "payment" && item.amountCents != null ? shortAmount(item.amountCents) : null;
  const time = event?.startAt ? event.timeLabel?.split(" – ")[0]?.replace(":00", "").replace(" ", "").toLowerCase() : null;
  const late = !item.done && item.state === "overdue";
  const full = [kind.label, time, item.title, amount, item.done ? "done" : late ? "overdue" : null].filter(Boolean).join(": ");
  return (
    <Link
      href={agendaHref(item.id, back)}
      title={full}
      className={`flex min-w-0 items-start gap-1 rounded-[2px] px-1.5 py-[3px] text-[11.5px] leading-tight text-chocolate transition-colors [&>svg]:mt-px [&>span[aria-hidden]]:mt-[3px] ${kind.chip} ${
        item.done ? "opacity-55" : ""
      }`}
    >
      <span className="sr-only">{kind.label}: </span>
      {late ? <span className="mt-px shrink-0 text-[9px] font-semibold tracking-[0.1em] text-brick uppercase">Late</span> : null}
      {item.kind === "milestone" ? <Icon name="star" size={11} className="shrink-0 fill-desert-rose/50 text-rose-ink" /> : null}
      {item.kind === "task" ? <span aria-hidden className="size-[7px] shrink-0 rounded-full border border-desert-rose" /> : null}
      {amount ? <span className="num shrink-0 font-semibold text-cocoa">{amount}</span> : null}
      {time ? <span className="num shrink-0 font-semibold text-cocoa">{time}</span> : null}
      <span className={`line-clamp-2 min-w-0 break-words ${item.done ? "line-through" : ""}`}>{item.title}</span>
    </Link>
  );
}
