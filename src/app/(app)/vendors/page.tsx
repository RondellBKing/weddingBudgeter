import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageTitle } from "@/components/ui/PageTitle";
import { CoverageCard } from "@/components/vendors/CoverageCard";
import { VendorCard } from "@/components/vendors/VendorCard";
import { VendorFilters } from "@/components/vendors/VendorFilters";
import { requireSession } from "@/lib/auth/require-session";
import { loadVendorList } from "@/lib/data/vendors";
import {
  coverage,
  filterVendors,
  parseVendorFilters,
  VENDOR_CATEGORY_LABEL,
  VENDOR_STATUS_LABEL,
} from "@/lib/domain/vendors";

export const metadata = { title: "Vendors" };

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSession();
  const [{ vendors }, params] = await Promise.all([loadVendorList(), searchParams]);
  const filters = parseVendorFilters(params);
  const shown = filterVendors(vendors, filters);
  const cover = coverage(vendors);
  const bookedCount = cover.filter((c) => c.booked.length > 0).length;
  const filtered = filters.category !== null || filters.status !== null;
  const addHref = filters.category ? `/vendors/new?category=${filters.category}` : "/vendors/new";

  const filterWords = [
    filters.status ? VENDOR_STATUS_LABEL[filters.status].toLowerCase() : null,
    filters.category ? `for ${VENDOR_CATEGORY_LABEL[filters.category].toLowerCase()}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="grid gap-8 sm:gap-10">
      <PageTitle
        word="Vendors"
        eyebrow="People"
        intro={`${bookedCount} of ${cover.length} categories booked. Everyone we hire, what we owe them, and what we still need to ask.`}
        actions={
          <Link href={addHref} className={buttonClass("primary")}>
            Add vendor
          </Link>
        }
      />

      {vendors.length === 0 ? (
        <EmptyState icon="vendors" title="Our vendor" word="list">
          <p>Everyone we&rsquo;re considering or have hired: photographers, florists, the DJ. Add them as soon as they&rsquo;re on our radar.</p>
          <div>
            <Link href="/vendors/new" className={buttonClass("primary")}>
              Add the first vendor
            </Link>
          </div>
        </EmptyState>
      ) : (
        <section aria-labelledby="list-h" className="grid gap-5">
          <h2 id="list-h" className="sr-only">
            Vendor list
          </h2>
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <VendorFilters category={filters.category} status={filters.status} />
            <p className="text-[13px] text-muted sm:mb-2.5" aria-live="polite">
              {filtered
                ? `${shown.length} of ${vendors.length} ${vendors.length === 1 ? "vendor" : "vendors"}`
                : `${vendors.length} ${vendors.length === 1 ? "vendor" : "vendors"}`}
            </p>
          </div>

          {shown.length > 0 ? (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((v) => (
                <li key={v.id} className="grid">
                  <VendorCard v={v} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="vendors" title="Nobody" word="here yet">
              <p>No vendors {filterWords || "match these filters"}. Try another filter, or add one.</p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href={addHref} className={buttonClass("primary")}>
                  Add vendor
                </Link>
                <Link href="/vendors" className={buttonClass("secondary")}>
                  Clear filters
                </Link>
              </div>
            </EmptyState>
          )}
        </section>
      )}

      <CoverageCard rows={cover} />
    </div>
  );
}
