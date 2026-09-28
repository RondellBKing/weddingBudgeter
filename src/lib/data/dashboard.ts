import "server-only";
import {
  addDays,
  daysBetween,
  dueState,
  formatInstant,
  fromDbDate,
  monthsAndDaysBetween,
  todayIn,
  toDbDate,
  type CalendarDate,
  type DueState,
} from "../dates";
import { buildAgenda } from "../domain/agenda";
import { prisma } from "../db";
import { sizingRollup, sizingUrgency } from "../domain/party-sizing";
import { coverage } from "../domain/vendors";
import { loadPlan } from "./plan";

export type DashboardTask = {
  id: string;
  title: string;
  dueDate: CalendarDate;
  daysUntil: number;
  state: DueState;
  isMilestone: boolean;
};

export async function loadDashboard() {
  const plan = await loadPlan();
  const { today, settings } = plan;
  const weekAhead = addDays(today, 7);

  const [dueSoon, nextTask, taskCounts, party, guestCount, seatedCount, agendaTasks, events, vendors] = await Promise.all([
    prisma.task.findMany({
      where: { status: { not: "DONE" }, dueDate: { lte: toDbDate(weekAhead) } },
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
      take: 8,
    }),
    prisma.task.findFirst({
      where: { status: { not: "DONE" }, dueDate: { gt: toDbDate(weekAhead) } },
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
    }),
    prisma.task.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.weddingPartyMember.findMany({
      select: {
        id: true,
        role: true,
        outfitType: true,
        sortOrder: true,
        askedOn: true,
        acceptedOn: true,
        chosenStyleId: true,
        sizingSubmittedOn: true,
        orderedOn: true,
        arrivedOn: true,
        alteredOn: true,
        readyOn: true,
      },
    }),
    prisma.guest.count({ where: { OR: [{ rsvpStatus: null }, { rsvpStatus: { not: "DECLINED" } }] } }),
    prisma.seatAssignment.count({ where: { guest: { OR: [{ rsvpStatus: null }, { rsvpStatus: { not: "DECLINED" } }] } } }),
    prisma.task.findMany({
      where: { status: { not: "DONE" }, dueDate: { lte: toDbDate(addDays(today, 120)) } },
      select: { id: true, title: true, dueDate: true, isMilestone: true },
    }),
    prisma.calendarEvent.findMany({
      where: {
        OR: [
          { allDayDate: { gte: toDbDate(today), lte: toDbDate(addDays(today, 120)) } },
          { startAt: { gte: toDbDate(today), lte: toDbDate(addDays(today, 121)) } },
        ],
      },
      include: { vendor: { select: { name: true } } },
    }),
    prisma.vendor.findMany({ select: { name: true, category: true, alsoCovers: true, status: true } }),
  ]);

  const toTask = (t: (typeof dueSoon)[number]): DashboardTask => {
    const due = fromDbDate(t.dueDate!);
    return {
      id: t.id,
      title: t.title,
      dueDate: due,
      daysUntil: daysBetween(today, due),
      state: dueState(due, today, 7),
      isMilestone: t.isMilestone,
    };
  };

  const totalTasks = taskCounts.reduce((s, g) => s + g._count._all, 0);
  const doneTasks = taskCounts.find((g) => g.status === "DONE")?._count._all ?? 0;
  const dressWearers = party.filter((m) => m.outfitType === "DRESS");
  const rollup = sizingRollup(
    party.map((m) => ({
      ...m,
      askedOn: fromDbDate(m.askedOn),
      acceptedOn: fromDbDate(m.acceptedOn),
      sizingSubmittedOn: fromDbDate(m.sizingSubmittedOn),
      orderedOn: fromDbDate(m.orderedOn),
      arrivedOn: fromDbDate(m.arrivedOn),
      alteredOn: fromDbDate(m.alteredOn),
      readyOn: fromDbDate(m.readyOn),
    })),
  );

  const vendorFor = new Map(plan.items.map((i) => [i.id, i.vendorName ?? i.description]));
  const agenda = buildAgenda(
    {
      payments: plan.nextPayments.map((p) => ({
        id: p.payment.id,
        dueDate: p.payment.dueDate,
        paidDate: null,
        title: vendorFor.get(p.item.id) ?? "Payment",
        detail: p.payment.sequence ? `Payment ${p.payment.sequence} of ${p.item.payments.length}` : "Payment",
        amountCents: p.amountCents,
      })),
      tasks: agendaTasks.map((t) => ({
        id: t.id,
        dueDate: fromDbDate(t.dueDate),
        title: t.title,
        isMilestone: t.isMilestone,
        done: false,
      })),
      events: events.map((e) => ({
        id: e.id,
        // An appointment's day is its date in the wedding's time zone.
        date: e.allDayDate ? fromDbDate(e.allDayDate) : todayIn(settings.timezone, e.startAt!),
        title: e.title,
        time: e.startAt ? formatInstant(e.startAt, settings.timezone, { hour: "numeric", minute: "2-digit" }) : undefined,
        detail: e.location ?? undefined,
      })),
    },
    today,
    { until: addDays(today, 120) },
  ).slice(0, 7);

  // Appointments in the next 30 days, in New York time.
  const appointments = events
    .map((e) => ({
      id: e.id,
      title: e.title,
      date: e.allDayDate ? fromDbDate(e.allDayDate) : todayIn(settings.timezone, e.startAt!),
      time: e.startAt ? formatInstant(e.startAt, settings.timezone, { hour: "numeric", minute: "2-digit" }) : null,
      location: e.location,
      vendorName: e.vendor?.name ?? null,
    }))
    .filter((e) => daysBetween(today, e.date) >= 0 && daysBetween(today, e.date) <= 30)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.time ?? "").localeCompare(b.time ?? "")));

  const statusCounts = { BOOKED: 0, QUOTED: 0, CONTACTED: 0, RESEARCHING: 0 } as Record<string, number>;
  for (const v of vendors) if (v.status in statusCounts) statusCounts[v.status]!++;
  const cover = coverage(vendors);

  return {
    plan,
    agenda,
    appointments,
    vendorStatus: statusCounts,
    stillNeeded: cover.filter((c) => c.booked.length === 0).map((c) => c.label),
    categoriesBooked: cover.filter((c) => c.booked.length > 0).length,
    categoriesTotal: cover.length,
    overduePayments: plan.nextPayments.filter((p) => p.state === "overdue"),
    daysToGo: daysBetween(today, settings.weddingDate),
    untilWedding: monthsAndDaysBetween(today, settings.weddingDate),
    tasksDueSoon: dueSoon.filter((t) => t.dueDate).map(toTask),
    nextTask: nextTask?.dueDate ? toTask(nextTask) : null,
    tasks: { done: doneTasks, total: totalTasks },
    sizing: {
      deadline: settings.dressSizingDeadline,
      ...sizingUrgency(settings.dressSizingDeadline, today, rollup.dresses.length + rollup.suits.length),
      dressWearers: dressWearers.length,
      // Same rule as the Wedding Party page: still owes a style or sizes, and not ordered yet.
      notSubmitted: rollup.dresses.length,
      suitsOutstanding: rollup.suits.length,
    },
    attire: { ready: party.filter((m) => m.readyOn).length, total: party.length },
    seating: { seated: seatedCount, total: guestCount },
    overageDue: plan.items.flatMap((i) => i.payments).find((p) => p.amountRule === "HEADCOUNT_OVERAGE")?.dueDate ?? null,
  };
}
