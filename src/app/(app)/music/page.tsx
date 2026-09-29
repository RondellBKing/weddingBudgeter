import { EmptyState } from "@/components/ui/EmptyState";
import { PageTitle } from "@/components/ui/PageTitle";
import { requireSession } from "@/lib/auth/require-session";

export const metadata = { title: "Music" };

export default async function Page() {
  await requireSession();
  return (
    <div className="grid gap-8 sm:gap-10">
      <PageTitle word="Music" eyebrow="Wedding day" intro="Every song that matters: the processional, first dance, must-plays and do-not-plays, and who walks in when." />
      <EmptyState icon="music" title="Coming" word="together">
        <p>This part of the planner is being set up.</p>
      </EmptyState>
    </div>
  );
}
