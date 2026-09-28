import Link from "next/link";
import { formatDate, type CalendarDate } from "@/lib/dates";
import { groupByStatus, isOverdue, type TaskRow } from "@/lib/domain/tasks";
import { TASK_STATUS_LABEL } from "@/lib/labels";
import { SelectBox } from "./Selection";
import { StatusSelect } from "./StatusSelect";
import { TaskCheck } from "./TaskCheck";
import { DueWords, MilestoneMark, taskHref, taskMeta } from "./TaskItem";

// Board view: one column per status. Four across on wide screens, two on tablets, stacked on
// phones. Overdue cards sit at the top of their column with a brick edge and the word.

/** Cards shown before a column folds the rest behind "Show N more". */
const SHOWN = 10;

const COLUMN_DOT: Record<TaskRow["status"], string> = {
  NOT_STARTED: "border border-rule-strong bg-paper",
  IN_PROGRESS: "bg-dusty-rose",
  BLOCKED: "bg-brick",
  DONE: "bg-garden",
};

export function Board({ tasks, today, back }: { tasks: TaskRow[]; today: CalendarDate; back: string }) {
  const columns = groupByStatus(tasks, today);
  return (
    <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
      {columns.map((col) => {
        // Done shows the most recent first; the others keep overdue-then-date order.
        const ordered = col.status === "DONE" ? [...col.tasks].reverse() : col.tasks;
        const shown = ordered.slice(0, SHOWN);
        const rest = ordered.slice(SHOWN);
        return (
          <section
            key={col.status}
            aria-labelledby={`col-${col.status}`}
            className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-3 rounded-[3px] border border-rule bg-linen/40 p-2.5"
          >
            <h2 id={`col-${col.status}`} className="flex items-center justify-between gap-2 px-1 pt-1">
              <span className="flex items-center gap-2">
                <span aria-hidden className={`size-2.5 rounded-full ${COLUMN_DOT[col.status]}`} />
                <span className="font-display text-[22px] leading-none italic">{TASK_STATUS_LABEL[col.status]}</span>
              </span>
              <span className="num text-[13px] text-muted">{col.tasks.length}</span>
            </h2>
            {shown.length === 0 ? (
              <p className="rounded-[3px] border border-dashed border-rule-strong px-3 py-5 text-center text-[13px] text-muted">Nothing here</p>
            ) : (
              <ul className="grid grid-cols-[minmax(0,1fr)] gap-2.5">
                {shown.map((t) => (
                  <BoardCard key={t.id} task={t} today={today} back={back} />
                ))}
              </ul>
            )}
            {rest.length > 0 ? (
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-center gap-1.5 rounded-[3px] border border-rule-strong bg-paper px-3 py-2 text-[12.5px] text-rose-ink hover:border-chocolate hover:text-chocolate [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">Show {rest.length} more</span>
                  <span className="hidden group-open:inline">Show fewer</span>
                </summary>
                <ul className="mt-2.5 grid grid-cols-[minmax(0,1fr)] gap-2.5">
                  {rest.map((t) => (
                    <BoardCard key={t.id} task={t} today={today} back={back} />
                  ))}
                </ul>
              </details>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function BoardCard({ task, today, back }: { task: TaskRow; today: CalendarDate; back: string }) {
  const done = task.status === "DONE";
  const late = isOverdue(task, today);
  return (
    <li
      className={`grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2.5 rounded-[3px] border bg-paper p-3 shadow-[0_1px_2px_rgba(62,43,34,0.05)] ${
        late ? "border-brick/40 border-l-[3px] border-l-brick" : "border-rule"
      }`}
    >
      <div className="flex gap-2.5">
        {!done ? <SelectBox id={task.id} title={task.title} /> : null}
        <TaskCheck id={task.id} done={done} title={task.title} />
        <div className="min-w-0 flex-1 pt-0.5">
          <Link
            href={taskHref(task.id, back)}
            className={`block text-[14.5px] leading-snug ${done ? "text-muted line-through decoration-rule-strong" : "hover:text-rose-ink"}`}
          >
            {task.title}
          </Link>
          {task.isMilestone && !done ? (
            <span className="mt-1 block">
              <MilestoneMark />
            </span>
          ) : null}
        </div>
      </div>
      <div className="grid gap-1.5 border-t border-rule pt-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="num text-[13px] text-cocoa">{task.dueDate ? formatDate(task.dueDate, "medium") : "No date"}</p>
            {!done ? <DueWords task={task} today={today} wrap /> : null}
          </div>
          <StatusSelect id={task.id} status={task.status} title={task.title} />
        </div>
        <p className="text-[11.5px] leading-snug text-muted">{taskMeta(task)}</p>
      </div>
    </li>
  );
}
