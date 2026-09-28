import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  SETTINGS,
  VENUE_ITEM,
  VENUE_PAYMENTS,
} from "../prisma/seed/data";
import { cd } from "../src/lib/dates";
import {
  itemTotals,
  summarizeBudget,
  upcomingPayments,
  type CategoryRow,
  type ItemRow,
  type PaymentRow,
} from "../src/lib/domain/budget";
import { computeHeadroom, overageCents, projectHeadcount, type OverageRule } from "../src/lib/domain/headcount";

// Build the same rows the seed writes, so these tests check the real numbers.
const categories: CategoryRow[] = CATEGORIES.map((c, i) => ({
  id: c.key,
  name: c.name,
  estimateCents: c.estimateCents,
  sortOrder: i,
  isContingency: Boolean(c.isContingency),
  isClosed: false,
}));

const venuePayments: PaymentRow[] = VENUE_PAYMENTS.map((p) => ({
  id: p.key,
  budgetItemId: VENUE_ITEM.key,
  sequence: p.sequence,
  kind: p.kind,
  amountCents: p.amountCents,
  amountRule: p.amountRule ?? null,
  isEstimate: Boolean(p.isEstimate),
  dueDate: p.dueDate,
  paidDate: p.paidDate ?? null,
}));

const venueItem: ItemRow = {
  id: VENUE_ITEM.key,
  categoryId: "venue",
  vendorId: "venue-vendor",
  description: VENUE_ITEM.description,
  estimateCents: VENUE_ITEM.estimateCents,
  contractedCents: VENUE_ITEM.contractedCents,
  payments: venuePayments,
};

const rule: OverageRule = {
  includedHeadcount: SETTINGS.includedHeadcount,
  perPersonOverageCents: SETTINGS.perPersonOverageCents,
  overageTaxPpm: 0,
};

/** Run the whole pipeline the app runs: headcount → overage → budget → contingency → headroom. */
function planAt(headcount: number, extraItems: ItemRow[] = [], cats = categories, r = rule) {
  const overage = overageCents(headcount, r);
  const summary = summarizeBudget({
    totalBudgetCents: SETTINGS.totalBudgetCents,
    categories: cats,
    items: [venueItem, ...extraItems],
    ctx: { headcountOverageCents: overage },
  });
  return { summary, headroom: computeHeadroom(headcount, r, summary.contingency.available) };
}

describe("seeded budget", () => {
  it("has categories that add up to $98,700 with the dress line removed", () => {
    const allocated = CATEGORIES.reduce((s, c) => s + c.estimateCents, 0);
    expect(allocated).toBe(9_870_000);
    expect(CATEGORIES).toHaveLength(20);
    expect(CATEGORIES.filter((c) => c.isContingency)).toHaveLength(1);
  });

  it("has a fixed venue schedule of exactly $54,000", () => {
    const fixed = VENUE_PAYMENTS.reduce((s, p) => s + (p.amountCents ?? 0), 0);
    expect(fixed).toBe(5_400_000);
  });

  it("derives the dashboard numbers at 125 people", () => {
    const { summary } = planAt(125);
    expect(summary.totalBudget).toBe(10_000_000);
    expect(summary.committed).toBe(5_400_000);
    expect(summary.paid).toBe(1_000_000);
    expect(summary.leftToPay).toBe(4_400_000);
    expect(summary.uncommitted).toBe(4_600_000);
    expect(summary.unallocated).toBe(130_000);
    expect(summary.contingency.available).toBe(400_000);
    expect(summary.overBudgetCents).toBe(0);
  });

  it("reconciles the venue payments against the contract", () => {
    const t = itemTotals(venueItem, { headcountOverageCents: 0 });
    expect(t.reconciliation).toBe("matches");
    expect(t.nextDue?.payment.dueDate).toBe("2026-10-19");
    expect(t.nextDue?.amountCents).toBe(1_000_000);
  });
});

describe("headcount vs. contingency (the table in the brief)", () => {
  it.each([
    // people, overage, contingency left, guests until gone
    [125, 0, 400_000, 20],
    [130, 100_000, 300_000, 15],
    [140, 300_000, 100_000, 5],
    [145, 400_000, 0, 0],
    [150, 500_000, -100_000, -5],
    [160, 700_000, -300_000, -15],
    [175, 1_000_000, -600_000, -30],
  ])("%i people", (people, overage, left, until) => {
    const { summary, headroom } = planAt(people);
    expect(headroom.overageCents).toBe(overage);
    expect(summary.contingency.available).toBe(left);
    expect(headroom.breakEvenHeadcount).toBe(145);
    expect(headroom.guestsUntilGone).toBe(until);
    expect(headroom.overBudgetCents).toBe(Math.max(0, -left));
    expect(headroom.guestsToCut).toBe(Math.max(0, -until));
  });

  it("raises the venue's committed amount by the overage", () => {
    const { summary } = planAt(130);
    const venue = summary.categories.find((c) => c.id === "venue")!;
    expect(venue.committed).toBe(5_500_000);
    expect(venue.overrun).toBe(100_000);
    expect(summary.committed).toBe(5_500_000);
  });

  it("counts unused included places as headroom", () => {
    const { headroom } = planAt(110);
    expect(headroom.unusedIncluded).toBe(15);
    expect(headroom.guestsUntilGone).toBe(35);
    expect(headroom.breakEvenHeadcount).toBe(145);
  });

  it("moves break-even down when another category runs over", () => {
    const photo: ItemRow = {
      id: "photo",
      categoryId: "photography",
      vendorId: null,
      description: "Photographer",
      estimateCents: 650_000,
      contractedCents: 750_000, // $1,000 over its $6,500 estimate
      payments: [],
    };
    const { summary, headroom } = planAt(125, [photo]);
    expect(summary.contingency.overruns).toBe(100_000);
    expect(summary.contingency.available).toBe(300_000);
    expect(headroom.breakEvenHeadcount).toBe(140);
    expect(headroom.guestsUntilGone).toBe(15);
  });

  it("says when cutting guests can't fix it", () => {
    const photo: ItemRow = {
      id: "photo",
      categoryId: "photography",
      vendorId: null,
      description: "Photographer",
      estimateCents: 650_000,
      contractedCents: 1_150_000, // $5,000 over
      payments: [],
    };
    const { summary, headroom } = planAt(130, [photo]);
    expect(summary.contingency.available).toBe(-200_000);
    expect(headroom.breakEvenHeadcount).toBeNull();
    expect(headroom.cuttingGuestsFixesIt).toBe(false);
    expect(headroom.guestsToCut).toBe(5);
  });

  it("uses 143 as break-even if the $200 turns out to be before 6.625% NJ tax", () => {
    const taxed: OverageRule = { ...rule, overageTaxPpm: 66_250 };
    expect(overageCents(126, taxed)).toBe(21_325);
    const { headroom } = planAt(125, [], categories, taxed);
    expect(headroom.breakEvenHeadcount).toBe(143);
    expect(headroom.guestsUntilGone).toBe(18);
  });

  it("returns closed-category savings to the contingency, but not open ones", () => {
    const photo: ItemRow = {
      id: "photo",
      categoryId: "photography",
      vendorId: null,
      description: "Photographer",
      estimateCents: 650_000,
      contractedCents: 600_000,
      payments: [],
    };
    const open = planAt(125, [photo]);
    expect(open.summary.contingency.available).toBe(400_000);
    const closedCats = categories.map((c) => (c.id === "photography" ? { ...c, isClosed: true } : c));
    const closed = planAt(125, [photo], closedCats);
    expect(closed.summary.contingency.available).toBe(450_000);
  });

  it("freezes a paid overage payment even if the headcount changes later", () => {
    const paidPayments = venuePayments.map((p) =>
      p.amountRule === "HEADCOUNT_OVERAGE" ? { ...p, amountCents: 100_000, paidDate: cd("2028-04-01") } : p,
    );
    const item = { ...venueItem, payments: paidPayments };
    const t = itemTotals(item, { headcountOverageCents: 900_000 });
    expect(t.paid).toBe(1_100_000);
    expect(t.committed).toBe(5_500_000);
  });
});

describe("projected headcount", () => {
  it("uses the settings target until a guest list exists", () => {
    const p = projectHeadcount({
      guestsNotDeclined: 0,
      hasGuestList: false,
      headcountTarget: 125,
      vendorMeals: 5,
      vendorMealsCountTowardHeadcount: true,
    });
    expect(p).toEqual({ headcount: 130, people: 125, vendorMeals: 5, source: "target" });
  });

  it("uses guests who haven't declined once the list exists, and drops vendor meals if they don't count", () => {
    const p = projectHeadcount({
      guestsNotDeclined: 138,
      hasGuestList: true,
      headcountTarget: 125,
      vendorMeals: 5,
      vendorMealsCountTowardHeadcount: false,
    });
    expect(p).toEqual({ headcount: 138, people: 138, vendorMeals: 0, source: "guest-list" });
  });
});

describe("upcoming payments", () => {
  it("lists unpaid payments in due order with day counts from New York's today", () => {
    const rows = upcomingPayments([venueItem], { headcountOverageCents: 0 }, cd("2026-09-28"));
    expect(rows.map((r) => r.payment.sequence)).toEqual([2, 3, 4, 5, 6]);
    expect(rows[0].daysUntil).toBe(21);
    expect(rows[0].state).toBe("due-soon");
    expect(rows[3].amountCents).toBe(0);
  });
});
