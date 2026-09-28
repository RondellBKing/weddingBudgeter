import { ComingSoon } from "@/components/ui/ComingSoon";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageTitle } from "@/components/ui/PageTitle";
import { requireSession } from "@/lib/auth/require-session";

export const metadata = { title: "Seating Plan" };

export default async function SeatingPage() {
  await requireSession();
  return (
    <div className="grid gap-8 sm:gap-10">
      <PageTitle word="Seating Plan" eyebrow="People" intro="Tables, and who sits where. This is one of the last things we'll do, once RSVPs are in." />
      <EmptyState icon="seating" title="No tables" word="yet">
        <p>
          After the guest list is imported and RSVPs close, we&apos;ll set out the tables and seat everyone, whole
          households at a time.
        </p>
      </EmptyState>
      <ComingSoon
        phase={5}
        items={[
          "Drag guests and whole households onto tables",
          "Warnings when a table is over capacity",
          "A simple list on phones, and a printable table-by-table list for the venue and caterer",
        ]}
      />
    </div>
  );
}
