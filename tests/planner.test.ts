import { describe, expect, it } from "vitest";
import { cd, greetingFor, monthsAndDaysBetween } from "../src/lib/dates";
import { buildAgenda, groupByMonth } from "../src/lib/domain/agenda";
import { attireStatus, displayNames, dressMenu } from "../src/lib/domain/party";

describe("countdown wording", () => {
  it("breaks the wait into months and days", () => {
    expect(monthsAndDaysBetween(cd("2026-09-28"), cd("2028-04-13"))).toEqual({ months: 18, days: 16 });
    expect(monthsAndDaysBetween(cd("2028-04-13"), cd("2028-04-13"))).toEqual({ months: 0, days: 0 });
    expect(monthsAndDaysBetween(cd("2028-04-14"), cd("2028-04-13"))).toEqual({ months: 0, days: 0 });
  });

  it("greets by the time in New York, not the server", () => {
    // 01:30 UTC on Sept 29 is 9:30 pm on Sept 28 in New York.
    expect(greetingFor("America/New_York", new Date("2026-09-29T01:30:00Z"))).toBe("Good evening");
    expect(greetingFor("America/New_York", new Date("2026-09-28T13:00:00Z"))).toBe("Good morning");
    expect(greetingFor("America/New_York", new Date("2026-09-28T18:00:00Z"))).toBe("Good afternoon");
  });
});

describe("wedding party rules", () => {
  it("derives the dress menu from role and outfit, not side", () => {
    expect(dressMenu("BRIDESMAID", "DRESS")).toBe("A");
    expect(dressMenu("MAID_OF_HONOR", "DRESS")).toBe("B");
    expect(dressMenu("MATRON_OF_HONOR", "DRESS")).toBe("B");
    expect(dressMenu("BRIDESMAN", "SUIT")).toBe("C");
    expect(dressMenu("GROOMSMAN", "SUIT")).toBeNull();
  });

  it("derives attire status from the latest step with a date", () => {
    expect(attireStatus({})).toBe("NOT_STARTED");
    expect(attireStatus({ chosenStyleId: "x" })).toBe("STYLE_CHOSEN");
    expect(attireStatus({ chosenStyleId: "x", sizingSubmittedOn: new Date() })).toBe("SIZING_SUBMITTED");
    expect(attireStatus({ orderedOn: new Date(), readyOn: new Date() })).toBe("READY");
  });

  it("numbers blank names per role", () => {
    const names = displayNames([
      { id: "1", name: null, role: "BRIDESMAID" as const },
      { id: "2", name: "  ", role: "BRIDESMAID" as const },
      { id: "3", name: null, role: "BEST_MAN" as const },
      { id: "4", name: "Jordan", role: "GROOMSMAN" as const },
    ]);
    expect(names.get("1")).toEqual({ name: "Bridesmaid 1", isPlaceholder: true });
    expect(names.get("2")).toEqual({ name: "Bridesmaid 2", isPlaceholder: true });
    expect(names.get("3")).toEqual({ name: "Best Man", isPlaceholder: true });
    expect(names.get("4")).toEqual({ name: "Jordan", isPlaceholder: false });
  });
});

describe("merged agenda", () => {
  const today = cd("2026-09-28");
  const agenda = buildAgenda(
    {
      payments: [
        { id: "p1", dueDate: cd("2026-04-19"), paidDate: cd("2026-04-18"), title: "Deposit", amountCents: 1_000_000 },
        { id: "p2", dueDate: cd("2026-10-19"), paidDate: null, title: "Payment 2", amountCents: 1_000_000 },
      ],
      tasks: [
        { id: "t1", dueDate: cd("2026-10-12"), title: "Ask about vendor meals", isMilestone: false, done: false },
        { id: "t2", dueDate: cd("2026-10-19"), title: "Milestone", isMilestone: true, done: false },
        { id: "t3", dueDate: null, title: "Someday", isMilestone: false, done: false },
      ],
      events: [{ id: "e1", date: cd("2026-11-02"), title: "Tasting", time: "18:00" }],
      deadlines: [
        { id: "hotel-h1", date: cd("2026-10-19"), title: "Hotel block cutoff: Marriott", done: false },
        { id: "decor-d1", date: cd("2026-10-01"), title: "Return lanterns", done: true },
      ],
    },
    today,
  );

  it("merges every source in date order, milestones then payments then deadlines on a shared day", () => {
    expect(agenda.map((a) => a.id)).toEqual(["task:t1", "task:t2", "payment:p2", "deadline:hotel-h1", "event:e1"]);
    expect(agenda[1].kind).toBe("milestone");
    expect(agenda[3].kind).toBe("deadline");
  });

  it("leaves out deadlines that are already done", () => {
    expect(agenda.find((a) => a.id === "deadline:decor-d1")).toBeUndefined();
  });

  it("leaves out paid payments and undated tasks by default", () => {
    expect(agenda.find((a) => a.id === "payment:p1")).toBeUndefined();
    expect(agenda.find((a) => a.id === "task:t3")).toBeUndefined();
  });

  it("groups by month with readable labels", () => {
    const groups = groupByMonth(agenda);
    expect(groups.map((g) => [g.label, g.items.length])).toEqual([
      ["October 2026", 4],
      ["November 2026", 1],
    ]);
  });
});
