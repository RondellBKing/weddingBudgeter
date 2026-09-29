import { describe, expect, it } from "vitest";
import { cd, daysBetween, type CalendarDate } from "../src/lib/dates";
import {
  afterMidnight,
  buildRehearsalTemplate,
  buildWeddingDayTemplate,
  dateHint,
  daySchedule,
  durationMinutes,
  formatDuration,
  fromMinutes,
  otherDays,
  parseViewKey,
  rehearsalTemplateError,
  scheduleSpan,
  timelineDays,
  timelineHref,
  timeRangeError,
  toMinutes,
  vendorForCategory,
  viewKeyFor,
  weddingTemplateError,
  type ArrivalVendor,
  type TemplateItem,
  type TimelineEntry,
} from "../src/lib/domain/timeline";

const WEDDING = cd("2028-04-13");
const VENUE = "The Estate at Florentine Gardens";

/** Minutes from the wedding day's midnight, so after-midnight rows sort after 11:59 PM. */
function abs(item: { date: CalendarDate; startTime: string }): number {
  return daysBetween(WEDDING, item.date) * 1440 + toMinutes(item.startTime);
}
function absEnd(item: TemplateItem): number | null {
  return item.endTime === null ? null : daysBetween(WEDDING, item.date) * 1440 + toMinutes(item.endTime);
}

function build(ceremonyTime: string, firstLook = true, venueAccessTime = "06:00") {
  return buildWeddingDayTemplate({ weddingDate: WEDDING, ceremonyTime, venueAccessTime, venueName: VENUE, firstLook });
}

/** Every ceremony time from 10:00 to 19:00, five minutes apart. */
const CEREMONY_TIMES = Array.from({ length: (19 - 10) * 12 + 1 }, (_, i) => fromMinutes(600 + i * 5));

const MAIN_LINE_FIRST_LOOK = [
  "getting-dressed",
  "first-look",
  "party-family-photos",
  "guests-arrive",
  "ceremony",
  "cocktail-hour",
  "grand-entrance",
  "welcome",
  "meal",
  "toasts",
  "parent-dances",
  "cake-cutting",
  "open-dancing",
  "last-dance",
  "send-off",
  "load-out",
];

describe("clock times", () => {
  it("converts HH:MM to minutes and back", () => {
    expect(toMinutes("00:00")).toBe(0);
    expect(toMinutes("16:30")).toBe(990);
    expect(toMinutes("23:59")).toBe(1439);
    expect(fromMinutes(990)).toBe("16:30");
    expect(fromMinutes(5)).toBe("00:05");
    expect(() => toMinutes("24:00")).toThrow();
    expect(() => toMinutes("4:30")).toThrow();
    expect(() => fromMinutes(1440)).toThrow();
  });

  it("derives duration only when the end is after the start", () => {
    expect(durationMinutes("16:00", "16:30")).toBe(30);
    expect(durationMinutes("16:00", null)).toBeNull();
    expect(durationMinutes("16:00", "16:00")).toBeNull();
    expect(durationMinutes("23:00", "01:00")).toBeNull();
  });

  it("formats durations plainly", () => {
    expect(formatDuration(5)).toBe("5 min");
    expect(formatDuration(60)).toBe("1 hr");
    expect(formatDuration(90)).toBe("1 hr 30 min");
    expect(formatDuration(300)).toBe("5 hr");
  });

  it("requires the end after the start, and sends after-midnight time to the next date", () => {
    expect(timeRangeError("16:00", null, WEDDING)).toBeNull();
    expect(timeRangeError("16:00", "16:30", WEDDING)).toBeNull();
    expect(timeRangeError("16:00", "16:00", WEDDING)).toMatch(/Leave the end blank/);
    const pastMidnight = timeRangeError("23:00", "01:00", WEDDING);
    expect(pastMidnight).toMatch(/past midnight/);
    expect(pastMidnight).toMatch(/Friday, April 14, 2028/);
  });
});

describe("the three days", () => {
  it("is the rehearsal, the wedding and the day after", () => {
    expect(timelineDays(WEDDING).map((d) => [d.key, d.date])).toEqual([
      ["rehearsal", "2028-04-12"],
      ["wedding", "2028-04-13"],
      ["after", "2028-04-14"],
    ]);
    expect(viewKeyFor(cd("2028-04-12"), WEDDING)).toBe("rehearsal");
    expect(viewKeyFor(cd("2028-04-14"), WEDDING)).toBe("after");
    expect(viewKeyFor(cd("2028-04-15"), WEDDING)).toBe("other");
    expect(viewKeyFor(cd("2028-04-11"), WEDDING)).toBe("other");
  });

  it("names the three days under the date field", () => {
    expect(dateHint(WEDDING)).toBe("Rehearsal Wed, Apr 12 · Wedding Thu, Apr 13 · Day after Fri, Apr 14");
  });

  it("reads the view from the URL, defaulting to the wedding day", () => {
    expect(parseViewKey(undefined)).toBe("wedding");
    expect(parseViewKey("after")).toBe("after");
    expect(parseViewKey(["rehearsal"])).toBe("rehearsal");
    expect(parseViewKey("nonsense")).toBe("wedding");
    expect(timelineHref("wedding")).toBe("/timeline");
    expect(timelineHref("other", "item-1")).toBe("/timeline?day=other#item-1");
  });
});

function entry(partial: Partial<TimelineEntry> & { id: string; date: CalendarDate; startTime: string }): TimelineEntry {
  return {
    endTime: null,
    title: partial.id,
    location: null,
    lead: null,
    involves: null,
    notes: null,
    vendor: null,
    isDemo: false,
    ...partial,
  };
}

const VENDORS: ArrivalVendor[] = [
  { id: "florist", name: "Petal & Stem", category: "FLORAL", status: "BOOKED", arrivalTime: "08:00" },
  { id: "dj", name: "Northside Sound", category: "MUSIC_DJ", status: "QUOTED", arrivalTime: "14:00" },
  { id: "photo", name: "Lumen", category: "PHOTOGRAPHY", status: "BOOKED", arrivalTime: null },
  { id: "misc", name: "Sparkler Co.", category: "OTHER", status: "BOOKED", arrivalTime: "15:00" },
];

describe("a day's run of show", () => {
  const items = [
    entry({ id: "ceremony", date: WEDDING, startTime: "16:00", endTime: "16:30" }),
    entry({ id: "setup", date: WEDDING, startTime: "08:00", endTime: "12:00" }),
    entry({ id: "brunch", date: cd("2028-04-14"), startTime: "11:00" }),
    entry({ id: "send-off", date: cd("2028-04-14"), startTime: "00:30" }),
  ];

  it("merges venue access and booked vendors' arrivals into the wedding day, sorted", () => {
    const rows = daySchedule({ date: WEDDING, items, weddingDate: WEDDING, vendors: VENDORS, venueAccessTime: "06:00", venueName: VENUE });
    expect(rows.map((r) => [r.startTime, r.source, r.title])).toEqual([
      ["06:00", "venue", "Venue opens to vendors"],
      ["08:00", "vendor", "Florist arrives"],
      ["08:00", "item", "setup"],
      ["15:00", "vendor", "Sparkler Co. arrives"],
      ["16:00", "item", "ceremony"],
    ]);
    expect(rows[1].vendor).toEqual({ id: "florist", name: "Petal & Stem" });
    expect(rows[1].itemId).toBeNull();
  });

  it("adds no derived rows on other days", () => {
    const rows = daySchedule({ date: cd("2028-04-14"), items, weddingDate: WEDDING, vendors: VENDORS, venueAccessTime: "06:00", venueName: VENUE });
    expect(rows.map((r) => r.itemId)).toEqual(["send-off", "brunch"]);
  });

  it("carries the wedding night's small hours and spans past midnight", () => {
    const next = daySchedule({ date: cd("2028-04-14"), items, weddingDate: WEDDING, vendors: [], venueAccessTime: "06:00", venueName: VENUE });
    const night = afterMidnight(next, "06:00");
    expect(night.map((r) => r.itemId)).toEqual(["send-off"]);
    const day = daySchedule({ date: WEDDING, items, weddingDate: WEDDING, vendors: [], venueAccessTime: "06:00", venueName: VENUE });
    expect(scheduleSpan(day, night)).toEqual({ from: "06:00", to: "00:30", nextDay: true });
    expect(scheduleSpan(day)).toEqual({ from: "06:00", to: "16:30", nextDay: false });
    expect(scheduleSpan([])).toBeNull();
  });

  it("groups items outside the three days by date", () => {
    const groups = otherDays(
      [
        entry({ id: "late", date: cd("2028-04-20"), startTime: "09:00" }),
        entry({ id: "early", date: cd("2028-04-01"), startTime: "18:00" }),
        entry({ id: "early2", date: cd("2028-04-01"), startTime: "10:00" }),
        ...items,
      ],
      WEDDING,
    );
    expect(groups.map((g) => [g.date, g.rows.map((r) => r.itemId)])).toEqual([
      ["2028-04-01", ["early2", "early"]],
      ["2028-04-20", ["late"]],
    ]);
  });
});

describe("wedding-day template", () => {
  it("builds the planner's order around a 4:00 PM ceremony", () => {
    const items = build("16:00");
    expect(items.map((i) => i.key)).toEqual([
      "setup",
      "hair-makeup",
      "photographer-arrives",
      "details",
      "getting-dressed",
      "first-look",
      "party-family-photos",
      "guests-arrive",
      "ceremony",
      "cocktail-hour",
      "grand-entrance",
      "welcome",
      "meal",
      "toasts",
      "parent-dances",
      "cake-cutting",
      "open-dancing",
      "last-dance",
      "send-off",
      "load-out",
    ]);
    const at = Object.fromEntries(items.map((i) => [i.key, [i.startTime, i.endTime]]));
    expect(at.setup).toEqual(["10:00", "15:00"]);
    expect(at["guests-arrive"]).toEqual(["15:30", "16:00"]);
    expect(at.ceremony).toEqual(["16:00", "16:30"]);
    expect(at["cocktail-hour"]).toEqual(["16:30", "17:30"]);
    expect(at["send-off"]).toEqual(["21:50", "22:00"]);
    expect(at["load-out"]).toEqual(["22:00", "23:00"]);
    expect(items.find((i) => i.key === "meal")!.title).toBe("Dinner");
    expect(items.every((i) => i.date === WEDDING)).toBe(true);
  });

  for (const firstLook of [true, false]) {
    it(`makes sense for every ceremony time from 10:00 AM to 7:00 PM (${firstLook ? "with" : "without"} a first look)`, () => {
      for (const time of CEREMONY_TIMES) {
        const items = build(time, firstLook);
        const byKey = new Map(items.map((i) => [i.key, i]));

        // The ceremony is exactly when they said.
        const ceremony = byKey.get("ceremony")!;
        expect([ceremony.date, ceremony.startTime], time).toEqual([WEDDING, time]);

        // Sorted by date and time, and every end after its start on the same date.
        for (let k = 1; k < items.length; k++) expect(abs(items[k]), `${time} ${items[k].key}`).toBeGreaterThanOrEqual(abs(items[k - 1]));
        for (const i of items) if (i.endTime) expect(toMinutes(i.endTime), `${time} ${i.key}`).toBeGreaterThan(toMinutes(i.startTime));

        // Nothing before the venue opens; only the wedding night rolls to the next date.
        for (const i of items) {
          if (i.date === WEDDING) expect(toMinutes(i.startTime), `${time} ${i.key}`).toBeGreaterThanOrEqual(360);
          else {
            expect(i.date, `${time} ${i.key}`).toBe("2028-04-14");
            expect(toMinutes(i.startTime), `${time} ${i.key}`).toBeLessThan(360);
          }
        }

        // The main line never overlaps: each moment starts once the one before has ended.
        const line = MAIN_LINE_FIRST_LOOK.filter((k) => firstLook || k !== "first-look");
        for (let k = 1; k < line.length; k++) {
          const prev = byKey.get(line[k - 1])!;
          const next = byKey.get(line[k])!;
          const prevEnd = absEnd(prev);
          if (prevEnd !== null) expect(abs(next), `${time} ${prev.key} → ${next.key}`).toBeGreaterThanOrEqual(prevEnd);
        }

        // The prep has real room: getting dressed takes at least 15 minutes and happens after
        // the photographer arrives.
        const dressed = byKey.get("getting-dressed")!;
        expect(absEnd(dressed)! - abs(dressed), time).toBeGreaterThanOrEqual(15);
        expect(abs(dressed), time).toBeGreaterThan(abs(byKey.get("photographer-arrives")!));

        // The first look is optional.
        expect(byKey.has("first-look"), time).toBe(firstLook);
        expect(byKey.has("photos-together"), time).toBe(!firstLook);
      }
    });
  }

  it("compresses a morning ceremony so nothing starts before the venue opens", () => {
    const items = build("10:00");
    const at = Object.fromEntries(items.map((i) => [i.key, [i.startTime, i.endTime]]));
    expect(at.setup).toEqual(["06:00", "09:00"]);
    expect(at["guests-arrive"]).toEqual(["09:30", "10:00"]);
    expect(Math.min(...items.map((i) => toMinutes(i.startTime)))).toBe(360);
    expect(items.find((i) => i.key === "meal")!.title).toBe("Lunch");
  });

  it("respects a later venue opening", () => {
    const items = build("16:00", true, "11:00");
    expect(items[0]).toMatchObject({ key: "setup", startTime: "11:00" });
    for (const i of items) expect(toMinutes(i.startTime)).toBeGreaterThanOrEqual(660);
  });

  it("rolls the end of a 7:00 PM wedding past midnight onto Friday", () => {
    const items = build("19:00");
    const byKey = new Map(items.map((i) => [i.key, i]));
    expect(byKey.get("open-dancing")).toMatchObject({ date: WEDDING, startTime: "22:25", endTime: null });
    expect(byKey.get("open-dancing")!.notes).toMatch(/^Runs until 12:45 AM, after midnight\./);
    expect(byKey.get("last-dance")).toMatchObject({ date: "2028-04-14", startTime: "00:45", endTime: "00:50" });
    expect(byKey.get("send-off")).toMatchObject({ date: "2028-04-14", startTime: "00:50", endTime: "01:00" });
    expect(byKey.get("load-out")).toMatchObject({ date: "2028-04-14", startTime: "01:00", endTime: "02:00" });
  });

  it("leaves out the photographer's arrival when their vendor page already has one", () => {
    const items = buildWeddingDayTemplate({
      weddingDate: WEDDING,
      ceremonyTime: "16:00",
      venueAccessTime: "06:00",
      venueName: VENUE,
      firstLook: true,
      arrivalsKnown: ["PHOTOGRAPHY"],
    });
    expect(items.some((i) => i.key === "photographer-arrives")).toBe(false);
    expect(items.some((i) => i.key === "details")).toBe(true);
  });

  it("only accepts ceremony times it was built for", () => {
    expect(weddingTemplateError("16:00", "06:00")).toBeNull();
    expect(weddingTemplateError("10:00", "06:00")).toBeNull();
    expect(weddingTemplateError("19:00", "06:00")).toBeNull();
    expect(weddingTemplateError("09:55", "06:00")).toMatch(/between 10:00 AM and 7:00 PM/);
    expect(weddingTemplateError("19:05", "06:00")).toMatch(/between 10:00 AM and 7:00 PM/);
    expect(weddingTemplateError("11:00", "09:00")).toMatch(/less than 3 hours/);
    expect(weddingTemplateError("4pm", "06:00")).toMatch(/Use a time/);
  });
});

describe("rehearsal-day template", () => {
  it("drops off, rehearses, then dinner", () => {
    const items = buildRehearsalTemplate({ rehearsalDate: cd("2028-04-12"), rehearsalTime: "17:00", venueName: VENUE });
    expect(items.map((i) => [i.key, i.date, i.startTime, i.endTime])).toEqual([
      ["drop-off", "2028-04-12", "16:00", "16:30"],
      ["rehearsal", "2028-04-12", "17:00", "18:00"],
      ["rehearsal-dinner", "2028-04-12", "18:30", "21:00"],
    ]);
  });

  it("keeps a late dinner on its own date and says when it ends", () => {
    const items = buildRehearsalTemplate({ rehearsalDate: cd("2028-04-12"), rehearsalTime: "20:00", venueName: VENUE });
    const dinner = items.find((i) => i.key === "rehearsal-dinner")!;
    expect(dinner).toMatchObject({ date: "2028-04-12", startTime: "21:30", endTime: null });
    expect(dinner.notes).toMatch(/^Runs until midnight\./);
  });

  it("checks the start time", () => {
    expect(rehearsalTemplateError("17:00")).toBeNull();
    expect(rehearsalTemplateError("08:00")).toMatch(/between 10:00 AM and 8:00 PM/);
    expect(rehearsalTemplateError("")).toMatch(/Use a time/);
  });
});

describe("linking template rows to vendors", () => {
  const vendors = [
    { id: "v1", name: "Venue", category: "VENUE" as const, alsoCovers: ["CATERING" as const], status: "BOOKED" as const },
    { id: "p2", name: "Zed Photo", category: "PHOTOGRAPHY" as const, alsoCovers: [], status: "BOOKED" as const },
    { id: "p1", name: "Aura Photo", category: "PHOTOGRAPHY" as const, alsoCovers: [], status: "BOOKED" as const },
    { id: "dj", name: "DJ", category: "MUSIC_DJ" as const, alsoCovers: [], status: "QUOTED" as const },
  ];

  it("picks a booked vendor by category, then by what a vendor also covers", () => {
    expect(vendorForCategory("PHOTOGRAPHY", vendors)?.id).toBe("p1");
    expect(vendorForCategory("CATERING", vendors)?.id).toBe("v1");
    expect(vendorForCategory("MUSIC_DJ", vendors)).toBeNull();
    expect(vendorForCategory(null, vendors)).toBeNull();
  });
});
