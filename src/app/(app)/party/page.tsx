import { AttireProgram } from "@/components/party/AttireProgram";
import { DeadlineCard } from "@/components/party/DeadlineCard";
import { RosterCard } from "@/components/party/Roster";
import { PageTitle } from "@/components/ui/PageTitle";
import { loadPartyOverview } from "@/lib/data/party";
import { formatDate } from "@/lib/dates";
import { sizingRollup, sizingUrgency, styleDistribution } from "@/lib/domain/party-sizing";
import { DutiesCard } from "./Duties";
import { SizingRollup } from "./SizingRollup";

export const metadata = { title: "Wedding Party" };

export default async function PartyPage() {
  const { plan, members, options } = await loadPartyOverview();
  const { today, settings } = plan;
  const deadline = settings.dressSizingDeadline;

  const dressCount = members.filter((m) => m.outfitType === "DRESS").length;
  const suitCount = members.length - dressCount;
  const rollup = sizingRollup(members);
  const urgency = sizingUrgency(deadline, today, rollup.dresses.length);

  return (
    <div className="grid grid-cols-1 gap-8 sm:gap-10">
      <PageTitle
        word="Wedding Party"
        eyebrow="People"
        intro={`${members.length} of our favorite people. Every attendant sends their dress selection and sizing by ${formatDate(deadline, "weekday-long")}.`}
      />

      <DeadlineCard
        deadline={deadline}
        urgency={urgency}
        dresses={{ owing: rollup.dresses.length, total: dressCount }}
        suits={{ owing: rollup.suits.length, total: suitCount }}
      />

      <SizingRollup
        deadline={deadline}
        urgency={urgency}
        dresses={rollup.dresses}
        suits={rollup.suits}
        totals={{ dresses: dressCount, suits: suitCount }}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <RosterCard title="The bride's" word="side" members={members.filter((m) => m.side === "BRIDE_SIDE")} />
        <RosterCard title="The groom's" word="side" members={members.filter((m) => m.side === "GROOM_SIDE")} />
      </div>

      <DutiesCard members={members} today={today} timezone={settings.timezone} />

      <AttireProgram options={options} distribution={styleDistribution(members, options)} />
    </div>
  );
}
