import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  cd,
  daysBetween,
  dueState,
  formatClockTime,
  formatDate,
  fromDbDate,
  parseCalendarDate,
  toDbDate,
  todayIn,
  weekday,
} from "../src/lib/dates";

// This file runs three times: TZ=America/New_York, TZ=UTC and TZ=Pacific/Kiritimati (UTC+14).
// Every expectation must hold in all three.

describe("database date round trip", () => {
  it("reads a Postgres date as the same calendar day in every time zone", () => {
    // Prisma returns a `date` column as 00:00 UTC of that day.
    const fromPrisma = new Date(Date.UTC(2028, 3, 13));
    expect(fromDbDate(fromPrisma)).toBe("2028-04-13");
    expect(formatDate(fromDbDate(fromPrisma), "weekday-long")).toBe("Thursday, April 13, 2028");
  });

  it("avoids the classic one-day slide", () => {
    // new Date("2028-04-13") is midnight UTC, which is the evening of April 12 in New York.
    // Formatting it with the device zone is the bug; formatDate never does that.
    const naive = new Date("2028-04-13");
    expect(formatDate(fromDbDate(naive))).toBe("Apr 13, 2028");
  });

  it("writes a calendar date as midnight UTC", () => {
    expect(toDbDate(cd("2027-11-07")).toISOString()).toBe("2027-11-07T00:00:00.000Z");
  });

  it("validates real dates only", () => {
    expect(parseCalendarDate("2028-02-29")).toBe("2028-02-29");
    expect(parseCalendarDate("2027-02-29")).toBeNull();
    expect(parseCalendarDate("2027-13-01")).toBeNull();
    expect(parseCalendarDate("11/7/2027")).toBeNull();
  });
});

describe("today in New York", () => {
  it("is still Sept 28 at 9:30 pm EDT even though UTC has moved on", () => {
    expect(todayIn("America/New_York", new Date("2026-09-29T01:30:00Z"))).toBe("2026-09-28");
    expect(todayIn("UTC", new Date("2026-09-29T01:30:00Z"))).toBe("2026-09-29");
  });

  it("handles the Nov 7, 2027 fall-back day (the sizing deadline)", () => {
    // 11:59 pm EST on Nov 7 is 04:59 UTC on Nov 8.
    expect(todayIn("America/New_York", new Date("2027-11-08T04:59:00Z"))).toBe("2027-11-07");
    expect(todayIn("America/New_York", new Date("2027-11-08T05:00:00Z"))).toBe("2027-11-08");
  });
});

describe("calendar arithmetic", () => {
  it("counts whole days across both DST changes", () => {
    expect(daysBetween(cd("2027-11-06"), cd("2027-11-08"))).toBe(2); // 25-hour day in between
    expect(daysBetween(cd("2028-03-03"), cd("2028-04-01"))).toBe(29); // 23-hour day in between
  });

  it("matches the real countdowns as of Sept 28, 2026", () => {
    const today = cd("2026-09-28");
    expect(daysBetween(today, cd("2026-10-19"))).toBe(21); // venue payment 2
    expect(daysBetween(today, cd("2027-11-07"))).toBe(405); // sizing deadline
    expect(daysBetween(today, cd("2028-04-13"))).toBe(563); // wedding
  });

  it("adds months with end-of-month clamping", () => {
    expect(addMonths(cd("2028-04-13"), -18)).toBe("2026-10-13");
    expect(addMonths(cd("2028-03-31"), -1)).toBe("2028-02-29");
    expect(addMonths(cd("2027-03-31"), -1)).toBe("2027-02-28");
    expect(addMonths(cd("2027-12-15"), 1)).toBe("2028-01-15");
  });

  it("adds days across month and DST boundaries", () => {
    expect(addDays(cd("2027-11-07"), 1)).toBe("2027-11-08");
    expect(addDays(cd("2028-04-13"), -70)).toBe("2028-02-03");
    expect(addDays(cd("2028-03-01"), -1)).toBe("2028-02-29");
  });

  it("knows the weekdays in the brief", () => {
    expect(weekday(cd("2028-04-13"))).toBe(4); // Thursday
    expect(weekday(cd("2028-04-12"))).toBe(3); // Wednesday rehearsal
    expect(weekday(cd("2027-11-07"))).toBe(0); // Sunday
  });
});

describe("due state", () => {
  const today = cd("2026-09-28");
  it("is on time through the due date and overdue the day after", () => {
    expect(dueState(cd("2026-09-28"), today)).toBe("due-soon");
    expect(dueState(cd("2026-09-27"), today)).toBe("overdue");
    expect(dueState(cd("2026-10-19"), today)).toBe("due-soon");
    expect(dueState(cd("2027-10-19"), today)).toBe("on-track");
  });
});

describe("clock times", () => {
  it("formats wedding-day times", () => {
    expect(formatClockTime("06:00")).toBe("6:00 AM");
    expect(formatClockTime("12:30")).toBe("12:30 PM");
    expect(formatClockTime("00:15")).toBe("12:15 AM");
  });
});
