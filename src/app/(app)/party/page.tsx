import { Card } from "@/components/ui/Card";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { Divider } from "@/components/ui/Ornaments";
import { PageTitle } from "@/components/ui/PageTitle";
import { ToneBadge } from "@/components/ui/Tone";
import { loadPartyPage, type PartyMemberView } from "@/lib/data/pages";
import { formatDate } from "@/lib/dates";
import { deadlineUrgency } from "@/lib/domain/deadlines";
import { ATTIRE_LABEL, ROLE_LABEL } from "@/lib/domain/party";

export const metadata = { title: "Wedding Party" };

const MENU_STYLE = {
  A: { swatch: "bg-dusty-rose", label: "Menu A · Dusty Rose dress" },
  B: { swatch: "bg-desert-rose", label: "Menu B · Desert Rose dress" },
  C: { swatch: "bg-cocoa", label: "Suit · Dusty Rose bow tie" },
} as const;

const HAIR = [
  "Sleek low bun or ponytail",
  "Curly ponytail or low ponytail",
  "Box braids in an updo bun",
  "Boho braids, or half-up half-down",
  "Twists gathered low or in an updo",
  "Faux locs in a low updo",
];

const ACCESSORIES = [
  "Yellow gold metals only, no silver",
  "Studs, or simple gold, pearl or diamond earrings",
  "A delicate necklace (optional)",
  "One or two minimal bracelets or rings",
  "A small clutch",
  "Watches off for the aisle",
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

const ROLE_MARK: Partial<Record<PartyMemberView["role"], string>> = {
  BEST_MAN: "BM",
  MAID_OF_HONOR: "MH",
  MATRON_OF_HONOR: "MT",
  BRIDESMAN: "B",
};

function MemberRow({ m }: { m: PartyMemberView }) {
  const menu = m.menu ? MENU_STYLE[m.menu] : null;
  const avatar = m.menu === "A" ? "bg-dusty-rose/45" : m.menu === "B" ? "bg-desert-rose/40" : "bg-linen";
  // Placeholders show their number ("Bridesmaid 3" → 3) or a role mark; named people show initials.
  const badge = m.isPlaceholder ? (m.name.match(/(\d+)$/)?.[1] ?? ROLE_MARK[m.role] ?? initials(m.name)) : initials(m.name);
  return (
    <li className="flex items-center gap-4 border-b border-rule py-3.5 last:border-b-0">
      <span
        aria-hidden
        className={`grid size-11 shrink-0 place-items-center rounded-full border border-paper font-display text-lg text-chocolate ring-1 ring-rule-strong ${avatar}`}
      >
        {badge}
      </span>
      <div className="min-w-0 flex-1">
        <p className={m.isPlaceholder ? "font-display text-lg leading-tight text-cocoa italic" : "text-[15px]"}>
          {m.name}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
          {!m.isPlaceholder ? <span>{ROLE_LABEL[m.role]} ·</span> : null}
          {menu ? (
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span className={`size-2 rounded-full ${menu.swatch}`} aria-hidden />
              {menu.label}
            </span>
          ) : (
            <span>Suit</span>
          )}
          {m.styleName ? <span>· {m.styleName}</span> : null}
        </p>
      </div>
      <span className="shrink-0 text-right text-[10.5px] font-semibold tracking-[0.1em] text-muted uppercase">
        {ATTIRE_LABEL[m.status]}
      </span>
    </li>
  );
}

export default async function PartyPage() {
  const { plan, members, options } = await loadPartyPage();
  const deadline = plan.settings.dressSizingDeadline;
  const urgency = deadlineUrgency(deadline, plan.today);
  const dresses = members.filter((m) => m.outfitType === "DRESS");
  const outstanding = dresses.filter((m) => !m.sizingSent).length;
  const brideSide = members.filter((m) => m.side === "BRIDE_SIDE");
  const groomSide = members.filter((m) => m.side === "GROOM_SIDE");
  const menu = (key: "A" | "B" | "SHOES") => options.filter((o) => o.menu === key);

  return (
    <div className="grid gap-8 sm:gap-10">
      <PageTitle
        word="Wedding Party"
        eyebrow="People"
        intro={`${members.length} of our favorite people. Every attendant sends their dress selection and sizing by ${formatDate(deadline, "weekday-long")}.`}
      />

      <Card framed className="grid gap-6 px-7 py-8 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-10 sm:px-10">
        <div className="relative grid justify-items-start gap-1">
          <span className={`num font-display text-[72px] leading-[0.85] ${urgency.tone === "overdue" ? "text-brick" : ""}`}>
            {Math.abs(urgency.daysLeft).toLocaleString("en-US")}
          </span>
          <span className="label-caps">{urgency.daysLeft >= 0 ? "days left" : "days overdue"}</span>
        </div>
        <div className="relative grid gap-3">
          <p className="font-display text-2xl leading-snug sm:text-[28px]">
            Dress selection &amp; sizing are due <em className="italic">{formatDate(deadline, "weekday-long")}</em>
          </p>
          <p className="text-sm text-cocoa">
            The bride orders every dress after that date. Alterations are each person&apos;s own cost.
          </p>
          <ToneBadge tone={urgency.tone}>
            {outstanding === 0 ? "Every size is in" : `${outstanding} of ${dresses.length} sizes outstanding`}
          </ToneBadge>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {[
          { title: "The bride's side", list: brideSide },
          { title: "The groom's side", list: groomSide },
        ].map((group) => (
          <Card key={group.title} className="grid content-start gap-2 p-6 sm:p-7">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[28px] leading-tight">
                {group.title.replace(/ side$/, "")} <em className="italic">side</em>
              </h2>
              <span className="label-caps">{group.list.length} people</span>
            </div>
            <ul>
              {group.list.map((m) => (
                <MemberRow key={m.id} m={m} />
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Card className="grid gap-8 p-6 sm:p-9" aria-labelledby="attire-h">
        <div className="grid justify-items-center gap-3 text-center">
          <p className="label-caps text-rose-ink">Our outfit guide</p>
          <h2 id="attire-h" className="text-[32px] leading-tight sm:text-[38px]">
            The attire <em className="italic">program</em>
          </h2>
          <Divider className="w-40" />
        </div>

        <div className="grid gap-8 md:grid-cols-3 md:gap-0 md:divide-x md:divide-rule">
          {[
            { key: "A" as const, title: "Menu A", who: "Bridesmaids", swatch: "bg-dusty-rose", color: "Dusty Rose · stretch satin · floor length" },
            { key: "B" as const, title: "Menu B", who: "Maid & Matron of Honor", swatch: "bg-desert-rose", color: "Desert Rose · stretch satin · floor length" },
            { key: "SHOES" as const, title: "Shoes", who: "Every dress", swatch: "bg-chocolate", color: "Chocolate brown patent · 3.5\" heel or higher" },
          ].map((col) => (
            <section key={col.key} className="grid content-start gap-4 md:px-7 md:first:pl-0 md:last:pr-0">
              <div className="flex items-center gap-3">
                <span aria-hidden className={`size-10 shrink-0 rounded-full ring-1 ring-rule-strong ring-offset-2 ring-offset-paper ${col.swatch}`} />
                <div>
                  <h3 className="font-sans text-[15px] font-medium">
                    {col.title} <span className="font-normal text-muted">· {col.who}</span>
                  </h3>
                  <p className="text-xs text-muted">{col.color}</p>
                </div>
              </div>
              <ul className="grid gap-2.5">
                {menu(col.key).map((o) => {
                  const count = members.filter((m) => m.styleName === o.name).length;
                  return (
                    <li key={o.id} className="flex items-baseline justify-between gap-3 border-b border-rule pb-2.5 last:border-b-0">
                      <span className="min-w-0">
                        <span className="font-display text-xl">{o.name}</span>
                        <span className="block text-xs text-muted">{o.description.split(". ")[0]}</span>
                      </span>
                      {count > 0 ? <span className="num text-xs text-cocoa">{count} chosen</span> : null}
                    </li>
                  );
                })}
              </ul>
              {col.key === "SHOES" ? (
                <p className="text-xs leading-relaxed text-muted">Already-owned shoes are welcome once they&apos;re approved.</p>
              ) : null}
            </section>
          ))}
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
              {HAIR.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </section>
          <section className="grid content-start gap-3 md:pl-7">
            <h3 className="font-sans text-[15px] font-medium">Accessories</h3>
            <ul className="grid gap-1 text-sm text-muted">
              {ACCESSORIES.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </section>
        </div>
      </Card>

      <ComingSoon
        phase={4}
        items={[
          "Add names and contact details",
          "Track each person from style chosen to ready, plus shoes, hair, accessories, gifts and lodging",
          "Who still owes their sizing, sorted by how late they are",
          "Duties for each attendant",
        ]}
      />
    </div>
  );
}
