import { notFound } from "next/navigation";
import { PaletteForm } from "@/components/design/PaletteForm";
import { ConfirmButton } from "@/components/form/ConfirmButton";
import { BackLink } from "@/components/tasks/BackLink";
import { Card } from "@/components/ui/Card";
import { PageTitle } from "@/components/ui/PageTitle";
import { requireSession } from "@/lib/auth/require-session";
import { loadPaletteColor } from "@/lib/data/design";
import { designHref } from "@/lib/domain/design";
import { deletePaletteColor, savePaletteColor } from "../../actions";

export const metadata = { title: "Edit a color" };

export default async function EditPaletteColorPage({ params }: PageProps<"/design/palette/[id]">) {
  await requireSession();
  const { id } = await params;
  const color = await loadPaletteColor(id);
  if (!color) notFound();
  const back = designHref("palette");

  return (
    <div className="grid gap-6 sm:gap-8">
      <BackLink href={back}>The palette</BackLink>
      <PageTitle
        lead="Edit"
        word={color.name}
        eyebrow="Palette"
        intro={color.isSeeded ? "This color came from choices you've already made. Change it here if those choices change." : undefined}
      />
      <Card className="p-6 sm:p-9">
        <PaletteForm
          action={savePaletteColor.bind(null, color.id)}
          values={{ name: color.name, hex: color.hex, usage: color.usage ?? "" }}
          submitLabel="Save color"
          cancelHref={back}
        />
      </Card>
      <section
        aria-labelledby="delete-h"
        className="flex flex-wrap items-center justify-between gap-4 rounded-[3px] border border-dashed border-rule-strong px-5 py-4 sm:px-6"
      >
        <div className="grid gap-0.5">
          <h2 id="delete-h" className="label-caps">
            Remove this color
          </h2>
          <p className="text-[13px] text-muted">It comes off the palette for good.</p>
        </div>
        <ConfirmButton action={deletePaletteColor.bind(null, color.id)} question={`Remove ${color.name}?`} confirmLabel="Yes, remove">
          Remove color
        </ConfirmButton>
      </section>
    </div>
  );
}
