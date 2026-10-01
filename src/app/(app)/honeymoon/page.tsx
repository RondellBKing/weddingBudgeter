import Link from "next/link";
import { AddIdeaForm, IdeaCard, TripDatesForm } from "@/components/honeymoon/Honeymoon";
import { TaskCheck } from "@/components/tasks/TaskCheck";
import { buttonClass } from "@/components/ui/Button";
import { Card, CardHeading } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Sprig } from "@/components/ui/Ornaments";
import { PageTitle, SectionTitle } from "@/components/ui/PageTitle";
import { requireSession } from "@/lib/auth/require-session";
import { loadHoneymoon } from "@/lib/data/honeymoon";
import { addDays, daysBetween, formatDate, relativeDays, type CalendarDate } from "@/lib/dates";
import { SUGGESTED_NIGHTS } from "@/lib/domain/honeymoon";
import { addIdea, chooseIdea, deleteIdea, saveIdea, saveTripDates, setIdeaFavorite, takeSuggestedDates } from "./actions";

export const metadata = { title: "Honeymoon" };

const dayName = (d: CalendarDate) => formatDate(d, "weekday-long").split(",")[0];
const NIGHT_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen"];
const nightsWord = (n: number) => `${NIGHT_WORDS[n] ?? n} ${n === 1 ? "night" : "nights"}`;
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default async function HoneymoonPage() {
  await requireSession();
  const { plan, trip, suggestion, passportUntil, groups, favorites, tasks } = await loadHoneymoon();
  const { settings, today } = plan;
  const hasDates = trip.departOn !== null && trip.returnOn !== null;

  return (
    <div className="grid gap-8 sm:gap-10">
      <PageTitle word="Honeymoon" eyebrow="After the wedding" intro="Where we go, when we leave, and what to book before we do." />

      {/* The trip at a glance */}
      <Card framed as="section" aria-label="The trip" className="overflow-hidden px-6 py-8 sm:px-10 sm:py-10">
        <Sprig flip="x" className="pointer-events-none absolute -top-3 -right-8 w-40 opacity-70 sm:w-52" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-12">
          <div className="grid content-start gap-4">
            <h2 className="label-caps text-rose-ink">The dates</h2>
            {hasDates ? (
              <>
                <p className="font-display text-[34px] leading-tight sm:text-[42px]">
                  {formatDate(trip.departOn!, "month-day-long")} <em className="text-cocoa italic">to</em> {formatDate(trip.returnOn!, "month-day-long")}
                </p>
                <p className="text-[15px] text-cocoa">
                  Leave {dayName(trip.departOn!)}, home {dayName(trip.returnOn!)}: {nightsWord(trip.nights!)}.{" "}
                  <span className="num text-muted">{relativeDays(daysBetween(today, trip.departOn!))}.</span>
                </p>
                <details className="group">
                  <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-[13px] text-rose-ink hover:text-chocolate [&::-webkit-details-marker]:hidden">
                    Change the dates
                    <Icon name="arrow" size={13} className="rotate-90 transition-transform group-open:-rotate-90" />
                  </summary>
                  <div className="mt-4">
                    <TripDatesForm action={saveTripDates} departOn={trip.departOn} returnOn={trip.returnOn} />
                  </div>
                </details>
              </>
            ) : (
              <>
                <p className="font-display text-[30px] leading-tight sm:text-[36px]">
                  Our suggestion: {dayName(suggestion.departOn)}, {formatDate(suggestion.departOn, "month-day-long")}{" "}
                  <em className="text-cocoa italic">to</em> {dayName(suggestion.returnOn)}, {formatDate(suggestion.returnOn, "month-day-long")}
                </p>
                <ul className="grid max-w-prose gap-1.5 text-[14px] leading-relaxed text-cocoa">
                  <li>
                    Two nights after the wedding, so {dayName(addDays(settings.weddingDate, 1))} is free for the day-after brunch, opening cards and packing.
                  </li>
                  <li>{capitalize(nightsWord(SUGGESTED_NIGHTS))} away, home on a {dayName(suggestion.returnOn)}.</li>
                  <li>It&apos;s Easter weekend, one of the busiest times to fly, so book the flights the day they open.</li>
                </ul>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <form action={takeSuggestedDates}>
                    <button type="submit" className={buttonClass("primary", "sm")}>
                      Use these dates
                    </button>
                  </form>
                  <details className="group basis-full">
                    <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-[13px] text-rose-ink hover:text-chocolate [&::-webkit-details-marker]:hidden">
                      Or pick our own
                      <Icon name="arrow" size={13} className="rotate-90 transition-transform group-open:-rotate-90" />
                    </summary>
                    <div className="mt-4">
                      <TripDatesForm action={saveTripDates} departOn={null} returnOn={null} />
                    </div>
                  </details>
                </div>
              </>
            )}
          </div>

          <div className="grid content-start gap-4 border-t border-rule pt-7 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
            <h2 className="label-caps text-rose-ink">The destination</h2>
            {trip.chosen ? (
              <>
                <p className="font-display text-[34px] leading-tight sm:text-[42px]">{trip.chosen.name}</p>
                {trip.chosen.place ? <p className="text-[15px] text-cocoa">{trip.chosen.place}</p> : null}
              </>
            ) : (
              <>
                <p className="font-display text-[30px] leading-tight italic sm:text-[36px]">Still deciding</p>
                <p className="max-w-prose text-[14px] leading-relaxed text-cocoa">
                  {favorites === 0
                    ? "Star the places you like on the shortlist below, then choose one."
                    : `${favorites} ${favorites === 1 ? "favorite" : "favorites"} on the shortlist so far. Choose one when you've decided.`}
                </p>
              </>
            )}
            <p className="max-w-prose border-t border-rule pt-4 text-[13px] leading-relaxed text-muted">
              {passportUntil
                ? `Passports: valid until at least ${formatDate(passportUntil, "long")}, six months past the trip. `
                : "Passports: most countries want six months left after you travel. "}
              Book tickets in the names on your passports today; if either of you changes names, update the passport after the trip.
            </p>
          </div>
        </div>
      </Card>

      {/* The shortlist */}
      <section aria-labelledby="ideas-h" className="grid gap-6">
        <div className="grid gap-2">
          <SectionTitle id="ideas-h" eyebrow="The shortlist" lead="Where" word="to go" />
          <p className="max-w-3xl text-[15px] leading-relaxed text-cocoa">
            Places at their best in mid-April, for leaving soon after a Thursday wedding. Star the ones you like, add your own, and choose one when
            you&apos;ve decided.
          </p>
        </div>
        {groups.map((g) => (
          <div key={g.key} className="grid gap-4">
            <h3 className="label-caps">{g.title}</h3>
            <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {g.ideas.map((idea) => (
                <li key={idea.id} className="grid">
                  <IdeaCard
                    idea={idea}
                    favorite={setIdeaFavorite.bind(null, idea.id, !idea.isFavorite)}
                    choose={chooseIdea.bind(null, idea.isChosen ? null : idea.id)}
                    save={saveIdea.bind(null, idea.id)}
                    remove={deleteIdea.bind(null, idea.id)}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
        <AddIdeaForm action={addIdea} />
      </section>

      {/* What to book, and when */}
      <Card className="grid gap-4 p-6 sm:p-8" aria-labelledby="hm-tasks-h">
        <CardHeading
          id="hm-tasks-h"
          title="What to book, and when"
          action={
            <Link href="/tasks?area=HONEYMOON" className="inline-flex items-center gap-1.5 text-[13px] text-rose-ink hover:text-chocolate">
              On the task list
              <Icon name="arrow" size={14} />
            </Link>
          }
        />
        {tasks.length > 0 ? (
          <ul className="grid">
            {tasks.map((t) => {
              const days = t.dueDate ? daysBetween(today, t.dueDate) : null;
              const late = !t.done && days !== null && days < 0;
              return (
                <li key={t.id} className="flex gap-2.5 border-b border-rule py-3 first:pt-0 last:border-b-0 last:pb-0">
                  <span className="-mt-1 -ml-1">
                    <TaskCheck id={t.id} done={t.done} title={t.title} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <Link
                      href={`/tasks/${t.id}?back=${encodeURIComponent("/honeymoon")}`}
                      className={`block text-[15px] leading-snug hover:text-rose-ink ${t.done ? "text-muted line-through decoration-rule-strong" : ""}`}
                    >
                      {t.title}
                    </Link>
                    {t.isMilestone ? <span className="text-[10px] font-semibold tracking-[0.12em] text-gold-ink uppercase">Milestone</span> : null}
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="num block text-sm text-cocoa">{t.dueDate ? formatDate(t.dueDate, "medium") : "No date"}</span>
                    {late ? <span className="block text-[10px] font-semibold tracking-[0.1em] text-brick uppercase">{relativeDays(days!)}</span> : null}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">No honeymoon tasks yet.</p>
        )}
      </Card>
    </div>
  );
}

