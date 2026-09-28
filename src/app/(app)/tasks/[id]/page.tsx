import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/form/ConfirmButton";
import { BackLink } from "@/components/tasks/BackLink";
import { TaskForm } from "@/components/tasks/TaskForm";
import { Card } from "@/components/ui/Card";
import { PageTitle } from "@/components/ui/PageTitle";
import { loadPlan } from "@/lib/data/plan";
import { loadTask, loadTaskOptions } from "@/lib/data/tasks";
import { formatInstant } from "@/lib/dates";
import { safeReturnPath } from "@/lib/domain/tasks";
import { deleteTask, saveTask } from "../actions";

export const metadata = { title: "Edit task" };

export default async function EditTaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const back = safeReturnPath(sp.back, "/tasks");
  const [task, { vendors, party }, { settings }] = await Promise.all([loadTask(id), loadTaskOptions(), loadPlan()]);
  if (!task) notFound();

  const intro = [
    task.completedAt
      ? `Done ${formatInstant(task.completedAt, settings.timezone, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}.`
      : null,
    task.isSeeded ? "This one came with the planning checklist. Change it or delete it like any other task." : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="grid gap-6 sm:gap-8">
      <BackLink href={back}>{back.startsWith("/calendar") ? "Calendar" : "Tasks"}</BackLink>
      <PageTitle lead="Edit the" word="task" eyebrow="Plan" intro={intro || undefined} />
      <Card className="p-6 sm:p-9">
        <TaskForm
          action={saveTask.bind(null, task.id, back)}
          values={{
            title: task.title,
            notes: task.notes ?? "",
            dueDate: task.dueDate ?? "",
            owner: task.owner,
            status: task.status,
            priority: task.priority,
            area: task.area,
            vendorId: task.vendorId ?? "",
            partyMemberId: task.partyMemberId ?? "",
            isMilestone: task.isMilestone,
          }}
          vendors={vendors}
          party={party}
          submitLabel="Save task"
          cancelHref={back}
        />
      </Card>
      <section aria-labelledby="delete-h" className="flex flex-wrap items-center justify-between gap-4 rounded-[3px] border border-dashed border-rule-strong px-5 py-4 sm:px-6">
        <div className="grid gap-0.5">
          <h2 id="delete-h" className="label-caps">
            Delete this task
          </h2>
          <p className="text-[13px] text-muted">It comes off the list and the calendar. This can&apos;t be undone.</p>
        </div>
        <ConfirmButton action={deleteTask.bind(null, task.id, back)} question="Delete this task?">
          Delete task
        </ConfirmButton>
      </section>
    </div>
  );
}
