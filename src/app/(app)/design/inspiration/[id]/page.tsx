import { notFound } from "next/navigation";
import { InspirationForm } from "@/components/design/InspirationForm";
import { ConfirmButton } from "@/components/form/ConfirmButton";
import { BackLink } from "@/components/tasks/BackLink";
import { Card } from "@/components/ui/Card";
import { PageTitle } from "@/components/ui/PageTitle";
import { requireSession } from "@/lib/auth/require-session";
import { loadInspirationItem } from "@/lib/data/design";
import { safeDesignBack } from "@/lib/domain/design";
import { DESIGN_AREA_LABEL } from "@/lib/labels";
import { deleteInspiration, saveInspiration } from "../../actions";

export const metadata = { title: "Edit inspiration" };

export default async function EditInspirationPage({ params, searchParams }: PageProps<"/design/inspiration/[id]">) {
  await requireSession();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const item = await loadInspirationItem(id);
  if (!item) notFound();
  const back = safeDesignBack(typeof sp.back === "string" ? sp.back : null);

  return (
    <div className="grid gap-6 sm:gap-8">
      <BackLink href={back}>The board</BackLink>
      <PageTitle
        lead="Edit the"
        word="inspiration"
        eyebrow="Vision & Décor"
        intro={item.title ? `${item.title}, pinned under ${DESIGN_AREA_LABEL[item.area].toLowerCase()}.` : undefined}
      />
      <Card className="p-6 sm:p-9">
        <InspirationForm
          action={saveInspiration.bind(null, item.id)}
          values={{
            area: item.area,
            title: item.title ?? "",
            imageUrl: item.imageUrl ?? "",
            sourceUrl: item.sourceUrl ?? "",
            notes: item.notes ?? "",
            isFavorite: item.isFavorite,
          }}
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
            Take it off the board
          </h2>
          <p className="text-[13px] text-muted">It&apos;s gone for good. The picture and the page it came from aren&apos;t touched.</p>
        </div>
        <ConfirmButton action={deleteInspiration.bind(null, item.id, back)} question="Take this off the board?">
          Delete
        </ConfirmButton>
      </section>
    </div>
  );
}
