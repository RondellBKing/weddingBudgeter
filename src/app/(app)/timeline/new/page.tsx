import { BackLink } from "@/components/tasks/BackLink";
import { TimelineItemForm } from "@/components/timeline/ItemForm";
import { Card } from "@/components/ui/Card";
import { PageTitle } from "@/components/ui/PageTitle";
import { requireSession } from "@/lib/auth/require-session";
import { loadPlan } from "@/lib/data/plan";
import { loadTimelineVendorOptions } from "@/lib/data/timeline";
import { parseCalendarDate } from "@/lib/dates";
import { dateHint, timelineHref, viewKeyFor } from "@/lib/domain/timeline";
import { saveTimelineItem } from "../actions";

export const metadata = { title: "Add to the timeline" };

export default async function NewTimelineItemPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireSession();
  const sp = await searchParams;
  const [{ settings }, vendors] = await Promise.all([loadPlan(), loadTimelineVendorOptions()]);
  const date = parseCalendarDate(typeof sp.date === "string" ? sp.date : null) ?? settings.weddingDate;
  const back = timelineHref(viewKeyFor(date, settings.weddingDate));

  return (
    <div className="grid gap-6 sm:gap-8">
      <BackLink href={back}>Timeline</BackLink>
      <PageTitle lead="A new" word="moment" eyebrow="Timeline" intro="One line of the run of show: when it happens, where, and who runs it." />
      <Card className="p-6 sm:p-9">
        <TimelineItemForm
          action={saveTimelineItem.bind(null, null)}
          values={{ date, startTime: "", endTime: "", title: "", location: "", lead: "", involves: "", vendorId: "", notes: "" }}
          vendors={vendors}
          dateHint={dateHint(settings.weddingDate)}
          cancelHref={back}
          submitLabel="Add to the timeline"
        />
      </Card>
    </div>
  );
}
