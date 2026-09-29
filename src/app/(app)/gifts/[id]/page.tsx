import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/form/ConfirmButton";
import { GiftForm } from "@/components/gifts/GiftForm";
import { BackLink } from "@/components/tasks/BackLink";
import { Card } from "@/components/ui/Card";
import { PageTitle } from "@/components/ui/PageTitle";
import { requireSession } from "@/lib/auth/require-session";
import { loadGift, loadGuestChoices } from "@/lib/data/gifts";
import { formatDate } from "@/lib/dates";
import { deleteGift, saveGift } from "../actions";

export const metadata = { title: "Edit gift" };

export default async function EditGiftPage({ params }: PageProps<"/gifts/[id]">) {
  await requireSession();
  const { id } = await params;
  const [g, guests] = await Promise.all([loadGift(id), loadGuestChoices()]);
  if (!g) notFound();

  return (
    <div className="grid gap-6 sm:gap-8">
      <BackLink href="/gifts">Gifts</BackLink>
      <PageTitle lead="Edit the" word="gift" eyebrow="Gifts" intro={`From ${g.fromName}, received ${formatDate(g.receivedOn, "long")}.`} />
      <Card className="max-w-3xl p-6 sm:p-9">
        <GiftForm
          action={saveGift.bind(null, g.id)}
          values={{
            fromName: g.fromName,
            guestId: g.guest?.id ?? "",
            description: g.description,
            receivedOn: g.receivedOn,
            thankYouSentOn: g.thankYouSentOn ?? "",
            notes: g.notes ?? "",
          }}
          guests={guests}
          submitLabel="Save gift"
          cancelHref="/gifts"
        />
      </Card>
      <section
        aria-labelledby="delete-h"
        className="flex max-w-3xl flex-wrap items-center justify-between gap-4 rounded-[3px] border border-dashed border-rule-strong px-5 py-4 sm:px-6"
      >
        <div className="grid gap-0.5">
          <h2 id="delete-h" className="label-caps">
            Delete this gift
          </h2>
          <p className="text-[13px] text-muted">It comes off the gift log for good. This can&apos;t be undone.</p>
        </div>
        <ConfirmButton action={deleteGift.bind(null, g.id)} question="Delete this gift?">
          Delete gift
        </ConfirmButton>
      </section>
    </div>
  );
}
