import { describe, expect, it } from "vitest";
import { cd } from "../src/lib/dates";
import type { CategoryRow, ItemRow } from "../src/lib/domain/budget";
import type { DiffRow } from "../src/lib/domain/guest-import";
import {
  coupleOnList,
  filterGuests,
  groupHouseholds,
  guestCounts,
  hasFilters,
  isComing,
  listAfterImport,
  parseGuestFilters,
  partyOnList,
  partyRoles,
  projectImpact,
  rsvpDisplay,
  type BudgetBasis,
  type GuestListItem,
} from "../src/lib/domain/guests";

function g(over: Partial<GuestListItem> & { fullName: string; householdName: string }): GuestListItem {
  return {
    id: over.fullName.toLowerCase().replace(/\W+/g, "-"),
    side: "BOTH",
    relationship: "FRIEND",
    isChild: false,
    plusOneOf: null,
    rsvpStatus: "PENDING",
    mealChoice: null,
    dietaryNotes: null,
    notes: null,
    externalId: null,
    isDemo: false,
    seat: null,
    partyRole: null,
    ...over,
  };
}

const LIST: GuestListItem[] = [
  g({ fullName: "Ava Rivera", householdName: "The Rivera Family", side: "BRIDE_SIDE", relationship: "FAMILY", rsvpStatus: "ATTENDING", seat: { tableLabel: "Table 1", seatNumber: null } }),
  g({ fullName: "Mia Rivera", householdName: "The Rivera Family", side: "BRIDE_SIDE", relationship: "FAMILY", isChild: true, rsvpStatus: null }),
  g({ id: "jose", fullName: "José Núñez", householdName: "Núñez", side: "GROOM_SIDE", relationship: "WORK", rsvpStatus: "DECLINED" }),
  g({ fullName: "Rondell", householdName: "Rondell & Capri", relationship: "COUPLE", rsvpStatus: "ATTENDING" }),
  g({ fullName: "Capri", householdName: "Rondell & Capri", relationship: "COUPLE", rsvpStatus: "ATTENDING" }),
  g({ fullName: "Andre Brooks", householdName: "Andre Brooks", side: "GROOM_SIDE" }),
];

describe("RSVP", () => {
  it("counts pending and unknown as coming", () => {
    expect(isComing("ATTENDING")).toBe(true);
    expect(isComing("PENDING")).toBe(true);
    expect(isComing(null)).toBe(true);
    expect(isComing("DECLINED")).toBe(false);
  });

  it("always has a word to go with the color", () => {
    expect(rsvpDisplay("ATTENDING")).toEqual({ label: "Attending", tone: "on-track" });
    expect(rsvpDisplay(null)).toEqual({ label: "Pending", tone: "due-soon" });
    expect(rsvpDisplay("DECLINED")).toEqual({ label: "Declined", tone: "neutral" });
  });
});

describe("counts", () => {
  it("adds up the list", () => {
    expect(guestCounts(LIST)).toEqual({
      total: 6,
      coming: 5,
      attending: 3,
      pending: 2,
      declined: 1,
      children: 1,
      households: 4,
      seated: 1,
    });
  });
});

describe("filters", () => {
  it("reads only known values from the URL", () => {
    expect(parseGuestFilters({ q: " riv ", side: "BRIDE_SIDE", rsvp: "NOPE", rel: ["FAMILY", "WORK"] })).toEqual({
      q: "riv",
      side: "BRIDE_SIDE",
      rsvp: null,
      rel: "FAMILY",
    });
    expect(hasFilters(parseGuestFilters({}))).toBe(false);
  });

  it("searches names and households without caring about accents", () => {
    const names = (f: Parameters<typeof filterGuests>[1]) => filterGuests(LIST, f).map((x) => x.fullName);
    expect(names({ q: "nunez", side: null, rsvp: null, rel: null })).toEqual(["José Núñez"]);
    expect(names({ q: "rivera family", side: null, rsvp: null, rel: null })).toEqual(["Ava Rivera", "Mia Rivera"]);
    expect(names({ q: "", side: "GROOM_SIDE", rsvp: null, rel: null })).toEqual(["José Núñez", "Andre Brooks"]);
    // "Pending" includes guests we have no answer for.
    expect(names({ q: "", side: null, rsvp: "PENDING", rel: null })).toEqual(["Mia Rivera", "Andre Brooks"]);
    expect(names({ q: "", side: null, rsvp: null, rel: "COUPLE" })).toEqual(["Rondell", "Capri"]);
  });
});

describe("households", () => {
  it("groups by household, the couple first, then A to Z ignoring 'The'", () => {
    const hs = groupHouseholds(LIST);
    expect(hs.map((h) => h.name)).toEqual(["Rondell & Capri", "Andre Brooks", "Núñez", "The Rivera Family"]);
    expect(hs[3].guests.map((x) => x.fullName)).toEqual(["Ava Rivera", "Mia Rivera"]);
    expect(hs[3].coming).toBe(2);
    expect(hs[2].coming).toBe(0);
  });

  it("puts children after adults", () => {
    const hs = groupHouseholds([g({ fullName: "Kid", householdName: "H", isChild: true }), g({ fullName: "Parent", householdName: "h" })]);
    expect(hs).toHaveLength(1);
    expect(hs[0].guests.map((x) => x.fullName)).toEqual(["Parent", "Kid"]);
  });
});

describe("is everyone eating on the list?", () => {
  it("finds the two of us when marked as the couple", () => {
    expect(coupleOnList(["Rondell", "Capri"], LIST)).toEqual([
      { partner: "Rondell", onList: true, guestName: "Rondell", markedAsCouple: true },
      { partner: "Capri", onList: true, guestName: "Capri", markedAsCouple: true },
    ]);
  });

  it("finds a partner by name when they came in from the RSVP app", () => {
    const list = [g({ fullName: "Rondell King", householdName: "Us", relationship: "OTHER" })];
    expect(coupleOnList(["Rondell", "Capri"], list)).toEqual([
      { partner: "Rondell", onList: true, guestName: "Rondell King", markedAsCouple: false },
      { partner: "Capri", onList: false, guestName: null, markedAsCouple: false },
    ]);
  });

  it("checks the wedding party by link or by name", () => {
    const members = [
      { id: "m1", name: "Ava Rivera", roleLabel: "Bridesmaid", displayName: "Bridesmaid", guestId: null },
      { id: "m2", name: null, roleLabel: "Bridesmaid", displayName: "Bridesmaid", guestId: null },
      { id: "m3", name: "Andre Q. Brooks", roleLabel: "Best Man", displayName: "Best Man", guestId: null },
      { id: "m4", name: null, roleLabel: "Groomsman", displayName: "Groomsman", guestId: "jose" },
      { id: "m5", name: "Terrence Hayes", roleLabel: "Groomsman", displayName: "Groomsman", guestId: null },
    ];
    const check = partyOnList(members, LIST);
    expect(check).toMatchObject({ total: 5, named: 3, found: 2 });
    expect(check.members.map((m) => m.guestName)).toEqual(["Ava Rivera", null, null, "José Núñez", null]);

    const list = [...LIST, g({ fullName: "Andre Quincy Brooks", householdName: "B" })];
    expect(partyOnList([{ id: "m", name: "Andre Brooks", roleLabel: "Best Man", displayName: "Best Man", guestId: null }], list).found).toBe(1);

    const roles = partyRoles(members, LIST);
    expect(roles.get("ava-rivera")).toBe("Bridesmaid");
    expect(roles.get("jose")).toBe("Groomsman");
    expect(roles.size).toBe(2);
  });
});

describe("the list after an import", () => {
  const row = (over: Partial<DiffRow>): DiffRow =>
    ({
      rowNumber: 2,
      kind: "new",
      guestId: null,
      fullName: "New Person",
      after: { rsvpStatus: "PENDING", mealChoice: null, dietaryNotes: null, side: "BOTH", relationship: "OTHER" },
      ...over,
    }) as DiffRow;

  it("adds accepted new rows and applies accepted changes", () => {
    const existing = [
      { id: "a", fullName: "Ava Rivera", relationship: "FAMILY" as const, rsvpStatus: "PENDING" as const },
      { id: "b", fullName: "Andre Brooks", relationship: "FRIEND" as const, rsvpStatus: "ATTENDING" as const },
    ];
    const rows = [
      row({ rowNumber: 2 }),
      row({ rowNumber: 3, fullName: "Skipped" }),
      row({ rowNumber: 4, kind: "changed", guestId: "b", fullName: "Andre Brooks", after: { rsvpStatus: "DECLINED", mealChoice: null, dietaryNotes: null, side: "BOTH", relationship: "FRIEND" } }),
    ];
    const after = listAfterImport(existing, rows, new Set([2, 4]));
    expect(after.map((x) => [x.fullName, x.rsvpStatus])).toEqual([
      ["Ava Rivera", "PENDING"],
      ["Andre Brooks", "DECLINED"],
      ["New Person", "PENDING"],
    ]);
    expect(after.filter((x) => isComing(x.rsvpStatus))).toHaveLength(2);
  });
});

describe("headcount impact", () => {
  // The real plan: $100,000 budget, the venue at $54,000 with a live overage payment,
  // a $4,000 contingency, $200 a person above 125.
  const categories: CategoryRow[] = [
    { id: "venue", name: "Venue", estimateCents: 5_400_000, sortOrder: 0, isContingency: false, isClosed: false },
    { id: "cont", name: "Contingency", estimateCents: 400_000, sortOrder: 1, isContingency: true, isClosed: false },
  ];
  const pay = (id: string, amountCents: number | null, dueDate: string, extra: Partial<ItemRow["payments"][number]> = {}) => ({
    id,
    budgetItemId: "v",
    sequence: null,
    kind: "INSTALLMENT",
    amountCents,
    amountRule: null,
    isEstimate: false,
    dueDate: cd(dueDate),
    paidDate: null,
    ...extra,
  });
  const items: ItemRow[] = [
    {
      id: "v",
      categoryId: "venue",
      vendorId: null,
      description: "Venue",
      estimateCents: 5_400_000,
      contractedCents: 5_400_000,
      payments: [
        pay("p1", 1_000_000, "2026-04-19", { paidDate: cd("2026-04-18") }),
        pay("p2", 1_000_000, "2026-10-19"),
        pay("p3", 1_500_000, "2027-10-19"),
        pay("p4", 1_565_000, "2028-03-03"),
        pay("p5", null, "2028-04-01", { amountRule: "HEADCOUNT_OVERAGE", kind: "OVERAGE" }),
        pay("p6", 335_000, "2028-04-01", { kind: "SERVICE_CHARGE" }),
      ],
    },
  ];
  const basis: BudgetBasis = {
    rule: { includedHeadcount: 125, perPersonOverageCents: 20_000, overageTaxPpm: 0 },
    totalBudgetCents: 10_000_000,
    headcountTarget: 125,
    vendorMeals: 0,
    categories,
    items,
  };

  it("uses the planned headcount until there's a list", () => {
    const i = projectImpact(basis, 0, false);
    expect(i.headcount).toMatchObject({ headcount: 125, source: "target" });
    expect(i.headroom.guestsUntilGone).toBe(20);
  });

  it("puts break-even at 145 people", () => {
    expect(projectImpact(basis, 125, true).headroom).toMatchObject({ overageCents: 0, breakEvenHeadcount: 145, guestsUntilGone: 20 });
    const at145 = projectImpact(basis, 145, true);
    expect(at145.headroom).toMatchObject({ overageCents: 400_000, guestsUntilGone: 0 });
    expect(at145.contingencyAvailable).toBe(0);
    const at146 = projectImpact(basis, 146, true);
    expect(at146.headroom.guestsUntilGone).toBe(-1);
    expect(at146.contingencyAvailable).toBe(-20_000);
  });

  it("adds vendor meals on top of the guest list", () => {
    const i = projectImpact({ ...basis, vendorMeals: 3 }, 142, true);
    expect(i.headcount).toMatchObject({ headcount: 145, people: 142, vendorMeals: 3 });
    expect(i.headroom.guestsUntilGone).toBe(0);
  });
});
