import { describe, expect, it } from "vitest";
import { cd } from "../src/lib/dates";
import { instantToZoned, offsetMinutesAt, parseClock, zonedTimeToInstant } from "../src/lib/domain/zoned-time";
import { APPOINTMENTS } from "../prisma/seed/data";

// Runs in TZ=America/New_York, UTC and Pacific/Kiritimati (UTC+14). Nothing here may depend on
// the machine's own zone.

const NY = "America/New_York";
const iso = (d: Date) => d.toISOString();
const at = (date: string, time: string, tz = NY) => zonedTimeToInstant(cd(date), time, tz);

describe("ordinary days", () => {
  it("reads summer times as EDT (UTC−4)", () => {
    const r = at("2028-04-13", "16:30");
    expect(r.kind).toBe("exact");
    expect(iso(r.instant)).toBe("2028-04-13T20:30:00.000Z");
  });

  it("reads winter times as EST (UTC−5)", () => {
    expect(iso(at("2027-01-15", "09:00").instant)).toBe("2027-01-15T14:00:00.000Z");
  });

  it("handles midnight and the last minute of the day", () => {
    expect(iso(at("2028-04-13", "00:00").instant)).toBe("2028-04-13T04:00:00.000Z");
    // 11:59 PM on the wedding day is already April 14 in UTC.
    expect(iso(at("2028-04-13", "23:59").instant)).toBe("2028-04-14T03:59:00.000Z");
    expect(iso(at("2027-12-31", "23:30").instant)).toBe("2028-01-01T04:30:00.000Z");
  });

  it("knows the offset at an instant", () => {
    expect(offsetMinutesAt(new Date("2028-04-13T20:30:00Z"), NY)).toBe(-240);
    expect(offsetMinutesAt(new Date("2027-01-15T14:00:00Z"), NY)).toBe(-300);
    expect(offsetMinutesAt(new Date("2027-01-15T14:00:00Z"), "UTC")).toBe(0);
  });
});

describe("fall back: Sunday, Nov 7, 2027 (the sizing deadline)", () => {
  it("is exact just before the repeated hour", () => {
    const r = at("2027-11-07", "00:59");
    expect(r.kind).toBe("exact");
    expect(iso(r.instant)).toBe("2027-11-07T04:59:00.000Z");
  });

  it("picks the first (EDT) 1:30 AM when it happens twice", () => {
    const r = at("2027-11-07", "01:30");
    expect(r.kind).toBe("ambiguous");
    expect(iso(r.instant)).toBe("2027-11-07T05:30:00.000Z");
    // The second 1:30 AM (EST) is an hour later; both read 1:30 in New York.
    expect(instantToZoned(new Date("2027-11-07T06:30:00Z"), NY)).toEqual({ date: "2027-11-07", time: "01:30" });
  });

  it("treats both edges of the repeated hour as ambiguous", () => {
    expect(at("2027-11-07", "01:00")).toMatchObject({ kind: "ambiguous" });
    expect(iso(at("2027-11-07", "01:00").instant)).toBe("2027-11-07T05:00:00.000Z");
    expect(iso(at("2027-11-07", "01:59").instant)).toBe("2027-11-07T05:59:00.000Z");
  });

  it("is exact again from 2:00 AM EST", () => {
    const r = at("2027-11-07", "02:00");
    expect(r.kind).toBe("exact");
    expect(iso(r.instant)).toBe("2027-11-07T07:00:00.000Z");
    expect(iso(at("2027-11-07", "23:59").instant)).toBe("2027-11-08T04:59:00.000Z");
  });

  it("puts noon on the 25-hour day at 17:00 UTC", () => {
    expect(iso(at("2027-11-07", "12:00").instant)).toBe("2027-11-07T17:00:00.000Z");
  });
});

describe("spring forward: Sunday, Mar 12, 2028", () => {
  it("is exact at 1:59 AM EST", () => {
    const r = at("2028-03-12", "01:59");
    expect(r.kind).toBe("exact");
    expect(iso(r.instant)).toBe("2028-03-12T06:59:00.000Z");
  });

  it("moves 2:30 AM, which never happens, forward to 3:30 AM EDT", () => {
    const r = at("2028-03-12", "02:30");
    expect(r.kind).toBe("skipped");
    expect(iso(r.instant)).toBe("2028-03-12T07:30:00.000Z");
    expect(instantToZoned(r.instant, NY)).toEqual({ date: "2028-03-12", time: "03:30" });
  });

  it("moves 2:00 AM forward to 3:00 AM", () => {
    const r = at("2028-03-12", "02:00");
    expect(r.kind).toBe("skipped");
    expect(instantToZoned(r.instant, NY).time).toBe("03:00");
  });

  it("is exact from 3:00 AM EDT", () => {
    const r = at("2028-03-12", "03:00");
    expect(r.kind).toBe("exact");
    expect(iso(r.instant)).toBe("2028-03-12T07:00:00.000Z");
  });

  it("also handles the 2027 change (Mar 14, 2027)", () => {
    expect(at("2027-03-14", "02:15").kind).toBe("skipped");
    expect(iso(at("2027-03-14", "03:15").instant)).toBe("2027-03-14T07:15:00.000Z");
  });
});

describe("round trips", () => {
  it("gives back the same wall time for every quarter hour of both change days", () => {
    for (const date of ["2027-11-07", "2028-03-12", "2028-04-13"]) {
      for (let minutes = 0; minutes < 24 * 60; minutes += 15) {
        const time = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
        const r = at(date, time);
        if (r.kind === "skipped") continue;
        expect(instantToZoned(r.instant, NY)).toEqual({ date, time });
      }
    }
  });

  it("fills an edit form from a stored instant", () => {
    expect(instantToZoned(new Date("2028-04-14T03:59:00Z"), NY)).toEqual({ date: "2028-04-13", time: "23:59" });
    expect(instantToZoned(new Date("2028-04-14T03:59:00Z"), "UTC")).toEqual({ date: "2028-04-14", time: "03:59" });
  });
});

describe("other zones", () => {
  it("works in UTC, a half-hour zone and UTC+14", () => {
    expect(iso(at("2028-04-13", "16:30", "UTC").instant)).toBe("2028-04-13T16:30:00.000Z");
    expect(iso(at("2028-04-13", "16:30", "Asia/Kolkata").instant)).toBe("2028-04-13T11:00:00.000Z");
    expect(iso(at("2028-04-13", "10:00", "Pacific/Kiritimati").instant)).toBe("2028-04-12T20:00:00.000Z");
  });

  it("handles a southern-hemisphere change (Sydney, first Sunday of April 2028)", () => {
    // Clocks go back from 3:00 AEDT to 2:00 AEST on April 2, 2028: 2:30 happens twice.
    const r = at("2028-04-02", "02:30", "Australia/Sydney");
    expect(r.kind).toBe("ambiguous");
    expect(iso(r.instant)).toBe("2028-04-01T15:30:00.000Z");
  });
});

describe("input checks", () => {
  it("parses 24-hour clock times only", () => {
    expect(parseClock("09:05")).toBe("09:05");
    expect(parseClock(" 23:59 ")).toBe("23:59");
    expect(parseClock("24:00")).toBeNull();
    expect(parseClock("9:05")).toBeNull();
    expect(parseClock("")).toBeNull();
  });

  it("refuses nonsense", () => {
    expect(() => zonedTimeToInstant(cd("2028-04-13"), "25:00")).toThrow();
    expect(() => zonedTimeToInstant("2027-02-29" as never, "10:00")).toThrow();
  });
});

describe("seeded appointments", () => {
  it("puts the venue's vendor preview at 6 PM New York time on Monday, Nov 16, 2026 (EST)", () => {
    const a = APPOINTMENTS.find((x) => x.key === "event-venue-vendor-preview-2026-11")!;
    const r = zonedTimeToInstant(a.date, a.time, NY);
    expect(r.kind).toBe("exact");
    expect(iso(r.instant)).toBe("2026-11-16T23:00:00.000Z");
    expect(new Date(`${a.date}T12:00:00Z`).getUTCDay()).toBe(1);
  });
});
