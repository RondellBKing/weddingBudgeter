import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageTitle } from "@/components/ui/PageTitle";
import { requireSession } from "@/lib/auth/require-session";

export const metadata = { title: "Calendar" };

export default async function Page() {
  await requireSession();
  return (
    <div className="grid gap-10">
      <PageTitle word="Calendar" />
      <ComingSoon
        phase={3}
        items={[
        "Month and agenda views of appointments, payment due dates and task due dates",
        "Milestone timeline from today to the wedding",
        "Subscribe from your phone's calendar",
        ]}
      />
    </div>
  );
}
