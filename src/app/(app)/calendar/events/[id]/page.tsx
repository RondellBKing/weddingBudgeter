import { notFound } from "next/navigation";
import { EventForm } from "@/components/calendar/EventForm";
import { ConfirmButton } from "@/components/form/ConfirmButton";
import { BackLink } from "@/components/tasks/BackLink";
import { Card } from "@/components/ui/Card";
import { PageTitle } from "@/components/ui/PageTitle";
import { loadEvent, loadEventOptions } from "@/lib/data/calendar";
import { formatDate } from "@/lib/dates";
import { safeReturnPath } from "@/lib/domain/tasks";
import { deleteEvent, saveEvent } from "../../actions";

export const metadata = { title: "Edit appointment" };

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const back = safeReturnPath(sp.back, "/calendar");
  const [event, { vendors }] = await Promise.all([loadEvent(id), loadEventOptions()]);
  if (!event) notFound();

  const when = `${formatDate(event.date, "weekday-long")}${event.timeLabel ? `, ${event.timeLabel} (New York time)` : ", all day"}.`;

  return (
    <div className="grid gap-6 sm:gap-8">
      <BackLink href={back}>Calendar</BackLink>
      <PageTitle lead="Edit the" word="appointment" eyebrow="Calendar" intro={when} />
      <Card className="p-6 sm:p-9">
        <EventForm
          action={saveEvent.bind(null, event.id, back)}
          values={{
            title: event.title,
            type: event.type,
            timing: event.allDay ? "allDay" : "timed",
            date: event.date,
            startTime: event.startTime,
            endTime: event.endTime,
            location: event.location ?? "",
            vendorId: event.vendorId ?? "",
            notes: event.notes ?? "",
          }}
          vendors={vendors}
          submitLabel="Save appointment"
          cancelHref={back}
        />
      </Card>
      <section aria-labelledby="delete-h" className="flex flex-wrap items-center justify-between gap-4 rounded-[3px] border border-dashed border-rule-strong px-5 py-4 sm:px-6">
        <div className="grid gap-0.5">
          <h2 id="delete-h" className="label-caps">
            Delete this appointment
          </h2>
          <p className="text-[13px] text-muted">It comes off the calendar and your phones. This can&apos;t be undone.</p>
        </div>
        <ConfirmButton action={deleteEvent.bind(null, event.id, back)} question="Delete this appointment?">
          Delete appointment
        </ConfirmButton>
      </section>
    </div>
  );
}
