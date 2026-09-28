"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/ui/Button";
import { SelectField } from "@/components/form/Fields";
import {
  isVendorCategory,
  isVendorStatus,
  vendorListHref,
  VENDOR_CATEGORY_LABEL,
  VENDOR_STATUS_LABEL,
  type VendorCategory,
  type VendorStatus,
} from "@/lib/domain/vendors";
import { optionsFrom } from "@/lib/labels";

const CATEGORY_OPTIONS = optionsFrom(VENDOR_CATEGORY_LABEL);
const STATUS_OPTIONS = optionsFrom(VENDOR_STATUS_LABEL);

/**
 * Category and status filters. The URL holds them (?category=FLORAL&status=QUOTED). With
 * JavaScript a change applies right away; without it, the form submits as a normal GET.
 */
export function VendorFilters({ category, status }: { category: VendorCategory | null; status: VendorStatus | null }) {
  const router = useRouter();
  const active = category !== null || status !== null;

  function apply(form: HTMLFormElement) {
    const data = new FormData(form);
    const c = data.get("category");
    const s = data.get("status");
    router.push(
      vendorListHref({ category: isVendorCategory(c) ? c : null, status: isVendorStatus(s) ? s : null }),
      { scroll: false },
    );
  }

  return (
    <form
      key={`${category ?? ""}|${status ?? ""}`}
      action="/vendors"
      method="get"
      role="search"
      aria-label="Filter vendors"
      className="grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap"
      onChange={(e) => apply(e.currentTarget)}
      onSubmit={(e) => {
        e.preventDefault();
        apply(e.currentTarget);
      }}
    >
      <SelectField
        name="category"
        label="Category"
        defaultValue={category ?? ""}
        placeholder="All categories"
        options={CATEGORY_OPTIONS}
        className="min-w-0 sm:w-56"
      />
      <SelectField
        name="status"
        label="Status"
        defaultValue={status ?? ""}
        placeholder="Any status"
        options={STATUS_OPTIONS}
        className="min-w-0 sm:w-48"
      />
      <noscript>
        <button type="submit" className={buttonClass("secondary")}>
          Show
        </button>
      </noscript>
      {active ? (
        <Link href="/vendors" scroll={false} className={`${buttonClass("quiet")} col-span-2 justify-self-start sm:mb-2.5 sm:ml-1`}>
          Clear filters
        </Link>
      ) : null}
    </form>
  );
}
