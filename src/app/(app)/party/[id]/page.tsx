import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { SubmitButton } from "@/components/form/SubmitButton";
import { AttireChecklist } from "@/components/party/AttireChecklist";
import { MemberAvatar } from "@/components/party/MemberAvatar";
import { attireTone, MENU_STYLE, SHOE_TONE, SUIT_STYLE } from "@/components/party/menu";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { ToneBadge, type Tone } from "@/components/ui/Tone";
import { loadPartyMember } from "@/lib/data/party";
import { formatDate } from "@/lib/dates";
import { attireChecklist, attireStatusLabel, ROLE_LABEL, SIDE_LABEL, telHref } from "@/lib/domain/party";
import { sizeSummary } from "@/lib/domain/party-sizes";
import { owedBy, owedLabel, sizingRollup, sizingUrgency } from "@/lib/domain/party-sizing";
import { SHOE_STATUS_LABEL } from "@/lib/labels";
import { markSizingReceived, saveMember } from "../actions";
import { AddDutyForm } from "../AddDutyForm";
import { DutyList } from "../Duties";
import { MemberForm, type MemberFormValues } from "./MemberForm";

export async function generateMetadata({ params }: PageProps<"/party/[id]">): Promise<Metadata> {
  const data = await loadPartyMember((await params).id);
  return { title: data ? data.member.name : "Wedding Party" };
}

function Detail({ label, children, badge }: { label: string; children: ReactNode; badge?: { tone: Tone; text: string } }) {
  return (
    <div className="grid gap-1 border-b border-rule py-3.5 first:pt-0 last:border-b-0 last:pb-0">
      <dt className="label-caps text-[10px]">{label}</dt>
      <dd className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="min-w-0 text-[15px]">{children}</span>
        {badge ? <ToneBadge tone={badge.tone}>{badge.text}</ToneBadge> : null}
      </dd>
    </div>
  );
}

const yes = (text: string): { tone: Tone; text: string } => ({ tone: "on-track", text });
const notYet = (text = "Not yet"): { tone: Tone; text: string } => ({ tone: "neutral", text });

export default async function PartyMemberPage({ params }: PageProps<"/party/[id]">) {
  const data = await loadPartyMember((await params).id);
  if (!data) notFound();
  const { plan, member: m, options, prev, next } = data;
  const { today, settings } = plan;
  const deadline = settings.dressSizingDeadline;

  const isDress = m.outfitType === "DRESS";
  const menu = m.menu ? MENU_STYLE[m.menu] : null;
  const owed = owedBy(m);
  const owes = owed.style || owed.sizes;
  // How loudly to show what this one person owes: the deadline's level, once they owe anything.
  const urgency = sizingUrgency(deadline, today, sizingRollup([m]).dresses.length);
  const steps = attireChecklist(m);
  const sizes = sizeSummary(m.sizes, m.outfitType);

  const values: MemberFormValues = {
    name: m.savedName ?? "",
    email: m.email ?? "",
    phone: m.phone ?? "",
    role: m.role,
    side: m.side,
    outfitType: m.outfitType,
    askedOn: m.askedOn ?? "",
    acceptedOn: m.acceptedOn ?? "",
    chosenStyleId: m.chosenStyleId ?? "",
    sizingSubmittedOn: m.sizingSubmittedOn ?? "",
    orderedOn: m.orderedOn ?? "",
    arrivedOn: m.arrivedOn ?? "",
    alteredOn: m.alteredOn ?? "",
    readyOn: m.readyOn ?? "",
    sizes: m.sizes,
    attirePaid: m.attirePaid,
    shoeOptionId: m.shoeOptionId ?? "",
    shoeOwnedDescription: m.shoeOwnedDescription ?? "",
    shoeStatus: m.shoeStatus,
    hairPlan: m.hairPlan ?? "",
    accessoriesConfirmed: m.accessoriesConfirmed,
    giftIdea: m.giftIdea ?? "",
    giftPurchased: m.giftPurchased,
    lodgingBooked: m.lodgingBooked,
    notes: m.notes ?? "",
  };
  const pick = (key: "A" | "B" | "SHOES") =>
    options.filter((o) => o.menu === key).map((o) => ({ id: o.id, name: o.name, description: o.description }));

  const owedTone: Tone = isDress && urgency.emphasis >= 3 ? urgency.tone : "neutral";
  const shoeChoice = m.shoeName ?? (m.shoeOwnedDescription ? `Their own: ${m.shoeOwnedDescription}` : null);

  return (
    <div className="grid grid-cols-1 gap-8 sm:gap-10">
      <nav aria-label="Wedding party" className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-[13px]">
        <Link href="/party" className="inline-flex items-center gap-2 text-rose-ink hover:text-chocolate">
          <Icon name="arrow" size={14} className="rotate-180" />
          The wedding party
        </Link>
        <span className="flex gap-5">
          {prev ? (
            <Link href={`/party/${prev.id}`} className="text-muted hover:text-chocolate">
              <span className="sr-only">Previous: </span>
              <span aria-hidden>‹ </span>
              {prev.name}
            </Link>
          ) : null}
          {next ? (
            <Link href={`/party/${next.id}`} className="text-muted hover:text-chocolate">
              <span className="sr-only">Next: </span>
              {next.name}
              <span aria-hidden> ›</span>
            </Link>
          ) : null}
        </span>
      </nav>

      <header className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <MemberAvatar m={m} size="lg" />
        <div className="grid min-w-0 flex-1 gap-2">
          <p className="label-caps text-rose-ink">
            {ROLE_LABEL[m.role]} · {SIDE_LABEL[m.side]}
          </p>
          <h1 className="text-[40px] leading-[1.02] tracking-[-0.01em] sm:text-[52px]">
            {m.isPlaceholder ? <em className="text-cocoa italic">{m.name}</em> : m.name}
          </h1>
          <p className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {m.email ? (
              <a href={`mailto:${m.email}`} className="text-rose-ink underline-offset-4 hover:underline">
                {m.email}
              </a>
            ) : null}
            {m.phone ? (
              <a href={telHref(m.phone)} className="num text-rose-ink underline-offset-4 hover:underline">
                {m.phone}
              </a>
            ) : null}
            {!m.email && !m.phone ? <span className="text-muted">No contact details yet. Add them below.</span> : null}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Card className="grid content-start gap-6 p-6 sm:p-8" aria-labelledby="outfit-h">
          <div className="grid gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="outfit-h" className="text-[28px] leading-tight">
                Their <em className="italic">outfit</em>
              </h2>
              <ToneBadge tone={attireTone(m.status)}>{attireStatusLabel(m.status, m.outfitType)}</ToneBadge>
            </div>
            <p className="flex items-center gap-x-2 text-sm text-cocoa">
              <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${menu ? menu.swatch : SUIT_STYLE.swatch}`} />
              <span>
                {menu ? menu.label : "Suit, matching the groom's party"}
                {m.styleName ? <span className="text-chocolate"> · {m.styleName}</span> : null}
              </span>
            </p>
            {owes ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[3px] bg-ivory/70 px-4 py-3">
                <ToneBadge tone={owedTone}>
                  Owes {owedLabel(owed, m.outfitType).toLowerCase()}
                  {isDress ? ` by ${formatDate(deadline, "month-day")}` : ""}
                </ToneBadge>
                {owed.sizes ? (
                  <form action={markSizingReceived.bind(null, m.id)}>
                    <SubmitButton variant="secondary" size="sm">
                      {isDress ? "Sizing received today" : "Measurements received today"}
                    </SubmitButton>
                  </form>
                ) : null}
              </div>
            ) : null}
          </div>

          <AttireChecklist steps={steps} />

          <div className="grid gap-3 border-t border-rule pt-5">
            <h3 className="label-caps">{isDress ? "Sizes" : "Measurements"}</h3>
            {sizes.length > 0 ? (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                {sizes.map((s) => (
                  <div key={s.key} className="grid gap-0.5">
                    <dt className="text-xs text-muted">{s.label}</dt>
                    <dd className="num text-[15px]">{s.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-muted">None recorded yet.</p>
            )}
          </div>
        </Card>

        <Card className="grid content-start gap-5 p-6 sm:p-8" aria-labelledby="details-h">
          <h2 id="details-h" className="text-[28px] leading-tight">
            The <em className="italic">details</em>
          </h2>
          <dl className="grid">
            {isDress ? (
              <Detail
                label="Shoes"
                badge={{ tone: SHOE_TONE[m.shoeStatus], text: SHOE_STATUS_LABEL[m.shoeStatus] }}
              >
                {shoeChoice ?? <span className="text-muted">Not chosen yet</span>}
              </Detail>
            ) : (
              <Detail label="Shoes">
                <span className="text-cocoa">
                  Matching the groom&apos;s party{m.menu === "C" ? ", with a Dusty Rose bow tie from the bride" : ""}
                </span>
              </Detail>
            )}
            <Detail label="Hair">{m.hairPlan ?? <span className="text-muted">Not decided yet</span>}</Detail>
            <Detail label="Accessories" badge={m.accessoriesConfirmed ? yes("Confirmed") : notYet()}>
              <span className="text-cocoa">Yellow gold only, no silver</span>
            </Detail>
            <Detail label="Gift" badge={m.giftPurchased ? yes("Purchased") : notYet("Not bought")}>
              {m.giftIdea ?? <span className="text-muted">No idea yet</span>}
            </Detail>
            <Detail label="Lodging" badge={m.lodgingBooked ? yes("Booked") : notYet("Not booked")}>
              <span className="text-cocoa">{m.lodgingBooked ? "Their room is booked" : "No room booked yet"}</span>
            </Detail>
            {!isDress ? (
              <Detail label="Suit rental" badge={m.attirePaid ? yes("Paid") : notYet("Not paid")}>
                <span className="text-cocoa">{m.attirePaid ? "Rental paid" : "Rental not paid yet"}</span>
              </Detail>
            ) : null}
            {m.notes ? (
              <Detail label="Notes">
                <span className="whitespace-pre-line text-cocoa">{m.notes}</span>
              </Detail>
            ) : null}
          </dl>
        </Card>
      </div>

      <Card className="grid gap-5 p-6 sm:p-8" aria-labelledby="member-duties-h">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="member-duties-h" className="text-[28px] leading-tight">
            Their <em className="italic">duties</em>
          </h2>
          {m.duties.length > 0 ? (
            <span className="num text-sm text-muted">
              {m.duties.filter((d) => !d.done).length} open · {m.duties.filter((d) => d.done).length} done
            </span>
          ) : null}
        </div>
        {m.duties.length > 0 ? (
          <DutyList duties={m.duties} today={today} timezone={settings.timezone} />
        ) : (
          <p className="text-sm text-muted">Nothing assigned yet.</p>
        )}
        <AddDutyForm memberId={m.id} />
      </Card>

      <Card className="p-6 sm:p-9" aria-labelledby="edit-h">
        <h2 id="edit-h" className="label-caps mb-8 border-b border-rule pb-4 text-rose-ink">
          Update {m.isPlaceholder ? "their" : `${m.name}'s`} details
        </h2>
        <MemberForm action={saveMember.bind(null, m.id)} values={values} menus={{ A: pick("A"), B: pick("B"), SHOES: pick("SHOES") }} />
      </Card>
    </div>
  );
}
