import { describe, expect, it } from "vitest";
import { CATEGORIES, VENUE, VENUE_PACKAGE } from "../prisma/seed/data";
import { groupPackage, nextPackageOrder, openChoices, packageSummary, splitIncluded, summaryWords, type PackageLine } from "../src/lib/domain/package";

const line = (
  id: string,
  section: PackageLine["section"],
  status: PackageLine["status"],
  sortOrder = 0,
  choice: string | null = null,
  chosen: string | null = null,
): PackageLine => ({
  id,
  section,
  name: id,
  status,
  notes: null,
  choice,
  chosen,
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

  it("lists what's still to choose, in contract order, leaving out what's decided or not included", () => {
    const lines = [
      line("cake", "DESSERT", "INCLUDED", 0, "Flavors"),
      line("entrees", "DINNER", "INCLUDED", 0, "One meat, one chicken, one fish"),
      line("linens", "TABLES", "INCLUDED", 0, "Colors", "Ivory and gold"),
      line("sushi", "COCKTAIL_HOUR", "NOT_INCLUDED", 0, "Rolls"),
      line("valet", "GUESTS", "INCLUDED"),
    ];
    expect(openChoices(lines).map((l) => l.id)).toEqual(["entrees", "cake"]);
    const { inPackage, notIncluded } = splitIncluded(lines);
    expect(notIncluded.map((l) => l.id)).toEqual(["sushi"]);
    expect(inPackage).toHaveLength(4);
  });
});

describe("the signed venue contract", () => {
  const pkg = (key: string) => VENUE_PACKAGE.find((p) => p.key === key);

  it("has one line per item, each with a key of its own", () => {
    const keys = VENUE_PACKAGE.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("includes the live music and the cake, so the budget doesn't pay for them twice", () => {
    expect(pkg("venue-pkg-ceremony-music")?.status).toBe("INCLUDED");
    expect(pkg("venue-pkg-cocktail-music")?.status).toBe("INCLUDED");
    expect(pkg("venue-pkg-cake")?.status).toBe("INCLUDED");
    const names = CATEGORIES.map((c) => c.name.toLowerCase());
    expect(names.some((n) => n.includes("ceremony music"))).toBe(false);
    expect(names.some((n) => n.includes("cake"))).toBe(false);
    // Reception music isn't included, so the DJ keeps its line.
    expect(names).toContain("music / dj");
    expect([...VENUE.alsoCovers].sort()).toEqual(["CAKE", "CATERING", "MUSIC_CEREMONY"]);
  });

  it("shows the options marked No, and the choices the package leaves to us", () => {
    for (const k of ["venue-pkg-sushi", "venue-pkg-viennese", "venue-pkg-kosher", "venue-pkg-security"]) expect(pkg(k)?.status, k).toBe("NOT_INCLUDED");
    expect(pkg("venue-pkg-entrees")?.choice).toMatch(/meat.*chicken.*fish/);
    expect(VENUE_PACKAGE.filter((p) => p.choice).length).toBeGreaterThanOrEqual(12);
    // Nothing marked not included asks us to choose anything.
    expect(VENUE_PACKAGE.some((p) => p.status === "NOT_INCLUDED" && p.choice)).toBe(false);
  });

  it("keeps the maître d' fee as an extra and flags the outside-vendor fee", () => {
    expect(pkg("venue-pkg-maitre-d")?.status).toBe("EXTRA_COST");
    expect(pkg("venue-pkg-outside-vendors")?.status).toBe("EXTRA_COST");
  });
});
