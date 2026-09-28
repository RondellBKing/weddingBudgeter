import { describe, expect, it } from "vitest";
import { addDays, cd, type CalendarDate } from "../src/lib/dates";
import {
  attireChecklist,
  attireStatusLabel,
  chosenStyleError,
  dateOrderWarnings,
  shoeOptionError,
  shoeWarnings,
  styleMenuFor,
  telHref,
  type OutfitType,
  type PartyRole,
} from "../src/lib/domain/party";
import {
  mergeSizes,
  parseSizes,
  SIZE_MAX_LENGTH,
  sizesFromForm,
  sizeSummary,
} from "../src/lib/domain/party-sizes";
import {
  owedLabel,
  sizingRollup,
  sizingUrgency,
  styleDistribution,
  URGENCY_LABEL,
  type RollupInput,
} from "../src/lib/domain/party-sizing";

const DEADLINE = cd("2027-11-07");

let seq = 0;
function member(over: Partial<RollupInput> & { role: PartyRole; outfitType: OutfitType }): RollupInput {
  seq += 1;
  return {
    id: over.id ?? `m${seq}`,
    sortOrder: seq,
    askedOn: null,
    acceptedOn: null,
    chosenStyleId: null,
    sizingSubmittedOn: null,
    ...over,
  };
}

describe("who hasn't sent sizing", () => {
  const d = (s: string) => cd(s);
  const party = [
    member({ id: "styled", role: "BRIDESMAID", outfitType: "DRESS", askedOn: d("2026-10-01"), acceptedOn: d("2026-10-02"), chosenStyleId: "maci" }),
    member({ id: "asked", role: "BRIDESMAID", outfitType: "DRESS", askedOn: d("2026-10-01") }),
    member({ id: "done", role: "BRIDESMAID", outfitType: "DRESS", chosenStyleId: "cheryl", sizingSubmittedOn: d("2027-09-01") }),
    member({ id: "not-asked", role: "BRIDESMAID", outfitType: "DRESS" }),
    member({ id: "moh-yes", role: "MAID_OF_HONOR", outfitType: "DRESS", askedOn: d("2026-10-01"), acceptedOn: d("2026-10-03") }),
    member({ id: "matron-sizes-no-style", role: "MATRON_OF_HONOR", outfitType: "DRESS", sizingSubmittedOn: d("2027-10-01") }),
    member({ id: "ordered", role: "MAID_OF_HONOR", outfitType: "DRESS", orderedOn: d("2027-11-10") }),
    member({ id: "best-man", role: "BEST_MAN", outfitType: "SUIT", acceptedOn: d("2026-10-05") }),
    member({ id: "groomsman", role: "GROOMSMAN", outfitType: "SUIT" }),
    member({ id: "bridesman", role: "BRIDESMAN", outfitType: "SUIT", askedOn: d("2026-10-01"), sizingSubmittedOn: d("2027-01-01") }),
  ];
  const rollup = sizingRollup(party);

  it("sorts dresses by how far behind they are: not asked, asked, said yes, style chosen, then style missing", () => {
    expect(rollup.dresses.map((m) => m.id)).toEqual(["not-asked", "asked", "moh-yes", "styled", "matron-sizes-no-style"]);
    expect(rollup.dresses.map((m) => m.stage)).toEqual(["NOT_ASKED", "ASKED", "ACCEPTED", "STYLE_CHOSEN", "STYLE_MISSING"]);
  });

  it("lists suits apart, for their measurements only", () => {
    expect(rollup.suits.map((m) => m.id)).toEqual(["groomsman", "best-man"]);
    expect(rollup.suits.every((m) => !m.owed.style && m.owed.sizes)).toBe(true);
  });

  it("leaves out anyone who is done or already ordered", () => {
    const ids = [...rollup.dresses, ...rollup.suits].map((m) => m.id);
    expect(ids).not.toContain("done");
    expect(ids).not.toContain("ordered");
    expect(ids).not.toContain("bridesman");
  });

  it("keeps roster order within a stage", () => {
    const a = member({ id: "b1", role: "BRIDESMAID", outfitType: "DRESS", sortOrder: 20 });
    const b = member({ id: "b2", role: "BRIDESMAID", outfitType: "DRESS", sortOrder: 10 });
    expect(sizingRollup([a, b]).dresses.map((m) => m.id)).toEqual(["b2", "b1"]);
  });

  it("says what each person owes in plain words", () => {
    expect(owedLabel({ style: true, sizes: true }, "DRESS")).toBe("Style and sizes");
    expect(owedLabel({ style: false, sizes: true }, "DRESS")).toBe("Sizes");
    expect(owedLabel({ style: true, sizes: false }, "DRESS")).toBe("Style");
    expect(owedLabel({ style: false, sizes: true }, "SUIT")).toBe("Measurements");
  });
});

describe("style menus", () => {
  const A = { menu: "A" as const };
  const B = { menu: "B" as const };
  const SHOES = { menu: "SHOES" as const };

  it("gives bridesmaids Menu A, the maid and matron of honor Menu B, and suits nothing", () => {
    expect(styleMenuFor("BRIDESMAID", "DRESS")).toBe("A");
    expect(styleMenuFor("MAID_OF_HONOR", "DRESS")).toBe("B");
    expect(styleMenuFor("MATRON_OF_HONOR", "DRESS")).toBe("B");
    expect(styleMenuFor("BRIDESMAN", "SUIT")).toBeNull();
    expect(styleMenuFor("BEST_MAN", "SUIT")).toBeNull();
  });

  it("accepts a style from the member's own menu", () => {
    expect(chosenStyleError({ role: "BRIDESMAID", outfitType: "DRESS" }, A)).toBeNull();
    expect(chosenStyleError({ role: "MAID_OF_HONOR", outfitType: "DRESS" }, B)).toBeNull();
    expect(chosenStyleError({ role: "MATRON_OF_HONOR", outfitType: "DRESS" }, B)).toBeNull();
    expect(chosenStyleError({ role: "BRIDESMAID", outfitType: "DRESS" }, null)).toBeNull();
  });

  it("rejects a style from the wrong menu", () => {
    expect(chosenStyleError({ role: "BRIDESMAID", outfitType: "DRESS" }, B)).toMatch(/Menu A/);
    expect(chosenStyleError({ role: "MAID_OF_HONOR", outfitType: "DRESS" }, A)).toMatch(/Menu B/);
    expect(chosenStyleError({ role: "MATRON_OF_HONOR", outfitType: "DRESS" }, A)).toMatch(/Menu B/);
    expect(chosenStyleError({ role: "BRIDESMAID", outfitType: "DRESS" }, SHOES)).toMatch(/Menu A/);
  });

  it("branches on the outfit, not the side: suits never get a dress style", () => {
    expect(chosenStyleError({ role: "BRIDESMAN", outfitType: "SUIT" }, A)).toMatch(/Suits/);
    expect(chosenStyleError({ role: "GROOMSMAN", outfitType: "SUIT" }, B)).toMatch(/Suits/);
  });

  it("takes shoes only from the shoe menu, and only for dresses", () => {
    expect(shoeOptionError({ outfitType: "DRESS" }, SHOES)).toBeNull();
    expect(shoeOptionError({ outfitType: "DRESS" }, A)).toMatch(/shoe menu/);
    expect(shoeOptionError({ outfitType: "SUIT" }, SHOES)).toMatch(/groom's party/);
  });

  it("nudges about owned shoes that still need approval", () => {
    const base = { outfitType: "DRESS" as const, shoeOptionId: null, shoeOwnedDescription: null };
    expect(shoeWarnings({ ...base, shoeStatus: "NOT_SELECTED" })).toEqual([]);
    expect(shoeWarnings({ ...base, shoeStatus: "APPROVED" })).toHaveLength(1);
    expect(shoeWarnings({ ...base, shoeOwnedDescription: "Brown patent pumps", shoeStatus: "SELECTED" })[0]).toMatch(/approval/);
    expect(shoeWarnings({ ...base, shoeOptionId: "platform", shoeStatus: "SELECTED" })).toEqual([]);
  });
});

describe("sizing urgency", () => {
  const at = (daysBefore: number): CalendarDate => addDays(DEADLINE, -daysBefore);

  it("names each level in words", () => {
    const cases: Array<[CalendarDate, string, string]> = [
      [cd("2026-09-28"), "calm", "Plenty of time"],
      [at(91), "calm", "Plenty of time"],
      [at(90), "90", "Under 90 days"],
      [at(61), "90", "Under 90 days"],
      [at(60), "60", "Under 60 days"],
      [at(30), "30", "Under 30 days"],
      [at(14), "14", "Two weeks left"],
      [at(7), "7", "Final week"],
      [at(0), "7", "Final week"],
      [at(-1), "overdue", "Overdue"],
    ];
    for (const [today, level, label] of cases) {
      const u = sizingUrgency(DEADLINE, today, 3);
      expect([u.level, u.label]).toEqual([level, label]);
    }
    expect(URGENCY_LABEL.overdue).toBe("Overdue");
  });

  it("leans harder as the deadline gets closer", () => {
    const emphasis = [120, 90, 60, 30, 14, 7, -1].map((n) => sizingUrgency(DEADLINE, at(n), 2).emphasis);
    expect(emphasis).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(sizingUrgency(DEADLINE, at(45), 2).tone).toBe("on-track");
    expect(sizingUrgency(DEADLINE, at(20), 2).tone).toBe("due-soon");
    expect(sizingUrgency(DEADLINE, at(-3), 2).tone).toBe("overdue");
    expect(sizingUrgency(DEADLINE, at(-3), 2).message).toMatch(/passed/);
  });

  it("counts days across the end of daylight saving time (Nov 7, 2027)", () => {
    expect(sizingUrgency(DEADLINE, cd("2027-11-06"), 1).daysLeft).toBe(1);
    expect(sizingUrgency(DEADLINE, cd("2027-11-08"), 1).daysLeft).toBe(-1);
  });

  it("calms down once everything is in, even after the deadline", () => {
    const u = sizingUrgency(DEADLINE, at(-5), 0);
    expect(u).toMatchObject({ tone: "on-track", label: "Everything is in", emphasis: 0, allIn: true, level: "overdue" });
  });
});

describe("sizes JSON", () => {
  it("keeps only known keys with real values", () => {
    expect(parseSizes(null)).toEqual({});
    expect(parseSizes("A8")).toEqual({});
    expect(parseSizes(["A8"])).toEqual({});
    expect(parseSizes({ dressSize: "  A8 ", bust: 36, waist: "", hips: null, color: "rose", jacket: "40R" })).toEqual({
      dressSize: "A8",
      bust: "36",
      jacket: "40R",
    });
  });

  it("tidies spacing and caps the length", () => {
    const long = "x".repeat(SIZE_MAX_LENGTH + 10);
    expect(parseSizes({ height: "5 ft   6\n in", hips: long })).toEqual({ height: "5 ft 6 in", hips: "x".repeat(SIZE_MAX_LENGTH) });
  });

  it("reads only the current outfit's inputs from the form", () => {
    const form = { size_dressSize: "A10", size_bust: " 37 in ", size_jacket: "42L", size_waist: "   " };
    expect(sizesFromForm(form, "DRESS")).toEqual({ dressSize: "A10", bust: "37 in" });
    expect(sizesFromForm(form, "SUIT")).toEqual({ jacket: "42L" });
  });

  it("replaces the current outfit's sizes and keeps the other outfit's", () => {
    const saved = { dressSize: "A8", bust: "36", jacket: "40R" };
    expect(mergeSizes(saved, { dressSize: "A10" }, "DRESS")).toEqual({ jacket: "40R", dressSize: "A10" });
    expect(mergeSizes(saved, {}, "SUIT")).toEqual({ dressSize: "A8", bust: "36" });
    expect(mergeSizes(null, {}, "DRESS")).toBeNull();
    expect(mergeSizes({ bust: "36" }, {}, "DRESS")).toBeNull();
    // A stray key for the other outfit in the submission is ignored.
    expect(mergeSizes(null, { jacket: "40R", bust: "36" }, "DRESS")).toEqual({ bust: "36" });
  });

  it("summarizes in form order for the outfit", () => {
    const sizes = parseSizes({ height: "5 ft 6 in", dressSize: "A8", jacket: "40R" });
    expect(sizeSummary(sizes, "DRESS").map((s) => [s.label, s.value])).toEqual([
      ["Dress size", "A8"],
      ["Height", "5 ft 6 in"],
    ]);
    expect(sizeSummary(sizes, "SUIT").map((s) => s.label)).toEqual(["Jacket"]);
  });
});

describe("style distribution", () => {
  const options = [
    { id: "maci", menu: "A" as const, name: "Maci" },
    { id: "cheryl", menu: "A" as const, name: "Cheryl" },
    { id: "sonel", menu: "B" as const, name: "Sonel" },
    { id: "aretha", menu: "B" as const, name: "Aretha" },
    { id: "platform", menu: "SHOES" as const, name: "Platform Stiletto" },
    { id: "block", menu: "SHOES" as const, name: "Block Heel" },
  ];
  const m = (role: PartyRole, outfitType: OutfitType, chosenStyleId: string | null, shoeOptionId: string | null = null, shoeOwnedDescription: string | null = null) => ({
    role,
    outfitType,
    chosenStyleId,
    shoeOptionId,
    shoeOwnedDescription,
  });
  const party = [
    m("BRIDESMAID", "DRESS", "maci", "platform"),
    m("BRIDESMAID", "DRESS", "maci", "block"),
    m("BRIDESMAID", "DRESS", "cheryl", null, "Brown patent pumps"),
    m("BRIDESMAID", "DRESS", null),
    m("MAID_OF_HONOR", "DRESS", "sonel", "platform"),
    m("MATRON_OF_HONOR", "DRESS", null),
    m("BRIDESMAN", "SUIT", null),
    m("GROOMSMAN", "SUIT", null),
  ];
  const dist = styleDistribution(party, options);

  it("counts each Menu A and Menu B style among the people on that menu", () => {
    expect(dist.A.eligible).toBe(4);
    expect(dist.A.rows).toEqual([
      { id: "maci", name: "Maci", count: 2 },
      { id: "cheryl", name: "Cheryl", count: 1 },
    ]);
    expect(dist.A.undecided).toBe(1);
    expect(dist.B.eligible).toBe(2);
    expect(dist.B.rows.map((r) => r.count)).toEqual([1, 0]);
    expect(dist.B.undecided).toBe(1);
  });

  it("counts shoes across every dress, with owned pairs apart", () => {
    expect(dist.SHOES.eligible).toBe(6);
    expect(dist.SHOES.rows.map((r) => [r.name, r.count])).toEqual([
      ["Platform Stiletto", 2],
      ["Block Heel", 1],
    ]);
    expect(dist.SHOES.owned).toBe(1);
    expect(dist.SHOES.undecided).toBe(2);
  });

  it("doesn't count a style from the wrong menu", () => {
    const odd = styleDistribution([m("BRIDESMAID", "DRESS", "sonel")], options);
    expect(odd.A.undecided).toBe(1);
    expect(odd.B.rows.every((r) => r.count === 0)).toBe(true);
  });
});

describe("attire checklist", () => {
  it("adds the style step for dresses only, with suit wording for suits", () => {
    const dress = attireChecklist({ outfitType: "DRESS", styleName: "Maci", askedOn: cd("2026-10-01") });
    expect(dress.map((s) => s.label)).toEqual([
      "Asked",
      "Said yes",
      "Style chosen",
      "Sizing sent",
      "Dress ordered",
      "Arrived",
      "Altered",
      "Ready",
    ]);
    expect(dress.filter((s) => s.done).map((s) => s.key)).toEqual(["askedOn", "style"]);
    const suit = attireChecklist({ outfitType: "SUIT", styleName: null });
    expect(suit.map((s) => s.label)).toContain("Measurements sent");
    expect(suit.find((s) => s.key === "style")).toBeUndefined();
  });

  it("words the derived status for the outfit", () => {
    expect(attireStatusLabel("SIZING_SUBMITTED", "DRESS")).toBe("Sizing sent");
    expect(attireStatusLabel("SIZING_SUBMITTED", "SUIT")).toBe("Measurements sent");
    expect(attireStatusLabel("ORDERED", "SUIT")).toBe("Rental ordered");
    expect(attireStatusLabel("READY", "SUIT")).toBe("Ready");
  });

  it("warns when dates run backwards, without blocking", () => {
    expect(dateOrderWarnings({ outfitType: "DRESS", askedOn: cd("2026-10-01"), acceptedOn: cd("2026-10-05") })).toEqual([]);
    const w = dateOrderWarnings({ outfitType: "DRESS", askedOn: cd("2026-10-05"), acceptedOn: cd("2026-10-01"), orderedOn: cd("2027-11-10") });
    expect(w).toHaveLength(1);
    expect(w[0]).toMatch(/Said yes.*before.*Asked/);
    // Compared with the latest date so far, so one early date doesn't hide a later problem.
    expect(dateOrderWarnings({ outfitType: "SUIT", orderedOn: cd("2027-12-01"), readyOn: cd("2027-11-01") })[0]).toMatch(/Ready.*Rental ordered/);
  });
});

describe("contact links", () => {
  it("dials only digits, keeping a leading plus and an extension", () => {
    expect(telHref("(201) 555-0142")).toBe("tel:2015550142");
    expect(telHref("+1 201.555.0142")).toBe("tel:+12015550142");
    expect(telHref("201-555-0142 x12")).toBe("tel:2015550142,12");
    expect(telHref("201 555 0142 ext. 7")).toBe("tel:2015550142,7");
  });
});
