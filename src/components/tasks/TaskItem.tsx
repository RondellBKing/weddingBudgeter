import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { formatDate, relativeDays, type CalendarDate } from "@/lib/dates";
import { taskDue, type TaskRow } from "@/lib/domain/tasks";
import { OWNER_LABEL, TASK_AREA_LABEL } from "@/lib/labels";
import { SelectBox } from "./Selection";
import { TaskCheck } from "./TaskCheck";

// One task in the list and on the board: the tick box, the title (a link to edit it),
// what it's about, and when it's due, with the date's state always in words.

export function taskHref(id: string, back: string): string {
  return `/tasks/${id}?back=${encodeURIComponent(back)}`;
}

export function MilestoneMark() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-[0.12em] whitespace-nowrap text-gold-ink uppercase">
      <Icon name="star" size={12} className="fill-gold/40" />
      Milestone
    </span>
  );
}

export function StatusMark({ status }: { status: TaskRow["status"] }) {
  if (status === "IN_PROGRESS") {
    return <span className="text-[10px] font-semibold tracking-[0.12em] whitespace-nowrap text-rose-ink uppercase">In progress</span>;
  }
  if (status === "BLOCKED") {
    return <span className="text-[10px] font-semibold tracking-[0.12em] whitespace-nowrap text-brick uppercase">Blocked</span>;
  }
  return null;
}

export function taskMeta(t: TaskRow): string {
  return [
    OWNER_LABEL[t.owner],
    TASK_AREA_LABEL[t.area],
    t.vendorName,
    t.partyMemberName ? `Duty for ${t.partyMemberName}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** "8 days overdue" in brick, "In 5 days" in gold within two weeks, nothing further out. */
export function DueWords({ task, today, wrap = false }: { task: TaskRow; today: CalendarDate; wrap?: boolean }) {
  const due = taskDue(task, today);
  if (due.days === null || (due.state !== "overdue" && due.state !== "due-soon")) return null;
  return (
    <span
      className={`block text-[10px] font-semibold tracking-[0.1em] uppercase ${wrap ? "" : "whitespace-nowrap"} ${due.state === "overdue" ? "text-brick" : "text-gold-ink"}`}
    >
      {relativeDays(due.days)}
    </span>
  );
}

export function TaskItem({
  task,
  today,
  back,
  dateStyle = "month-day",
}: {
  task: TaskRow;
  today: CalendarDate;
  back: string;
  dateStyle?: "month-day" | "medium";
}) {
  const done = task.status === "DONE";
  return (
    <li className="flex gap-3 border-b border-rule py-3.5 first:pt-0 last:border-b-0 last:pb-0">
      {!done ? <SelectBox id={task.id} title={task.title} /> : null}
      <TaskCheck id={task.id} done={done} title={task.title} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[15px] leading-snug">
          <Link
            href={taskHref(task.id, back)}
            className={done ? "text-muted line-through decoration-rule-strong hover:text-chocolate" : "hover:text-rose-ink"}
          >
            {task.title}
          </Link>
          {task.isMilestone && !done ? <MilestoneMark /> : null}
          <StatusMark status={task.status} />
        </p>
        {task.notes && !done ? <p className="mt-1 max-w-prose text-[13px] leading-relaxed text-cocoa/90">{task.notes}</p> : null}
        {!done ? <p className="mt-1 text-xs text-muted">{taskMeta(task)}</p> : null}
      </div>
      <span className="shrink-0 pt-px text-right">
        {task.dueDate ? (
          <span className={`num block text-sm ${done ? "text-muted" : "text-cocoa"}`}>{formatDate(task.dueDate, dateStyle)}</span>
        ) : (
          <span className="block text-xs text-muted">No date</span>
        )}
        {!done ? <DueWords task={task} today={today} /> : null}
      </span>
    </li>
  );
}
