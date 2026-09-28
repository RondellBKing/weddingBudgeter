// Demo data. Every row has isDemo = true and can be removed with `npm run demo:wipe`.
// Never run against production: demo guests would move the real headcount and overage payment.

import { addDays, todayIn, toDbDate } from "../../src/lib/dates";
import type { Prisma } from "../../src/generated/prisma/client";
import type { Db } from "../../src/lib/db-client";

const FIRST = ["Ava", "Marcus", "Jada", "Terrence", "Nia", "Andre", "Simone", "Darius", "Imani", "Malik", "Zoe", "Elijah", "Kendra", "Isaiah", "Brianna", "Jerome", "Tiana", "Xavier", "Monique", "Caleb"];
const LAST = ["Rivera", "Brooks", "Coleman", "Hayes", "Price", "Bennett", "Ward", "Foster", "Graham", "Sanders", "Ellis", "Porter", "Hudson", "Warren", "Fleming", "Carver", "Lawson", "Whitaker", "Monroe", "Sutton", "Holloway", "Pryor", "Baptiste", "Okafor", "Mensah", "Delgado", "Castillo", "Moreau", "Kimura", "Novak", "Duarte", "Ferreira", "Lindqvist", "Adeyemi", "Achebe", "Vance", "Gordon", "Tate", "Quinn", "Reyes"];

export async function seedDemo(db: Db) {
  const today = todayIn();

  await db.vendor.createMany({
    data: [
      { name: "Demo: Lumen Photography", category: "PHOTOGRAPHY", status: "QUOTED", quotedCents: 620_000, isDemo: true, notes: "Sample vendor." },
      { name: "Demo: Petal & Stem Florals", category: "FLORAL", status: "CONTACTED", isDemo: true, notes: "Sample vendor." },
      { name: "Demo: Northside Sound", category: "MUSIC_DJ", status: "RESEARCHING", isDemo: true, notes: "Sample vendor." },
    ],
  });

  await db.calendarEvent.createMany({
    data: [
      {
        title: "Demo: Florist consultation",
        type: "MEETING",
        startAt: new Date(`${addDays(today, 9)}T18:00:00Z`),
        endAt: new Date(`${addDays(today, 9)}T19:00:00Z`),
        location: "River Vale, NJ",
        isDemo: true,
      },
      { title: "Demo: Dress shopping day", type: "APPOINTMENT", allDayDate: toDbDate(addDays(today, 20)), isDemo: true },
    ],
  });

  // 136 guests in households of 1–4; 6 decline, so 130 are still coming.
  const guests: Prisma.GuestCreateManyInput[] = [];
  let n = 0;
  let household = 0;
  while (guests.length < 136) {
    const last = LAST[household % LAST.length];
    const size = [2, 2, 1, 4, 2, 3, 2, 1][household % 8];
    const householdName = `The ${last} ${size > 2 ? "Family" : "Household"} ${household + 1}`;
    const side = household % 3 === 0 ? "GROOM_SIDE" : household % 3 === 1 ? "BRIDE_SIDE" : "BOTH";
    for (let k = 0; k < size && guests.length < 136; k++) {
      const fullName = `${FIRST[n % FIRST.length]} ${last}`;
      guests.push({
        fullName,
        householdName,
        side,
        relationship: household % 4 === 0 ? "FAMILY" : "FRIEND",
        isChild: size === 4 && k >= 2,
        rsvpStatus: guests.length % 23 === 5 ? "DECLINED" : guests.length % 3 === 0 ? "ATTENDING" : "PENDING",
        matchKey: `${fullName}|${householdName}`.toLowerCase(),
        isDemo: true,
      });
      n++;
    }
    household++;
  }
  await db.guest.createMany({ data: guests });

  return { vendors: 3, events: 2, guests: guests.length };
}

export async function wipeDemo(db: Db) {
  return db.$transaction(async (tx) => {
    const payments = await tx.payment.deleteMany({ where: { isDemo: true } });
    const items = await tx.budgetItem.deleteMany({ where: { isDemo: true } });
    const decisions = await tx.decision.deleteMany({ where: { isDemo: true } });
    const tasks = await tx.task.deleteMany({ where: { isDemo: true } });
    const events = await tx.calendarEvent.deleteMany({ where: { isDemo: true } });
    const guests = await tx.guest.deleteMany({ where: { isDemo: true } });
    const tables = await tx.seatingTable.deleteMany({ where: { isDemo: true } });
    const vendors = await tx.vendor.deleteMany({ where: { isDemo: true } });
    return {
      payments: payments.count,
      budgetItems: items.count,
      decisions: decisions.count,
      tasks: tasks.count,
      events: events.count,
      guests: guests.count,
      seatingTables: tables.count,
      vendors: vendors.count,
    };
  });
}
