import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageTitle } from "@/components/ui/PageTitle";
import { requireSession } from "@/lib/auth/require-session";

export const metadata = { title: "Guests" };

export default async function Page() {
  await requireSession();
  return (
    <div className="grid gap-10">
      <PageTitle word="Guests" />
      <ComingSoon
        phase={5}
        items={[
        "Import the list from your RSVP app, with a preview before anything changes",
        "Re-import without duplicates",
        "Headcount against the venue's included 125",
        ]}
      />
    </div>
  );
}
