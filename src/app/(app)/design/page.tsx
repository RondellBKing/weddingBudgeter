import { EmptyState } from "@/components/ui/EmptyState";
import { PageTitle } from "@/components/ui/PageTitle";
import { requireSession } from "@/lib/auth/require-session";

export const metadata = { title: "Vision & Décor" };

export default async function Page() {
  await requireSession();
  return (
    <div className="grid gap-8 sm:gap-10">
      <PageTitle word="Vision & Décor" eyebrow="Design" intro="The look of the day: inspiration, the palette, and every piece of décor and rental that has to arrive at the venue." />
      <EmptyState icon="design" title="Coming" word="together">
        <p>This part of the planner is being set up.</p>
      </EmptyState>
    </div>
  );
}
