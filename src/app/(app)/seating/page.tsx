import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageTitle } from "@/components/ui/PageTitle";
import { requireSession } from "@/lib/auth/require-session";

export const metadata = { title: "Seating" };

export default async function Page() {
  await requireSession();
  return (
    <div className="grid gap-10">
      <PageTitle word="Seating Plan" />
      <ComingSoon
        phase={5}
        items={[
        "Drag guests and whole households onto tables",
        "Capacity warnings per table",
        "Printable table-by-table list for the venue and caterer",
        ]}
      />
    </div>
  );
}
