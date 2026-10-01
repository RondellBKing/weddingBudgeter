import "server-only";
import { requireSession } from "../auth/require-session";
import { daysBetween, formatDate, formatInstant, fromDbDate, todayIn } from "../dates";
import { prisma } from "../db";
import { planningChapters, journeyStats, type JourneyEntry } from "../domain/planning";
import { EVENT_TYPE_LABEL, OWNER_LABEL, TASK_AREA_LABEL } from "../labels";
import { loadPlan } from "./plan";

/** "Wedding party · The Estate", each name once ("Wedding party" is both an area and an owner). */
function unique(parts: Array<string | null | undefined>): string | null {
  const seen = [...new Set(parts.filter((p): p is string => Boolean(p)))];
  return seen.length ? seen.join(" · ") : null;
}

/** Milestone tasks and appointments, from the signed contract to after the wedding. */
export async function loadPlanningTimeline() {
  await requireSession();
  const plan = await loadPlan();
  const { settings, today } = plan;
  const tz = settings.timezone;

  const [milestones, events, trip] = await Promise.all([
    prisma.task.findMany({
      where: { isMilestone: true, dueDate: { not: null } },
      select: { id: true, title: true, notes: true, dueDate: true, status: true, owner: true, area: true, vendor: { select: { name: true } } },
    }),
    prisma.calendarEvent.findMany({ include: { vendor: { select: { name: true } } } }),
    prisma.weddingSettings.findUnique({ where: { id: 1 }, select: { honeymoonDepartOn: true, honeymoonReturnOn: true } }),
  ]);
  const chosen = trip?.honeymoonDepartOn ? await prisma.honeymoonIdea.findFirst({ where: { isChosen: true }, select: { name: true } }) : null;

  const entries: JourneyEntry[] = [
    ...milestones.map(
      (t): JourneyEntry => ({
        id: `task:${t.id}`,
        kind: "milestone",
        date: fromDbDate(t.dueDate!),
        title: t.title,
        notes: t.notes,
        done: t.status === "DONE",
        href: `/tasks/${t.id}?back=${encodeURIComponent("/planning")}`,
        taskId: t.id,
        meta: unique([TASK_AREA_LABEL[t.area], t.owner === "BOTH" ? null : OWNER_LABEL[t.owner], t.vendor?.name]),
      }),
    ),
    ...events.map(
      (e): JourneyEntry => ({
        id: `event:${e.id}`,
        kind: "appointment",
        date: e.allDayDate ? fromDbDate(e.allDayDate) : todayIn(tz, e.startAt!),
        title: e.title,
        notes: e.notes,
        done: false,
        href: `/calendar/events/${e.id}?back=${encodeURIComponent("/planning")}`,
        time: e.startAt ? formatInstant(e.startAt, tz, { hour: "numeric", minute: "2-digit" }) : null,
        location: e.location,
        meta: unique([EVENT_TYPE_LABEL[e.type], e.vendor?.name]),
      }),
    ),
  ];

  // The honeymoon, once its dates are set.
  if (trip?.honeymoonDepartOn && trip.honeymoonReturnOn) {
    const departOn = fromDbDate(trip.honeymoonDepartOn);
    const returnOn = fromDbDate(trip.honeymoonReturnOn);
    const nights = daysBetween(departOn, returnOn);
    entries.push({
      id: "honeymoon",
      kind: "honeymoon",
      date: departOn,
      title: chosen ? `Leave for the honeymoon: ${chosen.name}` : "Leave for the honeymoon",
      notes: `Home ${formatDate(returnOn, "weekday-long")}, ${nights} ${nights === 1 ? "night" : "nights"} away.`,
      done: false,
      href: "/honeymoon",
    });
  }

  return {
    plan,
    chapters: planningChapters(entries, settings.weddingDate, today),
    stats: journeyStats(entries, today),
  };
}
