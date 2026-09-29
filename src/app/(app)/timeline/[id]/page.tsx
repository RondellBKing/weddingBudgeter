import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/form/ConfirmButton";
import { BackLink } from "@/components/tasks/BackLink";
import { TimelineItemForm } from "@/components/timeline/ItemForm";
import { Card } from "@/components/ui/Card";
import { PageTitle } from "@/components/ui/PageTitle";
import { requireSession } from "@/lib/auth/require-session";
import { loadPlan } from "@/lib/data/plan";
import { loadTimelineItem, loadTimelineVendorOptions } from "@/lib/data/timeline";
import { formatDate } from "@/lib/dates";
import { dateHint, formatTimeRange, timelineHref, viewKeyFor } from "@/lib/domain/timeline";
import { deleteTimelineItem, saveTimelineItem } from "../actions";

export const metadata = { title: "Edit a moment" };

export default async function EditTimelineItemPage({ params }: PageProps<"/timeline/[id]">) {
  await requireSession();
  const { id } = await params;
  const item = await loadTimelineItem(id);
  if (!item) notFound();
  const [{ settings }, vendors] = await Promise.all([loadPlan(), loadTimelineVendorOptions(item.vendor?.id ?? null)]);
  const back = timelineHref(viewKeyFor(item.date, settings.weddingDate), `item-${item.id}`);

  return (
    <div className="grid gap-6 sm:gap-8">
      <BackLink href={back}>Timeline</BackLink>
      <PageTitle
        lead="Edit the"
        word="moment"
        eyebrow="Timeline"
        intro={`${item.title}: ${formatDate(item.date, "weekday-long")}, ${formatTimeRange(item.startTime, item.endTime)}.`}
      />
      <Card className="p-6 sm:p-9">
        <TimelineItemForm
          action={saveTimelineItem.bind(null, item.id)}
          values={{
            date: item.date,
            startTime: item.startTime,
            endTime: item.endTime ?? "",
            title: item.title,
            location: item.location ?? "",
            lead: item.lead ?? "",
            involves: item.involves ?? "",
            vendorId: item.vendor?.id ?? "",
            notes: item.notes ?? "",
          }}
          vendors={vendors}
          dateHint={dateHint(settings.weddingDate)}
          cancelHref={back}
          submitLabel="Save"
        />
      </Card>
      <section
        aria-labelledby="delete-h"
        className="flex flex-wrap items-center justify-between gap-4 rounded-[3px] border border-dashed border-rule-strong px-5 py-4 sm:px-6"
      >
        <div className="grid gap-0.5">
          <h2 id="delete-h" className="label-caps">
            Delete this moment
          </h2>
          <p className="text-[13px] text-muted">It comes off the run of show for good. This can&apos;t be undone.</p>
        </div>
        <ConfirmButton action={deleteTimelineItem.bind(null, item.id)} question="Delete this moment?">
          Delete
        </ConfirmButton>
      </section>
    </div>
  );
}
