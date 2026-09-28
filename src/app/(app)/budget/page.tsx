import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageTitle } from "@/components/ui/PageTitle";
import { requireSession } from "@/lib/auth/require-session";

export const metadata = { title: "Budget" };

export default async function Page() {
  await requireSession();
  return (
    <div className="grid gap-10">
      <PageTitle word="Budget" />
      <ComingSoon
        phase={1}
        items={[
        "Total budget, committed, paid, left to pay, and venue as a share of the whole",
        "Category estimates vs. contracts, with overruns flagged and drawn from the contingency",
        "Every payment across all vendors on one month-by-month schedule",
        "CSV export",
        ]}
      />
    </div>
  );
}
