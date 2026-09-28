import { applyPpm, type Cents } from "../money";

// The venue includes a fixed number of people; every person above that costs a per-person rate
// (plus any tax/service on it). That overage is a live claim against the contingency buffer,
// so the useful number is "how many more people until the buffer is gone".

export type OverageRule = {
  includedHeadcount: number;
  perPersonOverageCents: Cents;
  /** Tax/service on the overage in parts per million (6.625% = 66250). */
  overageTaxPpm: number;
};

/** Total overage owed for a headcount, including tax. Below the included count it's zero. */
export function overageCents(headcount: number, rule: OverageRule): Cents {
  const extra = Math.max(0, headcount - rule.includedHeadcount);
  const base = extra * rule.perPersonOverageCents;
  return base + applyPpm(base, rule.overageTaxPpm);
}

export type HeadcountInputs = {
  /** Guests on the list who haven't declined (pending counts as coming). */
  guestsNotDeclined: number;
  /** Whether a guest list has been imported yet. */
  hasGuestList: boolean;
  /** Planned headcount from settings, used until a guest list exists. */
  headcountTarget: number;
  /** Meals for booked vendors. */
  vendorMeals: number;
  vendorMealsCountTowardHeadcount: boolean;
};

export type ProjectedHeadcount = {
  headcount: number;
  people: number;
  vendorMeals: number;
  source: "guest-list" | "target";
};

/** The number the venue will bill on: everyone eating, plus vendor meals if they count. */
export function projectHeadcount(i: HeadcountInputs): ProjectedHeadcount {
  const people = i.hasGuestList ? i.guestsNotDeclined : i.headcountTarget;
  const vendorMeals = i.vendorMealsCountTowardHeadcount ? i.vendorMeals : 0;
  return {
    headcount: people + vendorMeals,
    people,
    vendorMeals,
    source: i.hasGuestList ? "guest-list" : "target",
  };
}

export type Headroom = {
  headcount: number;
  includedHeadcount: number;
  /** Overage owed at the current headcount, tax included. */
  overageCents: Cents;
  /** Cost of one more person above the included count, tax included. */
  perPersonAllInCents: Cents;
  /** Included places that are paid for but not yet used. */
  unusedIncluded: number;
  /** True when the per-person rate is zero, so headcount can't exhaust the buffer. */
  unlimited: boolean;
  /**
   * The largest headcount that keeps the contingency at or above zero.
   * Null when the plan is over budget even with no overage (another category ran over).
   */
  breakEvenHeadcount: number | null;
  /** breakEven − headcount. Negative means that many people past break-even. Null as above. */
  guestsUntilGone: number | null;
  /** How far over budget the plan is right now (0 when within budget). */
  overBudgetCents: Cents;
  /** People to remove to get back to break-even. 0 when within budget. */
  guestsToCut: number;
  /** False when cutting down to the included count still wouldn't fix the budget. */
  cuttingGuestsFixesIt: boolean;
};

/**
 * @param contingencyAvailableCents contingency left *after* every claim, including the overage
 *   at the current headcount (it is part of the venue's committed amount).
 */
export function computeHeadroom(
  headcount: number,
  rule: OverageRule,
  contingencyAvailableCents: Cents,
): Headroom {
  const current = overageCents(headcount, rule);
  const perPersonAllIn = rule.perPersonOverageCents + applyPpm(rule.perPersonOverageCents, rule.overageTaxPpm);
  const unusedIncluded = Math.max(0, rule.includedHeadcount - headcount);
  const overBudgetCents = Math.max(0, -contingencyAvailableCents);
  // What the contingency would be if nobody were above the included count.
  const slack = contingencyAvailableCents + current;

  const base = {
    headcount,
    includedHeadcount: rule.includedHeadcount,
    overageCents: current,
    perPersonAllInCents: perPersonAllIn,
    unusedIncluded,
    overBudgetCents,
  };

  if (slack < 0) {
    // Over budget for reasons other than headcount: even zero overage doesn't fix it.
    return {
      ...base,
      unlimited: false,
      breakEvenHeadcount: null,
      guestsUntilGone: null,
      guestsToCut: Math.max(0, headcount - rule.includedHeadcount),
      cuttingGuestsFixesIt: false,
    };
  }

  if (perPersonAllIn <= 0) {
    return {
      ...base,
      unlimited: true,
      breakEvenHeadcount: null,
      guestsUntilGone: null,
      guestsToCut: 0,
      cuttingGuestsFixesIt: true,
    };
  }

  // Largest n with overage(included + n) ≤ slack. Start from the division, then correct for rounding.
  let n = Math.floor(slack / perPersonAllIn);
  while (overageCents(rule.includedHeadcount + n + 1, rule) <= slack) n++;
  while (n > 0 && overageCents(rule.includedHeadcount + n, rule) > slack) n--;
  const breakEven = rule.includedHeadcount + n;
  const until = breakEven - headcount;

  return {
    ...base,
    unlimited: false,
    breakEvenHeadcount: breakEven,
    guestsUntilGone: until,
    guestsToCut: Math.max(0, -until),
    cuttingGuestsFixesIt: true,
  };
}
