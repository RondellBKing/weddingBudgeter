import { Card } from "@/components/ui/Card";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageTitle } from "@/components/ui/PageTitle";
import { loadPlan } from "@/lib/data/plan";
import { formatCents } from "@/lib/money";

export const metadata = { title: "Guests" };

export default async function GuestsPage() {
  const { settings, headroom, headcount } = await loadPlan();
  const facts = [
    [String(headcount.headcount), headcount.source === "target" ? "planned headcount" : "coming (not declined)"],
    [String(settings.includedHeadcount), "included by the venue"],
    [formatCents(headroom.perPersonAllInCents), `each person above ${settings.includedHeadcount}`],
    [headroom.breakEvenHeadcount === null ? "—" : String(headroom.breakEvenHeadcount), "uses up the contingency"],
  ];
  return (
    <div className="grid gap-8 sm:gap-10">
      <PageTitle word="Guests" eyebrow="People" intro="Who's coming. Invitations and RSVPs live in our RSVP app; the list comes here for the headcount and the seating chart." />

      {headcount.source === "target" ? (
        <EmptyState icon="guests" title="No guest list" word="yet">
          <p>
            When the list is ready in the RSVP app, we&apos;ll bring it in here. Until then, every number in the app uses
            our planned headcount of {settings.headcountTarget} people, including the two of us and the wedding party.
          </p>
        </EmptyState>
      ) : null}

      <Card className="grid grid-cols-2 gap-px overflow-hidden bg-rule p-0 lg:grid-cols-4">
        {facts.map(([value, label]) => (
          <div key={label} className="grid gap-1.5 bg-paper px-6 py-6">
            <span className="num font-display text-[40px] leading-none">{value}</span>
            <span className="text-[13px] text-muted">{label}</span>
          </div>
        ))}
      </Card>

      <ComingSoon
        phase={5}
        items={[
          "Import the list from the RSVP app, with a preview before anything changes",
          "Re-import any time without creating duplicates",
          "Export the list as a CSV",
        ]}
      />
    </div>
  );
}
