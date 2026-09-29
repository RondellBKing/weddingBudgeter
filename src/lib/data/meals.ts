import "server-only";
import { requireSession } from "../auth/require-session";
import { prisma } from "../db";
import { mealTotal, summarizeMeals, vendorMeals, type MealGuest } from "../domain/meals";
import { VENDOR_CATEGORY_LABEL } from "../domain/vendors";
import { loadPlan } from "./plan";

// The meals page and its printout read the same thing: every guest's RSVP, meal and dietary
// note, booked vendors' meals, and the headcount from the plan (reused, never recomputed).

export async function loadMeals() {
  await requireSession();
  const plan = await loadPlan();
  const [rows, vendors] = await Promise.all([
    prisma.guest.findMany({
      select: {
        id: true,
        fullName: true,
        householdName: true,
        isChild: true,
        rsvpStatus: true,
        mealChoice: true,
        dietaryNotes: true,
        seat: { select: { table: { select: { label: true } } } },
      },
      orderBy: [{ householdName: "asc" }, { fullName: "asc" }],
    }),
    prisma.vendor.findMany({
      where: { status: "BOOKED", mealsRequired: { gt: 0 } },
      select: { id: true, name: true, category: true, mealsRequired: true },
    }),
  ]);

  const guests: MealGuest[] = rows.map((g) => ({
    id: g.id,
    fullName: g.fullName,
    householdName: g.householdName,
    isChild: g.isChild,
    rsvpStatus: g.rsvpStatus,
    mealChoice: g.mealChoice,
    dietaryNotes: g.dietaryNotes,
    tableLabel: g.seat?.table.label ?? null,
  }));

  const summary = summarizeMeals(guests);
  const vendorList = vendorMeals(vendors.map((v) => ({ ...v, categoryLabel: VENDOR_CATEGORY_LABEL[v.category] })));
  return {
    plan,
    hasGuestList: guests.length > 0,
    summary,
    vendors: vendorList,
    total: mealTotal(summary, vendorList.total, plan.headcount),
    vendorMealsCounted: plan.settings.vendorMealsCountTowardHeadcount,
  };
}

export type MealsData = Awaited<ReturnType<typeof loadMeals>>;
