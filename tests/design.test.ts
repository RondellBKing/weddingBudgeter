import { describe, expect, it } from "vitest";
import { PALETTE } from "../prisma/seed/data";
import { cd, type CalendarDate } from "../src/lib/dates";
import {
  contrastRatio,
  coolToneNote,
  decorDateErrors,
  decorStatus,
  decorSummary,
  designHref,
  groupByArea,
  matchesBoard,
  mixHex,
  moveInList,
  needsReturn,
  nextDecorStep,
  parseBoardFilters,
  parseDesignView,
  parseHex,
  parseHttpUrl,
  placeholderTint,
  relativeLuminance,
  safeDesignBack,
  sourceHost,
  swatchInk,
  SWATCH_INK,
  type DecorDates,
} from "../src/lib/domain/design";
import { DESIGN_AREA_LABEL, valuesOf } from "../src/lib/labels";

const AREAS = valuesOf(DESIGN_AREA_LABEL);
const today = cd("2027-11-07"); // the day DST ends in New York

describe("parseHex", () => {
  it("normalizes to #RRGGBB", () => {
    expect(parseHex("#b5706b")).toBe("#B5706B");
    expect(parseHex("B5706B")).toBe("#B5706B");
    expect(parseHex("  #d9a3a0 ")).toBe("#D9A3A0");
  });
  it("rejects anything that isn't six hex digits", () => {
    for (const bad of ["", "#fff", "#12345", "#1234567", "#GGGGGG", "rgb(1,2,3)", "##B5706B", null, undefined]) {
      expect(parseHex(bad)).toBeNull();
    }
  });
});

describe("contrast and swatch ink", () => {
  it("matches the WCAG reference points", () => {
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 5);
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#B5706B", "#B5706B")).toBeCloseTo(1, 5);
    // Documented in globals.css: chocolate on ivory is 11.8:1.
    expect(contrastRatio("#3E2B22", "#F7F0E8")).toBeCloseTo(11.8, 1);
  });

  it("puts dark ink on the light palette colors and paper on the deep one", () => {
    const ink = Object.fromEntries(PALETTE.map((c) => [c.name, swatchInk(c.hex).tone]));
    expect(ink).toEqual({ "Dusty Rose": "dark", "Desert Rose": "dark", "Chocolate Brown": "light", Gold: "dark" });
  });

  it("always picks the better of the two inks", () => {
    for (const hex of ["#FFFFFF", "#000000", "#777777", "#B5706B", "#6B7A5A", "#F7F0E8", "#3E2B22", "#FFD700"]) {
      const s = swatchInk(hex);
      const other = s.tone === "dark" ? SWATCH_INK.light : SWATCH_INK.dark;
      expect(s.contrast).toBeGreaterThanOrEqual(contrastRatio(hex, other));
    }
  });

  it("keeps every seeded swatch readable at AA for normal text", () => {
    for (const c of PALETTE) expect(swatchInk(c.hex).contrast).toBeGreaterThanOrEqual(4.5);
  });

  it("stays readable for large text on any color", () => {
    for (let v = 0; v <= 255; v += 5) {
      const hex = `#${[v, v, v].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
      expect(swatchInk(hex).contrast).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("mixHex and placeholder tints", () => {
  it("blends between two colors", () => {
    expect(mixHex("#000000", "#FFFFFF", 1)).toBe("#000000");
    expect(mixHex("#000000", "#FFFFFF", 0)).toBe("#FFFFFF");
    expect(mixHex("#000000", "#FFFFFF", 0.5)).toBe("#808080");
    expect(mixHex("#000000", "#FFFFFF", 7)).toBe("#000000");
  });

  it("is stable per item and drawn from the palette", () => {
    const palette = PALETTE.map((c) => c.hex);
    const a = placeholderTint("item-a", palette);
    expect(placeholderTint("item-a", palette)).toEqual(a);
    const allowed = new Set(palette.flatMap((hex) => [mixHex(hex, "#FFFCF8", 0.26), hex]));
    for (let i = 0; i < 20; i++) expect(allowed.has(placeholderTint(`seed-${i}`, palette).background)).toBe(true);
  });

  it("washes light colors and makes a deep card of dark ones", () => {
    const backgrounds = new Set(Array.from({ length: 40 }, (_, i) => placeholderTint(`seed-${i}`, ["#D9A3A0", "#3E2B22"]).background));
    expect(backgrounds).toEqual(new Set([mixHex("#D9A3A0", "#FFFCF8", 0.26), "#3E2B22"]));
    expect(placeholderTint("any", ["#3E2B22"]).ink).toBe(SWATCH_INK.light);
    expect(placeholderTint("any", ["#D9A3A0"]).ink).toBe(SWATCH_INK.dark);
  });

  it("keeps the title readable on every wash", () => {
    const palette = [...PALETTE.map((c) => c.hex), "#000000", "#FFFFFF"];
    for (let i = 0; i < 40; i++) {
      const t = placeholderTint(`seed-${i}`, palette);
      expect(contrastRatio(t.background, t.ink)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("falls back to built-in warm tints when the palette is empty or invalid", () => {
    const t = placeholderTint("x", []);
    expect(t.background).toMatch(/^#[0-9A-F]{6}$/);
    expect(placeholderTint("x", ["not a color"])).toEqual(t);
  });
});

describe("coolToneNote", () => {
  it("flags silver and grey-blue", () => {
    expect(coolToneNote("#C0C0C0")).toMatch(/silver/);
    expect(coolToneNote("#A8A9AD")).toMatch(/silver/);
    expect(coolToneNote("#9FB4C7")).toMatch(/cool/);
    expect(coolToneNote("#4A6FA5")).toMatch(/cool/);
  });
  it("leaves the warm palette, warm greys, sage, black and white alone", () => {
    for (const hex of [...PALETTE.map((c) => c.hex), "#7A6558", "#A89F97", "#6B7A5A", "#F7F0E8", "#FFFFFF", "#000000"]) {
      expect(coolToneNote(hex)).toBeNull();
    }
  });
});

describe("links", () => {
  it("accepts http(s) links, adding https:// when it's missing", () => {
    expect(parseHttpUrl("https://www.pinterest.com/pin/123/")).toBe("https://www.pinterest.com/pin/123/");
    expect(parseHttpUrl("http://example.com/a.jpg")).toBe("http://example.com/a.jpg");
    expect(parseHttpUrl("pinterest.com/pin/123")).toBe("https://pinterest.com/pin/123");
  });
  it("rejects other schemes and junk", () => {
    for (const bad of ["javascript:alert(1)", "data:image/png;base64,AAAA", "ftp://example.com/a", "not a link", "", null]) {
      expect(parseHttpUrl(bad)).toBeNull();
    }
  });
  it("shows the host without www", () => {
    expect(sourceHost("https://www.pinterest.com/pin/123/")).toBe("pinterest.com");
    expect(sourceHost("https://shop.example.co.uk/x")).toBe("shop.example.co.uk");
  });
});

describe("board filters and links", () => {
  it("reads the view, area and favorites from the query string", () => {
    expect(parseDesignView({})).toBe("board");
    expect(parseDesignView({ view: "palette" })).toBe("palette");
    expect(parseDesignView({ view: ["decor", "palette"] })).toBe("decor");
    expect(parseDesignView({ view: "nope" })).toBe("board");
    expect(parseBoardFilters({ area: "FLOWERS", fav: "1" }, AREAS)).toEqual({ area: "FLOWERS", favorites: true });
    expect(parseBoardFilters({ area: "BOGUS" }, AREAS)).toEqual({ area: null, favorites: false });
  });

  it("builds links that round-trip", () => {
    expect(designHref("board")).toBe("/design");
    expect(designHref("palette", { area: "FLOWERS" })).toBe("/design?view=palette");
    expect(designHref("board", { area: "FLOWERS", favorites: true })).toBe("/design?area=FLOWERS&fav=1");
    const params = Object.fromEntries(new URLSearchParams(designHref("board", { area: "CAKE", favorites: true }).split("?")[1]));
    expect(parseBoardFilters(params, AREAS)).toEqual({ area: "CAKE", favorites: true });
  });

  it("only goes back to our own pages", () => {
    expect(safeDesignBack("/design?area=CAKE")).toBe("/design?area=CAKE");
    expect(safeDesignBack("/design")).toBe("/design");
    expect(safeDesignBack("/designer")).toBe("/design");
    expect(safeDesignBack("https://evil.example/design")).toBe("/design");
    expect(safeDesignBack("//evil.example")).toBe("/design");
    expect(safeDesignBack(null, "/design?view=decor")).toBe("/design?view=decor");
  });

  it("filters and groups by area in the label order", () => {
    const rows = [
      { id: "1", area: "FLOWERS" as const, isFavorite: false },
      { id: "2", area: "OVERALL" as const, isFavorite: true },
      { id: "3", area: "FLOWERS" as const, isFavorite: true },
    ];
    expect(groupByArea(rows, AREAS).map((g) => [g.area, g.items.map((i) => i.id)])).toEqual([
      ["OVERALL", ["2"]],
      ["FLOWERS", ["1", "3"]],
    ]);
    expect(rows.filter((r) => matchesBoard(r, { area: "FLOWERS", favorites: true })).map((r) => r.id)).toEqual(["3"]);
    expect(rows.filter((r) => matchesBoard(r, { area: null, favorites: false }))).toHaveLength(3);
  });
});

describe("moveInList", () => {
  const ids = ["rose", "desert", "choc", "gold"];
  it("swaps with the neighbor", () => {
    expect(moveInList(ids, "choc", "up")).toEqual(["rose", "choc", "desert", "gold"]);
    expect(moveInList(ids, "rose", "down")).toEqual(["desert", "rose", "choc", "gold"]);
  });
  it("leaves the ends and unknown ids alone, without mutating", () => {
    expect(moveInList(ids, "rose", "up")).toEqual(ids);
    expect(moveInList(ids, "gold", "down")).toEqual(ids);
    expect(moveInList(ids, "silver", "up")).toEqual(ids);
    expect(ids).toEqual(["rose", "desert", "choc", "gold"]);
  });
});

type Item = { id: string; name: string; source: "VENUE" | "VENDOR" | "RENTAL" | "PURCHASE" | "DIY" | "BORROWED" } & DecorDates;
const none: DecorDates = { orderedOn: null, receivedOn: null, returnBy: null, returnedOn: null };
const item = (source: Item["source"], d: Partial<Record<keyof DecorDates, string>> = {}, name = "Thing"): Item => ({
  id: name,
  name,
  source,
  orderedOn: d.orderedOn ? cd(d.orderedOn) : null,
  receivedOn: d.receivedOn ? cd(d.receivedOn) : null,
  returnBy: d.returnBy ? cd(d.returnBy) : null,
  returnedOn: d.returnedOn ? cd(d.returnedOn) : null,
});

describe("decorStatus", () => {
  it("walks Idea → Ordered → Received for things we keep", () => {
    expect(decorStatus(item("PURCHASE"), today)).toMatchObject({ key: "idea", label: "Idea", tone: "neutral" });
    expect(decorStatus(item("PURCHASE", { orderedOn: "2027-10-01" }), today)).toMatchObject({
      key: "ordered",
      label: "Ordered",
      detail: "Ordered Oct 1",
    });
    expect(decorStatus(item("PURCHASE", { orderedOn: "2027-10-01", receivedOn: "2027-10-20" }), today)).toMatchObject({
      key: "received",
      label: "Received",
      detail: "Received Oct 20",
      tone: "on-track",
    });
  });

  it("shows the year when the date is in another year", () => {
    expect(decorStatus(item("DIY", { orderedOn: "2026-12-30" }), today).detail).toBe("Ordered Dec 30, 2026");
  });

  it("counts down to the return date for rentals and borrowed pieces", () => {
    const due = decorStatus(item("RENTAL", { orderedOn: "2027-10-01", receivedOn: "2027-11-01", returnBy: "2027-11-30" }), today);
    expect(due).toMatchObject({ key: "return-due", label: "Return by Nov 30", tone: "on-track" });
    expect(due.detail).toBe("Received Nov 1. Due back in 23 days");

    const soon = decorStatus(item("BORROWED", { receivedOn: "2027-11-01", returnBy: "2027-11-14" }), today);
    expect(soon).toMatchObject({ key: "return-due", tone: "due-soon" });
  });

  it("is on time through the return date and overdue the day after", () => {
    const rental = item("RENTAL", { receivedOn: "2027-11-01", returnBy: "2027-11-07" });
    expect(decorStatus(rental, today)).toMatchObject({ key: "return-due", tone: "due-soon" });
    expect(decorStatus(rental, today).detail).toBe("Received Nov 1. Due back today");
    const late = decorStatus(rental, cd("2027-11-08"));
    expect(late).toMatchObject({ key: "return-overdue", label: "Return overdue", tone: "overdue" });
    expect(late.detail).toBe("Was due Nov 7 (1 day overdue)");
  });

  it("ends at Returned", () => {
    const s = decorStatus(item("RENTAL", { receivedOn: "2027-11-01", returnBy: "2027-11-03", returnedOn: "2027-11-05" }), today);
    expect(s).toMatchObject({ key: "returned", label: "Returned", detail: "Returned Nov 5" });
  });

  it("holds a received rental with no return date at Received and says so", () => {
    const s = decorStatus(item("RENTAL", { receivedOn: "2027-11-01" }), today);
    expect(s).toMatchObject({ key: "received", label: "Received" });
    expect(s.detail).toMatch(/No return date yet/);
  });

  it("treats anything given a return date as going back", () => {
    expect(needsReturn(item("PURCHASE"))).toBe(false);
    expect(needsReturn(item("VENUE", { returnBy: "2028-04-14" }))).toBe(true);
    expect(needsReturn(item("BORROWED"))).toBe(true);
    const s = decorStatus(item("VENDOR", { receivedOn: "2027-11-01", returnBy: "2027-11-02" }), today);
    expect(s.key).toBe("return-overdue");
  });

  it("mentions the return date while a rental is on order", () => {
    const s = decorStatus(item("RENTAL", { orderedOn: "2027-11-01", returnBy: "2028-04-17" }), today);
    expect(s).toMatchObject({ key: "ordered", detail: "Ordered Nov 1. Goes back by Apr 17, 2028" });
  });
});

describe("nextDecorStep", () => {
  it("offers the one step that moves an item along", () => {
    expect(nextDecorStep(item("PURCHASE"))).toBe("ordered");
    expect(nextDecorStep(item("PURCHASE", { orderedOn: "2027-10-01" }))).toBe("received");
    expect(nextDecorStep(item("PURCHASE", { orderedOn: "2027-10-01", receivedOn: "2027-10-02" }))).toBeNull();
    expect(nextDecorStep(item("RENTAL", { receivedOn: "2027-10-02" }))).toBe("returned");
    expect(nextDecorStep(item("BORROWED", { receivedOn: "2027-10-02", returnedOn: "2027-10-03" }))).toBeNull();
  });
});

describe("decorDateErrors", () => {
  it("accepts dates in order, or none at all", () => {
    expect(decorDateErrors(none)).toEqual({});
    const ok = item("RENTAL", { orderedOn: "2027-10-01", receivedOn: "2027-10-01", returnBy: "2027-10-01", returnedOn: "2027-10-01" });
    expect(decorDateErrors(ok)).toEqual({});
  });
  it("catches dates that can't all be true", () => {
    expect(decorDateErrors(item("RENTAL", { orderedOn: "2027-10-05", receivedOn: "2027-10-01" }))).toHaveProperty("receivedOn");
    expect(decorDateErrors(item("RENTAL", { receivedOn: "2027-10-05", returnBy: "2027-10-01" }))).toHaveProperty("returnBy");
    expect(decorDateErrors(item("RENTAL", { returnedOn: "2027-10-05" }))).toEqual({ returnedOn: "Add the day it arrived first." });
    expect(decorDateErrors(item("RENTAL", { receivedOn: "2027-10-05", returnedOn: "2027-10-01" }))).toHaveProperty("returnedOn");
  });
});

describe("decorSummary", () => {
  const items: Item[] = [
    item("PURCHASE", {}, "Table numbers"),
    item("DIY", { orderedOn: "2027-10-01" }, "Welcome sign"),
    item("PURCHASE", { orderedOn: "2027-10-01", receivedOn: "2027-10-10" }, "Candleholders"),
    item("RENTAL", { receivedOn: "2027-11-01", returnBy: "2027-11-20" }, "Chargers"),
    item("RENTAL", { receivedOn: "2027-11-01", returnBy: "2027-11-10" }, "Linens"),
    item("RENTAL", { receivedOn: "2027-10-01", returnBy: "2027-11-05" }, "Sample napkins"),
    item("BORROWED", { receivedOn: "2027-10-01", returnBy: "2027-10-20" }, "Cake stand"),
    item("BORROWED", { receivedOn: "2027-10-01", returnBy: "2027-10-02", returnedOn: "2027-10-02" }, "Lanterns"),
  ];

  it("counts by status and lists what's overdue, oldest first", () => {
    const s = decorSummary(items, today);
    expect(s.total).toBe(8);
    expect(s.counts).toEqual({ idea: 1, ordered: 1, received: 1, "return-due": 2, "return-overdue": 2, returned: 1 });
    expect(s.inHand).toBe(6);
    expect(s.overdue.map((o) => o.name)).toEqual(["Cake stand", "Sample napkins"]);
    expect(s.nextReturn).toMatchObject({ name: "Linens", returnBy: "2027-11-10" as CalendarDate });
  });

  it("is empty for an empty list", () => {
    const s = decorSummary([], today);
    expect(s.total).toBe(0);
    expect(s.overdue).toEqual([]);
    expect(s.nextReturn).toBeNull();
  });
});
