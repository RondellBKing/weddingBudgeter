import { notFound } from "next/navigation";
import { DecorForm } from "@/components/design/DecorForm";
import { DecorStatusBadge } from "@/components/design/DecorStatusBadge";
import { ConfirmButton } from "@/components/form/ConfirmButton";
import { BackLink } from "@/components/tasks/BackLink";
import { Card } from "@/components/ui/Card";
import { PageTitle } from "@/components/ui/PageTitle";
import { requireSession } from "@/lib/auth/require-session";
import { loadDecorItem, loadDecorOptions } from "@/lib/data/design";
import { loadPlan } from "@/lib/data/plan";
import { decorStatus, designHref } from "@/lib/domain/design";
import { deleteDecor, saveDecor } from "../../actions";

export const metadata = { title: "Edit a piece" };

export default async function EditDecorPage({ params }: PageProps<"/design/decor/[id]">) {
  await requireSession();
  const { id } = await params;
  const [item, { vendors, budgetItems }, { today }] = await Promise.all([loadDecorItem(id), loadDecorOptions(), loadPlan()]);
  if (!item) notFound();
  const back = designHref("decor");
  const status = decorStatus(item, today);

  return (
    <div className="grid gap-6 sm:gap-8">
      <BackLink href={back}>Décor &amp; rentals</BackLink>
      <PageTitle
        lead="Edit the"
        word="piece"
        eyebrow="Décor & rentals"
        intro={
          <span className="grid gap-2">
            <span>{item.name}</span>
            <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <DecorStatusBadge status={status} />
              {status.detail ? <span className="text-[13px] text-muted">{status.detail}</span> : null}
            </span>
          </span>
        }
      />
      <Card className="p-6 sm:p-9">
        <DecorForm
          action={saveDecor.bind(null, item.id)}
          values={{
            name: item.name,
            area: item.area,
            quantity: String(item.quantity),
            source: item.source,
            vendorId: item.vendor?.id ?? "",
            budgetItemId: item.budgetItem?.id ?? "",
            orderedOn: item.orderedOn ?? "",
            receivedOn: item.receivedOn ?? "",
            returnBy: item.returnBy ?? "",
            returnedOn: item.returnedOn ?? "",
            notes: item.notes ?? "",
          }}
          vendors={vendors}
          budgetItems={budgetItems}
          back={back}
          submitLabel="Save"
        />
      </Card>
      <section
        aria-labelledby="delete-h"
        className="flex flex-wrap items-center justify-between gap-4 rounded-[3px] border border-dashed border-rule-strong px-5 py-4 sm:px-6"
      >
        <div className="grid gap-0.5">
          <h2 id="delete-h" className="label-caps">
            Delete this piece
          </h2>
          <p className="text-[13px] text-muted">It comes off the list for good. The budget item it links to stays as it is.</p>
        </div>
        <ConfirmButton action={deleteDecor.bind(null, item.id)} question="Delete this piece?">
          Delete piece
        </ConfirmButton>
      </section>
    </div>
  );
}
