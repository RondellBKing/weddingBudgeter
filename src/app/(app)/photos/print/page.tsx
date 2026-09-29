import Link from "next/link";
import { PrintButton } from "@/components/seating/PrintButton";
import { Icon } from "@/components/ui/Icon";
import type { ShotMoment } from "@/generated/prisma/enums";
import { requireSession } from "@/lib/auth/require-session";
import { loadPlan } from "@/lib/data/plan";
import { loadShots, type ShotView } from "@/lib/data/photos";
import { formatClockTime, formatDate } from "@/lib/dates";
import { groupByMoment } from "@/lib/domain/music";
import { SHOT_PARTS, shotCounts } from "@/lib/domain/photos";
import { SHOT_MOMENT_LABEL } from "@/lib/labels";

export const metadata = { title: "Shot List" };

// When printing, hide the app around this page (sidebar, phone header and bottom bar, banners)
// by hiding everything that isn't <main> or one of its ancestors. Same approach as the seating chart.
const PRINT_CSS = `
@media print {
  @page { size: letter portrait; margin: 0.5in; }
  html, body { background: #fff !important; }
  *:has(> * > #main) { display: block !important; min-height: 0 !important; padding: 0 !important; }
  *:has(> * > #main) > :not(:has(#main)) { display: none !important; }
  *:has(> #main) { padding: 0 !important; }
  *:has(> #main) > :not(#main) { display: none !important; }
  #main { max-width: none !important; margin: 0 !important; padding: 0 !important; }
  .shots-print, .shots-print * { color: #000 !important; box-shadow: none !important; }
  .shots-print .print-rule { border-color: #8c8c8c !important; }
  .shots-print .print-hair { border-color: #c8c8c8 !important; }
  .shots-print .print-box { border-color: #000 !important; }
}
`;

function ShotLine({ shot, number }: { shot: ShotView; number: number | null }) {
  return (
    <li className="print-hair grid grid-cols-[0.9rem_minmax(0,1fr)] items-start gap-x-3 border-b border-rule py-2.5 break-inside-avoid last:border-b-0 print:grid-cols-[0.14in_minmax(0,1fr)] print:gap-x-2.5 print:py-[4pt]">
      {/* A box to tick on the day. */}
      <span aria-hidden className="print-box mt-[3px] size-3.5 rounded-[2px] border border-rule-strong print:mt-[2pt] print:size-[0.13in]" />
      <div className="min-w-0 [overflow-wrap:anywhere]">
        <p className="flex flex-wrap items-baseline gap-x-2.5 text-[14px] leading-snug print:text-[10pt]">
          <span>
            {number !== null ? <span className="num mr-1 text-muted">{number}.</span> : null}
            {shot.description}
          </span>
          {shot.isMustHave ? (
            <strong className="text-[10.5px] font-semibold tracking-[0.12em] whitespace-nowrap text-gold-ink uppercase print:text-[7.5pt]">
              <Icon name="star" size={11} fill="currentColor" className="mr-1 inline-block align-[-1px]" />
              Must-have
            </strong>
          ) : null}
        </p>
        {shot.people ? (
          <p className="mt-0.5 text-[12.5px] text-cocoa print:text-[9pt]">
            <span className="text-muted">With: </span>
            {shot.people}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function MomentSection({ moment, shots }: { moment: ShotMoment; shots: ShotView[] }) {
  const family = moment === "FAMILY";
  return (
    <section aria-labelledby={`print-${moment}`} className="grid gap-2">
      <div className="print-rule flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule-strong pb-1.5 break-after-avoid">
        <h3 id={`print-${moment}`} className="font-display text-[21px] leading-tight print:text-[12.5pt]">
          {SHOT_MOMENT_LABEL[moment]}
        </h3>
        <span className="label-caps num print:text-[7.5pt]">{shots.length === 1 ? "1 shot" : `${shots.length} shots`}</span>
      </div>
      {family ? (
        <p className="text-[12.5px] text-muted italic print:text-[8.5pt]">
          In this order, please: it keeps the fewest people moving. Grandparents can sit down once they&apos;re done.
        </p>
      ) : null}
      <ol className="grid">
        {shots.map((s, i) => (
          <ShotLine key={s.id} shot={s} number={family ? i + 1 : null} />
        ))}
      </ol>
    </section>
  );
}

export default async function ShotListPrintPage() {
  await requireSession();
  const [shots, { settings, today }] = await Promise.all([loadShots(), loadPlan()]);
  const byMoment = groupByMoment(shots);
  const counts = shotCounts(shots);

  return (
    <div className="shots-print grid gap-8 print:gap-6">
      <style>{PRINT_CSS}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/photos" className="inline-flex items-center gap-1.5 text-[13px] text-rose-ink hover:text-chocolate">
          <Icon name="arrow" size={14} className="rotate-180" />
          Back to the shot list
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-[13px] text-muted sm:inline">Letter, portrait. A box to tick beside every shot.</span>
          <PrintButton />
        </div>
      </div>

      <article className="grid gap-10 rounded-[3px] border border-rule bg-paper px-5 py-8 shadow-[0_1px_2px_rgba(62,43,34,0.04),0_8px_24px_-16px_rgba(62,43,34,0.18)] sm:px-10 sm:py-12 print:gap-6 print:border-0 print:bg-white print:p-0">
        <header className="print-rule grid justify-items-center gap-2 border-b border-rule pb-7 text-center print:pb-4">
          <p className="label-caps text-rose-ink">Shot list for the photographer</p>
          <h1 className="text-[40px] leading-none sm:text-[52px] print:text-[26pt]">
            {settings.partnerOneName} <em className="italic">&amp;</em> {settings.partnerTwoName}
          </h1>
          <p className="text-[13px] tracking-[0.18em] text-cocoa uppercase print:text-[9pt]">
            {formatDate(settings.weddingDate, "weekday-long")}
            {settings.ceremonyTime ? ` · Ceremony ${formatClockTime(settings.ceremonyTime)}` : ""} · {settings.venueName}
          </p>
          <p className="num text-[13px] text-muted print:text-[9pt]">
            {counts.total} shots · {counts.mustHaves} must-haves · {counts.family} family groupings · printed {formatDate(today, "medium")}
          </p>
        </header>

        {shots.length === 0 ? (
          <p className="text-center text-cocoa">
            No shots yet. Start the list on the <Link href="/photos" className="text-rose-ink underline underline-offset-4">photos page</Link>.
          </p>
        ) : (
          SHOT_PARTS.map((part) => {
            const moments = part.moments.filter((m) => (byMoment.get(m) ?? []).length > 0);
            if (moments.length === 0) return null;
            return (
              <section key={part.key} aria-labelledby={`print-part-${part.key}`} className="grid gap-5 print:gap-3">
                <h2 id={`print-part-${part.key}`} className="text-[28px] leading-tight break-after-avoid print:text-[16pt]">
                  {part.lead} <em className="italic">{part.word}</em>
                </h2>
                {moments.map((m) => (
                  <MomentSection key={m} moment={m} shots={byMoment.get(m)!} />
                ))}
              </section>
            );
          })
        )}
      </article>
    </div>
  );
}
