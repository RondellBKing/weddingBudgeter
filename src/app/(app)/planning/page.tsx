import Link from "next/link";
import { TaskCheck } from "@/components/tasks/TaskCheck";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { PageTitle } from "@/components/ui/PageTitle";
import { Ring } from "@/components/ui/Ring";
import { loadPlanningTimeline } from "@/lib/data/planning";
import { daysBetween, formatDate, relativeDays, type CalendarDate } from "@/lib/dates";
import type { Chapter, JourneyEntry } from "@/lib/domain/planning";
import { formatPercent } from "@/lib/money";

export const metadata = { title: "Planning Timeline" };

export default async function PlanningTimelinePage() {
  const { plan, chapters, stats } = await loadPlanningTimeline();
  const { today, settings } = plan;
  const next = stats.next;

  return (
    <div className="grid gap-8 sm:gap-12">
      <PageTitle
        lead="The road to"
        word={formatDate(settings.weddingDate, "month-day-long")}
        eyebrow="Planning timeline"
        intro={`Every milestone from the signed contract to ${formatDate(settings.weddingDate, "weekday-long")}, counted back from the day. Tick each one off as it happens.`}
        actions={
          <>
            <Link href="/tasks" className={buttonClass("secondary")}>
              Every task
            </Link>
            <Link href="/calendar" className={buttonClass("primary")}>
              Calendar
            </Link>
          </>
        }
      />

      {/* Where things stand */}
      <Card className="grid gap-8 p-6 sm:p-8 md:grid-cols-[auto_minmax(0,1fr)_minmax(0,0.8fr)] md:items-center md:gap-12">
        <Ring
          size={132}
          thickness={8}
          total={Math.max(stats.milestones, 1)}
          label={`${stats.done} of ${stats.milestones} milestones done`}
          segments={[{ label: "Done", value: stats.done, className: "stroke-garden", display: String(stats.done) }]}
        >
          <div className="grid gap-0.5">
            <span className="num font-display text-[32px] leading-none">
              {stats.done}
              <span className="text-[20px] text-muted">/{stats.milestones}</span>
            </span>
            <span className="text-[11px] text-muted">milestones</span>
          </div>
        </Ring>
        <div className="grid gap-2">
          <p className="label-caps text-rose-ink">Next milestone</p>
          {next ? (
            <>
              <p className="font-display text-[28px] leading-tight sm:text-[32px]">{next.title}</p>
              <p className="text-sm text-cocoa">
                {formatDate(next.date, "weekday-long")} · {relativeDays(daysBetween(today, next.date)).toLowerCase()}
              </p>
            </>
          ) : (
            <p className="font-display text-[28px] leading-tight italic">Every milestone is done.</p>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-6 border-t border-rule pt-6 md:border-t-0 md:border-l md:pt-0 md:pl-10">
          <div className="grid gap-1">
            <dt className="label-caps text-[10px]">Done</dt>
            <dd className="num font-display text-[34px] leading-none">{formatPercent(stats.done, Math.max(stats.milestones, 1))}</dd>
          </div>
          <div className="grid gap-1">
            <dt className="label-caps text-[10px]">Appointments ahead</dt>
            <dd className="num font-display text-[34px] leading-none">{stats.appointmentsAhead}</dd>
          </div>
        </dl>
      </Card>

      {/* The chapters */}
      <ol className="grid gap-6 sm:gap-8" aria-label="Planning timeline">
        {chapters.map((c) => (
          <ChapterCard key={c.key} chapter={c} today={today} />
        ))}
      </ol>
    </div>
  );
}

function ChapterCard({ chapter, today }: { chapter: Chapter; today: CalendarDate }) {
  const rows: Array<{ kind: "entry"; entry: JourneyEntry } | { kind: "today" }> = chapter.entries.map((entry) => ({ kind: "entry", entry }));
  if (chapter.todayAt !== null) rows.splice(chapter.todayAt, 0, { kind: "today" });

  return (
    <li>
      <Card
        as="section"
        aria-labelledby={`ch-${chapter.key}`}
        className={`grid gap-6 px-6 py-7 sm:px-9 sm:py-9 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-10 ${chapter.current ? "ring-1 ring-dusty-rose/60" : ""}`}
      >
        <header className="grid content-start gap-2">
          <p className="label-caps text-[10px]">{chapter.span}</p>
          <h2 id={`ch-${chapter.key}`} className="font-display text-[32px] leading-[1.05] italic sm:text-[38px]">
            {chapter.title}
          </h2>
          {chapter.current ? (
            <p className="mt-1 inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.16em] text-rose-ink uppercase">
              <span aria-hidden className="size-1.5 rounded-full bg-desert-rose" />
              You are here
            </p>
          ) : null}
        </header>

        <ul className="grid">
          {rows.map((row, i) =>
            row.kind === "today" ? (
              <TodayRow key="today" today={today} first={i === 0} last={i === rows.length - 1} />
            ) : (
              <EntryRow key={row.entry.id} entry={row.entry} today={today} first={i === 0} last={i === rows.length - 1} />
            ),
          )}
        </ul>
      </Card>
    </li>
  );
}

/** The gold thread down the middle column, stopping at the first and last nodes. */
function Rail({ first, last }: { first: boolean; last: boolean }) {
  return (
    <span
      aria-hidden
      className={`absolute left-1/2 w-px -translate-x-1/2 bg-gold/60 ${first ? "top-4" : "top-0"} ${last ? "h-4" : "bottom-0"}`}
    />
  );
}

const ROW = "grid grid-cols-[4.25rem_1.75rem_minmax(0,1fr)] gap-x-3 sm:grid-cols-[5.5rem_2rem_minmax(0,1fr)] sm:gap-x-4";

function DateCell({ date }: { date: CalendarDate }) {
  return (
    <p className="pt-1 text-right leading-none">
      <span className="font-display text-[20px] italic sm:text-[22px]">{formatDate(date, "month-day")}</span>
      <span className="label-caps mt-1 block text-[9.5px]">{date.slice(0, 4)}</span>
    </p>
  );
}

function EntryRow({ entry, today, first, last }: { entry: JourneyEntry; today: CalendarDate; first: boolean; last: boolean }) {
  const days = daysBetween(today, entry.date);
  const late = !entry.done && days < 0;
  const soon = !entry.done && days >= 0 && days <= 30;
  return (
    <li className={ROW}>
      <DateCell date={entry.date} />
      <div className="relative flex justify-center">
        <Rail first={first} last={last} />
        {/* self-start: as a flex item it would otherwise stretch and paper over the rail. */}
        <span className="relative z-10 self-start bg-paper py-0.5">
          {entry.taskId ? (
            <TaskCheck id={entry.taskId} done={entry.done} title={entry.title} />
          ) : (
            <span className="grid size-7 place-items-center" title="Appointment">
              <span aria-hidden className="size-3 rounded-full border-2 border-garden bg-paper" />
            </span>
          )}
        </span>
      </div>
      {/* The space between rows lives here, so the rail beside it runs unbroken. */}
      <div className={`grid min-w-0 content-start gap-1 pt-0.5 ${last ? "" : "pb-7"}`}>
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <Link
            href={entry.href}
            className={`text-[16px] leading-snug font-medium ${entry.done ? "text-cocoa" : "text-chocolate"} hover:text-rose-ink`}
          >
            {entry.title}
          </Link>
          {entry.kind === "appointment" ? (
            <span className="text-[10px] font-semibold tracking-[0.14em] text-garden-ink uppercase">Appointment</span>
          ) : null}
          {entry.done ? <span className="text-[10px] font-semibold tracking-[0.14em] text-garden-ink uppercase">Done</span> : null}
          {late ? <span className="text-[10px] font-semibold tracking-[0.14em] text-brick uppercase">{relativeDays(days)}</span> : null}
          {soon ? <span className="text-[10px] font-semibold tracking-[0.14em] text-gold-ink uppercase">{relativeDays(days)}</span> : null}
        </p>
        {entry.kind === "appointment" && (entry.time || entry.location) ? (
          <p className="flex flex-wrap items-center gap-x-2 text-[13.5px] text-cocoa">
            {entry.time ? (
              <span className="inline-flex items-center gap-1">
                <Icon name="clock" size={13} />
                {entry.time}
              </span>
            ) : null}
            {entry.location ? (
              <span className="inline-flex items-center gap-1">
                <Icon name="pin" size={13} />
                {entry.location}
              </span>
            ) : null}
          </p>
        ) : null}
        {entry.notes ? <p className="max-w-prose text-[13.5px] leading-relaxed text-muted">{entry.notes}</p> : null}
        {entry.meta ? <p className="label-caps text-[9.5px]">{entry.meta}</p> : null}
      </div>
    </li>
  );
}

function TodayRow({ today, first, last }: { today: CalendarDate; first: boolean; last: boolean }) {
  return (
    <li className={ROW} aria-label={`Today, ${formatDate(today, "weekday-long")}`}>
      <p className="pt-2 text-right text-[10px] font-semibold tracking-[0.16em] text-rose-ink uppercase">Today</p>
      <div className="relative flex justify-center">
        <Rail first={first} last={last} />
        <span aria-hidden className="relative z-10 mt-2.5 size-2.5 rounded-full bg-desert-rose ring-4 ring-paper" />
      </div>
      <div className={`flex items-start gap-3 pt-1.5 ${last ? "" : "pb-7"}`}>
        <span className="text-[13px] whitespace-nowrap text-rose-ink">{formatDate(today, "weekday-medium")}</span>
        <span aria-hidden className="mt-2 h-px flex-1 bg-dusty-rose/70" />
      </div>
    </li>
  );
}
