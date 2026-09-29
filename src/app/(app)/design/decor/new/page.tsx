import { DecorForm } from "@/components/design/DecorForm";
import { BackLink } from "@/components/tasks/BackLink";
import { Card } from "@/components/ui/Card";
import { PageTitle } from "@/components/ui/PageTitle";
import { requireSession } from "@/lib/auth/require-session";
import { loadDecorOptions } from "@/lib/data/design";
import { designHref, parseBoardFilters } from "@/lib/domain/design";
import { DESIGN_AREA_LABEL, valuesOf } from "@/lib/labels";
import { saveDecor } from "../../actions";

export const metadata = { title: "Add a piece" };

export default async function NewDecorPage({ searchParams }: PageProps<"/design/decor/new">) {
  await requireSession();
  const [sp, { vendors, budgetItems }] = await Promise.all([searchParams, loadDecorOptions()]);
  // "Add" links from an area arrive with the area already chosen.
  const { area } = parseBoardFilters(sp, valuesOf(DESIGN_AREA_LABEL));
  const back = designHref("decor");

  return (
    <div className="grid gap-6 sm:gap-8">
      <BackLink href={back}>Décor &amp; rentals</BackLink>
      <PageTitle
        lead="A new"
        word="piece"
        eyebrow="Décor & rentals"
        intro="Only the name is needed now. Add the dates as it's ordered, arrives and goes back."
      />
      <Card className="p-6 sm:p-9">
        <DecorForm
          action={saveDecor.bind(null, null)}
          values={{
            name: "",
            area: area ?? "RECEPTION",
            quantity: "1",
            source: "PURCHASE",
            vendorId: "",
            budgetItemId: "",
            orderedOn: "",
            receivedOn: "",
            returnBy: "",
            returnedOn: "",
            notes: "",
          }}
          vendors={vendors}
          budgetItems={budgetItems}
          back={back}
          submitLabel="Add piece"
        />
      </Card>
    </div>
  );
}
