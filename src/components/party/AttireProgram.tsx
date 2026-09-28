import { Card } from "@/components/ui/Card";
import { Divider } from "@/components/ui/Ornaments";
import { ACCESSORY_NOTES, HAIR_STYLES, type OptionMenu } from "@/lib/domain/party";
import type { MenuDistribution } from "@/lib/domain/party-sizing";
import { percentInt } from "@/lib/money";

type Option = { id: string; menu: OptionMenu; name: string; description: string };

const COLUMNS: Array<{ key: OptionMenu; title: string; who: string; swatch: string; bar: string; color: string }> = [
  { key: "A", title: "Menu A", who: "Bridesmaids", swatch: "bg-dusty-rose", bar: "bg-dusty-rose", color: "Dusty Rose · stretch satin · floor length" },
  { key: "B", title: "Menu B", who: "Maid & Matron of Honor", swatch: "bg-desert-rose", bar: "bg-desert-rose", color: "Desert Rose · stretch satin · floor length" },
  { key: "SHOES", title: "Shoes", who: "Every dress", swatch: "bg-chocolate", bar: "bg-cocoa", color: "Chocolate brown patent · 3.5\" heel or higher" },
];

/** A thin bar with its number written beside it (the light fills can't carry meaning alone). */
function Bar({ value, max, fill, label }: { value: number; max: number; fill: string; label: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <div className="h-1 overflow-hidden rounded-[1px] bg-linen" aria-hidden>
        <div className={`h-full ${fill}`} style={{ width: `${percentInt(value, max)}%` }} />
      </div>
      <span className="num w-12 text-right text-xs text-cocoa">
        <span className="sr-only">{label}: </span>
        {value} of {max}
      </span>
    </div>
  );
}

/** The outfit guide, with how the choices are spreading across each menu. */
export function AttireProgram({ options, distribution }: { options: Option[]; distribution: Record<OptionMenu, MenuDistribution> }) {
  return (
    <Card className="grid gap-8 p-6 sm:p-9" aria-labelledby="attire-h">
      <div className="grid justify-items-center gap-3 text-center">
        <p className="label-caps text-rose-ink">Our outfit guide</p>
        <h2 id="attire-h" className="text-[32px] leading-tight sm:text-[38px]">
          The attire <em className="italic">program</em>
        </h2>
        <Divider className="w-40" />
      </div>

      <div className="grid gap-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-rule">
        {COLUMNS.map((col) => {
          const d = distribution[col.key];
          const chosen = d.rows.reduce((s, r) => s + r.count, 0) + d.owned;
          return (
            <section key={col.key} className="grid content-start gap-4 md:px-7 md:first:pl-0 md:last:pr-0">
              <div className="flex items-center gap-3">
                <span aria-hidden className={`size-10 shrink-0 rounded-full ring-1 ring-rule-strong ring-offset-2 ring-offset-paper ${col.swatch}`} />
                <div className="min-w-0">
                  <h3 className="font-sans text-[15px] font-medium">
                    {col.title} <span className="font-normal text-muted">· {col.who}</span>
                  </h3>
                  <p className="text-xs text-muted">{col.color}</p>
                </div>
              </div>
              <p className="label-caps text-[10px]">
                {chosen} of {d.eligible} decided
              </p>
              <ul className="grid gap-3">
                {options
                  .filter((o) => o.menu === col.key)
                  .map((o) => {
                    const count = d.rows.find((r) => r.id === o.id)?.count ?? 0;
                    return (
                      <li key={o.id} className="grid gap-1.5 border-b border-rule pb-3 last:border-b-0">
                        <span className="min-w-0">
                          <span className="font-display text-xl">{o.name}</span>
                          <span className="block text-xs text-muted">{o.description.split(". ")[0]}</span>
                        </span>
                        <Bar value={count} max={d.eligible} fill={col.bar} label={o.name} />
                      </li>
                    );
                  })}
              </ul>
              <div className="grid gap-1.5 text-xs text-muted">
                {col.key === "SHOES" ? (
                  <>
                    <p>
                      <span className="num text-cocoa">{d.owned}</span> wearing a pair they own
                      {d.owned > 0 ? " (each needs approval)" : ""}
                    </p>
                    <p className="leading-relaxed">Already-owned shoes are welcome once they&apos;re approved.</p>
                  </>
                ) : null}
                <p>
                  <span className="num text-cocoa">{d.undecided}</span> still choosing
                </p>
              </div>
            </section>
          );
        })}
      </div>

      <div className="grid gap-8 border-t border-rule pt-8 md:grid-cols-3 md:gap-0 md:divide-x md:divide-rule">
        <section className="grid content-start gap-3 md:pr-7">
          <h3 className="font-sans text-[15px] font-medium">Menu C · Bridesman</h3>
          <p className="text-sm leading-relaxed text-cocoa">
            Suit rental, with shoes that match the groom&apos;s party. A Dusty Rose bow tie, gifted by the bride.
          </p>
        </section>
        <section className="grid content-start gap-3 md:px-7">
          <h3 className="font-sans text-[15px] font-medium">Hair</h3>
          <p className="text-sm text-cocoa">Your own natural or protective style, elegant and off the face.</p>
          <ul className="grid gap-1 text-sm text-muted">
            {HAIR_STYLES.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </section>
        <section className="grid content-start gap-3 md:pl-7">
          <h3 className="font-sans text-[15px] font-medium">Accessories</h3>
          <ul className="grid gap-1 text-sm text-muted">
            {ACCESSORY_NOTES.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </section>
      </div>
    </Card>
  );
}
