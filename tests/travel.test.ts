import { describe, expect, it } from "vitest";
import { cd } from "../src/lib/dates";
import {
  bagCount,
  bagItemStatus,
  bagProgress,
  cutoffCountdown,
  cutoffStatus,
  groupShuttles,
  nights,
  sortHotels,
  toBuy,
} from "../src/lib/domain/travel";

describe("hotel cutoff urgency", () => {
  const cutoff = cd("2028-03-13");

  it("steps up at 90, 60, 30, 14 and 7 days, with a word for every level", () => {
    expect(cutoffStatus(cutoff, cd("2027-10-01"))).toMatchObject({ level: "calm", tone: "on-track", label: "Plenty of time" });
    expect(cutoffStatus(cutoff, cd("2027-12-14"))).toMatchObject({ daysLeft: 90, level: "90", tone: "on-track" });
    expect(cutoffStatus(cutoff, cd("2028-01-13"))).toMatchObject({ daysLeft: 60, level: "60", label: "Under 60 days" });
    expect(cutoffStatus(cutoff, cd("2028-02-12"))).toMatchObject({ daysLeft: 30, level: "30", tone: "due-soon" });
    expect(cutoffStatus(cutoff, cd("2028-02-28"))).toMatchObject({ daysLeft: 14, level: "14", label: "Two weeks left" });
    expect(cutoffStatus(cutoff, cd("2028-03-13"))).toMatchObject({ daysLeft: 0, level: "7", label: "Final week" });
  });

  it("says the cutoff passed the day after, never 'overdue' for a hotel", () => {
    const s = cutoffStatus(cutoff, cd("2028-03-14"));
    expect(s).toMatchObject({ daysLeft: -1, level: "overdue", tone: "overdue", label: "Cutoff passed" });
    expect(s.message).toMatch(/regular rate/);
  });

  it("counts calendar days across the March DST change", () => {
    // Mar 12, 2028 is a 23-hour day in New York.
    expect(cutoffStatus(cd("2028-03-13"), cd("2028-03-11")).daysLeft).toBe(2);
  });

  it("words the countdown figure", () => {
    expect(cutoffCountdown(12)).toEqual({ figure: "12", caption: "days left" });
    expect(cutoffCountdown(1)).toEqual({ figure: "1", caption: "day left" });
    expect(cutoffCountdown(0)).toEqual({ figure: "Today", caption: "last day at the group rate" });
    expect(cutoffCountdown(-1)).toEqual({ figure: "1", caption: "day since the cutoff" });
    expect(cutoffCountdown(-1200)).toEqual({ figure: "1,200", caption: "days since the cutoff" });
  });

  it("counts nights and ignores out-of-order dates", () => {
    expect(nights(cd("2028-04-12"), cd("2028-04-14"))).toBe(2);
    expect(nights(cd("2028-04-14"), cd("2028-04-12"))).toBeNull();
    expect(nights(null, cd("2028-04-14"))).toBeNull();
  });

  it("sorts by the soonest cutoff, undated last", () => {
    const sorted = sortHotels([
      { name: "B", cutoffDate: null },
      { name: "C", cutoffDate: cd("2028-03-13") },
      { name: "A", cutoffDate: null },
      { name: "D", cutoffDate: cd("2028-02-01") },
    ]);
    expect(sorted.map((h) => h.name)).toEqual(["D", "C", "A", "B"]);
  });
});

describe("shuttles", () => {
  it("groups runs by day and orders each day by departure time", () => {
    const days = groupShuttles([
      { id: "late", date: cd("2028-04-13"), departTime: "22:30", seats: 24 },
      { id: "rehearsal", date: cd("2028-04-12"), departTime: "18:00", seats: null },
      { id: "early", date: cd("2028-04-13"), departTime: "09:05", seats: 12 },
      { id: "mid", date: cd("2028-04-13"), departTime: "15:15", seats: 24 },
    ]);
    expect(days.map((d) => d.date)).toEqual(["2028-04-12", "2028-04-13"]);
    expect(days[1].runs.map((r) => r.id)).toEqual(["early", "mid", "late"]);
    expect(days[1].seats).toBe(60);
    expect(days[0].seats).toBe(0);
  });
});

describe("welcome bags", () => {
  it("derives each item's status from its dates", () => {
    expect(bagItemStatus({ orderedOn: null, receivedOn: null })).toBe("not-ordered");
    expect(bagItemStatus({ orderedOn: cd("2028-02-01"), receivedOn: null })).toBe("ordered");
    expect(bagItemStatus({ orderedOn: cd("2028-02-01"), receivedOn: cd("2028-02-10") })).toBe("received");
    expect(bagItemStatus({ orderedOn: null, receivedOn: cd("2028-02-10") })).toBe("received");
  });

  it("suggests one bag per household that hasn't declined, pending included", () => {
    const count = bagCount([
      { householdName: "The Riveras", rsvpStatus: "ATTENDING" },
      { householdName: "the riveras", rsvpStatus: "DECLINED" },
      { householdName: "The Brooks Family", rsvpStatus: "PENDING" },
      { householdName: "Coleman", rsvpStatus: null },
      { householdName: "Hayes", rsvpStatus: "DECLINED" },
      { householdName: "Hayes", rsvpStatus: "DECLINED" },
    ]);
    expect(count).toEqual({ hasGuestList: true, bags: 3, households: 4 });
  });

  it("has nothing to count before there's a guest list", () => {
    const none = bagCount([]);
    expect(none).toEqual({ hasGuestList: false, bags: 0, households: 0 });
    expect(toBuy(2, none)).toBeNull();
  });

  it("multiplies per bag by the number of bags", () => {
    expect(toBuy(2, { hasGuestList: true, bags: 61, households: 64 })).toBe(122);
    expect(toBuy(1, { hasGuestList: true, bags: 0, households: 2 })).toBe(0);
  });

  it("tallies progress", () => {
    expect(
      bagProgress([
        { orderedOn: null, receivedOn: null },
        { orderedOn: cd("2028-01-01"), receivedOn: null },
        { orderedOn: cd("2028-01-01"), receivedOn: cd("2028-01-09") },
        { orderedOn: null, receivedOn: null },
      ]),
    ).toEqual({ total: 4, notOrdered: 2, ordered: 1, received: 1 });
  });
});
