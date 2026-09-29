import { EmptyState } from "@/components/ui/EmptyState";
import { PageTitle } from "@/components/ui/PageTitle";
import { requireSession } from "@/lib/auth/require-session";

export const metadata = { title: "Meals" };

export default async function Page() {
  await requireSession();
  return (
    <div className="grid gap-8 sm:gap-10">
      <PageTitle word="Meals" eyebrow="Guest care" intro="Meal counts and every dietary need, ready to send to the venue." />
      <EmptyState icon="meals" title="Coming" word="together">
        <p>This part of the planner is being set up.</p>
      </EmptyState>
    </div>
  );
}
