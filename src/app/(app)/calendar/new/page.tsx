import { EventForm } from "@/components/calendar/EventForm";
import { BackLink } from "@/components/tasks/BackLink";
import { Card } from "@/components/ui/Card";
import { PageTitle } from "@/components/ui/PageTitle";
import { loadEventOptions } from "@/lib/data/calendar";
import { parseCalendarDate } from "@/lib/dates";
import { safeReturnPath } from "@/lib/domain/tasks";
import { saveEvent } from "../actions";

export const metadata = { title: "New appointment" };

export default async function NewEventPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const back = safeReturnPath(sp.back, "/calendar");
  const date = parseCalendarDate(typeof sp.date === "string" ? sp.date : null);
  const { vendors } = await loadEventOptions();

  return (
    <div className="grid gap-6 sm:gap-8">
      <BackLink href={back}>Calendar</BackLink>
      <PageTitle
        lead="A new"
        word="appointment"
        eyebrow="Calendar"
        intro="Tastings, fittings, meetings and visits. Times are New York time; your phone shows them in its own."
      />
      <Card className="p-6 sm:p-9">
        <EventForm
          action={saveEvent.bind(null, null, back)}
          values={{
            title: "",
            type: "APPOINTMENT",
            timing: "timed",
            date: date ?? "",
            startTime: "",
            endTime: "",
            location: "",
            vendorId: "",
            notes: "",
          }}
          vendors={vendors}
          submitLabel="Add appointment"
          cancelHref={back}
        />
      </Card>
    </div>
  );
}
