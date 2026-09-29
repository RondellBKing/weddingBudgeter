import Link from "next/link";
import { ChildrenLine, ChoiceTable, DietaryList, HeadcountNote, PASSOVER_NOTE, VendorMealList } from "@/components/meals/MealParts";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageTitle, SectionTitle } from "@/components/ui/PageTitle";
import { Stat, StatRow } from "@/components/ui/Stat";
import { requireSession } from "@/lib/auth/require-session";
import { loadMeals, type MealsData } from "@/lib/data/meals";
import type { MealGuest } from "@/lib/domain/meals";

export const metadata = { title: "Meals" };

const n = (x: number) => x.toLocaleString("en-US");

/** The number for the venue, and how it's made up. */
function TotalCard({ data }: { data: MealsData }) {
  const { summary, total } = data;
  const parts = [
    { label: "Attending", value: summary.attending },
    { label: "Pending", value: summary.pending },
    { label: total.vendorMeals === 1 ? "Vendor meal" : "Vendor meals", value: total.vendorMeals },
  ];
  return (
    <Card framed aria-labelledby="total-h" className="grid gap-7 px-7 py-8 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-12 sm:px-10">
      <div className="relative grid justify-items-start gap-1">
        <p className="label-caps text-rose-ink">For the venue</p>
        <span className="num font-display text-[88px] leading-[0.9]">{n(total.total)}</span>
        <h2 id="total-h" className="label-caps">
          Meals in all
        </h2>
      </div>
      <div className="relative grid gap-4">
        <dl className="flex flex-wrap items-end gap-x-3 gap-y-3">
          {parts.map((p, i) => (
            <div key={p.label} className="flex items-end gap-3">
              {i > 0 ? (
                <span aria-hidden className="pb-1 font-display text-2xl text-muted">
                  +
                </span>
              ) : null}
              <div className="grid gap-1">
                <dt className="label-caps text-[10px]">{p.label}</dt>
                <dd className="num font-display text-[34px] leading-none">{n(p.value)}</dd>
              </div>
            </div>
          ))}
        </dl>
        <p className="text-[15px] leading-relaxed text-cocoa">
          Pending guests count as coming, the same as the headcount, so the venue is never short. <HeadcountNote total={total} />
        </p>
      </div>
    </Card>
  );
}

function NoChoiceList({ guests }: { guests: MealGuest[] }) {
  if (guests.length === 0) return <p className="text-[13px] text-garden-ink">Everyone coming has chosen a meal.</p>;
  return (
    <details className="group rounded-[3px] border border-rule bg-ivory/45 px-4 py-3">
      <summary className="cursor-pointer text-[13px] text-rose-ink marker:text-muted hover:text-chocolate">
        Who hasn&apos;t chosen yet ({n(guests.length)})
      </summary>
      <ul className="mt-3 columns-1 gap-6 text-[13px] sm:columns-2">
        {guests.map((g) => (
          <li key={g.id} className="flex items-baseline justify-between gap-3 border-b border-rule py-1.5 break-inside-avoid">
            <Link href={`/guests/${g.id}`} className="min-w-0 truncate underline-offset-4 hover:text-rose-ink hover:underline">
              {g.fullName}
            </Link>
            <span className="shrink-0 text-[12px] text-muted">{g.rsvpStatus === "ATTENDING" ? "Attending" : "Pending"}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function VendorCard({ data }: { data: MealsData }) {
  const { vendors } = data;
  return (
    <Card aria-labelledby="vendor-meals-h" className="grid content-start gap-5 p-6 sm:p-8">
      <SectionTitle lead="Vendor" word="meals" eyebrow="Booked vendors" id="vendor-meals-h" />
      <p className="text-[13px] leading-relaxed text-muted">
        From each booked vendor&apos;s &ldquo;meals required&rdquo;, never from the guest list.
        {data.vendorMealsCounted ? " The venue counts them in the headcount (Settings)." : " The venue doesn't bill them as guests (Settings)."}
      </p>
      {vendors.rows.length === 0 ? (
        <p className="text-[15px] text-cocoa">
          No booked vendor needs a meal yet. Set &ldquo;meals required&rdquo; on each vendor&apos;s page once they&apos;re booked.
        </p>
      ) : (
        <VendorMealList rows={vendors.rows} total={vendors.total} />
      )}
    </Card>
  );
}

export default async function MealsPage() {
  await requireSession();
  const data = await loadMeals();
  const { summary, hasGuestList } = data;

  return (
    <div className="grid gap-8 sm:gap-10">
      <PageTitle
        word="Meals"
        eyebrow="Guest care"
        intro="Meal counts and every dietary need, ready to send to the venue."
        actions={
          <Link href="/meals/print" className={buttonClass("primary")}>
            Printable version
          </Link>
        }
      />

      {!hasGuestList ? (
        <>
          <EmptyState icon="meals" title="No guest list" word="yet">
            <p>
              Meal choices and dietary notes come from the guest list. Import it from the RSVP app and the counts for the
              venue appear here.
            </p>
            <div>
              <Link href="/guests/import" className={buttonClass("primary")}>
                Import the guest list
              </Link>
            </div>
          </EmptyState>
          <div className="grid gap-5 lg:grid-cols-2">
            <VendorCard data={data} />
          </div>
        </>
      ) : (
        <>
          <TotalCard data={data} />

          <StatRow label="Guest meal summary">
            <Stat label="Attending" value={n(summary.attending)} />
            <Stat label="Pending" value={n(summary.pending)} sub="Counted as coming" />
            <Stat label="Children" value={n(summary.children.total)} sub={summary.children.total > 0 ? `${n(summary.children.pending)} pending` : undefined} />
            <Stat label="No meal yet" value={n(summary.noChoice.total)} sub={summary.noChoice.total > 0 ? `${n(summary.noChoice.pending)} pending` : "All chosen"} />
            <Stat label="Dietary notes" value={n(summary.dietary.length)} sub={summary.declined > 0 ? `${n(summary.declined)} declined, left out` : undefined} />
          </StatRow>

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <Card aria-labelledby="choices-h" className="grid content-start gap-5 p-6 sm:p-8">
              <SectionTitle lead="By meal" word="choice" eyebrow="Guests coming" id="choices-h" />
              {summary.choices.length === 0 ? (
                <p className="text-[15px] text-cocoa">
                  No meal choices yet. They arrive with the RSVP app&apos;s export; re-import the guest list as replies come in.
                </p>
              ) : null}
              <ChoiceTable summary={summary} />
              <ChildrenLine summary={summary} />
              <NoChoiceList guests={summary.noChoiceGuests} />
            </Card>
            <VendorCard data={data} />
          </div>

          <Card aria-labelledby="dietary-h" className="grid content-start gap-5 p-6 sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
              <SectionTitle lead="Dietary" word="notes" eyebrow="Allergies and needs" id="dietary-h" />
              <span className="num text-sm text-muted">
                {summary.dietary.length} {summary.dietary.length === 1 ? "guest" : "guests"}
              </span>
            </div>
            <p className="max-w-3xl border-l-2 border-dusty-rose pl-4 text-[15px] leading-relaxed text-cocoa">{PASSOVER_NOTE}</p>
            {summary.dietary.length === 0 ? (
              <p className="text-[15px] text-cocoa">No dietary notes from anyone coming yet.</p>
            ) : (
              <DietaryList rows={summary.dietary} />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
