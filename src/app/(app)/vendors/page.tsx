import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageTitle } from "@/components/ui/PageTitle";
import { requireSession } from "@/lib/auth/require-session";

export const metadata = { title: "Vendors" };

export default async function Page() {
  await requireSession();
  return (
    <div className="grid gap-10">
      <PageTitle word="Vendors" />
      <ComingSoon
        phase={2}
        items={[
        "Every vendor with contacts, quotes, contracts and payments",
        "Coverage: which categories still have nobody booked",
        "Questions-to-ask checklist and a timestamped call log per vendor",
        ]}
      />
    </div>
  );
}
