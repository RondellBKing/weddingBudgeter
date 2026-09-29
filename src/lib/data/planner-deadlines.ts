import "server-only";
import { compareDates, fromDbDate, type CalendarDate } from "../dates";
import { prisma } from "../db";
import { DECOR_SOURCE_LABEL } from "../labels";

// Dated obligations that live in the planner sections rather than in tasks: hotel block cutoffs
// and the day rented or borrowed décor has to go back. Read at request time, never copied.

export type PlannerDeadline = { id: string; date: CalendarDate; title: string; detail?: string; done: boolean };

/**
 * No session check here: pages reach it through loaders that call requireSession(), and the
 * calendar feed after checking its secret token.
 */
export async function queryPlannerDeadlines(today: CalendarDate): Promise<PlannerDeadline[]> {
  const [hotels, decor] = await Promise.all([
    prisma.hotelBlock.findMany({ where: { cutoffDate: { not: null } }, select: { id: true, name: true, cutoffDate: true } }),
    prisma.decorItem.findMany({
      where: { returnBy: { not: null } },
      select: { id: true, name: true, source: true, returnBy: true, returnedOn: true, vendor: { select: { name: true } } },
    }),
  ]);
  return [
    ...hotels.map((h) => {
      const date = fromDbDate(h.cutoffDate!);
      return {
        id: `hotel-${h.id}`,
        date,
        title: `Hotel block cutoff: ${h.name}`,
        detail: "Last day for the group rate",
        done: compareDates(date, today) < 0,
      };
    }),
    ...decor.map((d) => ({
      id: `decor-${d.id}`,
      date: fromDbDate(d.returnBy!),
      title: `Return ${d.name}`,
      detail: [DECOR_SOURCE_LABEL[d.source], d.vendor?.name].filter(Boolean).join(" · "),
      done: d.returnedOn !== null,
    })),
  ];
}
