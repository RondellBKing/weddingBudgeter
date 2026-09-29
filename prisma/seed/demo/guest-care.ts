import { addDays, cd, fromDbDate, todayIn, toDbDate } from "../../../src/lib/dates";
import type { Prisma } from "../../../src/generated/prisma/client";
import type { Db } from "../../../src/lib/db-client";

// Sample rows for Hotels & Travel, Meals and Gifts (isDemo = true).
// Runs after the demo guests exist, so gifts can link to them and some of them get meal choices
// and dietary notes (as the RSVP app's export would bring). Every hotel, shuttle, bag item and
// gift here is removed by wipeDemoGuestCare; the two sample vendors and the demo guests go with
// the main wipe.

const MEALS = ["Filet mignon", "Chicken francese", "Vegetable risotto"];
const DIETARY = ["Tree-nut allergy", "Kosher for Passover", "Vegetarian", "Gluten-free", "Shellfish allergy", "No pork, please"];

export async function seedDemoGuestCare(db: Db): Promise<Record<string, number>> {
  const today = todayIn();
  const day = (offset: number) => toDbDate(addDays(today, offset));
  const settings = await db.weddingSettings.findUnique({ where: { id: 1 }, select: { weddingDate: true } });
  const wedding = settings ? fromDbDate(settings.weddingDate) : cd("2028-04-13");
  const weddingDay = (offset: number) => toDbDate(addDays(wedding, offset));

  const [coach, inn] = await Promise.all([
    db.vendor.create({
      data: {
        name: "Demo: Valley Coach Co.",
        category: "TRANSPORT",
        status: "BOOKED",
        mealsRequired: 2,
        notes: "Sample vendor. Two drivers stay on site between the evening runs.",
        isDemo: true,
      },
      select: { id: true },
    }),
    db.vendor.create({
      data: { name: "Demo: Pascack Valley Inn", category: "LODGING", status: "BOOKED", notes: "Sample vendor.", isDemo: true },
      select: { id: true },
    }),
  ]);

  const hotels = await db.hotelBlock.createMany({
    data: [
      {
        name: "Pascack Valley Inn",
        address: "100 Sample Road, Montvale, NJ",
        phone: "(201) 555-0188",
        bookingUrl: "https://example.com/groups/florentine-2028",
        groupCode: "FLORENTINE28",
        roomsHeld: 20,
        nightlyRateCents: 18_900,
        cutoffDate: weddingDay(-31),
        checkIn: weddingDay(-1),
        checkOut: weddingDay(1),
        vendorId: inn.id,
        notes: "Sample block. Breakfast included; the shuttle leaves from the front entrance.",
        isDemo: true,
      },
      {
        name: "Garden State Suites",
        address: "25 Example Avenue, Park Ridge, NJ",
        roomsHeld: 10,
        nightlyRateCents: 16_500,
        cutoffDate: day(24),
        checkIn: weddingDay(-1),
        checkOut: weddingDay(1),
        notes: "Sample block with a short cutoff, to show how the countdown looks when it's close.",
        isDemo: true,
      },
    ],
  });

  const venue = "The Estate at Florentine Gardens";
  const shuttles = await db.shuttleRun.createMany({
    data: [
      { date: weddingDay(0), departTime: "16:15", fromPlace: "Pascack Valley Inn", toPlace: venue, seats: 24, vendorId: coach.id, isDemo: true },
      { date: weddingDay(0), departTime: "16:40", fromPlace: "Garden State Suites", toPlace: venue, seats: 14, vendorId: coach.id, isDemo: true },
      { date: weddingDay(0), departTime: "22:30", fromPlace: venue, toPlace: "Pascack Valley Inn", seats: 24, vendorId: coach.id, isDemo: true },
      {
        date: weddingDay(0),
        departTime: "23:30",
        fromPlace: venue,
        toPlace: "Both hotels",
        seats: 24,
        vendorId: coach.id,
        notes: "Last run of the night.",
        isDemo: true,
      },
    ],
  });

  const bagItems = await db.welcomeBagItem.createMany({
    data: [
      { name: "Bottled water", perBag: 2, orderedOn: day(-20), receivedOn: day(-12), sortOrder: 0, isDemo: true },
      { name: "Snacks from a local bakery", perBag: 1, orderedOn: day(-5), sortOrder: 1, isDemo: true },
      { name: "Welcome note and weekend schedule", perBag: 1, notes: "Print once the timeline is final.", sortOrder: 2, isDemo: true },
      { name: "Mints and pain reliever", perBag: 1, sortOrder: 3, isDemo: true },
    ],
  });

  // Meal choices and dietary notes on some demo guests, the way the RSVP app's export brings them.
  const guests = await db.guest.findMany({
    where: { isDemo: true },
    select: { id: true, fullName: true, householdName: true, isChild: true, rsvpStatus: true },
    orderBy: [{ householdName: "asc" }, { fullName: "asc" }, { id: "asc" }],
  });
  const byMeal = new Map<string, string[]>();
  const add = (meal: string, id: string) => byMeal.set(meal, [...(byMeal.get(meal) ?? []), id]);
  guests.forEach((g, i) => {
    // Everyone attending has chosen, and about half of the pending guests.
    if (g.rsvpStatus === "DECLINED" || (g.rsvpStatus !== "ATTENDING" && i % 2 === 0)) return;
    add(g.isChild ? "Kids' plate" : MEALS[i % MEALS.length], g.id);
  });
  let mealChoices = 0;
  for (const [mealChoice, ids] of byMeal) {
    mealChoices += (await db.guest.updateMany({ where: { id: { in: ids } }, data: { mealChoice } })).count;
  }
  const noted = guests.filter((g) => g.rsvpStatus !== "DECLINED").filter((_, i) => i % 17 === 4);
  for (const [i, g] of noted.entries()) {
    await db.guest.update({ where: { id: g.id }, data: { dietaryNotes: DIETARY[i % DIETARY.length] } });
  }

  // Gifts: some thanked, some not, a few linked to demo guests. Engagement gifts, since the
  // wedding is still ahead.
  const [a, b, c, d, e] = guests;
  const gifts: Prisma.GiftCreateManyInput[] = [
    { fromName: a?.fullName ?? "A dear friend", guestId: a?.id, description: "Champagne flutes, for the engagement", receivedOn: day(-45), thankYouSentOn: day(-38), isDemo: true },
    { fromName: b?.householdName ?? "The neighbors", guestId: b?.id, description: "Dutch oven from the registry", receivedOn: day(-30), notes: "Sample gift.", isDemo: true },
    { fromName: c?.fullName ?? "An old friend", guestId: c?.id, description: "Framed print of River Vale", receivedOn: day(-16), thankYouSentOn: day(-9), isDemo: true },
    { fromName: d?.fullName ?? "A cousin", guestId: d?.id, description: "Cookbook with a family recipe card tucked in", receivedOn: day(-10), isDemo: true },
    { fromName: e?.householdName ?? "The family next door", guestId: e?.id, description: "Card with a check", receivedOn: day(-3), isDemo: true },
    { fromName: "The book club", description: "Candle set", receivedOn: day(-1), notes: "Not on the guest list.", isDemo: true },
  ];
  const giftRows = await db.gift.createMany({ data: gifts });

  return {
    guestCareVendors: 2,
    hotelBlocks: hotels.count,
    shuttleRuns: shuttles.count,
    welcomeBagItems: bagItems.count,
    gifts: giftRows.count,
    mealChoices,
    dietaryNotes: noted.length,
  };
}

/** Runs inside wipeDemo's transaction, before demo guests and vendors are removed. */
export async function wipeDemoGuestCare(tx: Prisma.TransactionClient): Promise<Record<string, number>> {
  const gifts = await tx.gift.deleteMany({ where: { isDemo: true } });
  const shuttles = await tx.shuttleRun.deleteMany({ where: { isDemo: true } });
  const hotels = await tx.hotelBlock.deleteMany({ where: { isDemo: true } });
  const bagItems = await tx.welcomeBagItem.deleteMany({ where: { isDemo: true } });
  return { gifts: gifts.count, shuttleRuns: shuttles.count, hotelBlocks: hotels.count, welcomeBagItems: bagItems.count };
}
