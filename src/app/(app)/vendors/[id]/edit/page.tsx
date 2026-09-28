import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/form/ConfirmButton";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { PageTitle } from "@/components/ui/PageTitle";
import { VendorForm } from "@/components/vendors/VendorForm";
import { requireSession } from "@/lib/auth/require-session";
import { loadVendorForEdit } from "@/lib/data/vendors";
import { deleteVendor, saveVendor } from "../../actions";

export const metadata = { title: "Edit vendor" };

export default async function EditVendorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const v = await loadVendorForEdit(id);
  if (!v) notFound();

  const unlinked =
    v.linkedItemCount === 0
      ? "Budget items, tasks and appointments stay, unlinked."
      : `${v.linkedItemCount === 1 ? "Its budget item stays" : `Its ${v.linkedItemCount} budget items stay`}, with payments, but no longer linked to a vendor. Tasks and appointments stay too.`;

  return (
    <div className="grid gap-8 sm:gap-10">
      <div className="grid gap-5">
        <Link
          href={`/vendors/${v.id}`}
          className="inline-flex items-center gap-1.5 justify-self-start text-[13px] text-rose-ink hover:text-chocolate"
        >
          <Icon name="arrow" size={14} className="rotate-180" />
          {v.name}
        </Link>
        <PageTitle lead="Edit" word="details" eyebrow={v.name} />
      </div>

      <Card className="p-6 sm:p-8 lg:p-10">
        <VendorForm
          action={saveVendor.bind(null, v.id)}
          initial={v.values}
          venueAccessTime={v.venueAccessTime}
          submitLabel="Save changes"
          cancelHref={`/vendors/${v.id}`}
        />
      </Card>

      <Card className="grid gap-4 p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-8 sm:p-8" aria-labelledby="delete-h">
        <div className="grid gap-1.5">
          <h2 id="delete-h" className="text-[24px] leading-tight">
            Delete this <em className="italic">vendor</em>
          </h2>
          <p className="max-w-prose text-[13px] leading-relaxed text-cocoa">
            Removes {v.name} with its questions and communication log. {unlinked} This can&rsquo;t be undone.
          </p>
        </div>
        <div className="sm:justify-self-end">
          <ConfirmButton
            action={deleteVendor.bind(null, v.id)}
            question={`Delete ${v.name} and its notes? Budget items and payments stay, unlinked.`}
            confirmLabel="Yes, delete vendor"
            size="md"
          >
            Delete vendor
          </ConfirmButton>
        </div>
      </Card>
    </div>
  );
}
