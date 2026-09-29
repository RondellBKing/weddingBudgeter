import { describe, expect, it } from "vitest";
import { VENUE_PACKAGE } from "../prisma/seed/data";
import { groupPackage, nextPackageOrder, packageSummary, summaryWords, type PackageLine } from "../src/lib/domain/package";

const line = (id: string, section: PackageLine["section"], status: PackageLine["status"], sortOrder = 0): PackageLine => ({
  id,
  section,
  name: id,
  status,
  notes: null,
  sortOrder,
});

describe("the venue package", () => {
  it("groups lines in contract order and drops empty sections", () => {
    const groups = groupPackage([line("bar", "BAR", "INCLUDED"), line("space", "SPACE", "INCLUDED"), line("valet", "GUESTS", "TO_CONFIRM")]);
    expect(groups.map((g) => g.section)).toEqual(["SPACE", "BAR", "GUESTS"]);
    expect(groups[0].label).toBe("The space");
  });

  it("keeps each section in its own order", () => {
    const [g] = groupPackage([line("b", "BAR", "INCLUDED", 2), line("a", "BAR", "INCLUDED", 1)]);
    expect(g.lines.map((l) => l.id)).toEqual(["a", "b"]);
  });

  it("counts by status and says it in words, without zeros", () => {
    const s = packageSummary([line("a", "BAR", "INCLUDED"), line("b", "BAR", "INCLUDED"), line("c", "STAFF", "EXTRA_COST"), line("d", "BAR", "TO_CONFIRM")]);
    expect(s).toMatchObject({ INCLUDED: 2, EXTRA_COST: 1, NOT_INCLUDED: 0, TO_CONFIRM: 1, total: 4 });
    expect(summaryWords(s)).toBe("2 included · 1 costs extra · 1 to confirm");
    expect(summaryWords(packageSummary([]))).toBe("Nothing listed yet");
  });

  it("adds new lines at the end", () => {
    expect(nextPackageOrder([])).toBe(0);
    expect(nextPackageOrder([{ sortOrder: 3 }, { sortOrder: 7 }])).toBe(8);
  });

  it("seeds only what the contract confirms as settled; everything from listings is still to confirm", () => {
    const keys = VENUE_PACKAGE.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
    const settled = VENUE_PACKAGE.filter((p) => p.status !== "TO_CONFIRM").map((p) => p.key);
    expect(settled.sort()).toEqual(["venue-pkg-event-125", "venue-pkg-maitre-d", "venue-pkg-vendor-access"]);
    expect(VENUE_PACKAGE.find((p) => p.key === "venue-pkg-maitre-d")?.status).toBe("EXTRA_COST");
  });
});
