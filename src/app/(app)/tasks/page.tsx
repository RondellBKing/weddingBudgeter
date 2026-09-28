import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageTitle } from "@/components/ui/PageTitle";
import { requireSession } from "@/lib/auth/require-session";

export const metadata = { title: "Tasks" };

export default async function Page() {
  await requireSession();
  return (
    <div className="grid gap-10">
      <PageTitle word="Tasks" />
      <ComingSoon
        phase={3}
        items={[
        "List and board views, filters, quick add and bulk complete",
        "The planning checklist, already loaded and dated backwards from April 13, 2028",
        ]}
      />
    </div>
  );
}
