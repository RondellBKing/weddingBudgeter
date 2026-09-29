import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { InspirationRow } from "@/lib/data/design";
import { designHref, groupByArea, matchesBoard, placeholderTint, type BoardFilters as Filters } from "@/lib/domain/design";
import { DESIGN_AREA_LABEL, valuesOf } from "@/lib/labels";
import { BoardFilters } from "./BoardFilters";
import { InspirationCard } from "./InspirationCard";

const AREAS = valuesOf(DESIGN_AREA_LABEL);

/** Columns an area takes: its idea count, capped at the grid's width (2, 3 at lg, 4 at xl). */
function spanClass(n: number): string {
  const phone = n >= 2 ? "col-span-2" : "col-span-1";
  const lg = n >= 3 ? "lg:col-span-3" : n === 2 ? "lg:col-span-2" : "lg:col-span-1";
  const xl = n >= 4 ? "xl:col-span-4" : n === 3 ? "xl:col-span-3" : n === 2 ? "xl:col-span-2" : "xl:col-span-1";
  return `${phone} ${lg} ${xl}`;
}

export function newInspirationHref(area: string | null, back: string) {
  const q = new URLSearchParams();
  if (area) q.set("area", area);
  q.set("back", back);
  return `/design/inspiration/new?${q}`;
}

/** The inspiration board: ideas grouped by area, filtered by area and favorites. */
export function BoardView({ items, palette, filters }: { items: InspirationRow[]; palette: string[]; filters: Filters }) {
  const back = designHref("board", filters);
  const shown = items.filter((i) => matchesBoard(i, filters));
  const groups = groupByArea(shown, AREAS);
  const favorites = items.filter((i) => i.isFavorite).length;

  if (items.length === 0) {
    return (
      <EmptyState icon="design" title="A board for the" word="look">
        <p>
          Keep what catches your eye: a tablescape, a bouquet, the lighting at someone else&rsquo;s wedding. Paste an
          image link, a link to where you found it, or both.
        </p>
        <div>
          <Link href={newInspirationHref(null, back)} className={buttonClass("primary")}>
            Add the first idea
          </Link>
        </div>
      </EmptyState>
    );
  }

  return (
    <section aria-labelledby="board-h" className="grid gap-8 sm:gap-10">
      <h2 id="board-h" className="sr-only">
        Inspiration board
      </h2>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <BoardFilters area={filters.area} favorites={filters.favorites} />
        <p className="num text-[13px] text-muted sm:mb-2.5" aria-live="polite">
          {shown.length === items.length
            ? `${items.length} on the board · ${favorites} ${favorites === 1 ? "favorite" : "favorites"}`
            : `${shown.length} of ${items.length} shown`}
        </p>
      </div>

      {groups.length === 0 ? (
        <Card className="grid justify-items-start gap-3 px-6 py-10 sm:px-9">
          <p className="font-display text-2xl">
            Nothing <em className="italic">here yet</em>
          </p>
          <p className="text-sm text-cocoa">
            {filters.favorites ? "No favorites" : "Nothing on the board"}
            {filters.area ? ` for ${DESIGN_AREA_LABEL[filters.area].toLowerCase()}` : ""}.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href={newInspirationHref(filters.area, back)} className={buttonClass("secondary", "sm")}>
              Add something
            </Link>
            <Link href={designHref("board")} className={buttonClass("quiet")}>
              Show the whole board
            </Link>
          </div>
        </Card>
      ) : (
        // One shared grid: each area spans as many columns as it has ideas, so small areas sit
        // side by side instead of leaving a row mostly empty, and cards line up across areas.
        <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 sm:gap-y-12 lg:grid-cols-3 xl:grid-cols-4">
          {groups.map((group) => {
            const label = DESIGN_AREA_LABEL[group.area];
            return (
              <section
                key={group.area}
                aria-labelledby={`area-${group.area}`}
                className={`grid grid-cols-subgrid grid-rows-[auto_1fr] gap-y-3 sm:gap-y-5 ${spanClass(group.items.length)}`}
              >
                <div className="col-span-full grid gap-1 border-b border-rule pb-2.5">
                  <h2 id={`area-${group.area}`} className="text-[22px] leading-tight italic sm:text-[28px]">
                    {label}
                  </h2>
                  <p className="flex items-baseline gap-3">
                    <span className="num label-caps text-[10px]">
                      {group.items.length} {group.items.length === 1 ? "idea" : "ideas"}
                    </span>
                    <Link href={newInspirationHref(group.area, back)} className="text-[12px] text-rose-ink hover:text-chocolate">
                      Add<span className="sr-only"> to {label}</span>
                    </Link>
                  </p>
                </div>
                <ul className="col-span-full grid grid-cols-subgrid gap-y-3 sm:gap-y-5">
                  {group.items.map((item) => (
                    <li key={item.id} className="grid">
                      <InspirationCard item={item} tint={placeholderTint(item.id, palette)} back={back} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
