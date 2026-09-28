import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { PageTitle } from "@/components/ui/PageTitle";
import { VendorForm } from "@/components/vendors/VendorForm";
import { requireSession } from "@/lib/auth/require-session";
import { loadNewVendorDefaults } from "@/lib/data/vendors";
import { EMPTY_VENDOR_VALUES } from "@/lib/domain/vendor-form";
import { parseVendorFilters } from "@/lib/domain/vendors";
import { saveVendor } from "../actions";

export const metadata = { title: "Add a vendor" };

export default async function NewVendorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSession();
  const [{ venueAccessTime }, params] = await Promise.all([loadNewVendorDefaults(), searchParams]);
  // "Add one" links from the coverage view arrive with the category already chosen.
  const { category } = parseVendorFilters(params);

  return (
    <div className="grid gap-8 sm:gap-10">
      <div className="grid gap-5">
        <Link href="/vendors" className="inline-flex items-center gap-1.5 justify-self-start text-[13px] text-rose-ink hover:text-chocolate">
          <Icon name="arrow" size={14} className="rotate-180" />
          All vendors
        </Link>
        <PageTitle
          lead="A new"
          word="vendor"
          eyebrow="Vendors"
          intro="Only the name and category are needed now. Fill in the rest as you hear back."
        />
      </div>
      <Card className="p-6 sm:p-8 lg:p-10">
        <VendorForm
          action={saveVendor.bind(null, null)}
          initial={{ ...EMPTY_VENDOR_VALUES, category: category ?? "" }}
          venueAccessTime={venueAccessTime}
          submitLabel="Add vendor"
          cancelHref="/vendors"
        />
      </Card>
    </div>
  );
}
