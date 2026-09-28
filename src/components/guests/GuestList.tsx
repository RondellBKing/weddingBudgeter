import Link from "next/link";
import { GUEST_SIDE_LABEL, RELATIONSHIP_LABEL } from "@/lib/labels";
import { isComing, type GuestListItem, type Household } from "@/lib/domain/guests";
import { RsvpBadge, Tag } from "./bits";

function GuestRow({ g }: { g: GuestListItem }) {
  const declined = !isComing(g.rsvpStatus);
  const food = [g.mealChoice, g.dietaryNotes].filter(Boolean).join(" · ");
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 border-b border-rule py-3.5 last:border-b-0 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)_minmax(0,0.8fr)_7.25rem] sm:items-baseline">
      <div className="min-w-0">
        <Link
          href={`/guests/${g.id}`}
          className={`text-[15px] underline-offset-4 hover:text-rose-ink hover:underline ${declined ? "text-muted" : ""}`}
        >
          {g.fullName}
        </Link>
        <span className="mt-1 flex flex-wrap gap-1.5 empty:hidden">
          {g.relationship === "COUPLE" ? <Tag tone="rose">The couple</Tag> : null}
          {g.partyRole ? <Tag tone="rose">{g.partyRole}</Tag> : null}
          {g.isChild ? <Tag>Child</Tag> : null}
          {g.plusOneOf ? <Tag>Plus-one of {g.plusOneOf.fullName}</Tag> : null}
          {g.isDemo ? <Tag tone="demo">Demo</Tag> : null}
        </span>
      </div>

      <div className="justify-self-end sm:order-last">
        <RsvpBadge status={g.rsvpStatus} />
      </div>

      <div className="col-span-2 min-w-0 text-[13px] leading-relaxed text-cocoa max-sm:empty:hidden sm:col-span-1">
        {g.relationship !== "COUPLE" ? (
          <p>
            {g.side === "BOTH" ? "Both sides" : GUEST_SIDE_LABEL[g.side]} · {RELATIONSHIP_LABEL[g.relationship]}
          </p>
        ) : null}
        {food ? (
          <p className="text-muted">
            <span className="sr-only">Meal and dietary notes: </span>
            {food}
          </p>
        ) : null}
      </div>

      <div className={`col-span-2 text-[13px] sm:col-span-1 ${g.seat ? "" : "max-sm:hidden"}`}>
        {g.seat ? (
          <span className="text-cocoa">
            {g.seat.tableLabel}
            {g.seat.seatNumber ? <span className="num text-muted"> · seat {g.seat.seatNumber}</span> : null}
          </span>
        ) : declined ? null : (
          <span className="text-muted max-sm:hidden">
            <span aria-hidden>—</span>
            <span className="sr-only">Not seated</span>
          </span>
        )}
      </div>
    </li>
  );
}

/** The list, household by household. Rows stack on phones; no sideways scrolling. */
export function GuestList({ households }: { households: Array<Household<GuestListItem>> }) {
  return (
    <div className="grid gap-7">
      <div
        aria-hidden
        className="label-caps hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)_minmax(0,0.8fr)_7.25rem] gap-x-4 border-b border-chocolate/70 pb-2 text-[10px] sm:grid"
      >
        <span>Guest</span>
        <span>Side · meal</span>
        <span>Table</span>
        <span className="text-right">RSVP</span>
      </div>
      {households.map((h) => (
        <section key={h.key} aria-label={h.name} className="grid">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-b border-rule pb-1.5">
            <h3 className="text-[21px] leading-tight">{h.name}</h3>
            <span className="num text-xs text-muted">
              {h.guests.length} {h.guests.length === 1 ? "guest" : "guests"}
              {h.coming !== h.guests.length ? ` · ${h.coming} coming` : ""}
            </span>
          </div>
          <ul>
            {h.guests.map((g) => (
              <GuestRow key={g.id} g={g} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
