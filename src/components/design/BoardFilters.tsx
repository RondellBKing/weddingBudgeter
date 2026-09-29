"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SelectField } from "@/components/form/Fields";
import { buttonClass } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { designHref, parseBoardFilters, type BoardFilters as Filters } from "@/lib/domain/design";
import { DESIGN_AREA_LABEL, optionsFrom, valuesOf } from "@/lib/labels";
import type { DesignArea } from "@/generated/prisma/enums";

const AREA_OPTIONS = optionsFrom(DESIGN_AREA_LABEL);
const AREAS = valuesOf(DESIGN_AREA_LABEL);

/**
 * Area and "favorites only". The URL holds them (/design?area=FLOWERS&fav=1). With JavaScript a
 * change applies right away; without it, the form submits as a normal GET.
 */
export function BoardFilters({ area, favorites }: { area: DesignArea | null; favorites: boolean }) {
  const router = useRouter();
  const active = area !== null || favorites;

  function apply(form: HTMLFormElement) {
    const data = new FormData(form);
    const f: Filters = parseBoardFilters({ area: String(data.get("area") ?? ""), fav: data.get("fav") ? "1" : "" }, AREAS);
    router.push(designHref("board", f), { scroll: false });
  }

  return (
    <form
      key={`${area ?? ""}|${favorites}`}
      action="/design"
      method="get"
      role="search"
      aria-label="Filter the board"
      className="flex flex-wrap items-end gap-x-5 gap-y-3"
      onChange={(e) => apply(e.currentTarget)}
      onSubmit={(e) => {
        e.preventDefault();
        apply(e.currentTarget);
      }}
    >
      <SelectField
        name="area"
        label="Area"
        defaultValue={area ?? ""}
        placeholder="Every area"
        options={AREA_OPTIONS}
        className="w-full min-w-0 sm:w-60"
      />
      <label className="inline-flex cursor-pointer items-center gap-2.5 rounded-[3px] border border-rule-strong bg-paper px-3.5 py-2.5 text-[14px] text-chocolate has-[:checked]:border-desert-rose has-[:checked]:bg-brick-wash/40 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-desert-rose">
        <input type="checkbox" name="fav" value="1" defaultChecked={favorites} className="peer sr-only" />
        <Icon name="star" size={16} className="fill-transparent text-cocoa peer-checked:fill-dusty-rose peer-checked:text-rose-ink" />
        Favorites only
      </label>
      <noscript>
        <button type="submit" className={buttonClass("secondary")}>
          Show
        </button>
      </noscript>
      {active ? (
        <Link href={designHref("board")} scroll={false} className={`${buttonClass("quiet")} mb-1.5`}>
          Clear filters
        </Link>
      ) : null}
    </form>
  );
}
