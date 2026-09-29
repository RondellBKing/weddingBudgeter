import { describe, expect, it } from "vitest";
import { mealKey, mealTotal, summarizeMeals, vendorMeals, type MealGuest } from "../src/lib/domain/meals";

let n = 0;
function guest(over: Partial<MealGuest>): MealGuest {
  n++;
  return {
    id: `g${n}`,
    fullName: `Guest ${n}`,
    householdName: "The Household",
    isChild: false,
    rsvpStatus: "ATTENDING",
    mealChoice: null,
    dietaryNotes: null,
    tableLabel: null,
    ...over,
  };
}

describe("meal counts", () => {
  const guests = [
    guest({ mealChoice: "Chicken" }),
    guest({ mealChoice: " chicken  " }),
    guest({ mealChoice: "Chicken", rsvpStatus: "PENDING" }),
    guest({ mealChoice: "Short rib" }),
    guest({ mealChoice: "Vegetarian risotto", rsvpStatus: null, dietaryNotes: "Kosher for Passover", householdName: "The Brooks Family", fullName: "Nia Brooks" }),
    guest({ mealChoice: "Kids plate", isChild: true, householdName: "The Brooks Family", fullName: "Andre Brooks" }),
    guest({ isChild: true, rsvpStatus: "PENDING" }),
    guest({ rsvpStatus: "ATTENDING", dietaryNotes: "Tree-nut allergy", householdName: "Adeyemi", fullName: "Zoe Adeyemi", tableLabel: "Table 4" }),
    guest({ mealChoice: "Chicken", rsvpStatus: "DECLINED", dietaryNotes: "Vegan" }),
    guest({ dietaryNotes: "   " }),
  ];
  const s = summarizeMeals(guests);

  it("counts attending and pending apart, and leaves declined guests out", () => {
    expect(s).toMatchObject({ attending: 6, pending: 3, declined: 1, guests: 9 });
  });

  it("groups spellings of the same choice and shows the most common one", () => {
    expect(s.choices[0]).toEqual({ key: "chicken", label: "Chicken", attending: 2, pending: 1, total: 3 });
    expect(s.choices.map((c) => c.label)).toEqual(["Chicken", "Kids plate", "Short rib", "Vegetarian risotto"]);
    expect(mealKey("  Short   Rib ")).toBe("short rib");
  });

  it("counts children and guests with no meal choice, pending apart", () => {
    expect(s.children).toEqual({ attending: 1, pending: 1, total: 2 });
    expect(s.noChoice).toEqual({ attending: 2, pending: 1, total: 3 });
    expect(s.noChoiceGuests).toHaveLength(3);
  });

  it("lists every dietary note from guests who are coming, by household", () => {
    expect(s.dietary.map((d) => [d.fullName, d.note, d.tableLabel, d.pending])).toEqual([
      ["Zoe Adeyemi", "Tree-nut allergy", "Table 4", false],
      ["Nia Brooks", "Kosher for Passover", null, true],
    ]);
  });

  it("every coming guest lands in exactly one meal row or in 'no choice'", () => {
    const inRows = s.choices.reduce((sum, c) => sum + c.total, 0) + s.noChoice.total;
    expect(inRows).toBe(s.guests);
  });
});

describe("vendor meals", () => {
  it("lists only vendors who need a meal, most first, and totals them", () => {
    const v = vendorMeals([
      { id: "a", name: "DJ", mealsRequired: 2 },
      { id: "b", name: "Florist", mealsRequired: 0 },
      { id: "c", name: "Photographer", mealsRequired: 3 },
      { id: "d", name: "Band", mealsRequired: 2 },
    ]);
    expect(v.rows.map((r) => r.id)).toEqual(["c", "d", "a"]);
    expect(v.total).toBe(7);
  });
});

describe("total meals for the venue", () => {
  it("matches the plan's headcount when vendor meals count toward it", () => {
    const t = mealTotal({ attending: 100, pending: 30 }, 5, { headcount: 135, people: 130, vendorMeals: 5, source: "guest-list" });
    expect(t).toEqual({ guests: 130, vendorMeals: 5, total: 135, headcount: 135, difference: 0, reason: "same" });
  });

  it("explains the gap when the venue doesn't bill vendor meals as guests", () => {
    const t = mealTotal({ attending: 100, pending: 30 }, 5, { headcount: 130, people: 130, vendorMeals: 0, source: "guest-list" });
    expect(t).toMatchObject({ total: 135, headcount: 130, difference: 5, reason: "vendors-not-billed" });
  });

  it("says when the budget is still on the planned headcount", () => {
    const t = mealTotal({ attending: 0, pending: 0 }, 5, { headcount: 130, people: 125, vendorMeals: 5, source: "target" });
    expect(t).toMatchObject({ guests: 0, total: 5, reason: "no-guest-list" });
  });

  it("flags anything else instead of guessing", () => {
    const t = mealTotal({ attending: 100, pending: 30 }, 5, { headcount: 140, people: 135, vendorMeals: 5, source: "guest-list" });
    expect(t).toMatchObject({ difference: -5, reason: "other" });
  });
});
