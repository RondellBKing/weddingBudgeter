import Link from "next/link";
import { movePaletteColor, savePaletteColor } from "@/app/(app)/design/actions";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { SectionTitle } from "@/components/ui/PageTitle";
import type { PaletteRow } from "@/lib/data/design";
import { coolToneNote, swatchInk } from "@/lib/domain/design";
import { PaletteForm } from "./PaletteForm";
import { PendingButton } from "./PendingButton";

const moveClass =
  "grid size-8 place-items-center rounded-full border border-rule-strong bg-paper text-cocoa transition-colors hover:border-chocolate hover:text-chocolate disabled:pointer-events-none disabled:opacity-35";

function Swatch({ color, index, count }: { color: PaletteRow; index: number; count: number }) {
  const ink = swatchInk(color.hex);
  const note = coolToneNote(color.hex);
  return (
    <article className="grid content-start gap-3">
      <div
        className="relative grid aspect-[4/5] content-between rounded-[3px] p-4 shadow-[inset_0_0_0_1px_rgba(62,43,34,0.08)] sm:p-5"
        style={{ background: color.hex, color: ink.color }}
      >
        <span className="num text-[12px] tracking-[0.14em]">{String(index + 1).padStart(2, "0")}</span>
        <div className="grid gap-1">
          <h3 className="font-display text-[23px] leading-[1.1] sm:text-[28px]">{color.name}</h3>
          <p className="num text-[13px] tracking-[0.1em]">{color.hex}</p>
        </div>
      </div>
      <div className="grid gap-2 px-0.5">
        <p className="text-[13px] leading-relaxed text-cocoa">
          {color.usage ?? <span className="text-muted">Not used anywhere yet</span>}
        </p>
        {note ? <p className="text-[12px] leading-relaxed text-gold-ink">{note}</p> : null}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex gap-1.5">
            <form action={movePaletteColor.bind(null, color.id, "up")}>
              <PendingButton className={moveClass} disabled={index === 0} label={`Move ${color.name} earlier`} title="Move earlier">
                <Icon name="arrow" size={14} className="rotate-180" />
              </PendingButton>
            </form>
            <form action={movePaletteColor.bind(null, color.id, "down")}>
              <PendingButton className={moveClass} disabled={index === count - 1} label={`Move ${color.name} later`} title="Move later">
                <Icon name="arrow" size={14} />
              </PendingButton>
            </form>
          </div>
          <Link href={`/design/palette/${color.id}`} className="text-[13px] text-rose-ink hover:text-chocolate">
            Edit<span className="sr-only"> {color.name}</span>
          </Link>
        </div>
      </div>
    </article>
  );
}

/** The palette as big swatches, the standing metals rule, and a form to add a color. */
export function PaletteView({ palette }: { palette: PaletteRow[] }) {
  return (
    <div className="grid gap-8 sm:gap-10">
      <Card as="section" aria-labelledby="palette-h" className="grid gap-7 p-5 sm:p-8">
        <h2 id="palette-h" className="sr-only">
          The palette
        </h2>
        {palette.length === 0 ? (
          <p className="py-6 text-center text-cocoa">No colors yet. Add the first one below.</p>
        ) : (
          <ol className="grid grid-cols-2 gap-x-4 gap-y-7 sm:gap-x-6 lg:grid-cols-4">
            {palette.map((c, i) => (
              <li key={c.id}>
                <Swatch color={c} index={i} count={palette.length} />
              </li>
            ))}
          </ol>
        )}
        <div className="flex items-start gap-3 border-t border-rule pt-5">
          <svg aria-hidden viewBox="0 0 12 12" className="mt-[5px] size-2.5 shrink-0 fill-gold">
            <path d="M6 0 12 6 6 12 0 6z" />
          </svg>
          <p className="text-[14px] leading-relaxed text-cocoa">
            <span className="font-medium text-chocolate">Gold metals only, no silver.</span> Candleholders, frames, stands
            and hardware are all gold, and every color stays warm.
          </p>
        </div>
      </Card>

      <Card as="section" aria-labelledby="add-color-h" id="add-color" className="grid gap-6 p-6 sm:p-9">
        <SectionTitle lead="Add a" word="color" id="add-color-h" />
        <PaletteForm action={savePaletteColor.bind(null, null)} values={{ name: "", hex: "", usage: "" }} submitLabel="Add color" idPrefix="new-" />
      </Card>
    </div>
  );
}
