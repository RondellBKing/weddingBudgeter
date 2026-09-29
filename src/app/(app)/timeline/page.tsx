import Link from "next/link";
import { TimelineQuickAdd } from "@/components/timeline/QuickAdd";
import { RainPlanCard } from "@/components/timeline/RainPlanCard";
import { RunOfShow } from "@/components/timeline/RunOfShow";
import { RehearsalTemplateCard, WeddingTemplateCard } from "@/components/timeline/TemplateCard";
import { VenueCard } from "@/components/timeline/VenueCard";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageTitle } from "@/components/ui/PageTitle";
import { Tabs } from "@/components/ui/Tabs";
import { requireSession } from "@/lib/auth/require-session";
import { loadTimeline } from "@/lib/data/timeline";
import { addDays, daysBetween, formatClockTime, formatDate, type CalendarDate } from "@/lib/dates";
import {
  afterMidnight,
  daySchedule,
  otherDays,
  parseViewKey,
  scheduleSpan,
  timelineDays,
  timelineHref,
  type ScheduleRow,
} from "@/lib/domain/timeline";
import { buildTimelineTemplate } from "./actions";

export const metadata = { title: "Timeline" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function weekdayOf(date: CalendarDate): string {
  return formatDate(date, "weekday-long").split(",")[0];
}

/** "Thursday, *April 13* 2028" with an eyebrow and a one-line summary. */
function DayHeading({ date, eyebrow, summary, id }: { date: CalendarDate; eyebrow: string; summary?: string | null; id: string }) {
  const [weekday, monthDay, year] = formatDate(date, "weekday-long").split(", ");
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div className="grid gap-1.5">
        <p className="label-caps text-rose-ink">{eyebrow}</p>
        <h2 id={id} className="text-[30px] leading-tight sm:text-[36px]">
          {weekday}, <em className="italic">{monthDay}</em> <span className="num text-[0.7em] text-muted">{year}</span>
        </h2>
      </div>
      {summary ? <p className="num text-[13px] text-cocoa">{summary}</p> : null}
    </header>
  );
}

function summarize(rows: ScheduleRow[], night: ScheduleRow[], nextDate: CalendarDate): string | null {
  const moments = rows.filter((r) => r.source === "item").length + night.length;
  const arrivals = rows.filter((r) => r.source === "vendor").length;
  const span = scheduleSpan(rows, night);
  if (moments === 0) return arrivals > 0 ? `${arrivals} vendor ${arrivals === 1 ? "arrival" : "arrivals"} so far` : null;
  if (!span) return null;
  const parts = [
    `${moments} ${moments === 1 ? "moment" : "moments"}`,
    arrivals > 0 ? `${arrivals} vendor ${arrivals === 1 ? "arrival" : "arrivals"}` : null,
    `${formatClockTime(span.from)} to ${formatClockTime(span.to)}${span.nextDay ? ` ${weekdayOf(nextDate)}` : ""}`,
  ];
  return parts.filter(Boolean).join(" · ");
}

const EMPTY: Record<"rehearsal" | "wedding" | "after", string> = {
  rehearsal: "Nothing on the rehearsal day yet.",
  wedding: "No moments planned yet. The venue opening and vendor arrivals will show here on their own.",
  after: "Nothing planned for the day after yet. A farewell brunch, returning rentals, or collecting gifts and cards from the venue all fit here.",
};

export default async function TimelinePage({ searchParams }: { searchParams: SearchParams }) {
  await requireSession();
  const sp = await searchParams;
  const view = parseViewKey(sp.day);
  const { plan, items, arrivals, rainPlan } = await loadTimeline();
  const { settings } = plan;
  const wedding = settings.weddingDate;
  const days = timelineDays(wedding);
  const others = otherDays(items, wedding);
  const current = view === "other" ? null : days.find((d) => d.key === view)!;

  const tabs = days.map((d) => ({ key: d.key, label: d.tab, href: timelineHref(d.key) }));
  const otherCount = others.reduce((n, g) => n + g.rows.length, 0);

  const addHref = `/timeline/new?date=${current ? current.date : wedding}`;

  return (
    <div className="grid gap-8 sm:gap-10">
      <PageTitle
        word="Timeline"
        eyebrow="Wedding day"
        intro="The run of show for the rehearsal, the wedding day and the day after. Vendor arrivals come straight from each vendor's page."
        actions={
          <>
            <Link href="/timeline/print" className={buttonClass("secondary")}>
              Day-of binder
            </Link>
            <Link href={addHref} className={buttonClass("primary")}>
              Add a moment
            </Link>
          </>
        }
      />

      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-3">
        <Tabs label="Day" current={view} items={tabs} />
        {otherCount > 0 || view === "other" ? (
          // Items dated outside the three days. Kept apart from the day tabs so those fit a phone.
          <Link
            href={timelineHref("other")}
            aria-current={view === "other" ? "page" : undefined}
            className={`rounded-[3px] border px-3.5 py-[7px] text-[12px] font-medium tracking-[0.06em] whitespace-nowrap uppercase transition-colors ${
              view === "other" ? "border-chocolate bg-chocolate text-ivory" : "border-rule-strong bg-paper text-cocoa hover:text-chocolate"
            }`}
          >
            Other days <span className="num">· {otherCount}</span>
          </Link>
        ) : null}
      </div>

      {current ? (
        <DayView
          day={current}
          items={items}
          arrivals={arrivals}
          settings={settings}
          built={sp.built === current.key}
        />
      ) : (
        <OtherDaysView groups={others} wedding={wedding} />
      )}

      <div className="grid items-start gap-5 lg:grid-cols-12">
        <RainPlanCard plan={rainPlan} className="lg:col-span-7" />
        <VenueCard
          className="lg:col-span-5"
          venueName={settings.venueName}
          venueAddress={settings.venueAddress}
          venueAccessTime={settings.venueAccessTime}
          ceremonyTime={settings.ceremonyTime}
          vendors={arrivals}
        />
      </div>
    </div>
  );
}

type LoadedTimeline = Awaited<ReturnType<typeof loadTimeline>>;

function DayView({
  day,
  items,
  arrivals,
  settings,
  built,
}: {
  day: ReturnType<typeof timelineDays>[number];
  items: LoadedTimeline["items"];
  arrivals: LoadedTimeline["arrivals"];
  settings: LoadedTimeline["plan"]["settings"];
  built: boolean;
}) {
  const wedding = settings.weddingDate;
  const common = { items, weddingDate: wedding, vendors: arrivals, venueAccessTime: settings.venueAccessTime, venueName: settings.venueName };
  const rows = daySchedule({ date: day.date, ...common });
  const nextDate = addDays(day.date, 1);
  const night = day.key === "wedding" ? afterMidnight(daySchedule({ date: nextDate, ...common }), settings.venueAccessTime) : [];
  const stored = rows.filter((r) => r.source === "item").length;
  const dayName = `${weekdayOf(day.date)}, ${formatDate(day.date, "month-day")}`;

  return (
    <>
      {stored === 0 && day.key === "wedding" ? (
        <WeddingTemplateCard
          action={buildTimelineTemplate.bind(null, "wedding")}
          ceremonyTime={settings.ceremonyTime}
          venueAccess={formatClockTime(settings.venueAccessTime)}
        />
      ) : null}
      {stored === 0 && day.key === "rehearsal" ? <RehearsalTemplateCard action={buildTimelineTemplate.bind(null, "rehearsal")} /> : null}

      <Card as="section" aria-labelledby="day-h" className="grid gap-6 p-5 sm:p-8">
        <DayHeading id="day-h" date={day.date} eyebrow={day.label} summary={summarize(rows, night, nextDate)} />

        {built && stored > 0 ? (
          <p role="status" className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-y border-rule py-3 text-[14px] text-cocoa">
            <span className="text-[11px] font-semibold tracking-[0.12em] text-garden-ink uppercase">Draft ready</span>
            <span>Tap any line to change it, and delete what you don&apos;t need.</span>
          </p>
        ) : null}

        {rows.length > 0 ? (
          <RunOfShow rows={rows} label={`Run of show for ${dayName}`} highlightTime={day.key === "wedding" ? settings.ceremonyTime : null} />
        ) : (
          <p className="text-[15px] text-cocoa">{EMPTY[day.key]}</p>
        )}

        {night.length > 0 ? (
          <section aria-labelledby="night-h" className="grid gap-2 border-t border-rule-strong pt-5">
            <h3 id="night-h" className="label-caps">
              After midnight · {weekdayOf(nextDate)}, {formatDate(nextDate, "month-day")}
            </h3>
            <RunOfShow rows={night} label="After midnight" compact />
          </section>
        ) : null}

        <div className="rounded-[3px] border border-rule bg-ivory/60 p-4 sm:p-5">
          <TimelineQuickAdd date={day.date} dayName={dayName} />
        </div>
      </Card>
    </>
  );
}

function OtherDaysView({ groups, wedding }: { groups: ReturnType<typeof otherDays>; wedding: CalendarDate }) {
  if (groups.length === 0) {
    return (
      <Card className="px-6 py-10 text-[15px] text-cocoa sm:px-9">
        Nothing on other days. Anything dated outside the rehearsal, the wedding and the day after shows up here.
      </Card>
    );
  }
  return (
    <div className="grid gap-5">
      {groups.map((g) => {
        const offset = daysBetween(wedding, g.date);
        const eyebrow = offset < 0 ? `${-offset} days before the wedding` : `${offset} days after the wedding`;
        const id = `day-${g.date}`;
        return (
          <Card key={g.date} as="section" aria-labelledby={id} className="grid gap-4 p-5 sm:p-8">
            <DayHeading id={id} date={g.date} eyebrow={eyebrow} />
            <RunOfShow rows={g.rows} label={`Run of show for ${formatDate(g.date, "long")}`} />
          </Card>
        );
      })}
    </div>
  );
}
