import Link from "next/link";
import { HotelCard } from "@/components/travel/HotelCard";
import { Shuttles } from "@/components/travel/Shuttles";
import { WelcomeBags } from "@/components/travel/WelcomeBags";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageTitle, SectionTitle } from "@/components/ui/PageTitle";
import { requireSession } from "@/lib/auth/require-session";
import { loadTravel } from "@/lib/data/travel";

export const metadata = { title: "Hotels & Travel" };

function BookEarly() {
  return (
    <p className="max-w-3xl border-l-2 border-dusty-rose pl-4 text-[15px] leading-relaxed text-cocoa">
      Book early. The wedding is the Thursday before Easter, during Passover, and the next day is Good Friday, so
      hotels near River Vale fill up that week.
    </p>
  );
}

const JUMPS = [
  { href: "#hotels", label: "Hotels" },
  { href: "#shuttles", label: "Shuttles" },
  { href: "#welcome-bags", label: "Welcome bags" },
];

export default async function TravelPage() {
  await requireSession();
  const { today, weddingDate, hotels, shuttleDays, bagItems, bags, transportVendors } = await loadTravel();

  return (
    <div className="grid gap-10 sm:gap-14">
      <PageTitle
        word="Hotels & Travel"
        eyebrow="Guest care"
        intro="Hotel blocks and their cutoff dates, shuttles to the venue, and the welcome bags."
      />

      <nav aria-label="On this page" className="-mt-4 flex flex-wrap gap-x-6 gap-y-2 border-y border-rule py-3 sm:-mt-6">
        {JUMPS.map((j) => (
          <a key={j.href} href={j.href} className="label-caps text-rose-ink hover:text-chocolate">
            {j.label}
          </a>
        ))}
      </nav>

      <section id="hotels" aria-labelledby="hotels-h" className="grid scroll-mt-24 gap-6">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <SectionTitle eyebrow="Where guests stay" lead="Hotel" word="blocks" id="hotels-h" />
          {hotels.length > 0 ? (
            <Link href="/travel/hotels/new" className={buttonClass("primary", "sm")}>
              Add a hotel block
            </Link>
          ) : null}
        </div>
        <BookEarly />
        {hotels.length === 0 ? (
          <EmptyState icon="travel" title="No hotel blocks" word="yet">
            <p>
              Add each hotel holding rooms for guests. The cutoff date is the one to watch: after it, unbooked rooms go
              back to the hotel and the group rate ends.
            </p>
            <div>
              <Link href="/travel/hotels/new" className={buttonClass("primary")}>
                Add a hotel block
              </Link>
            </div>
          </EmptyState>
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-2">
            {hotels.map((h) => (
              <HotelCard key={h.id} hotel={h} today={today} />
            ))}
          </div>
        )}
      </section>

      <section id="shuttles" aria-labelledby="shuttles-h" className="grid scroll-mt-24 gap-6">
        <SectionTitle eyebrow="Getting there" lead="Shuttle" word="runs" id="shuttles-h" />
        <Card className="p-6 sm:p-8">
          <Shuttles days={shuttleDays} weddingDate={weddingDate} vendors={transportVendors} />
        </Card>
      </section>

      <section id="welcome-bags" aria-labelledby="bags-h" className="grid scroll-mt-24 gap-6">
        <SectionTitle eyebrow="A hello at check-in" lead="Welcome" word="bags" id="bags-h" />
        <Card className="p-6 sm:p-8">
          <WelcomeBags items={bagItems} bags={bags} />
        </Card>
      </section>
    </div>
  );
}
