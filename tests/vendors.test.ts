import { describe, expect, it } from "vitest";
import { VENUE_ITEM, VENUE_PAYMENTS } from "../prisma/seed/data";
import { cd } from "../src/lib/dates";
import { summarizeBudget, type ItemRow, type PaymentRow } from "../src/lib/domain/budget";
import {
  displayUrl,
  instagramUrl,
  isLikelyEmail,
  isLikelyPhone,
  normalizeInstagram,
  normalizeWebUrl,
  telHref,
} from "../src/lib/domain/vendor-contact";
import { readVendorForm, vendorFormValues, vendorSchema, EMPTY_VENDOR_VALUES } from "../src/lib/domain/vendor-form";
import { paymentState, vendorMoney } from "../src/lib/domain/vendor-money";
import {
  arrivesBeforeAccess,
  coverage,
  filterVendors,
  parseVendorFilters,
  sortVendors,
  statusGroup,
  vendorListHref,
  type VendorCategory,
  type VendorStatus,
} from "../src/lib/domain/vendors";

type V = { id: string; name: string; category: VendorCategory; alsoCovers: VendorCategory[]; status: VendorStatus };

const venue: V = { id: "v1", name: "The Estate at Florentine Gardens", category: "VENUE", alsoCovers: ["CATERING", "CAKE"], status: "BOOKED" };
const photo: V = { id: "v2", name: "Lumen Photography", category: "PHOTOGRAPHY", alsoCovers: [], status: "QUOTED" };
const florist: V = { id: "v3", name: "Petal & Stem", category: "FLORAL", alsoCovers: [], status: "DECLINED" };
const florist2: V = { id: "v4", name: "Bloom House", category: "FLORAL", alsoCovers: [], status: "CONTACTED" };
const caterer: V = { id: "v5", name: "Garden Table", category: "CATERING", alsoCovers: [], status: "RESEARCHING" };
const all = [venue, photo, florist, florist2, caterer];

describe("coverage", () => {
  const rows = coverage(all);
  const row = (c: VendorCategory) => rows.find((r) => r.category === c)!;

  it("lists every category except Other, booked or not", () => {
    expect(rows).toHaveLength(15);
    expect(rows.some((r) => r.category === "OTHER")).toBe(false);
    expect(row("OFFICIANT")).toMatchObject({ booked: [], bookedVendors: [], inProgress: 0 });
  });

  it("counts a booked vendor's alsoCovers as covered", () => {
    expect(row("VENUE").bookedVendors).toEqual([{ id: "v1", name: venue.name, via: "category" }]);
    expect(row("CATERING").bookedVendors).toEqual([{ id: "v1", name: venue.name, via: "also" }]);
    expect(row("CAKE").booked).toEqual([venue.name]);
  });

  it("counts researching, contacted and quoted vendors as in progress, not declined ones", () => {
    expect(row("PHOTOGRAPHY")).toMatchObject({ booked: [], inProgress: 1 });
    expect(row("FLORAL")).toMatchObject({ booked: [], inProgress: 1 });
    expect(row("CATERING").inProgress).toBe(1);
  });

  it("doesn't count alsoCovers of a vendor that isn't booked", () => {
    const rows2 = coverage([{ ...venue, status: "QUOTED" }]);
    expect(rows2.find((r) => r.category === "CATERING")).toMatchObject({ booked: [], inProgress: 1 });
  });

  it("still accepts rows without ids (the old preview's shape)", () => {
    const [first] = coverage([{ name: "Venue", category: "VENUE", alsoCovers: [], status: "BOOKED" }]);
    expect(first.booked).toEqual(["Venue"]);
  });
});

describe("list filters", () => {
  it("reads filters from the URL and ignores anything unknown", () => {
    expect(parseVendorFilters({ category: "FLORAL", status: "QUOTED" })).toEqual({ category: "FLORAL", status: "QUOTED" });
    expect(parseVendorFilters({ category: ["CAKE", "VENUE"] })).toEqual({ category: "CAKE", status: null });
    expect(parseVendorFilters({ category: "florist", status: "" })).toEqual({ category: null, status: null });
    expect(parseVendorFilters({})).toEqual({ category: null, status: null });
  });

  it("filters by category, including vendors that also cover it", () => {
    expect(filterVendors(all, { category: "CATERING", status: null }).map((v) => v.id)).toEqual(["v1", "v5"]);
    expect(filterVendors(all, { category: "FLORAL", status: null }).map((v) => v.id)).toEqual(["v3", "v4"]);
  });

  it("filters by status, and by both together", () => {
    expect(filterVendors(all, { category: null, status: "BOOKED" }).map((v) => v.id)).toEqual(["v1"]);
    expect(filterVendors(all, { category: "FLORAL", status: "DECLINED" }).map((v) => v.id)).toEqual(["v3"]);
    expect(filterVendors(all, { category: "OFFICIANT", status: null })).toEqual([]);
    expect(filterVendors(all, { category: null, status: null })).toHaveLength(5);
  });

  it("builds clean URLs for filters", () => {
    expect(vendorListHref({})).toBe("/vendors");
    expect(vendorListHref({ category: "FLORAL" })).toBe("/vendors?category=FLORAL");
    expect(vendorListHref({ category: "CAKE", status: "QUOTED" })).toBe("/vendors?category=CAKE&status=QUOTED");
  });

  it("orders booked first, then by how far along, declined and cancelled last", () => {
    expect(sortVendors(all).map((v) => v.id)).toEqual(["v1", "v2", "v4", "v5", "v3"]);
    expect(statusGroup("BOOKED")).toBe("booked");
    expect(statusGroup("QUOTED")).toBe("talking");
    expect(statusGroup("CANCELLED")).toBe("closed");
  });
});

describe("wedding-day arrival", () => {
  it("flags arrivals before the venue opens to vendors (6:00 AM)", () => {
    expect(arrivesBeforeAccess("05:30", "06:00")).toBe(true);
    expect(arrivesBeforeAccess("06:00", "06:00")).toBe(false);
    expect(arrivesBeforeAccess("14:00", "06:00")).toBe(false);
    expect(arrivesBeforeAccess(null, "06:00")).toBe(false);
    expect(arrivesBeforeAccess("5:30", "06:00")).toBe(false);
  });
});

// ─── Money ─────────────────────────────────────────────────────────────────────

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
  vendorId: "v1",
  description: VENUE_ITEM.description,
  estimateCents: VENUE_ITEM.estimateCents,
  contractedCents: VENUE_ITEM.contractedCents,
  payments: venuePayments,
};

const today = cd("2026-09-28");

describe("vendor money roll-up", () => {
  it("rolls up the venue from its payments: $54,000 committed, $10,000 paid", () => {
    const m = vendorMoney("v1", { items: [venueItem], ctx: { headcountOverageCents: 0 }, today });
    expect(m.contracted).toBe(5_400_000);
    expect(m.committed).toBe(5_400_000);
    expect(m.paid).toBe(1_000_000);
    expect(m.leftToPay).toBe(4_400_000);
    expect(m.paymentCount).toBe(6);
    expect(m.paidCount).toBe(1);
  });

  it("lists payments by due date with a state word, next due first unpaid", () => {
    const m = vendorMoney("v1", { items: [venueItem], ctx: { headcountOverageCents: 0 }, today });
    expect(m.payments.map((p) => p.payment.sequence)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(m.payments.map((p) => p.state)).toEqual(["paid", "due-soon", "upcoming", "upcoming", "upcoming", "upcoming"]);
    expect(m.nextDue?.payment.sequence).toBe(2);
    expect(m.nextDue?.daysUntil).toBe(21);
  });

  it("computes the headcount overage live, and it raises committed", () => {
    // 135 people: 10 × $200 = $2,000 on top of the contract.
    const m = vendorMoney("v1", { items: [venueItem], ctx: { headcountOverageCents: 200_000 }, today });
    const overage = m.payments.find((p) => p.payment.amountRule === "HEADCOUNT_OVERAGE")!;
    expect(overage.amountCents).toBe(200_000);
    expect(overage.isLive).toBe(true);
    expect(m.committed).toBe(5_600_000);
    expect(m.contracted).toBe(5_400_000);
  });

  it("uses the plan's precomputed totals when given, and matches them", () => {
    const ctx = { headcountOverageCents: 200_000 };
    const summary = summarizeBudget({ totalBudgetCents: 10_000_000, categories: [], items: [venueItem], ctx });
    const m = vendorMoney("v1", { items: [venueItem], ctx, today, totals: summary.itemTotals });
    expect(m.committed).toBe(summary.itemTotals.get(venueItem.id)!.committed);
  });

  it("sums several items and ignores other vendors' items", () => {
    const extra: ItemRow = {
      id: "cake",
      categoryId: "cake",
      vendorId: "v1",
      description: "Upgraded cake",
      estimateCents: null,
      contractedCents: null,
      payments: [
        { id: "c1", budgetItemId: "cake", sequence: null, kind: "OTHER", amountCents: 45_000, amountRule: null, isEstimate: false, dueDate: cd("2026-09-01"), paidDate: null },
      ],
    };
    const other: ItemRow = { ...extra, id: "x", vendorId: "v2", payments: [] };
    const m = vendorMoney("v1", { items: [venueItem, extra, other], ctx: { headcountOverageCents: 0 }, today });
    expect(m.items.map((i) => i.item.id)).toEqual([VENUE_ITEM.key, "cake"]);
    expect(m.contracted).toBe(5_400_000); // the cake has no contract, so only the venue's counts
    expect(m.committed).toBe(5_445_000);
    // An overdue payment is the earliest unpaid one, so it's next.
    expect(m.nextDue?.payment.id).toBe("c1");
    expect(m.nextDue?.state).toBe("overdue");
    expect(m.nextDue?.daysUntil).toBe(-27);
  });

  it("has nothing to roll up for a vendor with no budget items", () => {
    const m = vendorMoney("nobody", { items: [venueItem], ctx: { headcountOverageCents: 0 }, today });
    expect(m).toMatchObject({ contracted: null, committed: 0, paid: 0, paymentCount: 0, nextDue: null });
  });

  it("calls a payment due on its day on time, and overdue the day after", () => {
    const p = venuePayments[1];
    expect(paymentState(p, cd("2026-10-19"))).toBe("due-soon");
    expect(paymentState(p, cd("2026-10-20"))).toBe("overdue");
    expect(paymentState(p, cd("2026-06-01"))).toBe("upcoming");
    expect(paymentState(venuePayments[0], cd("2030-01-01"))).toBe("paid");
  });
});

// ─── Contact details ───────────────────────────────────────────────────────────

describe("contact details", () => {
  it("accepts web addresses with or without https, and rejects other schemes", () => {
    expect(normalizeWebUrl("florist.com")).toBe("https://florist.com/");
    expect(normalizeWebUrl(" https://www.Lumen.photo/weddings ")).toBe("https://www.lumen.photo/weddings");
    expect(normalizeWebUrl("http://example.com:8080/x?y=1")).toBe("http://example.com:8080/x?y=1");
    expect(normalizeWebUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeWebUrl("ftp://files.example.com")).toBeNull();
    expect(normalizeWebUrl("not a url")).toBeNull();
    expect(normalizeWebUrl("localhost")).toBeNull();
    expect(displayUrl("https://www.lumen.photo/")).toBe("lumen.photo");
  });

  it("turns any Instagram form into a handle", () => {
    expect(normalizeInstagram("@lumenphoto")).toBe("lumenphoto");
    expect(normalizeInstagram("lumen.photo_nj")).toBe("lumen.photo_nj");
    expect(normalizeInstagram("https://www.instagram.com/lumenphoto/?hl=en")).toBe("lumenphoto");
    expect(normalizeInstagram("instagram.com/lumenphoto")).toBe("lumenphoto");
    expect(normalizeInstagram("lumen photo")).toBeNull();
    expect(instagramUrl("lumenphoto")).toBe("https://www.instagram.com/lumenphoto/");
  });

  it("checks emails and phone numbers lightly", () => {
    expect(isLikelyEmail("hello@florentinegardens.com")).toBe(true);
    expect(isLikelyEmail("hello@florentine")).toBe(false);
    expect(isLikelyPhone("(201) 555-0142")).toBe(true);
    expect(isLikelyPhone("+1 201.555.0142 ext 3")).toBe(true);
    expect(isLikelyPhone("555-01")).toBe(false);
    expect(isLikelyPhone("call me")).toBe(false);
  });

  it("builds tel: links from phone numbers", () => {
    expect(telHref("(201) 555-0142")).toBe("tel:2015550142");
    expect(telHref("+1 201 555 0142 ext 3")).toBe("tel:+12015550142,3");
  });
});

// ─── The add/edit form ─────────────────────────────────────────────────────────

function formData(values: Record<string, string | string[]>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) for (const x of Array.isArray(v) ? v : [v]) f.append(k, x);
  return f;
}

describe("vendor form", () => {
  it("parses a full form into a row: cents, calendar date, normalized links", () => {
    const parsed = vendorSchema.parse(
      readVendorForm(
        formData({
          name: "  Lumen Photography ",
          category: "PHOTOGRAPHY",
          alsoCovers: ["VIDEOGRAPHY", "PHOTOGRAPHY", "VIDEOGRAPHY"],
          status: "QUOTED",
          email: "hi@lumen.photo",
          phone: "(201) 555-0142",
          website: "lumen.photo",
          instagram: "@lumenphoto",
          quoted: "6,200.50",
          contractSignedOn: "2026-10-02",
          arrivalTime: "13:30",
          mealsRequired: "2",
          notes: "",
        }),
      ),
    );
    expect(parsed).toMatchObject({
      name: "Lumen Photography",
      category: "PHOTOGRAPHY",
      alsoCovers: ["VIDEOGRAPHY"],
      status: "QUOTED",
      contactName: null,
      website: "https://lumen.photo/",
      instagram: "lumenphoto",
      quoted: 620_050,
      contractSignedOn: "2026-10-02",
      contractUrl: null,
      arrivalTime: "13:30",
      mealsRequired: 2,
      notes: null,
    });
  });

  it("needs only a name and a category; blank meals mean zero", () => {
    const parsed = vendorSchema.parse({ ...EMPTY_VENDOR_VALUES, name: "Garden Table", category: "CATERING", mealsRequired: "" });
    expect(parsed).toMatchObject({ status: "RESEARCHING", mealsRequired: 0, quoted: null, email: null, alsoCovers: [] });
  });

  it("reports each bad field by its input name", () => {
    const result = vendorSchema.safeParse({
      ...EMPTY_VENDOR_VALUES,
      name: " ",
      category: "",
      email: "nope",
      website: "javascript:alert(1)",
      quoted: "12.345",
      arrivalTime: "25:00",
      mealsRequired: "-1",
    });
    expect(result.success).toBe(false);
    const fields = new Set(result.error!.issues.map((i) => String(i.path[0])));
    for (const f of ["name", "category", "email", "website", "quoted", "arrivalTime", "mealsRequired"]) expect(fields).toContain(f);
  });

  it("round-trips a saved vendor into its edit form", () => {
    const values = vendorFormValues({
      name: "Lumen",
      category: "PHOTOGRAPHY",
      alsoCovers: [],
      status: "BOOKED",
      contactName: null,
      email: null,
      phone: null,
      website: null,
      instagram: "lumenphoto",
      quotedCents: 620_050,
      contractSignedOn: new Date(Date.UTC(2026, 9, 2)),
      contractUrl: null,
      arrivalTime: "13:30",
      mealsRequired: 2,
      notes: null,
    });
    expect(values).toMatchObject({ instagram: "@lumenphoto", quoted: "6200.50", contractSignedOn: "2026-10-02", mealsRequired: "2" });
    expect(vendorSchema.parse(values)).toMatchObject({ instagram: "lumenphoto", quoted: 620_050, contractSignedOn: "2026-10-02" });
  });
});
