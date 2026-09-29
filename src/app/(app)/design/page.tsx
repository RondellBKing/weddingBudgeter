import Link from "next/link";
import { BoardView, newInspirationHref } from "@/components/design/BoardView";
import { DecorView, newDecorHref } from "@/components/design/DecorView";
import { PaletteView } from "@/components/design/PaletteView";
import { buttonClass } from "@/components/ui/Button";
import { PageTitle } from "@/components/ui/PageTitle";
import { Tabs } from "@/components/ui/Tabs";
import { requireSession } from "@/lib/auth/require-session";
import { loadDecor, loadInspiration, loadPalette } from "@/lib/data/design";
import { loadPlan } from "@/lib/data/plan";
import { designHref, parseBoardFilters, parseDesignView } from "@/lib/domain/design";
import { DESIGN_AREA_LABEL, valuesOf } from "@/lib/labels";

export const metadata = { title: "Vision & Décor" };

const AREAS = valuesOf(DESIGN_AREA_LABEL);

export default async function DesignPage({ searchParams }: PageProps<"/design">) {
  await requireSession();
  const sp = await searchParams;
  const view = parseDesignView(sp);
  const filters = parseBoardFilters(sp, AREAS);

  const action =
    view === "board" ? (
      <Link href={newInspirationHref(filters.area, designHref("board", filters))} className={buttonClass("primary")}>
        Add inspiration
      </Link>
    ) : view === "decor" ? (
      <Link href={newDecorHref(null)} className={buttonClass("primary")}>
        Add a piece
      </Link>
    ) : (
      <a href="#add-color" className={buttonClass("primary")}>
        Add a color
      </a>
    );

  return (
    <div className="grid gap-8 sm:gap-10">
      <PageTitle
        word="Vision & Décor"
        eyebrow="Design"
        intro="The look of the day: inspiration, the palette, and every piece of décor and rental that has to arrive at the venue."
        actions={action}
      />

      <div>
        <Tabs
          label="Vision and décor views"
          current={view}
          items={[
            { key: "board", label: "Board", href: designHref("board") },
            { key: "palette", label: "Palette", href: designHref("palette") },
            { key: "decor", label: "Décor & rentals", href: designHref("decor") },
          ]}
        />
      </div>

      {view === "board" ? <Board filters={filters} /> : null}
      {view === "palette" ? <Palette /> : null}
      {view === "decor" ? <Decor /> : null}
    </div>
  );
}

async function Board({ filters }: { filters: ReturnType<typeof parseBoardFilters> }) {
  const [items, palette] = await Promise.all([loadInspiration(), loadPalette()]);
  return <BoardView items={items} palette={palette.map((c) => c.hex)} filters={filters} />;
}

async function Palette() {
  return <PaletteView palette={await loadPalette()} />;
}

async function Decor() {
  const [{ today }, items] = await Promise.all([loadPlan(), loadDecor()]);
  return <DecorView items={items} today={today} />;
}
