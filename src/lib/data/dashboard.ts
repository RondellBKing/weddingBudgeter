import "server-only";
import { addDays, daysBetween, dueState, fromDbDate, toDbDate, type CalendarDate, type DueState } from "../dates";
import { prisma } from "../db";
import { deadlineUrgency } from "../domain/deadlines";
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

  const [dueSoon, nextTask, taskCounts, party, guestCount, seatedCount] = await Promise.all([
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
      select: { outfitType: true, sizingSubmittedOn: true, readyOn: true },
    }),
    prisma.guest.count({ where: { OR: [{ rsvpStatus: null }, { rsvpStatus: { not: "DECLINED" } }] } }),
    prisma.seatAssignment.count({ where: { guest: { OR: [{ rsvpStatus: null }, { rsvpStatus: { not: "DECLINED" } }] } } }),
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

  return {
    plan,
    daysToGo: daysBetween(today, settings.weddingDate),
    tasksDueSoon: dueSoon.filter((t) => t.dueDate).map(toTask),
    nextTask: nextTask?.dueDate ? toTask(nextTask) : null,
    tasks: { done: doneTasks, total: totalTasks },
    sizing: {
      deadline: settings.dressSizingDeadline,
      ...deadlineUrgency(settings.dressSizingDeadline, today),
      dressWearers: dressWearers.length,
      notSubmitted: dressWearers.filter((m) => !m.sizingSubmittedOn).length,
    },
    attire: { ready: party.filter((m) => m.readyOn).length, total: party.length },
    seating: { seated: seatedCount, total: guestCount },
    overageDue: plan.items.flatMap((i) => i.payments).find((p) => p.amountRule === "HEADCOUNT_OVERAGE")?.dueDate ?? null,
  };
}
