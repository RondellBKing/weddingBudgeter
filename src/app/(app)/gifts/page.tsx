import { GiftForm, type GiftValues } from "@/components/gifts/GiftForm";
import { GiftLog, ThankYouList } from "@/components/gifts/GiftLists";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageTitle, SectionTitle } from "@/components/ui/PageTitle";
import { Stat, StatRow } from "@/components/ui/Stat";
import { requireSession } from "@/lib/auth/require-session";
import { loadGifts } from "@/lib/data/gifts";
import { waitedLabel } from "@/lib/domain/gifts";
import { saveGift } from "./actions";

export const metadata = { title: "Gifts" };

const GUIDE =
  "A gentle guide: write within about two weeks for a gift that arrives before the wedding, and within about three months of the wedding for one that arrives on the day or after.";

export default async function GiftsPage() {
  await requireSession();
  const { today, totals, owed, all, guests } = await loadGifts();
  const blank: GiftValues = { fromName: "", guestId: "", description: "", receivedOn: today, thankYouSentOn: "", notes: "" };

  const logCard = (
    <Card id="log-gift" aria-labelledby="log-gift-h" className="grid scroll-mt-24 content-start gap-6 p-6 sm:p-8">
      <SectionTitle lead="Log a" word="gift" eyebrow="As it arrives" id="log-gift-h" />
      <GiftForm action={saveGift.bind(null, null)} values={blank} guests={guests} submitLabel="Log gift" idPrefix="add-gift-" />
    </Card>
  );

  return (
    <div className="grid gap-8 sm:gap-10">
      <PageTitle
        word="Gifts"
        eyebrow="Guest care"
        intro="Every gift as it arrives, and every thank-you note still to write."
        actions={
          all.length > 0 ? (
            <a href="#log-gift" className={buttonClass("primary")}>
              Log a gift
            </a>
          ) : null
        }
      />

      {all.length === 0 ? (
        <>
          <EmptyState icon="gift" title="No gifts" word="yet">
            <p>Log each gift as it arrives, engagement gifts included. The thank-you notes still to write are listed for you, oldest first.</p>
            <p className="text-[13px] text-muted">{GUIDE}</p>
          </EmptyState>
          <div className="max-w-2xl">{logCard}</div>
        </>
      ) : (
        <>
          <StatRow label="Gift totals">
            <Stat label="Gifts received" value={totals.received} />
            <Stat label="Thank-yous sent" value={totals.thanked} />
            <Stat label="Still to write" value={totals.toWrite} sub={totals.toWrite === 0 ? "All caught up" : undefined} />
            <Stat label="Running late" value={totals.late} sub={totals.late === 0 ? "None" : "Past the guide"} />
            <Stat label="Oldest waiting" value={owed.length > 0 ? waitedLabel(owed[0].waitedDays).replace(/^Waiting /, "") : "None"} />
          </StatRow>

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <Card aria-labelledby="owed-h" className="grid content-start gap-5 p-6 sm:p-8">
              <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
                <SectionTitle lead="Thank-yous to" word="write" eyebrow="Oldest first" id="owed-h" />
                <span className="num text-sm text-muted">{owed.length} to write</span>
              </div>
              <p className="text-[13px] leading-relaxed text-muted">{GUIDE}</p>
              {owed.length === 0 ? (
                <p className="text-[15px] text-garden-ink">Every thank-you is written. Lovely.</p>
              ) : (
                <ThankYouList owed={owed} />
              )}
            </Card>
            {logCard}
          </div>

          <Card aria-labelledby="all-h" className="grid content-start gap-4 px-6 pt-6 pb-2 sm:px-9 sm:pt-8">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
              <SectionTitle lead="Every" word="gift" eyebrow="Newest first" id="all-h" />
              <span className="num text-sm text-muted">{all.length} in all</span>
            </div>
            <GiftLog gifts={all} />
          </Card>
        </>
      )}
    </div>
  );
}
