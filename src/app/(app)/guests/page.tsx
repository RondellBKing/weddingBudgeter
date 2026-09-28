import Link from "next/link";
import { HeadcountCard } from "@/components/dashboard/HeadcountCard";
import { SubmitButton } from "@/components/form/SubmitButton";
import { EveryoneChecklist } from "@/components/guests/EveryoneChecklist";
import { GuestFilters } from "@/components/guests/GuestFilters";
import { GuestList } from "@/components/guests/GuestList";
import { buttonClass } from "@/components/ui/Button";
import { Card, CardHeading } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageTitle } from "@/components/ui/PageTitle";
import { Legend, Ring } from "@/components/ui/Ring";
import { loadGuestList } from "@/lib/data/guests";
import { filterGuests, groupHouseholds, guestCounts, hasFilters, parseGuestFilters } from "@/lib/domain/guests";
import { formatCents } from "@/lib/money";
import { addCouple } from "./actions";

export const metadata = { title: "Guests" };

export default async function GuestsPage({ searchParams }: PageProps<"/guests">) {
  const { plan, guests, couple, party, vendorMeals, overageDue } = await loadGuestList();
  const { settings, headroom, headcount, budget } = plan;
  const filters = parseGuestFilters(await searchParams);
  const counts = guestCounts(guests);
  const shown = filterGuests(guests, filters);
  const households = groupHouseholds(shown);
  const filtered = hasFilters(filters);

  const actions = (
    <>
      <Link href="/guests/import" className={buttonClass("primary")}>
        Import from RSVP app
      </Link>
      <Link href="/guests/new" className={buttonClass("secondary")}>
        Add guest
      </Link>
      {guests.length > 0 ? (
        <a href="/guests/export" download className={buttonClass("secondary")}>
          Export CSV
        </a>
      ) : null}
    </>
  );

  const intro =
    "Who's coming. Invitations and RSVPs live in our RSVP app; the list comes here for the headcount and the seating chart.";

  if (guests.length === 0) {
    const facts = [
      [String(headcount.headcount), "planned headcount"],
      [String(settings.includedHeadcount), "included by the venue"],
      [formatCents(headroom.perPersonAllInCents), `each person above ${settings.includedHeadcount}`],
      [headroom.breakEvenHeadcount === null ? "—" : String(headroom.breakEvenHeadcount), "uses up the contingency"],
    ];
    return (
      <div className="grid gap-8 sm:gap-10">
        <PageTitle word="Guests" eyebrow="People" intro={intro} actions={actions} />

        <EmptyState icon="guests" title="No guest list" word="yet">
          <p>
            When the list is ready in the RSVP app, export it as a CSV and bring it in here. Until then, every number in
            the app uses our planned headcount of {settings.headcountTarget} people, including the two of us and the
            wedding party.
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
            <Link href="/guests/import" className={buttonClass("primary")}>
              Import from RSVP app
            </Link>
            <form action={addCouple}>
              <SubmitButton variant="secondary" pendingLabel="Adding…">
                Add the two of us
              </SubmitButton>
            </form>
          </div>
        </EmptyState>

        <Card className="grid grid-cols-2 gap-px overflow-hidden bg-rule p-0 lg:grid-cols-4">
          {facts.map(([value, label]) => (
            <div key={label} className="grid gap-1.5 bg-paper px-6 py-6">
              <span className="num font-display text-[40px] leading-none">{value}</span>
              <span className="text-[13px] text-muted">{label}</span>
            </div>
          ))}
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-8 sm:gap-10">
      <PageTitle word="Guests" eyebrow="People" intro={intro} actions={actions} />

      <div className="grid gap-5 lg:grid-cols-12">
        <Card className="grid content-start gap-5 p-6 sm:p-7 lg:col-span-7" aria-labelledby="headcount-h">
          <CardHeading id="headcount-h" title={`Headcount & the venue's ${settings.includedHeadcount}`} />
          <HeadcountCard
            headroom={headroom}
            headcount={headcount}
            contingencyAvailable={budget.contingency.available}
            overageDue={overageDue}
          />
        </Card>

        <Card className="grid content-start gap-6 p-6 sm:p-7 lg:col-span-5" aria-labelledby="list-h">
          <CardHeading id="list-h" title="The list" />
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <Ring
              size={136}
              thickness={9}
              total={counts.total}
              label={`${counts.total} on the list: ${counts.attending} attending, ${counts.pending} pending, ${counts.declined} declined.`}
              segments={[
                { label: "Attending", value: counts.attending, className: "stroke-garden" },
                { label: "Pending", value: counts.pending, className: "stroke-gold" },
                { label: "Declined", value: counts.declined, className: "stroke-rule-strong" },
              ]}
            >
              <div className="grid gap-0.5">
                <span className="num font-display text-4xl leading-none">{counts.total}</span>
                <span className="text-[11px] text-muted">on the list</span>
              </div>
            </Ring>
            <div className="flex w-full min-w-0 sm:flex-1">
              <Legend
                items={[
                  { label: "Attending", value: String(counts.attending), swatch: "bg-garden" },
                  { label: "Pending", value: String(counts.pending), swatch: "bg-gold", note: "No reply yet; counted as coming" },
                  { label: "Declined", value: String(counts.declined), swatch: "bg-rule-strong", note: "Not counted" },
                ]}
              />
            </div>
          </div>
          <dl className="grid grid-cols-3 border-t border-rule pt-4">
            {[
              ["Households", counts.households],
              ["Children", counts.children],
              ["Seated", `${counts.seated} of ${counts.coming}`],
            ].map(([label, value], i) => (
              <div key={label} className={`grid gap-1 ${i > 0 ? "border-l border-rule pl-4" : ""}`}>
                <dt className="label-caps text-[10px]">{label}</dt>
                <dd className="num text-xl">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <Card className="grid gap-5 p-6 sm:p-7" aria-labelledby="everyone-h">
        <CardHeading id="everyone-h" title="Is everyone eating on the list?" />
        <EveryoneChecklist
          couple={couple}
          party={party}
          vendorMeals={vendorMeals}
          vendorMealsCount={settings.vendorMealsCountTowardHeadcount}
          addCouple={addCouple}
        />
      </Card>

      <Card className="grid gap-6 p-6 sm:p-7" aria-labelledby="everyone-list-h">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 id="everyone-list-h" className="text-[28px] leading-tight sm:text-[32px]">
            Everyone, by <em className="italic">household</em>
          </h2>
          <p className="num text-sm text-muted" aria-live="polite">
            {filtered ? `Showing ${shown.length} of ${guests.length}` : `${guests.length} guests in ${counts.households} households`}
          </p>
        </div>
        <GuestFilters filters={filters} active={filtered} />
        {households.length > 0 ? (
          <GuestList households={households} />
        ) : (
          <p className="border-t border-rule pt-6 text-cocoa">
            No guests match.{" "}
            <Link href="/guests" className="text-rose-ink underline-offset-4 hover:underline">
              Show everyone
            </Link>
          </p>
        )}
      </Card>
    </div>
  );
}
