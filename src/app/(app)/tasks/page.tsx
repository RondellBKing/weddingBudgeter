import { Card } from "@/components/ui/Card";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { Icon } from "@/components/ui/Icon";
import { PageTitle } from "@/components/ui/PageTitle";
import { Ring } from "@/components/ui/Ring";
import { loadTasksPage } from "@/lib/data/pages";
import { daysBetween, dueState, formatDate, relativeDays, type CalendarDate } from "@/lib/dates";
import { groupByMonth } from "@/lib/domain/agenda";
import { formatPercent } from "@/lib/money";

export const metadata = { title: "Tasks" };

export default async function TasksPage() {
  const { plan, tasks } = await loadTasksPage();
  const { today, settings } = plan;
  const done = tasks.filter((t) => t.done);
  const open = tasks.filter((t) => !t.done && t.dueDate) as Array<(typeof tasks)[number] & { dueDate: CalendarDate }>;
  const overdue = open.filter((t) => dueState(t.dueDate, today) === "overdue").length;
  const milestonesAhead = open.filter((t) => t.isMilestone).length;
  const next = open[0];
  const months = groupByMonth(open.map((t) => ({ ...t, date: t.dueDate })));

  return (
    <div className="grid gap-8 sm:gap-10">
      <PageTitle
        word="Tasks"
        eyebrow="Plan"
        intro={`Our checklist, dated backwards from ${formatDate(settings.weddingDate, "weekday-long")}. Every date is worked out from the wedding day, and every one of them can be changed.`}
      />

      <Card className="grid gap-6 p-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-10 sm:p-8">
        <Ring
          size={132}
          thickness={9}
          total={tasks.length}
          label={`${done.length} of ${tasks.length} tasks done`}
          segments={[{ label: "Done", value: done.length, className: "stroke-garden" }]}
        >
          <div className="grid gap-0.5">
            <span className="num font-display text-3xl leading-none">{formatPercent(done.length, tasks.length)}</span>
            <span className="text-[11px] text-muted">done</span>
          </div>
        </Ring>
        <div className="grid gap-4">
          <dl className="grid grid-cols-3 gap-4">
            {[
              [open.length, "to go"],
              [milestonesAhead, "milestones ahead"],
              [overdue, "overdue"],
            ].map(([n, label]) => (
              <div key={label} className="grid gap-1">
                <dd className={`num font-display text-[34px] leading-none ${label === "overdue" && Number(n) > 0 ? "text-brick" : ""}`}>{n}</dd>
                <dt className="label-caps text-[10px]">{label}</dt>
              </div>
            ))}
          </dl>
          {next ? (
            <p className="border-t border-rule pt-4 text-sm text-cocoa">
              <span className="label-caps mr-2 text-[10px]">Next up</span>
              {next.title}, {formatDate(next.dueDate, "weekday-medium")} ({relativeDays(daysBetween(today, next.dueDate)).toLowerCase()})
            </p>
          ) : null}
        </div>
      </Card>

      <Card className="px-6 sm:px-9">
        {months.map((m) => {
          const [monthName, year] = m.label.split(" ");
          return (
            <section key={m.key} className="grid gap-3 border-b border-rule py-7 last:border-b-0 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-8">
              <h2 className="leading-none">
                <span className="font-display text-[28px] italic">{monthName}</span>
                <span className="label-caps mt-1.5 block text-[10px]">{year}</span>
              </h2>
              <ul className="grid">
                {m.items.map((t) => {
                  const days = daysBetween(today, t.date);
                  const state = dueState(t.date, today, 14);
                  return (
                    <li key={t.id} className="flex gap-3.5 border-b border-rule py-3 first:pt-0 last:border-b-0 last:pb-0">
                      <span aria-hidden className="mt-1 size-[17px] shrink-0 rounded-full border border-rule-strong bg-paper" />
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-x-2 text-[15px] leading-snug">
                          {t.title}
                          {t.isMilestone ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-[0.12em] text-gold-ink uppercase">
                              <Icon name="star" size={12} className="fill-gold/40" />
                              Milestone
                            </span>
                          ) : null}
                        </p>
                        {t.notes ? <p className="mt-1 max-w-prose text-[13px] leading-relaxed text-muted">{t.notes}</p> : null}
                      </div>
                      <span className="shrink-0 text-right">
                        <span className="num block text-sm text-cocoa">{formatDate(t.date, "month-day")}</span>
                        {state !== "on-track" ? (
                          <span className={`block text-[10px] font-semibold tracking-[0.1em] uppercase ${state === "overdue" ? "text-brick" : "text-gold-ink"}`}>
                            {relativeDays(days)}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        {done.length > 0 ? (
          <section className="grid gap-3 py-7 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-8">
            <h2 className="font-display text-[28px] leading-none italic">Done</h2>
            <ul className="grid">
              {done.map((t) => (
                <li key={t.id} className="flex items-baseline gap-3.5 border-b border-rule py-3 first:pt-0 last:border-b-0 last:pb-0">
                  <span aria-hidden className="grid size-[17px] shrink-0 translate-y-0.5 place-items-center rounded-full bg-garden text-paper">
                    <Icon name="check" size={11} strokeWidth={2.4} />
                  </span>
                  <span className="min-w-0 flex-1 text-muted line-through decoration-rule-strong">{t.title}</span>
                  {t.dueDate ? <span className="num shrink-0 text-sm text-muted">{formatDate(t.dueDate, "medium")}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </Card>

      <ComingSoon
        phase={3}
        items={[
          "Tick tasks off, add your own, and change or delete any of these",
          "List and board views, filtered by who owns it, status and due date",
          "Overdue tasks pinned to the top",
        ]}
      />
    </div>
  );
}
