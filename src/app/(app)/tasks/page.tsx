import Link from "next/link";
import { Board } from "@/components/tasks/Board";
import { FilterBar } from "@/components/tasks/FilterBar";
import { QuickAdd } from "@/components/tasks/QuickAdd";
import { SelectionBar, SelectionProvider, SelectToggle } from "@/components/tasks/Selection";
import { TaskItem, taskHref } from "@/components/tasks/TaskItem";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { PageTitle } from "@/components/ui/PageTitle";
import { Ring } from "@/components/ui/Ring";
import { Tabs } from "@/components/ui/Tabs";
import { loadTasks } from "@/lib/data/tasks";
import { daysBetween, formatDate, relativeDays, type CalendarDate } from "@/lib/dates";
import { groupByMonth } from "@/lib/domain/agenda";
import {
  hasActiveFilters,
  matchesFilters,
  parseTaskFilters,
  sectionTasks,
  taskStats,
  tasksHref,
  DEFAULT_FILTERS,
  DUE_WINDOW_LABEL,
  type TaskFilters,
  type TaskRow,
} from "@/lib/domain/tasks";
import { OWNER_LABEL, TASK_AREA_LABEL, TASK_STATUS_LABEL, valuesOf } from "@/lib/labels";
import { formatPercent } from "@/lib/money";

export const metadata = { title: "Tasks" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** "Capri's tasks · In progress · Venue · Due this week", for the empty-result message. */
function describeFilters(f: TaskFilters): string {
  return [
    f.owner ? `Who: ${OWNER_LABEL[f.owner]}` : null,
    f.status ? (f.status === "OPEN" ? "Not done yet" : TASK_STATUS_LABEL[f.status]) : null,
    f.area ? TASK_AREA_LABEL[f.area] : null,
    f.due !== "all" ? DUE_WINDOW_LABEL[f.due] : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export default async function TasksPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const { plan, tasks } = await loadTasks();
  const { today, settings } = plan;
  const filters = parseTaskFilters(sp, { owners: valuesOf(OWNER_LABEL), areas: valuesOf(TASK_AREA_LABEL) });
  const stats = taskStats(tasks, today);
  const shown = tasks.filter((t) => matchesFilters(t, filters, today));
  const back = tasksHref(filters);
  const openShownIds = shown.filter((t) => t.status !== "DONE").map((t) => t.id);
  const filtered = hasActiveFilters(filters);

  return (
    <div className="grid gap-8 sm:gap-10">
      <PageTitle
        word="Tasks"
        eyebrow="Plan"
        intro={`Our checklist, dated backwards from ${formatDate(settings.weddingDate, "weekday-long")}. Tick things off as they're done; every date can be changed.`}
        actions={
          <Link href={`/tasks/new?back=${encodeURIComponent(back)}`} className={buttonClass("primary")}>
            New task
          </Link>
        }
      />

      <StatsCard stats={stats} today={today} back={back} />

      <Card className="p-5 sm:p-7" aria-label="Add a task">
        <QuickAdd />
      </Card>

      <SelectionProvider>
        <section aria-label="Task list" className="grid gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs
              label="View"
              current={filters.view}
              items={[
                { key: "list", label: "List", href: tasksHref(filters, { view: "list" }) },
                { key: "board", label: "Board", href: tasksHref(filters, { view: "board" }) },
              ]}
            />
            <div className="flex items-center gap-3">
              {filtered ? (
                <Link href={tasksHref({ ...DEFAULT_FILTERS, view: filters.view })} className="text-[13px] text-rose-ink hover:text-chocolate">
                  Clear filters
                </Link>
              ) : null}
              <SelectToggle disabled={openShownIds.length === 0} />
            </div>
          </div>

          <FilterBar filters={filters} overdueCount={stats.overdue} />

          {tasks.length === 0 ? (
            <EmptyState icon="tasks" title="Nothing on the" word="list">
              <p>Add the first task above, or create one with every detail using New task.</p>
            </EmptyState>
          ) : shown.length === 0 ? (
            <Card className="grid justify-items-start gap-3 px-6 py-10 sm:px-9">
              <p className="font-display text-2xl">
                Nothing <em className="italic">matches</em>
              </p>
              <p className="text-sm text-cocoa">No tasks for {describeFilters(filters)}.</p>
              <Link href={tasksHref({ ...DEFAULT_FILTERS, view: filters.view })} className={buttonClass("secondary", "sm")}>
                Show every task
              </Link>
            </Card>
          ) : filters.view === "board" ? (
            <Board tasks={shown} today={today} back={back} />
          ) : (
            <ListView tasks={shown} today={today} back={back} />
          )}

          <SelectionBar openIds={openShownIds} />
        </section>
      </SelectionProvider>
    </div>
  );
}

function StatsCard({ stats, today, back }: { stats: ReturnType<typeof taskStats>; today: CalendarDate; back: string }) {
  const next = stats.next;
  return (
    <Card className="grid gap-6 p-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-10 sm:p-8">
      <Ring
        size={132}
        thickness={9}
        total={stats.total}
        label={`${stats.done} of ${stats.total} tasks done`}
        segments={[{ label: "Done", value: stats.done, className: "stroke-garden" }]}
      >
        <div className="grid gap-0.5">
          <span className="num font-display text-3xl leading-none">{formatPercent(stats.done, stats.total)}</span>
          <span className="text-[11px] text-muted">done</span>
        </div>
      </Ring>
      <div className="grid gap-4">
        <dl className="grid grid-cols-3 gap-4">
          {(
            [
              [stats.open, "to go"],
              [stats.milestonesAhead, "milestones ahead"],
              [stats.overdue, "overdue"],
            ] as const
          ).map(([n, label]) => (
            <div key={label} className="flex flex-col-reverse justify-end gap-1">
              <dt className="label-caps text-[10px]">{label}</dt>
              <dd className={`num font-display text-[34px] leading-none ${label === "overdue" && n > 0 ? "text-brick" : ""}`}>{n}</dd>
            </div>
          ))}
        </dl>
        {next?.dueDate ? (
          <p className="border-t border-rule pt-4 text-sm text-cocoa">
            <span className="label-caps mr-2 text-[10px]">Next up</span>
            <Link href={taskHref(next.id, back)} className="hover:text-rose-ink">
              {next.title}
            </Link>
            , {formatDate(next.dueDate, "weekday-medium")} ({relativeDays(daysBetween(today, next.dueDate)).toLowerCase()})
          </p>
        ) : null}
      </div>
    </Card>
  );
}

function ListView({ tasks, today, back }: { tasks: TaskRow[]; today: CalendarDate; back: string }) {
  const s = sectionTasks(tasks, today);
  const months = groupByMonth(s.upcoming.map((t) => ({ ...t, date: t.dueDate as CalendarDate })));

  return (
    <div className="grid gap-6">
      {s.overdue.length > 0 ? (
        <section
          aria-labelledby="overdue-h"
          className="relative grid gap-3 overflow-hidden rounded-[3px] border border-brick/35 bg-paper px-6 py-7 shadow-[0_1px_2px_rgba(62,43,34,0.04),0_8px_24px_-16px_rgba(156,59,46,0.35)] sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-8 sm:px-9"
        >
          <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-brick" />
          <h2 id="overdue-h" className="leading-none text-brick">
            <span className="font-display text-[28px] italic">Overdue</span>
            <span className="mt-1.5 flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.14em] uppercase">
              <Icon name="clock" size={13} />
              {s.overdue.length} {s.overdue.length === 1 ? "task" : "tasks"} late
            </span>
          </h2>
          <ul className="grid">
            {s.overdue.map((t) => (
              <TaskItem key={t.id} task={t} today={today} back={back} dateStyle="medium" />
            ))}
          </ul>
        </section>
      ) : null}

      {months.length > 0 || s.undated.length > 0 ? (
        <Card className="px-6 sm:px-9">
          {months.map((m) => {
            const [monthName, year] = m.label.split(" ");
            return (
              <section
                key={m.key}
                aria-label={m.label}
                className="grid gap-3 border-b border-rule py-7 last:border-b-0 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-8"
              >
                <h2 className="leading-none">
                  <span className="font-display text-[28px] italic">{monthName}</span>
                  <span className="label-caps mt-1.5 block text-[10px]">{year}</span>
                </h2>
                <ul className="grid">
                  {m.items.map((t) => (
                    <TaskItem key={t.id} task={t} today={today} back={back} />
                  ))}
                </ul>
              </section>
            );
          })}
          {s.undated.length > 0 ? (
            <section aria-label="No date yet" className="grid gap-3 py-7 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-8">
              <h2 className="leading-none">
                <span className="font-display text-[28px] italic">Someday</span>
                <span className="label-caps mt-1.5 block text-[10px]">No date yet</span>
              </h2>
              <ul className="grid">
                {s.undated.map((t) => (
                  <TaskItem key={t.id} task={t} today={today} back={back} />
                ))}
              </ul>
            </section>
          ) : null}
        </Card>
      ) : null}

      {s.done.length > 0 ? (
        <Card as="section" aria-labelledby="done-h" className="px-6 sm:px-9">
          <details open={s.done.length <= 6} className="group py-7">
            <summary className="flex cursor-pointer list-none items-baseline justify-between gap-4 [&::-webkit-details-marker]:hidden">
              <h2 id="done-h" className="flex items-baseline gap-3 leading-none">
                <span className="font-display text-[28px] italic">Done</span>
                <span className="num label-caps text-[10px]">{s.done.length}</span>
              </h2>
              <span className="text-[13px] text-rose-ink group-open:hidden">Show</span>
              <span className="hidden text-[13px] text-rose-ink group-open:inline">Hide</span>
            </summary>
            <ul className="mt-5 grid sm:ml-[calc(9.5rem+2rem)]">
              {s.done.map((t) => (
                <TaskItem key={t.id} task={t} today={today} back={back} dateStyle="medium" />
              ))}
            </ul>
          </details>
        </Card>
      ) : null}
    </div>
  );
}
