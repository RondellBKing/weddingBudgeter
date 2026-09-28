import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { daysBetween, formatDate, relativeDays, type CalendarDate } from "@/lib/dates";
import type { AgendaItem } from "@/lib/domain/agenda";
import { buildTimeline } from "@/lib/domain/calendar-grid";
import { formatCents } from "@/lib/money";
import { agendaHref, KIND } from "./kinds";

// The road to the wedding: milestones and payment due dates only, from today to the day
// itself. Anything whose date has passed without being done (or paid) sits above "Today",
// marked Behind in brick.

const BACK = "/calendar?view=timeline";

type Place = "first" | "middle" | "last";

/** One row: date on the left, a node on the line, the words on the right. */
function Row({ date, node, children, place = "middle" }: { date?: ReactNode; node: ReactNode; children: ReactNode; place?: Place }) {
  return (
    <li className="grid grid-cols-[3.75rem_1.75rem_minmax(0,1fr)] gap-x-2.5 sm:grid-cols-[6.5rem_2rem_minmax(0,1fr)] sm:gap-x-4">
      <div className="pt-0.5 pb-7 text-right">{date}</div>
      <div className="relative flex items-start justify-center">
        <span
          aria-hidden
          className={`absolute left-1/2 w-px -translate-x-1/2 bg-rule-strong ${
            place === "first" ? "top-2.5 bottom-0" : place === "last" ? "top-0 h-2.5" : "inset-y-0"
          }`}
        />
        <span className="relative mt-[3px] grid place-items-center">{node}</span>
      </div>
      <div className="min-w-0 pb-7">{children}</div>
    </li>
  );
}

function DateLabel({ date }: { date: CalendarDate }) {
  return (
    <span className="leading-tight">
      <span className="num block text-sm text-chocolate">{formatDate(date, "month-day")}</span>
      <span className="label-caps block text-[9.5px]">{formatDate(date, "weekday-short")}</span>
    </span>
  );
}

function Node({ item, behind }: { item: AgendaItem; behind: boolean }) {
  if (behind) return <span className="block size-3.5 rounded-full border-2 border-brick bg-paper ring-4 ring-paper" />;
  if (item.done) {
    return (
      <span className="grid size-4 place-items-center rounded-full bg-garden text-paper ring-4 ring-paper">
        <Icon name="check" size={10} strokeWidth={2.6} />
      </span>
    );
  }
  if (item.kind === "milestone") return <span className="block size-3 rotate-45 bg-desert-rose ring-4 ring-paper" />;
  return <span className="block size-3 rounded-full bg-gold ring-4 ring-paper" />;
}

function Entry({ item, today, behind, place }: { item: AgendaItem; today: CalendarDate; behind: boolean; place?: Place }) {
  const days = daysBetween(today, item.date);
  const kind = KIND[item.kind];
  return (
    <Row place={place} date={<DateLabel date={item.date} />} node={<Node item={item} behind={behind} />}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Link href={agendaHref(item.id, BACK)} className="min-w-0 text-[15px] leading-snug hover:text-rose-ink">
          {item.title}
        </Link>
        {item.amountCents != null ? <span className="num text-sm text-chocolate">{formatCents(item.amountCents)}</span> : null}
      </div>
      <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted">
        <span>{item.kind === "payment" && item.detail ? item.detail : kind.label}</span>
        {behind ? (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.12em] text-brick uppercase">
            <span aria-hidden className="size-1.5 rounded-full bg-brick" />
            Behind · {relativeDays(days)}
          </span>
        ) : item.done ? (
          <span className="text-[10px] font-semibold tracking-[0.12em] text-garden-ink uppercase">{item.kind === "payment" ? "Paid" : "Done"}</span>
        ) : days <= 30 ? (
          <span className="text-[10px] font-semibold tracking-[0.12em] text-gold-ink uppercase">{relativeDays(days)}</span>
        ) : null}
      </p>
    </Row>
  );
}

export function TimelineView({
  items,
  today,
  weddingDate,
  weddingTaskIds,
  venue,
}: {
  items: AgendaItem[];
  today: CalendarDate;
  weddingDate: CalendarDate;
  /** The seeded "Wedding day" task: the wedding itself is drawn at the end instead. */
  weddingTaskIds: Set<string>;
  venue: string;
}) {
  const { behind, ahead } = buildTimeline(
    items.filter((i) => !weddingTaskIds.has(i.id)),
    today,
    weddingDate,
  );
  const daysToGo = daysBetween(today, weddingDate);
  const milestones = ahead.filter((i) => i.kind === "milestone" && !i.done).length;
  const payments = ahead.filter((i) => i.kind === "payment").length;

  // Year headings wherever the year changes, starting with this year after "Today".
  const rows: ReactNode[] = [];
  let year = today.slice(0, 4);
  for (const item of ahead) {
    const y = item.date.slice(0, 4);
    if (y !== year) {
      year = y;
      rows.push(
        <Row key={`year-${y}`} node={<span className="block size-1.5 rounded-full bg-rule-strong" />}>
          <h3 className="-mt-1.5 font-display text-[26px] leading-none italic">{y}</h3>
        </Row>,
      );
    }
    rows.push(<Entry key={item.id} item={item} today={today} behind={false} />);
  }

  return (
    <Card as="section" aria-labelledby="timeline-h" className="px-5 py-8 sm:px-10 sm:py-10">
      <header className="mb-9 grid gap-2">
        <h2 id="timeline-h" className="text-[30px] leading-tight sm:text-[34px]">
          The road to the <em className="italic">wedding</em>
        </h2>
        <p className="max-w-2xl text-sm text-cocoa">
          {milestones} {milestones === 1 ? "milestone" : "milestones"} and {payments} {payments === 1 ? "payment" : "payments"} between
          today and {formatDate(weddingDate, "weekday-long")}.
          {behind.length > 0 ? (
            <span className="text-brick">
              {" "}
              {behind.length} {behind.length === 1 ? "thing is" : "things are"} behind schedule.
            </span>
          ) : (
            " Nothing is behind schedule."
          )}
        </p>
      </header>

      <ol>
        {behind.map((item, i) => (
          <Entry key={item.id} item={item} today={today} behind place={i === 0 ? "first" : "middle"} />
        ))}

        <Row
          place={behind.length === 0 ? "first" : "middle"}
          date={<DateLabel date={today} />}
          node={<span className="block size-3.5 rounded-full bg-chocolate ring-4 ring-paper" />}
        >
          <p className="text-[10px] font-semibold tracking-[0.14em] text-rose-ink uppercase">Today</p>
          <p className="mt-0.5 text-sm text-cocoa">
            {daysToGo.toLocaleString("en-US")} days to go
          </p>
        </Row>

        {rows}

        <Row
          place="last"
          date={<DateLabel date={weddingDate} />}
          node={
            <span className="relative grid size-8 -translate-y-1.5 place-items-center rounded-full border border-gold/80 bg-paper ring-4 ring-paper">
              <span className="absolute inset-[3px] rounded-full border border-gold/40" />
              <svg aria-hidden viewBox="0 0 12 12" className="relative size-2.5 fill-gold">
                <path d="M6 0 12 6 6 12 0 6z" />
              </svg>
            </span>
          }
        >
          <p className="text-[10px] font-semibold tracking-[0.14em] text-gold-ink uppercase">{formatDate(weddingDate, "weekday-long")}</p>
          <p className="mt-1 font-display text-[30px] leading-none italic">The wedding</p>
          <p className="mt-1.5 text-sm text-cocoa">{venue}</p>
        </Row>
      </ol>
    </Card>
  );
}
