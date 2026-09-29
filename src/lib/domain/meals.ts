import { normalizeText } from "./guest-import";

// Meal counts for the venue. Everything is derived from the guest list (meal choice, dietary
// notes, RSVP) and from booked vendors' mealsRequired. Vendor meals never come from guest rows.
//
// Pending (and "no reply yet") counts as coming, the same rule the headcount uses, so the venue
// is never short. Pending guests are shown apart so everyone can see how firm each number is.

export type MealRsvp = "PENDING" | "ATTENDING" | "DECLINED" | null;

export type MealGuest = {
  id: string;
  fullName: string;
  householdName: string;
  isChild: boolean;
  rsvpStatus: MealRsvp;
  mealChoice: string | null;
  dietaryNotes: string | null;
  /** The table they're seated at, if any. */
  tableLabel: string | null;
};

export type Split = { attending: number; pending: number; total: number };

export type MealChoiceRow = Split & { key: string; label: string };

export type DietaryRow = {
  id: string;
  fullName: string;
  householdName: string;
  tableLabel: string | null;
  note: string;
  isChild: boolean;
  pending: boolean;
  mealChoice: string | null;
};

export type MealSummary = {
  attending: number;
  /** Pending or no reply yet. Counted as coming. */
  pending: number;
  declined: number;
  /** attending + pending: every guest plate to plan for. */
  guests: number;
  children: Split;
  /** One row per meal choice, most chosen first. */
  choices: MealChoiceRow[];
  /** Coming, but no meal choice yet. */
  noChoice: Split;
  /** The guests behind noChoice, household by household. */
  noChoiceGuests: MealGuest[];
  /** Every dietary note from a guest who's coming, household by household. */
  dietary: DietaryRow[];
};

const blank = (s: string | null | undefined) => !s || s.trim() === "";

/** "Chicken", " chicken ", "CHICKEN" are one choice. */
export function mealKey(choice: string): string {
  return choice.trim().replace(/\s+/g, " ").toLowerCase();
}

function split(): Split {
  return { attending: 0, pending: 0, total: 0 };
}

function bump(s: Split, pending: boolean) {
  if (pending) s.pending++;
  else s.attending++;
  s.total++;
}

const byHousehold = (a: { householdName: string; fullName: string }, b: { householdName: string; fullName: string }) =>
  normalizeText(a.householdName).replace(/^the /, "").localeCompare(normalizeText(b.householdName).replace(/^the /, "")) ||
  a.fullName.localeCompare(b.fullName);

export function summarizeMeals(guests: MealGuest[]): MealSummary {
  const children = split();
  const noChoice = split();
  const noChoiceGuests: MealGuest[] = [];
  const dietary: DietaryRow[] = [];
  // key → counts, plus how often each spelling was used (the most common one is shown).
  const choices = new Map<string, Split & { spellings: Map<string, number> }>();
  let attending = 0;
  let pending = 0;
  let declined = 0;

  for (const g of guests) {
    if (g.rsvpStatus === "DECLINED") {
      declined++;
      continue;
    }
    const isPending = g.rsvpStatus !== "ATTENDING";
    if (isPending) pending++;
    else attending++;
    if (g.isChild) bump(children, isPending);

    if (blank(g.mealChoice)) {
      bump(noChoice, isPending);
      noChoiceGuests.push(g);
    } else {
      const spelling = g.mealChoice!.trim().replace(/\s+/g, " ");
      const key = mealKey(spelling);
      let row = choices.get(key);
      if (!row) {
        row = { ...split(), spellings: new Map() };
        choices.set(key, row);
      }
      bump(row, isPending);
      row.spellings.set(spelling, (row.spellings.get(spelling) ?? 0) + 1);
    }

    if (!blank(g.dietaryNotes)) {
      dietary.push({
        id: g.id,
        fullName: g.fullName,
        householdName: g.householdName,
        tableLabel: g.tableLabel,
        note: g.dietaryNotes!.trim(),
        isChild: g.isChild,
        pending: isPending,
        mealChoice: blank(g.mealChoice) ? null : g.mealChoice!.trim(),
      });
    }
  }

  const rows: MealChoiceRow[] = [...choices.entries()].map(([key, r]) => {
    // Most common spelling; ties go to the one that sorts first, so the label is stable.
    const label = [...r.spellings.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
    return { key, label, attending: r.attending, pending: r.pending, total: r.total };
  });
  rows.sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));

  return {
    attending,
    pending,
    declined,
    guests: attending + pending,
    children,
    choices: rows,
    noChoice,
    noChoiceGuests: noChoiceGuests.sort(byHousehold),
    dietary: dietary.sort(byHousehold),
  };
}

// ─── Vendor meals ─────────────────────────────────────────────────────────────

export type VendorMeal = { id: string; name: string; mealsRequired: number };

/** Booked vendors that need a meal, most meals first, and the total. */
export function vendorMeals<T extends VendorMeal>(vendors: T[]): { rows: T[]; total: number } {
  const rows = vendors.filter((v) => v.mealsRequired > 0).sort((a, b) => b.mealsRequired - a.mealsRequired || a.name.localeCompare(b.name));
  return { rows, total: rows.reduce((s, v) => s + v.mealsRequired, 0) };
}

// ─── The number for the venue ─────────────────────────────────────────────────

/** The headcount from loadPlan(), as it was computed there (never recomputed here). */
export type PlanHeadcount = {
  headcount: number;
  people: number;
  vendorMeals: number;
  source: "guest-list" | "target";
};

export type MealTotal = {
  /** Attending + pending guests. */
  guests: number;
  /** Every booked vendor's meals, whether or not the venue bills them as guests. */
  vendorMeals: number;
  /** What the kitchen makes: guests + vendor meals. */
  total: number;
  /** The headcount the budget uses. */
  headcount: number;
  /** total − headcount. */
  difference: number;
  /**
   * Why the two differ:
   * - "same": they match.
   * - "vendors-not-billed": the venue doesn't bill vendor meals as guests (a setting), so the
   *   kitchen makes that many more plates than the billed headcount.
   * - "no-guest-list": the budget is still using the planned headcount.
   * - "other": anything else (should be rare: something changed between the two reads).
   */
  reason: "same" | "vendors-not-billed" | "no-guest-list" | "other";
};

export function mealTotal(summary: Pick<MealSummary, "attending" | "pending">, vendorMealCount: number, plan: PlanHeadcount): MealTotal {
  const guests = summary.attending + summary.pending;
  const total = guests + vendorMealCount;
  const difference = total - plan.headcount;
  let reason: MealTotal["reason"];
  if (plan.source === "target") reason = "no-guest-list";
  else if (difference === 0) reason = "same";
  else if (plan.people === guests && plan.vendorMeals === 0 && difference === vendorMealCount) reason = "vendors-not-billed";
  else reason = "other";
  return { guests, vendorMeals: vendorMealCount, total, headcount: plan.headcount, difference, reason };
}
