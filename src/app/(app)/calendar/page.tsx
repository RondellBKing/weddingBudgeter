import Link from "next/link";
import { headers } from "next/headers";
import { AgendaView } from "@/components/calendar/AgendaView";
import { KIND, KIND_ORDER } from "@/components/calendar/kinds";
import { MonthView } from "@/components/calendar/MonthView";
import { SubscribeCard } from "@/components/calendar/SubscribeCard";
import { TimelineView } from "@/components/calendar/TimelineView";
import { buttonClass } from "@/components/ui/Button";
import { PageTitle } from "@/components/ui/PageTitle";
import { Tabs } from "@/components/ui/Tabs";
import { loadCalendar, loadFeedToken } from "@/lib/data/calendar";
import { parseMonth } from "@/lib/domain/calendar-grid";

export const metadata = { title: "Calendar" };

type View = "agenda" | "month" | "timeline";

/** The feed URL as this browser reaches the app (works locally, on previews and in production). */
async function feedUrl(token: string): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
  const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() || (local ? "http" : "https");
  return `${proto}://${host}/api/calendar/${encodeURIComponent(token)}.ics`;
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const view: View = sp.view === "month" ? "month" : sp.view === "timeline" ? "timeline" : "agenda";
  const [data, token] = await Promise.all([loadCalendar(), loadFeedToken()]);
  const { today, weddingDate, items, events, plan } = data;
  const month = parseMonth(sp.month, today);
  const back = view === "month" ? `/calendar?view=month&month=${month}` : view === "timeline" ? "/calendar?view=timeline" : "/calendar";
  const newHref = `/calendar/new?back=${encodeURIComponent(back)}`;

  return (
    <div className="grid gap-8 sm:gap-10">
      <PageTitle
        word="Calendar"
        eyebrow="Plan"
        intro="Every appointment, payment and deadline between now and the wedding, in one place."
        actions={
          <>
            <Link href={`/tasks/new?back=${encodeURIComponent(back)}`} className={buttonClass("secondary")}>
              New task
            </Link>
            <Link href={newHref} className={buttonClass("primary")}>
              Add appointment
            </Link>
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <Tabs
          label="View"
          current={view}
          items={[
            { key: "agenda", label: "Agenda", href: "/calendar" },
            { key: "month", label: "Month", href: `/calendar?view=month${sp.month ? `&month=${month}` : ""}` },
            { key: "timeline", label: "Timeline", href: "/calendar?view=timeline" },
          ]}
        />
        {view !== "timeline" ? (
          <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Key">
            {KIND_ORDER.map((k) => (
              <li key={k} className="flex items-center gap-2 text-[13px] text-cocoa">
                <span aria-hidden className={`size-2.5 rounded-full ${KIND[k].dot}`} />
                {KIND[k].label}
              </li>
            ))}
          </ul>
        ) : (
          <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Key">
            <li className="flex items-center gap-2 text-[13px] text-cocoa">
              <span aria-hidden className="size-2.5 rotate-45 bg-desert-rose" />
              Milestone
            </li>
            <li className="flex items-center gap-2 text-[13px] text-cocoa">
              <span aria-hidden className="size-2.5 rounded-full bg-gold" />
              Payment
            </li>
            <li className="flex items-center gap-2 text-[13px] text-cocoa">
              <span aria-hidden className="size-2.5 rounded-full border-2 border-brick" />
              Behind
            </li>
          </ul>
        )}
      </div>

      {view === "month" ? (
        <MonthView month={month} items={items} events={events} today={today} weddingDate={weddingDate} />
      ) : view === "timeline" ? (
        <TimelineView
          items={items}
          today={today}
          weddingDate={weddingDate}
          weddingTaskIds={data.weddingTaskIds}
          venue={`${plan.settings.venueName}, ${plan.settings.venueAddress}`}
        />
      ) : (
        <AgendaView items={items} events={events} today={today} weddingDate={weddingDate} back={back} />
      )}

      <SubscribeCard feedUrl={await feedUrl(token)} />
    </div>
  );
}
