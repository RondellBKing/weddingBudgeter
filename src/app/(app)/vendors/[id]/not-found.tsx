import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function VendorNotFound() {
  return (
    <EmptyState icon="vendors" title="Vendor not" word="found">
      <p>This vendor may have been deleted, or the link is out of date.</p>
      <div>
        <Link href="/vendors" className={buttonClass("primary")}>
          All vendors
        </Link>
      </div>
    </EmptyState>
  );
}
