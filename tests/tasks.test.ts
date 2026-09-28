import { describe, expect, it } from "vitest";
import { cd, type CalendarDate } from "../src/lib/dates";
import { buildAgenda, type AgendaItem } from "../src/lib/domain/agenda";
import {
  buildTimeline,
  daysWithItems,
  lastOfMonth,
  monthGrid,
  monthTitle,
  parseMonth,
  shiftMonth,
  sortByTime,
} from "../src/lib/domain/calendar-grid";
import {
  endOfMonth,
  endOfWeek,
  groupByStatus,
  hasActiveFilters,
  inDueWindow,
  isOverdue,
  matchesFilters,
  parseTaskFilters,
  safeReturnPath,
  sectionTasks,
  sortOverdueFirst,
  taskDue,
  taskStats,
  tasksHref,
  DEFAULT_FILTERS,
  type TaskRow,
} from "../src/lib/domain/tasks";

// Runs in three time zones. Everything below works on calendar dates only.

// Monday, Sept 28, 2026.
const TODAY = cd("2026-09-28");
const ALLOWED = {
  owners: ["RONDELL", "CAPRI", "BOTH", "VENDOR", "WEDDING_PARTY"] as const,
  areas: ["PLANNING", "VENUE", "GUESTS", "ATTIRE"] as const,
};

let seq = 0;
function task(p: Partial<TaskRow> & { dueDate?: CalendarDate | null }): TaskRow {
  seq++;
  return {
    id: p.id ?? `t${seq}`,
    title: p.title ?? `Task ${seq}`,
    notes: null,
    dueDate: p.dueDate === undefined ? null : p.dueDate,
    owner: p.owner ?? "BOTH",
    status: p.status ?? "NOT_STARTED",
    priority: p.priority ?? "MEDIUM",
    area: p.area ?? "PLANNING",
    isMilestone: p.isMilestone ?? false,
    vendorId: null,
    vendorName: null,
    partyMemberId: null,
    partyMemberName: null,
  };
}

describe("reading filters from the URL", () => {
  it("defaults to the list with nothing filtered", () => {
    expect(parseTaskFilters({}, ALLOWED)).toEqual(DEFAULT_FILTERS);
    expect(hasActiveFilters(parseTaskFilters({}, ALLOWED))).toBe(false);
  });

  it("keeps valid values and ignores the rest", () => {
    const f = parseTaskFilters({ view: "board", owner: "CAPRI", status: "OPEN", area: "VENUE", due: "week" }, ALLOWED);
    expect(f).toEqual({ view: "board", owner: "CAPRI", status: "OPEN", area: "VENUE", due: "week" });
    const junk = parseTaskFilters({ view: "grid", owner: "SOMEONE", status: "done", area: "", due: "tomorrow" }, ALLOWED);
    expect(junk).toEqual(DEFAULT_FILTERS);
  });

  it("uses the first of repeated values", () => {
    expect(parseTaskFilters({ owner: ["RONDELL", "CAPRI"] }, ALLOWED).owner).toBe("RONDELL");
  });

  it("only returns to our own task and calendar pages after a save", () => {
    expect(safeReturnPath("/tasks?view=board&owner=CAPRI", "/tasks")).toBe("/tasks?view=board&owner=CAPRI");
    expect(safeReturnPath("/calendar?view=month&month=2028-04", "/tasks")).toBe("/calendar?view=month&month=2028-04");
    expect(safeReturnPath(["/tasks/abc", "/x"], "/calendar")).toBe("/tasks/abc");
    expect(safeReturnPath("/taskset", "/tasks")).toBe("/tasks");
    expect(safeReturnPath("//evil.example/tasks", "/tasks")).toBe("/tasks");
    expect(safeReturnPath("https://evil.example/tasks", "/calendar")).toBe("/calendar");
    expect(safeReturnPath("/\\evil.example", "/tasks")).toBe("/tasks");
    expect(safeReturnPath("/budget", "/tasks")).toBe("/tasks");
    expect(safeReturnPath(undefined, "/calendar")).toBe("/calendar");
  });

  it("writes short links, leaving defaults out", () => {
    expect(tasksHref(DEFAULT_FILTERS)).toBe("/tasks");
    expect(tasksHref(DEFAULT_FILTERS, { view: "board", due: "overdue" })).toBe("/tasks?view=board&due=overdue");
    const f = parseTaskFilters({ owner: "CAPRI", area: "VENUE" }, ALLOWED);
    expect(tasksHref(f, { owner: null })).toBe("/tasks?area=VENUE");
  });
});

describe("due windows", () => {
  it("knows where this week and this month end", () => {
    expect(endOfWeek(TODAY)).toBe("2026-10-03"); // Saturday
    expect(endOfWeek(cd("2026-10-03"))).toBe("2026-10-03");
    expect(endOfWeek(cd("2026-10-04"))).toBe("2026-10-10"); // Sunday starts a new week
    expect(endOfMonth(TODAY)).toBe("2026-09-30");
    expect(endOfMonth(cd("2028-02-10"))).toBe("2028-02-29");
  });

  const overdue = task({ dueDate: cd("2026-09-20") });
  const doneLate = task({ dueDate: cd("2026-09-20"), status: "DONE" });
  const today = task({ dueDate: TODAY });
  const saturday = task({ dueDate: cd("2026-10-03") });
  const sunday = task({ dueDate: cd("2026-10-04") });
  const day90 = task({ dueDate: cd("2026-12-27") });
  const day91 = task({ dueDate: cd("2026-12-28") });
  const undated = task({});
  const doneThisWeek = task({ dueDate: cd("2026-10-01"), status: "DONE" });

  it("overdue means open and before today", () => {
    expect(isOverdue(overdue, TODAY)).toBe(true);
    expect(isOverdue(doneLate, TODAY)).toBe(false);
    expect(isOverdue(today, TODAY)).toBe(false);
    expect(isOverdue(undated, TODAY)).toBe(false);
    expect([overdue, doneLate, today, undated].filter((t) => inDueWindow(t, "overdue", TODAY))).toEqual([overdue]);
  });

  it("this week runs through Saturday and includes open overdue tasks", () => {
    const week = [overdue, doneLate, today, saturday, sunday, undated, doneThisWeek].filter((t) => inDueWindow(t, "week", TODAY));
    expect(week).toEqual([overdue, today, saturday, doneThisWeek]);
  });

  it("this month runs through the last day of the month", () => {
    expect(inDueWindow(today, "month", TODAY)).toBe(true);
    expect(inDueWindow(saturday, "month", TODAY)).toBe(false);
  });

  it("next 90 days includes day 90 but not day 91", () => {
    expect(inDueWindow(day90, "90", TODAY)).toBe(true);
    expect(inDueWindow(day91, "90", TODAY)).toBe(false);
  });

  it("undated tasks only show under any date", () => {
    expect(inDueWindow(undated, "all", TODAY)).toBe(true);
    expect(inDueWindow(undated, "90", TODAY)).toBe(false);
  });
});

describe("filters together", () => {
  const rows = [
    task({ id: "a", owner: "CAPRI", area: "VENUE", dueDate: cd("2026-10-01") }),
    task({ id: "b", owner: "RONDELL", area: "VENUE", dueDate: cd("2026-10-01"), status: "IN_PROGRESS" }),
    task({ id: "c", owner: "CAPRI", area: "GUESTS", dueDate: cd("2027-01-01"), status: "DONE" }),
    task({ id: "d", owner: "CAPRI", area: "VENUE", dueDate: cd("2026-09-01"), status: "BLOCKED" }),
  ];
  const ids = (f: Partial<typeof DEFAULT_FILTERS>) =>
    rows.filter((t) => matchesFilters(t, { ...DEFAULT_FILTERS, ...f }, TODAY)).map((t) => t.id);

  it("combines owner, area, status and window", () => {
    expect(ids({})).toEqual(["a", "b", "c", "d"]);
    expect(ids({ owner: "CAPRI" })).toEqual(["a", "c", "d"]);
    expect(ids({ owner: "CAPRI", area: "VENUE" })).toEqual(["a", "d"]);
    expect(ids({ status: "OPEN" })).toEqual(["a", "b", "d"]);
    expect(ids({ status: "DONE" })).toEqual(["c"]);
    expect(ids({ status: "BLOCKED", due: "overdue" })).toEqual(["d"]);
    expect(ids({ owner: "CAPRI", due: "week" })).toEqual(["a", "d"]);
  });
});

describe("ordering", () => {
  it("puts overdue first, then by date, milestones and priority", () => {
    const later = task({ id: "later", dueDate: cd("2026-12-01") });
    const soonLow = task({ id: "soon-low", dueDate: cd("2026-10-05"), priority: "LOW" });
    const soonHigh = task({ id: "soon-high", dueDate: cd("2026-10-05"), priority: "HIGH" });
    const soonMilestone = task({ id: "soon-milestone", dueDate: cd("2026-10-05"), isMilestone: true, priority: "LOW" });
    const late2 = task({ id: "late-2", dueDate: cd("2026-09-25") });
    const late1 = task({ id: "late-1", dueDate: cd("2026-09-01") });
    const none = task({ id: "none" });
    const order = sortOverdueFirst([later, none, soonLow, late2, soonHigh, late1, soonMilestone], TODAY).map((t) => t.id);
    expect(order).toEqual(["late-1", "late-2", "soon-milestone", "soon-high", "soon-low", "later", "none"]);
  });

  it("splits the list into overdue, upcoming, undated and done", () => {
    const s = sectionTasks(
      [
        task({ id: "done", dueDate: cd("2026-04-18"), status: "DONE" }),
        task({ id: "up", dueDate: cd("2026-10-12") }),
        task({ id: "late", dueDate: cd("2026-09-01"), status: "IN_PROGRESS" }),
        task({ id: "none" }),
        task({ id: "today", dueDate: TODAY }),
      ],
      TODAY,
    );
    expect(s.overdue.map((t) => t.id)).toEqual(["late"]);
    expect(s.upcoming.map((t) => t.id)).toEqual(["today", "up"]);
    expect(s.undated.map((t) => t.id)).toEqual(["none"]);
    expect(s.done.map((t) => t.id)).toEqual(["done"]);
  });
});

describe("board", () => {
  it("has the four status columns in order, overdue cards on top", () => {
    const cols = groupByStatus(
      [
        task({ id: "n1", dueDate: cd("2026-11-01") }),
        task({ id: "n0", dueDate: cd("2026-09-01") }),
        task({ id: "p", dueDate: cd("2026-10-01"), status: "IN_PROGRESS" }),
        task({ id: "d", dueDate: cd("2026-04-18"), status: "DONE" }),
      ],
      TODAY,
    );
    expect(cols.map((c) => c.status)).toEqual(["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "DONE"]);
    expect(cols.map((c) => c.tasks.map((t) => t.id))).toEqual([["n0", "n1"], ["p"], [], ["d"]]);
  });
});

describe("one task's date", () => {
  it("reads as overdue, due soon, on track, done or undated", () => {
    expect(taskDue(task({ dueDate: cd("2026-09-27") }), TODAY)).toEqual({ state: "overdue", days: -1 });
    expect(taskDue(task({ dueDate: cd("2026-10-12") }), TODAY)).toEqual({ state: "due-soon", days: 14 });
    expect(taskDue(task({ dueDate: cd("2026-10-13") }), TODAY)).toEqual({ state: "on-track", days: 15 });
    expect(taskDue(task({ dueDate: cd("2026-09-01"), status: "DONE" }), TODAY).state).toBe("done");
    expect(taskDue(task({}), TODAY)).toEqual({ state: "none", days: null });
  });

  it("counts across the Nov 7, 2027 clock change by calendar days", () => {
    expect(taskDue(task({ dueDate: cd("2027-11-08") }), cd("2027-11-06")).days).toBe(2);
  });

  it("summarizes the checklist", () => {
    const s = taskStats(
      [
        task({ id: "late", dueDate: cd("2026-09-01") }),
        task({ id: "next", dueDate: cd("2026-10-12"), isMilestone: true }),
        task({ id: "done", status: "DONE", dueDate: cd("2026-04-18") }),
        task({ id: "none" }),
      ],
      TODAY,
    );
    expect(s).toMatchObject({ total: 4, done: 1, open: 3, overdue: 1, milestonesAhead: 1 });
    expect(s.next?.id).toBe("next");
  });
});

describe("month grid", () => {
  it("fills April 2028 out to whole weeks, Sunday to Saturday", () => {
    // April 1, 2028 is a Saturday and April 30 a Sunday.
    const weeks = monthGrid("2028-04");
    expect(weeks).toHaveLength(6);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[0]!.map((c) => c.date)).toEqual([
      "2028-03-26",
      "2028-03-27",
      "2028-03-28",
      "2028-03-29",
      "2028-03-30",
      "2028-03-31",
      "2028-04-01",
    ]);
    expect(weeks[0]!.filter((c) => c.inMonth).map((c) => c.date)).toEqual(["2028-04-01"]);
    expect(weeks[5]!.map((c) => c.date)).toEqual([
      "2028-04-30",
      "2028-05-01",
      "2028-05-02",
      "2028-05-03",
      "2028-05-04",
      "2028-05-05",
      "2028-05-06",
    ]);
    expect(weeks.flat().filter((c) => c.inMonth)).toHaveLength(30);
  });

  it("needs no filler when a month starts on Sunday and ends on Saturday", () => {
    const weeks = monthGrid("2026-02");
    expect(weeks).toHaveLength(4);
    expect(weeks.flat().every((c) => c.inMonth)).toBe(true);
    expect(weeks[0]![0]!.date).toBe("2026-02-01");
    expect(weeks[3]![6]!.date).toBe("2026-02-28");
  });

  it("handles leap-year February and the November clock change month", () => {
    expect(lastOfMonth("2028-02")).toBe("2028-02-29");
    const nov = monthGrid("2027-11");
    // Nov 1, 2027 is a Monday; Nov 7 (the 25-hour day) sits in the second week on a Sunday.
    expect(nov[0]![0]!.date).toBe("2027-10-31");
    expect(nov[1]![0]!.date).toBe("2027-11-07");
    expect(nov.flat().map((c) => c.date)).toContain("2027-11-07");
  });

  it("places items on their day, including leading and trailing days", () => {
    const items = [
      { id: "wedding", date: cd("2028-04-13") },
      { id: "pay-a", date: cd("2028-04-01") },
      { id: "pay-b", date: cd("2028-04-01") },
      { id: "prev", date: cd("2028-03-30") },
      { id: "far", date: cd("2028-06-01") },
    ];
    const cells = monthGrid("2028-04", items).flat();
    const on = (d: string) => cells.find((c) => c.date === d)!.items.map((i) => i.id);
    expect(on("2028-04-13")).toEqual(["wedding"]);
    expect(on("2028-04-01")).toEqual(["pay-a", "pay-b"]);
    expect(on("2028-03-30")).toEqual(["prev"]);
    expect(cells.flatMap((c) => c.items).map((i) => i.id)).not.toContain("far");
    // The phone list keeps only this month's days with something on them.
    expect(daysWithItems("2028-04", items).map((d) => d.date)).toEqual(["2028-04-01", "2028-04-13"]);
  });

  it("reads and moves the month in the URL", () => {
    expect(parseMonth("2028-04", TODAY)).toBe("2028-04");
    expect(parseMonth(undefined, TODAY)).toBe("2026-09");
    expect(parseMonth("2028-13", TODAY)).toBe("2026-09");
    expect(parseMonth("April", TODAY)).toBe("2026-09");
    expect(shiftMonth("2028-01", -1)).toBe("2027-12");
    expect(shiftMonth("2027-12", 1)).toBe("2028-01");
    expect(shiftMonth("2026-09", 19)).toBe("2028-04");
    expect(monthTitle("2028-04")).toBe("April 2028");
  });
});

describe("timeline", () => {
  const agenda: AgendaItem[] = buildAgenda(
    {
      payments: [
        { id: "p-paid", dueDate: cd("2026-04-19"), paidDate: cd("2026-04-18"), title: "Venue", amountCents: 1_000_000 },
        { id: "p-late", dueDate: cd("2026-09-19"), paidDate: null, title: "Venue", amountCents: 1_000_000 },
        { id: "p-next", dueDate: cd("2026-10-19"), paidDate: null, title: "Venue", amountCents: 1_000_000 },
      ],
      tasks: [
        { id: "m-done", dueDate: cd("2026-04-18"), title: "Sign", isMilestone: true, done: true },
        { id: "m-late", dueDate: cd("2026-09-01"), title: "Late milestone", isMilestone: true, done: false },
        { id: "t-late", dueDate: cd("2026-09-01"), title: "Late task", isMilestone: false, done: false },
        { id: "m-early", dueDate: cd("2027-01-13"), title: "Done early", isMilestone: true, done: true },
        { id: "m-day", dueDate: cd("2028-04-13"), title: "Wedding day", isMilestone: true, done: false },
        { id: "m-after", dueDate: cd("2028-06-13"), title: "After", isMilestone: true, done: false },
      ],
      events: [{ id: "e", date: cd("2026-10-02"), title: "Tasting" }],
    },
    TODAY,
    { includeDone: true },
  );

  it("keeps milestones and payments from today to the wedding, with anything behind first", () => {
    const t = buildTimeline(agenda, TODAY, cd("2028-04-13"));
    expect(t.behind.map((i) => i.id)).toEqual(["task:m-late", "payment:p-late"]);
    expect(t.ahead.map((i) => i.id)).toEqual(["payment:p-next", "task:m-early", "task:m-day"]);
  });
});

describe("appointments within a day", () => {
  it("follow their clock time", () => {
    const d = cd("2028-04-12");
    const items = [
      { id: "event:late", date: d, kind: "event" as const },
      { id: "task:x", date: d, kind: "task" as const },
      { id: "event:early", date: d, kind: "event" as const },
      { id: "event:allday", date: d, kind: "event" as const },
    ];
    const starts: Record<string, number | null> = { "event:late": 20, "event:early": 10, "event:allday": null };
    expect(sortByTime(items, (id) => starts[id] ?? null).map((i) => i.id)).toEqual([
      "event:allday",
      "task:x",
      "event:early",
      "event:late",
    ]);
  });
});
