import "server-only";
import type { EventType } from "@/generated/prisma/enums";
import { requireSession } from "../auth/require-session";
import { formatInstant, fromDbDate, todayIn, type CalendarDate } from "../dates";
import { prisma } from "../db";
import { buildAgenda, paymentDetail } from "../domain/agenda";
import { resolvePaymentAmount } from "../domain/budget";
import { sortByTime } from "../domain/calendar-grid";
import { instantToZoned } from "../domain/zoned-time";
import { buildIcs, feedEvents, tokensMatch, type FeedInput } from "../ics";
import { EVENT_TYPE_LABEL, OWNER_LABEL } from "../labels";
import { queryPlannerDeadlines } from "./planner-deadlines";
import { computePlan, loadPlan } from "./plan";

// The calendar is a union of sources merged at read time: appointments (CalendarEvent),
// payment due dates (unpaid Payment rows), task due dates, and planner deadlines (hotel block
// cutoffs, décor return-by dates). Nothing is copied.

/** The seeded "Wedding day" task. Views that draw the wedding day themselves skip it. */
const WEDDING_TASK_SEED_KEY = "wedding-day";

export type EventInfo = {
  id: string;
  title: string;
  type: EventType;
  typeLabel: string;
  allDay: boolean;
  /** The appointment's day in New York. */
  date: CalendarDate;
  startAt: Date | null;
  endAt: Date | null;
  /** "10:30 AM – 12:00 PM" in New York time, or null for all-day. */
  timeLabel: string | null;
  location: string | null;
  vendorId: string | null;
  vendorName: string | null;
  notes: string | null;
};

type EventRecord = {
  id: string;
  title: string;
  type: EventType;
  startAt: Date | null;
  endAt: Date | null;
  allDayDate: Date | null;
  location: string | null;
  vendorId: string | null;
  notes: string | null;
  vendor: { name: string } | null;
};

function eventInfo(e: EventRecord, timeZone: string): EventInfo {
  const clock = (d: Date) => formatInstant(d, timeZone, { hour: "numeric", minute: "2-digit" });
  const timeLabel = e.startAt ? (e.endAt ? `${clock(e.startAt)} – ${clock(e.endAt)}` : clock(e.startAt)) : null;
  return {
    id: e.id,
    title: e.title,
    type: e.type,
    typeLabel: EVENT_TYPE_LABEL[e.type],
    allDay: e.startAt === null,
    date: e.allDayDate ? fromDbDate(e.allDayDate) : todayIn(timeZone, e.startAt!),
    startAt: e.startAt,
    endAt: e.endAt,
    timeLabel,
    location: e.location,
    vendorId: e.vendorId,
    vendorName: e.vendor?.name ?? null,
    notes: e.notes,
  };
}

export type CalendarData = Awaited<ReturnType<typeof loadCalendar>>;

/**
 * Everything the calendar views need. `items` includes done tasks and past appointments (the
 * month view shows them quietly); the agenda filters them out. Payments are unpaid only.
 */
export async function loadCalendar() {
  await requireSession();
  const plan = await loadPlan();
  const { settings, today } = plan;
  const [tasks, eventRows, deadlines] = await Promise.all([
    prisma.task.findMany({
      where: { dueDate: { not: null } },
      select: { id: true, title: true, dueDate: true, isMilestone: true, status: true, seedKey: true, vendor: { select: { name: true } } },
    }),
    prisma.calendarEvent.findMany({ include: { vendor: { select: { name: true } } } }),
    queryPlannerDeadlines(today),
  ]);

  const events = new Map(eventRows.map((e) => [`event:${e.id}`, eventInfo(e, settings.timezone)]));
  const ctx = { headcountOverageCents: plan.headroom.overageCents };

  const items = buildAgenda(
    {
      payments: plan.items.flatMap((item) =>
        item.payments
          .filter((p) => p.paidDate === null)
          .map((p) => ({
            id: p.id,
            dueDate: p.dueDate,
            paidDate: p.paidDate,
            title: item.vendorName ?? item.description,
            detail: paymentDetail(p, item.payments.length),
            amountCents: resolvePaymentAmount(p, ctx),
          })),
      ),
      tasks: tasks.map((t) => ({
        id: t.id,
        dueDate: fromDbDate(t.dueDate),
        title: t.title,
        isMilestone: t.isMilestone,
        done: t.status === "DONE",
        detail: t.vendor?.name ?? undefined,
      })),
      events: [...events.values()].map((e) => ({
        id: e.id,
        date: e.date,
        title: e.title,
        time: e.timeLabel ?? undefined,
        detail: [e.typeLabel, e.location].filter(Boolean).join(" · "),
      })),
      deadlines,
    },
    today,
    { includeDone: true },
  );

  const startOf = (id: string) => events.get(id)?.startAt?.getTime() ?? null;
  const weddingTaskIds = new Set(tasks.filter((t) => t.seedKey === WEDDING_TASK_SEED_KEY).map((t) => `task:${t.id}`));

  return {
    plan,
    today,
    weddingDate: settings.weddingDate,
    items: sortByTime(items, startOf),
    events,
    weddingTaskIds,
  };
}

/** Vendors for the appointment form's select. */
export async function loadEventOptions(): Promise<{ vendors: Array<{ value: string; label: string }> }> {
  await requireSession();
  const vendors = await prisma.vendor.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return { vendors: vendors.map((v) => ({ value: v.id, label: v.name })) };
}

/** One appointment for the edit page, with its New York date and times for the form. */
export async function loadEvent(id: string) {
  await requireSession();
  const plan = await loadPlan();
  const e = await prisma.calendarEvent.findUnique({ where: { id }, include: { vendor: { select: { name: true } } } });
  if (!e) return null;
  const tz = plan.settings.timezone;
  return {
    ...eventInfo(e, tz),
    startTime: e.startAt ? instantToZoned(e.startAt, tz).time : "",
    endTime: e.endAt ? instantToZoned(e.endAt, tz).time : "",
  };
}

/** The secret part of the calendar feed URL (changes on "Log out everywhere"). */
export async function loadFeedToken(): Promise<string> {
  await requireSession();
  const state = await prisma.authState.findUnique({ where: { id: 1 }, select: { icsToken: true } });
  if (!state) throw new Error("AuthState is missing. Run `npm run seed`.");
  return state.icsToken;
}

/**
 * The .ics feed. Phone calendar apps can't sign in, so this is the one data function that
 * doesn't call requireSession(): the secret token in the URL is the credential, checked here
 * in constant time before anything is read. Returns null when the token doesn't match.
 *
 * It can't use loadPlan() (that requires a session), so it recomputes the one derived number
 * it needs, the headcount overage, with the same domain functions loadPlan uses.
 */
export async function loadCalendarFeed(token: string, opts: { includeAmounts: boolean; now?: Date }): Promise<string | null> {
  const state = await prisma.authState.findUnique({ where: { id: 1 }, select: { icsToken: true } });
  if (!state || !tokensMatch(token, state.icsToken)) return null;

  // The same plan every page uses, so amounts in the feed never drift from the app.
  let plan: Awaited<ReturnType<typeof computePlan>>;
  try {
    plan = await computePlan();
  } catch {
    return null;
  }
  const s = plan.settings;
  const ctx = { headcountOverageCents: plan.headroom.overageCents };

  const [tasks, events, deadlines] = await Promise.all([
    prisma.task.findMany({ where: { status: { not: "DONE" }, dueDate: { not: null } }, orderBy: [{ dueDate: "asc" }, { title: "asc" }] }),
    prisma.calendarEvent.findMany({ include: { vendor: { select: { name: true } } }, orderBy: [{ allDayDate: "asc" }, { startAt: "asc" }] }),
    queryPlannerDeadlines(plan.today),
  ]);

  const input: FeedInput = {
    couple: `${s.partnerOneName} & ${s.partnerTwoName}`,
    weddingDate: s.weddingDate,
    ceremonyTime: s.ceremonyTime,
    venue: { name: s.venueName, address: s.venueAddress },
    payments: plan.items.flatMap((item) =>
      item.payments
        .filter((p) => p.paidDate === null)
        .map((p) => ({
          id: p.id,
          dueDate: p.dueDate,
          title: item.vendorName ?? item.description,
          detail: paymentDetail(p, item.payments.length),
          amountCents: resolvePaymentAmount(p, ctx),
          isEstimate: p.isEstimate || p.amountRule !== null,
        })),
    ),
    tasks: tasks.map((t) => ({
      id: t.id,
      dueDate: fromDbDate(t.dueDate!),
      title: t.title,
      notes: t.notes,
      isMilestone: t.isMilestone,
      ownerLabel: OWNER_LABEL[t.owner],
      isWeddingMarker: t.seedKey === WEDDING_TASK_SEED_KEY,
      updatedAt: t.updatedAt,
    })),
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      typeLabel: EVENT_TYPE_LABEL[e.type],
      allDayDate: fromDbDate(e.allDayDate),
      startAt: e.startAt,
      endAt: e.endAt,
      location: e.location,
      vendorName: e.vendor?.name ?? null,
      notes: e.notes,
      updatedAt: e.updatedAt,
    })),
    deadlines: deadlines.filter((d) => !d.done).map((d) => ({ id: d.id, date: d.date, title: d.title, detail: d.detail ?? null })),
  };

  return buildIcs({
    name: "Wedding HQ",
    timezone: s.timezone,
    now: opts.now ?? new Date(),
    events: feedEvents(input, { includeAmounts: opts.includeAmounts }),
  });
}
