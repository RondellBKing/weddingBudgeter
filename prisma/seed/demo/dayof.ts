import type { Prisma } from "../../../src/generated/prisma/client";
import { addDays, fromDbDate, toDbDate } from "../../../src/lib/dates";
import type { Db } from "../../../src/lib/db-client";
import { buildRehearsalTemplate, buildWeddingDayTemplate, type TemplateItem } from "../../../src/lib/domain/timeline";

// Sample run of show (isDemo = true): the wedding-day template around a 4:00 PM ceremony with a
// first look, the rehearsal-day template at 5:00 PM, a farewell brunch the day after, and the
// final walkthrough two weeks out (so "Other days" has something to show).
// Vendor arrivals and the venue opening are derived on the page, so they aren't rows here.

function row(i: TemplateItem): Prisma.TimelineItemCreateManyInput {
  return {
    date: toDbDate(i.date),
    startTime: i.startTime,
    endTime: i.endTime,
    title: i.title,
    location: i.location,
    lead: i.lead,
    involves: i.involves,
    notes: i.notes,
    isDemo: true,
  };
}

export async function seedDemoDayOf(db: Db): Promise<Record<string, number>> {
  const s = await db.weddingSettings.findUnique({ where: { id: 1 } });
  if (!s) return {};
  const wedding = fromDbDate(s.weddingDate);
  const items = [
    ...buildRehearsalTemplate({ rehearsalDate: addDays(wedding, -1), rehearsalTime: "17:00", venueName: s.venueName }),
    ...buildWeddingDayTemplate({
      weddingDate: wedding,
      ceremonyTime: "16:00",
      venueAccessTime: s.venueAccessTime,
      venueName: s.venueName,
      firstLook: true,
    }),
  ].map(row);
  items.push({
    date: toDbDate(addDays(wedding, -14)),
    startTime: "11:00",
    endTime: "12:00",
    title: "Final walkthrough at the venue",
    location: s.venueName,
    lead: "Coordinator",
    involves: "The couple and the venue manager",
    notes: "Walk the day in order: layout, timing, deliveries and the rain plan.",
    isDemo: true,
  });
  items.push({
    date: toDbDate(addDays(wedding, 1)),
    startTime: "11:00",
    endTime: "13:00",
    title: "Farewell brunch",
    location: "Hotel restaurant",
    lead: "Hosts",
    involves: "Family and out-of-town guests",
    notes: "Collect gifts, cards and personal items from the venue after.",
    isDemo: true,
  });
  const { count } = await db.timelineItem.createMany({ data: items });
  return { timelineItems: count };
}

/** Runs inside wipeDemo's transaction, before demo guests and vendors are removed. */
export async function wipeDemoDayOf(tx: Prisma.TransactionClient): Promise<Record<string, number>> {
  const { count } = await tx.timelineItem.deleteMany({ where: { isDemo: true } });
  return { timelineItems: count };
}
