import { InspirationForm } from "@/components/design/InspirationForm";
import { BackLink } from "@/components/tasks/BackLink";
import { Card } from "@/components/ui/Card";
import { PageTitle } from "@/components/ui/PageTitle";
import { requireSession } from "@/lib/auth/require-session";
import { parseBoardFilters, safeDesignBack } from "@/lib/domain/design";
import { DESIGN_AREA_LABEL, valuesOf } from "@/lib/labels";
import { saveInspiration } from "../../actions";

export const metadata = { title: "Add inspiration" };

export default async function NewInspirationPage({ searchParams }: PageProps<"/design/inspiration/new">) {
  await requireSession();
  const sp = await searchParams;
  // "Add" links from an area on the board arrive with the area already chosen.
  const { area } = parseBoardFilters(sp, valuesOf(DESIGN_AREA_LABEL));
  const back = safeDesignBack(typeof sp.back === "string" ? sp.back : null);

  return (
    <div className="grid gap-6 sm:gap-8">
      <BackLink href={back}>The board</BackLink>
      <PageTitle
        lead="New"
        word="inspiration"
        eyebrow="Vision & Décor"
        intro="Paste a link to the picture, a link to where you found it, or both. A few words help later."
      />
      <Card className="p-6 sm:p-9">
        <InspirationForm
          action={saveInspiration.bind(null, null)}
          values={{ area: area ?? "OVERALL", title: "", imageUrl: "", sourceUrl: "", notes: "", isFavorite: false }}
          back={back}
          submitLabel="Add to the board"
        />
      </Card>
    </div>
  );
}
