import { HotelForm } from "@/components/travel/HotelForm";
import { BackLink } from "@/components/tasks/BackLink";
import { Card } from "@/components/ui/Card";
import { PageTitle } from "@/components/ui/PageTitle";
import { requireSession } from "@/lib/auth/require-session";
import { loadPlan } from "@/lib/data/plan";
import { loadVendorOptions } from "@/lib/data/travel";
import { formatDate } from "@/lib/dates";
import { saveHotel } from "../../actions";

export const metadata = { title: "Add a hotel block" };

export default async function NewHotelPage() {
  await requireSession();
  const [plan, vendors] = await Promise.all([loadPlan(), loadVendorOptions("LODGING")]);
  return (
    <div className="grid gap-6 sm:gap-8">
      <BackLink href="/travel#hotels">Hotels &amp; Travel</BackLink>
      <PageTitle lead="Add a" word="hotel block" eyebrow="Hotels & Travel" intro="Rooms held for guests at a group rate, and the date that rate ends." />
      <Card className="p-6 sm:p-9">
        <HotelForm
          action={saveHotel.bind(null, null)}
          values={{
            name: "",
            address: "",
            phone: "",
            bookingUrl: "",
            groupCode: "",
            roomsHeld: "",
            nightlyRate: "",
            cutoffDate: "",
            checkIn: "",
            checkOut: "",
            vendorId: "",
            notes: "",
          }}
          vendors={vendors}
          weddingDateLabel={formatDate(plan.settings.weddingDate, "weekday-long")}
          submitLabel="Add hotel block"
        />
      </Card>
    </div>
  );
}
