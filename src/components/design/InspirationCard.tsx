import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import type { InspirationRow } from "@/lib/data/design";
import { sourceHost } from "@/lib/domain/design";
import { DESIGN_AREA_LABEL } from "@/lib/labels";
import { FavoriteButton } from "./FavoriteButton";
import { InspirationImage } from "./InspirationImage";
import { InspirationPlaceholder, type Tint } from "./Placeholder";

/** One pin on the board: the picture (or its placeholder), a few words, where it came from. */
export function InspirationCard({
  item,
  tint,
  back,
}: {
  item: InspirationRow;
  tint: Tint;
  back: string;
}) {
  const areaLabel = DESIGN_AREA_LABEL[item.area];
  const name = item.title ?? `${areaLabel} idea`;
  const editHref = `/design/inspiration/${item.id}?back=${encodeURIComponent(back)}`;

  return (
    <Card as="article" className="flex h-full flex-col overflow-hidden">
      <div className="relative aspect-[4/5] overflow-hidden rounded-t-[3px] bg-linen">
        {item.imageUrl ? (
          <InspirationImage
            key={item.imageUrl}
            src={item.imageUrl}
            alt={item.title ?? `Inspiration for ${areaLabel.toLowerCase()}`}
            fallback={<InspirationPlaceholder title={name} tint={tint} />}
          />
        ) : (
          <InspirationPlaceholder title={name} tint={tint} heading />
        )}
        <div className="absolute top-2 right-2">
          <FavoriteButton id={item.id} favorite={item.isFavorite} title={name} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 px-3.5 pt-3 pb-3.5 sm:px-4 sm:pt-3.5 sm:pb-4">
        {item.imageUrl ? (
          <h3 className={`font-display text-[18px] leading-snug sm:text-[20px] ${item.title ? "" : "sr-only"}`}>{name}</h3>
        ) : null}
        {item.notes ? <p className="line-clamp-3 text-[13px] leading-relaxed text-cocoa">{item.notes}</p> : null}
        {item.isFavorite ? <p className="sr-only">A favorite.</p> : null}

        <div className="mt-auto flex items-center justify-between gap-3 pt-2 text-[12px]">
          {item.sourceUrl ? (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
              className="inline-flex min-w-0 items-center gap-1 text-rose-ink underline-offset-4 hover:text-chocolate hover:underline"
            >
              <span className="truncate">{sourceHost(item.sourceUrl)}</span>
              <Icon name="arrow" size={12} className="shrink-0 -rotate-45" />
              <span className="sr-only"> (source for {name}, opens in a new tab)</span>
            </a>
          ) : (
            <span />
          )}
          <Link href={editHref} className="shrink-0 text-cocoa underline-offset-4 hover:text-rose-ink hover:underline">
            Edit<span className="sr-only"> {name}</span>
          </Link>
        </div>
      </div>
    </Card>
  );
}
