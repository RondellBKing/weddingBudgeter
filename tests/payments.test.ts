import { describe, expect, it } from "vitest";
import { cd } from "../src/lib/dates";
import type { ItemRow, PaymentRow } from "../src/lib/domain/budget";
import { itemTotals } from "../src/lib/domain/budget";
import {
  amountModeOf,
  filterItemRows,
  itemTableRows,
  nextSequence,
  planMarkPaid,
  planMarkUnpaid,
  scheduleByMonth,
  sortItemRows,
} from "../src/lib/domain/payments";

const p = (over: Partial<PaymentRow>): PaymentRow => ({
  id: "p",
  budgetItemId: "i",
  sequence: 1,
  kind: "INSTALLMENT",
  amountCents: 100_000,
  amountRule: null,
  isEstimate: false,
  dueDate: cd("2026-10-19"),
  paidDate: null,
  ...over,
});

describe("marking payments paid and unpaid", () => {
  const ctx = { headcountOverageCents: 140_000 };

  it("freezes the live headcount overage at today's value when paid", () => {
    const overage = p({ kind: "OVERAGE", amountCents: null, amountRule: "HEADCOUNT_OVERAGE", isEstimate: true });
    expect(planMarkPaid(overage, { paidDate: cd("2028-04-01"), amountCents: null }, ctx)).toEqual({
      ok: true,
      paidDate: "2028-04-01",
      amountCents: 140_000,
    });
  });

  it("uses the amount actually paid when one is given", () => {
    expect(planMarkPaid(p({}), { paidDate: cd("2026-10-18"), amountCents: 99_500 }, ctx)).toMatchObject({ amountCents: 99_500 });
  });

  it("asks for an amount when it was never known", () => {
    expect(planMarkPaid(p({ amountCents: null }), { paidDate: cd("2026-10-18"), amountCents: null }, ctx)).toEqual({
      ok: false,
      message: "Enter the amount you paid.",
    });
  });

  it("sends a computed payment back to live computation when unpaid", () => {
    expect(planMarkUnpaid({ amountCents: 140_000, amountRule: "HEADCOUNT_OVERAGE" })).toEqual({ paidDate: null, amountCents: null });
    expect(planMarkUnpaid({ amountCents: 100_000, amountRule: null })).toEqual({ paidDate: null, amountCents: 100_000 });
  });

  it("describes amount modes", () => {
    expect(amountModeOf(p({}))).toBe("fixed");
    expect(amountModeOf(p({ amountCents: null }))).toBe("unknown");
    expect(amountModeOf(p({ amountCents: null, amountRule: "HEADCOUNT_OVERAGE" }))).toBe("overage");
  });

  it("numbers new payments after the last one", () => {
    expect(nextSequence([])).toBe(1);
    expect(nextSequence([{ sequence: 2 }, { sequence: null }, { sequence: 6 }])).toBe(7);
  });
});

const venue: ItemRow = {
  id: "venue",
  categoryId: "c-venue",
  vendorId: "v1",
  vendorName: "The Estate at Florentine Gardens",
  description: "Venue contract",
  estimateCents: 5_400_000,
  contractedCents: 5_400_000,
  payments: [
    p({ id: "1", sequence: 1, dueDate: cd("2026-04-19"), paidDate: cd("2026-04-18"), amountCents: 1_000_000 }),
    p({ id: "2", sequence: 2, dueDate: cd("2026-10-19"), amountCents: 1_000_000 }),
    p({ id: "5", sequence: 5, kind: "OVERAGE", dueDate: cd("2028-04-01"), amountCents: null, amountRule: "HEADCOUNT_OVERAGE" }),
    p({ id: "6", sequence: 6, kind: "SERVICE_CHARGE", dueDate: cd("2028-04-01"), amountCents: 335_000 }),
  ],
};
const photo: ItemRow = {
  id: "photo",
  categoryId: "c-photo",
  vendorId: null,
  vendorName: null,
  description: "Photographer",
  estimateCents: 650_000,
  contractedCents: null,
  payments: [p({ id: "ph1", dueDate: cd("2026-10-02"), amountCents: null })],
};

describe("cash-flow schedule", () => {
  const ctx = { headcountOverageCents: 100_000 };

  it("groups every payment by due month with totals", () => {
    const months = scheduleByMonth([venue, photo], ctx);
    expect(months.map((m) => m.label)).toEqual(["April 2026", "October 2026", "April 2028"]);
    const oct = months[1];
    expect(oct.rows.map((r) => r.payment.id)).toEqual(["ph1", "2"]);
    expect(oct.dueCents).toBe(1_000_000);
    expect(oct.unknownCount).toBe(1);
    expect(months[0].paidCents).toBe(1_000_000);
    expect(months[2].dueCents).toBe(435_000);
  });

  it("filters upcoming and paid", () => {
    expect(scheduleByMonth([venue], ctx, "paid").flatMap((m) => m.rows.map((r) => r.payment.id))).toEqual(["1"]);
    expect(scheduleByMonth([venue], ctx, "upcoming").flatMap((m) => m.rows.map((r) => r.payment.id))).toEqual(["2", "5", "6"]);
  });
});

describe("budget item table", () => {
  const ctx = { headcountOverageCents: 0 };
  const totals = new Map([
    ["venue", itemTotals(venue, ctx)],
    ["photo", itemTotals(photo, ctx)],
  ]);
  const rows = itemTableRows([venue, photo], totals, new Map([["c-venue", "Venue"], ["c-photo", "Photography"]]));

  it("derives paid, left to pay and next due for each item", () => {
    expect(rows[0]).toMatchObject({ paid: 1_000_000, leftToPay: 4_400_000, nextDue: "2026-10-19", categoryName: "Venue" });
    expect(rows[1]).toMatchObject({ paid: 0, leftToPay: 0, nextDue: "2026-10-02" });
  });

  it("sorts with empty values last in both directions", () => {
    expect(sortItemRows(rows, "contracted", "asc").map((r) => r.id)).toEqual(["venue", "photo"]);
    expect(sortItemRows(rows, "contracted", "desc").map((r) => r.id)).toEqual(["venue", "photo"]);
    expect(sortItemRows(rows, "nextDue", "asc").map((r) => r.id)).toEqual(["photo", "venue"]);
    expect(sortItemRows(rows, "category", "desc").map((r) => r.id)).toEqual(["venue", "photo"]);
  });

  it("filters by category and vendor", () => {
    expect(filterItemRows(rows, { categoryId: "c-photo" }).map((r) => r.id)).toEqual(["photo"]);
    expect(filterItemRows(rows, { vendorId: "none" }).map((r) => r.id)).toEqual(["photo"]);
    expect(filterItemRows(rows, { vendorId: "v1" }).map((r) => r.id)).toEqual(["venue"]);
  });
});
