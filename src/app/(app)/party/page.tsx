import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageTitle } from "@/components/ui/PageTitle";
import { requireSession } from "@/lib/auth/require-session";

export const metadata = { title: "Wedding Party" };

export default async function Page() {
  await requireSession();
  return (
    <div className="grid gap-10">
      <PageTitle word="Wedding Party" />
      <ComingSoon
        phase={4}
        items={[
        "All 14 attendants, with roles and outfit types already set up",
        "Dress menus A and B, shoes, hair and accessories, tracked per person",
        "Who still owes their sizing, sorted by how late they are",
        ]}
      />
    </div>
  );
}
