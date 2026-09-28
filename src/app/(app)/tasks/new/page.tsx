import { BackLink } from "@/components/tasks/BackLink";
import { TaskForm } from "@/components/tasks/TaskForm";
import { Card } from "@/components/ui/Card";
import { PageTitle } from "@/components/ui/PageTitle";
import { loadTaskOptions } from "@/lib/data/tasks";
import { parseCalendarDate } from "@/lib/dates";
import { safeReturnPath } from "@/lib/domain/tasks";
import { saveTask } from "../actions";

export const metadata = { title: "New task" };

export default async function NewTaskPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const back = safeReturnPath(sp.back, "/tasks");
  const date = parseCalendarDate(typeof sp.date === "string" ? sp.date : null);
  const { vendors, party } = await loadTaskOptions();

  return (
    <div className="grid gap-6 sm:gap-8">
      <BackLink href={back}>{back.startsWith("/calendar") ? "Calendar" : "Tasks"}</BackLink>
      <PageTitle lead="A new" word="task" eyebrow="Plan" intro="Only the title is required. Add a date to put it on the calendar." />
      <Card className="p-6 sm:p-9">
        <TaskForm
          action={saveTask.bind(null, null, back)}
          values={{
            title: "",
            notes: "",
            dueDate: date ?? "",
            owner: "BOTH",
            status: "NOT_STARTED",
            priority: "MEDIUM",
            area: "PLANNING",
            vendorId: "",
            partyMemberId: "",
            isMilestone: false,
          }}
          vendors={vendors}
          party={party}
          submitLabel="Add task"
          cancelHref={back}
        />
      </Card>
    </div>
  );
}
