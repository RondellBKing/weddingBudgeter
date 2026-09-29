import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/form/ConfirmButton";
import { HotelForm } from "@/components/travel/HotelForm";
import { BackLink } from "@/components/tasks/BackLink";
import { Card } from "@/components/ui/Card";
import { PageTitle } from "@/components/ui/PageTitle";
import { requireSession } from "@/lib/auth/require-session";
import { loadPlan } from "@/lib/data/plan";
import { loadHotel, loadVendorOptions } from "@/lib/data/travel";
import { formatDate } from "@/lib/dates";
import { centsToInputValue } from "@/lib/money";
import { deleteHotel, saveHotel } from "../../actions";

export const metadata = { title: "Edit hotel block" };

export default async function EditHotelPage({ params }: PageProps<"/travel/hotels/[id]">) {
  await requireSession();
  const { id } = await params;
  const [h, plan, vendors] = await Promise.all([loadHotel(id), loadPlan(), loadVendorOptions("LODGING")]);
  if (!h) notFound();

  return (
    <div className="grid gap-6 sm:gap-8">
      <BackLink href="/travel#hotels">Hotels &amp; Travel</BackLink>
      <PageTitle lead="Edit the" word="hotel block" eyebrow="Hotels & Travel" intro={h.name} />
      <Card className="p-6 sm:p-9">
        <HotelForm
          action={saveHotel.bind(null, h.id)}
          values={{
            name: h.name,
            address: h.address ?? "",
            phone: h.phone ?? "",
            bookingUrl: h.bookingUrl ?? "",
            groupCode: h.groupCode ?? "",
            roomsHeld: h.roomsHeld === null ? "" : String(h.roomsHeld),
            nightlyRate: centsToInputValue(h.nightlyRateCents),
            cutoffDate: h.cutoffDate ?? "",
            checkIn: h.checkIn ?? "",
            checkOut: h.checkOut ?? "",
            vendorId: h.vendor?.id ?? "",
            notes: h.notes ?? "",
          }}
          vendors={vendors}
          weddingDateLabel={formatDate(plan.settings.weddingDate, "weekday-long")}
          submitLabel="Save hotel block"
        />
      </Card>
      <section
        aria-labelledby="delete-h"
        className="flex flex-wrap items-center justify-between gap-4 rounded-[3px] border border-dashed border-rule-strong px-5 py-4 sm:px-6"
      >
        <div className="grid gap-0.5">
          <h2 id="delete-h" className="label-caps">
            Delete this hotel block
          </h2>
          <p className="text-[13px] text-muted">It comes off Hotels &amp; Travel for good. This can&apos;t be undone.</p>
        </div>
        <ConfirmButton action={deleteHotel.bind(null, h.id)} question="Delete this hotel block?">
          Delete hotel block
        </ConfirmButton>
      </section>
    </div>
  );
}
