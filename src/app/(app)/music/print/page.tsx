import Link from "next/link";
import { PrintButton } from "@/components/ui/PrintButton";
import { Icon } from "@/components/ui/Icon";
import type { MusicMoment } from "@/generated/prisma/enums";
import { requireSession } from "@/lib/auth/require-session";
import { loadMusic, type SongView } from "@/lib/data/music";
import { loadPlan } from "@/lib/data/plan";
import { formatClockTime, formatDate } from "@/lib/dates";
import { groupByMoment, isKeyMoment, MUSIC_PARTS } from "@/lib/domain/music";
import { MUSIC_MOMENT_LABEL } from "@/lib/labels";
import { printCss } from "@/components/ui/print-css";

export const metadata = { title: "Music for the DJ" };

// Printing hides the app around this page; see printCss.
const PRINT_CSS = printCss("music-print");

function Songs({ songs, empty }: { songs: SongView[]; empty: string }) {
  // Indented past the number column, so it lines up with the song titles around it.
  if (songs.length === 0) return <p className="pl-[1.625rem] text-[13.5px] text-muted italic print:text-[9.5pt]">{empty}</p>;
  return (
    <ol className="grid gap-1.5 print:gap-1">
      {songs.map((s, i) => (
        <li key={s.id} className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-1.5 text-[14px] leading-snug print:text-[10pt]">
          <span className="num text-right text-[12px] text-muted print:text-[8.5pt]">{songs.length > 1 ? `${i + 1}.` : ""}</span>
          <span className="min-w-0 [overflow-wrap:anywhere]">
            <strong className="font-medium">{s.title}</strong>
            {s.artist ? <span className="text-cocoa"> · {s.artist}</span> : null}
            {s.notes ? <span className="block text-[12px] text-muted print:text-[8.5pt]">{s.notes}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

function MomentLine({ moment, songs }: { moment: MusicMoment; songs: SongView[] }) {
  return (
    <li className="print-hair grid gap-1.5 border-b border-rule py-3 break-inside-avoid last:border-b-0 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6 print:grid-cols-[1.9in_minmax(0,1fr)] print:gap-4 print:py-[5pt]">
      <p className="font-display text-[19px] leading-tight print:text-[11.5pt]">{MUSIC_MOMENT_LABEL[moment]}</p>
      <Songs songs={songs} empty={isKeyMoment(moment) ? "Not chosen yet" : "Your choice"} />
    </li>
  );
}

export default async function MusicPrintPage() {
  await requireSession();
  const [{ songs, processional }, { settings, today }] = await Promise.all([loadMusic(), loadPlan()]);
  const byMoment = groupByMoment(songs);

  return (
    <div className="music-print grid gap-8 print:gap-6">
      <style>{PRINT_CSS}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/music" className="inline-flex items-center gap-1.5 text-[13px] text-rose-ink hover:text-chocolate">
          <Icon name="arrow" size={14} className="rotate-180" />
          Back to the music
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-[13px] text-muted sm:inline">Letter, portrait. Ceremony, processional, reception, then the two lists.</span>
          <PrintButton />
        </div>
      </div>

      <article className="grid gap-10 rounded-[3px] border border-rule bg-paper px-5 py-8 shadow-[0_1px_2px_rgba(62,43,34,0.04),0_8px_24px_-16px_rgba(62,43,34,0.18)] sm:px-10 sm:py-12 print:gap-6 print:border-0 print:bg-white print:p-0">
        <header className="print-rule grid justify-items-center gap-2 border-b border-rule pb-7 text-center print:pb-4">
          <p className="label-caps text-rose-ink">Music for the DJ and musicians</p>
          <h1 className="text-[40px] leading-none sm:text-[52px] print:text-[26pt]">
            {settings.partnerOneName} <em className="italic">&amp;</em> {settings.partnerTwoName}
          </h1>
          <p className="text-[13px] tracking-[0.18em] text-cocoa uppercase print:text-[9pt]">
            {formatDate(settings.weddingDate, "weekday-long")}
            {settings.ceremonyTime ? ` · Ceremony ${formatClockTime(settings.ceremonyTime)}` : ""} · {settings.venueName}
          </p>
          <p className="num text-[13px] text-muted print:text-[9pt]">Printed {formatDate(today, "medium")}</p>
        </header>

        {MUSIC_PARTS.map((part) => (
          <section key={part.key} aria-labelledby={`print-${part.key}`} className="grid gap-3">
            <h2 id={`print-${part.key}`} className="text-[28px] leading-tight break-after-avoid print:text-[16pt]">
              {part.lead} <em className="italic">{part.word}</em>
            </h2>
            <ol className="print-rule grid border-t border-rule-strong">
              {part.moments.map((m) => (
                <MomentLine key={m} moment={m} songs={byMoment.get(m) ?? []} />
              ))}
            </ol>

            {part.key === "ceremony" ? (
              <section aria-labelledby="print-processional" className="mt-5 grid gap-3 break-inside-avoid print:mt-3">
                <h3 id="print-processional" className="text-[22px] leading-tight print:text-[13pt]">
                  Processional <em className="italic">order</em>
                </h3>
                {processional.length === 0 ? (
                  <p className="text-[13.5px] text-muted italic print:text-[9.5pt]">Not set yet.</p>
                ) : (
                  <ol className="print-rule grid border-t border-rule-strong">
                    {processional.map((p, i) => (
                      <li
                        key={p.id}
                        className="print-hair grid grid-cols-[2rem_minmax(0,1fr)] items-baseline gap-x-3 border-b border-rule py-2 last:border-b-0 print:grid-cols-[0.35in_minmax(0,1fr)] print:py-[3pt]"
                      >
                        <span className="num text-right font-display text-[19px] leading-none text-rose-ink print:text-[11pt]">{i + 1}</span>
                        <span className="min-w-0 text-[14px] [overflow-wrap:anywhere] print:text-[10pt]">
                          {p.walkers}
                          {p.notes ? <span className="block text-[12px] text-muted print:text-[8.5pt]">{p.notes}</span> : null}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            ) : null}
          </section>
        ))}

        <div className="grid gap-8 sm:grid-cols-2 print:grid-cols-2 print:gap-6">
          {(["MUST_PLAY", "DO_NOT_PLAY"] as const).map((m) => (
            <section key={m} aria-labelledby={`print-${m}`} className="grid content-start gap-3 break-inside-avoid">
              <h2 id={`print-${m}`} className="text-[28px] leading-tight print:text-[16pt]">
                {m === "MUST_PLAY" ? "Must" : "Do not"} <em className="italic">play</em>
              </h2>
              <div className="print-rule border-t border-rule-strong pt-3">
                <Songs songs={byMoment.get(m) ?? []} empty="Nothing on this list." />
              </div>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
