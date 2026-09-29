import { EmptyState } from "@/components/ui/EmptyState";
import { PageTitle } from "@/components/ui/PageTitle";
import { requireSession } from "@/lib/auth/require-session";

export const metadata = { title: "Gifts" };

export default async function Page() {
  await requireSession();
  return (
    <div className="grid gap-8 sm:gap-10">
      <PageTitle word="Gifts" eyebrow="Guest care" intro="Every gift as it arrives, and every thank-you note still to write." />
      <EmptyState icon="gift" title="Coming" word="together">
        <p>This part of the planner is being set up.</p>
      </EmptyState>
    </div>
  );
}
