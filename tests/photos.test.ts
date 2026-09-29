import { describe, expect, it } from "vitest";
import { SHOT_MOMENTS, SHOT_PARTS, shotCounts, STANDARD_SHOT_LIST, templateRows } from "../src/lib/domain/photos";

describe("standard shot list", () => {
  it("covers every moment of the day except Other", () => {
    const moments = new Set(STANDARD_SHOT_LIST.map((s) => s.moment));
    for (const m of SHOT_MOMENTS.filter((m) => m !== "OTHER")) expect(moments.has(m), m).toBe(true);
    expect(moments.has("OTHER")).toBe(false);
  });

  it("groups every moment into one part of the day, in order", () => {
    expect(SHOT_PARTS.flatMap((p) => p.moments)).toEqual(SHOT_MOMENTS);
  });

  it("runs in the order of the day", () => {
    const order = STANDARD_SHOT_LIST.map((s) => SHOT_MOMENTS.indexOf(s.moment));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("has the details a planner would ask for", () => {
    const details = STANDARD_SHOT_LIST.filter((s) => s.moment === "DETAILS").map((s) => s.description.toLowerCase());
    for (const word of ["band", "invitation", "shoes", "flowers"]) {
      expect(details.some((d) => d.includes(word)), word).toBe(true);
    }
  });

  it("writes family groupings by role, with everyone who needs to be there", () => {
    const family = STANDARD_SHOT_LIST.filter((s) => s.moment === "FAMILY");
    const titles = family.map((s) => s.description);
    expect(titles).toContain("Couple with the bride's parents");
    expect(titles).toContain("Couple with the groom's parents");
    expect(titles).toContain("Couple with both families");
    expect(titles).toContain("Couple with both sets of parents");
    expect(titles.some((t) => /grandparents/.test(t))).toBe(true);
    for (const s of family) expect(s.people, s.description).toBeTruthy();
  });

  it("puts the biggest family photo in the middle, so each side only builds up or peels away", () => {
    const family = STANDARD_SHOT_LIST.filter((s) => s.moment === "FAMILY").map((s) => s.description);
    const both = family.indexOf("Couple with both families");
    expect(family.slice(0, both).every((t) => t.includes("bride's"))).toBe(true);
    expect(family[both + 1]).toBe("Couple with the groom's extended family");
  });

  it("plans golden hour around a 7:30 PM sunset", () => {
    const golden = STANDARD_SHOT_LIST.find((s) => /golden hour/i.test(s.description));
    expect(golden?.moment).toBe("COUPLE");
    expect(golden?.isMustHave).toBe(true);
    expect(golden?.description).toMatch(/7:30 PM/);
  });

  it("marks the moments that can't be redone as must-haves", () => {
    const must = STANDARD_SHOT_LIST.filter((s) => s.isMustHave).map((s) => s.description);
    expect(must).toContain("The first kiss");
    expect(must).toContain("Vows and the ring exchange");
    expect(must).toContain("The first dance");
  });

  it("has no repeats and never names either partner", () => {
    const titles = STANDARD_SHOT_LIST.map((s) => s.description);
    expect(new Set(titles).size).toBe(titles.length);
    expect(JSON.stringify(STANDARD_SHOT_LIST)).not.toMatch(/Rondell|Capri/);
  });

  it("numbers rows within each moment", () => {
    const rows = templateRows();
    expect(rows).toHaveLength(STANDARD_SHOT_LIST.length);
    const family = rows.filter((r) => r.moment === "FAMILY").map((r) => r.sortOrder);
    expect(family).toEqual(family.map((_, i) => i));
    expect(rows.find((r) => r.moment === "RECEPTION")?.sortOrder).toBe(0);
  });
});

describe("shot counts", () => {
  it("counts shots, must-haves and family groupings", () => {
    expect(shotCounts([])).toEqual({ total: 0, mustHaves: 0, family: 0 });
    expect(
      shotCounts([
        { moment: "FAMILY", isMustHave: true },
        { moment: "FAMILY", isMustHave: false },
        { moment: "DETAILS", isMustHave: true },
        { moment: "RECEPTION", isMustHave: false },
      ]),
    ).toEqual({ total: 4, mustHaves: 2, family: 2 });
  });
});
