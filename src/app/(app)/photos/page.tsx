import { EmptyState } from "@/components/ui/EmptyState";
import { PageTitle } from "@/components/ui/PageTitle";
import { requireSession } from "@/lib/auth/require-session";

export const metadata = { title: "Photos" };

export default async function Page() {
  await requireSession();
  return (
    <div className="grid gap-8 sm:gap-10">
      <PageTitle word="Photos" eyebrow="Wedding day" intro="The shot list for the photographer, with every family grouping and who needs to be in it." />
      <EmptyState icon="camera" title="Coming" word="together">
        <p>This part of the planner is being set up.</p>
      </EmptyState>
    </div>
  );
}
