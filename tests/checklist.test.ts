import { describe, expect, it } from "vitest";
import { buildChecklist, DECISIONS, WEDDING_DATE } from "../prisma/seed/data";
import { parseCalendarDate } from "../src/lib/dates";

// The seeded planning checklist: real data, so it has to be clean on the first load.

const tasks = buildChecklist();
const SEEDED_ON = "2026-09-28";

describe("seeded checklist", () => {
  it("gives every task its own key", () => {
    const keys = tasks.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("uses real calendar dates", () => {
    for (const t of tasks) expect(parseCalendarDate(t.dueDate), t.key).toBe(t.dueDate);
  });

  it("doesn't start anything overdue: only finished tasks are dated before it was seeded", () => {
    for (const t of tasks.filter((t) => t.dueDate < SEEDED_ON)) expect(t.doneOn, t.key).toBeDefined();
  });

  it("plans the rehearsal for Wednesday and the wedding for Thursday", () => {
    const day = (d: string) => new Date(`${d}T12:00:00Z`).getUTCDay();
    expect(day(tasks.find((t) => t.key === "rehearsal")!.dueDate)).toBe(3);
    expect(day(tasks.find((t) => t.key === "wedding-day")!.dueDate)).toBe(4);
    expect(tasks.find((t) => t.key === "wedding-day")!.dueDate).toBe(WEDDING_DATE);
  });

  it("covers what a full-service planner covers", () => {
    const areas = new Set(tasks.map((t) => t.area));
    for (const a of ["PLANNING", "BUDGET", "VENUE", "VENDORS", "ATTIRE", "WEDDING_PARTY", "GUESTS", "STATIONERY", "CEREMONY", "RECEPTION", "BEAUTY", "TRAVEL", "LEGAL", "DAY_OF"]) {
      expect(areas.has(a as never), a).toBe(true);
    }
    expect(tasks.length).toBeGreaterThan(90);
  });

  it("plans for our traditions: the broom is decided, the kwe kwe is still a choice", () => {
    const keys = new Set(tasks.map((t) => t.key));
    for (const k of ["broom", "broom-people", "broom-cues", "kwe-kwe-decide", "kwe-kwe-leader", "kwe-kwe-plan"]) expect(keys.has(k), k).toBe(true);
    expect(DECISIONS.some((d) => d.key === "decision-jumping-the-broom")).toBe(true);
    expect(DECISIONS.some((d) => d.title.toLowerCase().includes("kwe kwe"))).toBe(false);
  });
});
