import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/form/ConfirmButton";
import { RsvpBadge, Tag } from "@/components/guests/bits";
import { GuestForm } from "@/components/guests/GuestForm";
import { Card, CardHeading } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { PageTitle } from "@/components/ui/PageTitle";
import { loadGuest, loadGuestFormOptions } from "@/lib/data/guests";
import { formatInstant } from "@/lib/dates";
import { deleteGuest, updateGuest } from "../actions";

export const metadata = { title: "Guest" };

export default async function GuestPage({ params }: PageProps<"/guests/[id]">) {
  const { id } = await params;
  const [guest, options] = await Promise.all([loadGuest(id), loadGuestFormOptions(id)]);
  if (!guest) notFound();

  const imported = Boolean(guest.externalId || guest.lastImportedAt);
  const facts: Array<[string, React.ReactNode]> = [
    ["RSVP", <RsvpBadge key="rsvp" status={guest.rsvpStatus} />],
    ["Table", guest.seat ? `${guest.seat.tableLabel}${guest.seat.seatNumber ? ` · seat ${guest.seat.seatNumber}` : ""}` : "Not seated yet"],
    [
      "From the RSVP app",
      guest.lastImportedAt ? `Last updated ${formatInstant(guest.lastImportedAt, undefined, { month: "short", day: "numeric", year: "numeric" })}` : "Added here",
    ],
  ];

  return (
    <div className="grid max-w-3xl gap-8 sm:gap-10">
      <div className="grid gap-4">
        <Link href="/guests" className="inline-flex items-center gap-1.5 text-[13px] text-rose-ink hover:text-chocolate">
          <Icon name="arrow" size={14} className="rotate-180" />
          All guests
        </Link>
        <PageTitle
          lead=""
          word={guest.fullName}
          eyebrow={guest.householdName !== guest.fullName ? guest.householdName : "Guest"}
        />
        <div className="flex flex-wrap gap-1.5 empty:hidden">
          {guest.relationship === "COUPLE" ? <Tag tone="rose">The couple</Tag> : null}
          {guest.partyRole ? <Tag tone="rose">{guest.partyRole}</Tag> : null}
          {guest.isChild ? <Tag>Child</Tag> : null}
          {guest.isDemo ? <Tag tone="demo">Demo</Tag> : null}
        </div>
      </div>

      <Card className="grid gap-5 p-6 text-sm sm:grid-cols-3 sm:p-7">
        {facts.map(([label, value]) => (
          <div key={label} className="grid content-start gap-1">
            <span className="label-caps text-[10px]">{label}</span>
            <span className="text-cocoa">{value}</span>
          </div>
        ))}
        {guest.plusOnes.length > 0 ? (
          <div className="grid gap-1 sm:col-span-3">
            <span className="label-caps text-[10px]">Their plus-one</span>
            <span className="text-cocoa">
              {guest.plusOnes.map((p, i) => (
                <span key={p.id}>
                  {i > 0 ? ", " : ""}
                  <Link href={`/guests/${p.id}`} className="underline-offset-4 hover:text-rose-ink hover:underline">
                    {p.fullName}
                  </Link>
                </span>
              ))}
            </span>
          </div>
        ) : null}
        {imported ? (
          <p className="border-t border-rule pt-4 text-[13px] leading-relaxed text-muted sm:col-span-3">
            This guest comes from the RSVP app. The next import updates their name, household, RSVP, meal and dietary
            notes from there; side, relationship, notes and plus-ones stay as you set them here.
          </p>
        ) : null}
      </Card>

      <Card className="p-6 sm:p-8">
        <GuestForm
          action={updateGuest.bind(null, guest.id)}
          values={{
            fullName: guest.fullName,
            householdName: guest.householdName,
            side: guest.side,
            relationship: guest.relationship,
            isChild: guest.isChild,
            plusOneOfId: guest.plusOneOfId,
            rsvpStatus: guest.rsvpStatus,
            mealChoice: guest.mealChoice,
            dietaryNotes: guest.dietaryNotes,
            notes: guest.notes,
          }}
          plusOneChoices={options.plusOneChoices}
          households={options.households}
          submitLabel="Save guest"
          imported={imported}
        />
      </Card>

      <Card className="grid gap-4 p-6 sm:p-7" aria-labelledby="remove-h">
        <CardHeading id="remove-h" title="Remove from the list" />
        <p className="max-w-prose text-sm text-cocoa">
          For someone who is no longer invited.{guest.seat ? " Their seat is freed up too." : ""} If they only declined,
          set their RSVP to Declined instead; they&apos;ll stay on the list but won&apos;t count.
          {imported ? " If they're still in the RSVP app, the next import will offer to add them back." : ""}
        </p>
        <div>
          <ConfirmButton
            action={deleteGuest.bind(null, guest.id)}
            question={`Remove ${guest.fullName}?`}
            confirmLabel="Yes, remove"
          >
            Remove guest
          </ConfirmButton>
        </div>
      </Card>
    </div>
  );
}
