import type { Owner, Priority, TaskArea, TaskStatus } from "../../generated/prisma/enums";
import { addDays, compareDates, daysBetween, dueState, weekday, type CalendarDate, type DueState } from "../dates";

// Task list rules: which tasks a filter shows, how they're ordered, and how the board groups
// them. Pure functions over plain rows, so they're easy to test in every time zone.

export type TaskRow = {
  id: string;
  title: string;
  notes: string | null;
  dueDate: CalendarDate | null;
  owner: Owner;
  status: TaskStatus;
  priority: Priority;
  area: TaskArea;
  isMilestone: boolean;
  vendorId: string | null;
  vendorName: string | null;
  partyMemberId: string | null;
  partyMemberName: string | null;
};

export const TASK_STATUSES: TaskStatus[] = ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "DONE"];

// ─── Filters ───────────────────────────────────────────────────────────────────

export type DueWindow = "all" | "overdue" | "week" | "month" | "90";
export type StatusFilter = TaskStatus | "OPEN";
export type TaskView = "list" | "board";

export type TaskFilters = {
  view: TaskView;
  owner: Owner | null;
  status: StatusFilter | null;
  area: TaskArea | null;
  due: DueWindow;
};

export const DUE_WINDOW_LABEL: Record<DueWindow, string> = {
  all: "Any date",
  overdue: "Overdue",
  week: "This week",
  month: "This month",
  "90": "Next 90 days",
};

export const DEFAULT_FILTERS: TaskFilters = { view: "list", owner: null, status: null, area: null, due: "all" };

type SearchParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function oneOf<T extends string>(value: string | undefined, allowed: readonly T[]): T | null {
  return value !== undefined && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

/** Read filters from the URL. Unknown or empty values are ignored rather than rejected. */
export function parseTaskFilters(
  sp: SearchParams,
  allowed: { owners: readonly Owner[]; areas: readonly TaskArea[] },
): TaskFilters {
  return {
    view: first(sp.view) === "board" ? "board" : "list",
    owner: oneOf(first(sp.owner), allowed.owners),
    status: oneOf<StatusFilter>(first(sp.status), [...TASK_STATUSES, "OPEN"]),
    area: oneOf(first(sp.area), allowed.areas),
    due: oneOf<DueWindow>(first(sp.due), ["all", "overdue", "week", "month", "90"]) ?? "all",
  };
}

/** The URL for a set of filters, leaving defaults out so links stay short. */
export function tasksHref(f: TaskFilters, patch: Partial<TaskFilters> = {}): string {
  const next = { ...f, ...patch };
  const q = new URLSearchParams();
  if (next.view !== "list") q.set("view", next.view);
  if (next.owner) q.set("owner", next.owner);
  if (next.status) q.set("status", next.status);
  if (next.area) q.set("area", next.area);
  if (next.due !== "all") q.set("due", next.due);
  const s = q.toString();
  return s ? `/tasks?${s}` : "/tasks";
}

/**
 * Where a form goes back to after saving. Only our own task and calendar pages, so a crafted
 * link can't bounce anyone to another site.
 */
export function safeReturnPath(back: unknown, fallback: "/tasks" | "/calendar"): string {
  const v = Array.isArray(back) ? back[0] : back;
  if (typeof v !== "string" || v.length > 500 || v.startsWith("//") || v.includes("\\")) return fallback;
  return /^\/(tasks|calendar)(?=$|[/?#])/.test(v) ? v : fallback;
}

export function hasActiveFilters(f: TaskFilters): boolean {
  return Boolean(f.owner || f.status || f.area || f.due !== "all");
}

/** Last day of the week (weeks run Sunday to Saturday, like the month grid). */
export function endOfWeek(today: CalendarDate): CalendarDate {
  return addDays(today, 6 - weekday(today));
}

export function endOfMonth(today: CalendarDate): CalendarDate {
  const [y, m] = today.split("-").map(Number) as [number, number];
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${today.slice(0, 7)}-${String(last).padStart(2, "0")}` as CalendarDate;
}

/** The last due date a window reaches (null for "all" and "overdue"). */
export function windowEnd(window: DueWindow, today: CalendarDate): CalendarDate | null {
  if (window === "week") return endOfWeek(today);
  if (window === "month") return endOfMonth(today);
  if (window === "90") return addDays(today, 90);
  return null;
}

export function isDone(t: Pick<TaskRow, "status">): boolean {
  return t.status === "DONE";
}

/** Open and past its due date. A done task is never overdue. */
export function isOverdue(t: Pick<TaskRow, "status" | "dueDate">, today: CalendarDate): boolean {
  return !isDone(t) && t.dueDate !== null && compareDates(t.dueDate, today) < 0;
}

/**
 * Whether a task falls in a due window. "This week", "this month" and "next 90 days" mean
 * "needs doing by then", so open overdue tasks are included; done tasks count only when due
 * inside the window. Tasks with no date only show under "any date".
 */
export function inDueWindow(t: Pick<TaskRow, "status" | "dueDate">, window: DueWindow, today: CalendarDate): boolean {
  if (window === "all") return true;
  if (window === "overdue") return isOverdue(t, today);
  if (t.dueDate === null) return false;
  const end = windowEnd(window, today)!;
  if (compareDates(t.dueDate, end) > 0) return false;
  return isOverdue(t, today) || compareDates(t.dueDate, today) >= 0;
}

export function matchesFilters(t: TaskRow, f: TaskFilters, today: CalendarDate): boolean {
  if (f.owner && t.owner !== f.owner) return false;
  if (f.area && t.area !== f.area) return false;
  if (f.status === "OPEN" && isDone(t)) return false;
  if (f.status && f.status !== "OPEN" && t.status !== f.status) return false;
  return inDueWindow(t, f.due, today);
}

// ─── Ordering ──────────────────────────────────────────────────────────────────

const PRIORITY_RANK: Record<Priority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

/** Due date (undated last), then milestones, then priority, then title. */
export function compareTasks(a: TaskRow, b: TaskRow): number {
  if (a.dueDate !== b.dueDate) {
    if (a.dueDate === null) return 1;
    if (b.dueDate === null) return -1;
    const byDate = compareDates(a.dueDate, b.dueDate);
    if (byDate !== 0) return byDate;
  }
  return (
    Number(b.isMilestone) - Number(a.isMilestone) ||
    PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
    a.title.localeCompare(b.title)
  );
}

/** Overdue tasks first (most overdue at the top), then everything else in date order. */
export function sortOverdueFirst<T extends TaskRow>(tasks: T[], today: CalendarDate): T[] {
  return [...tasks].sort(
    (a, b) => Number(isOverdue(b, today)) - Number(isOverdue(a, today)) || compareTasks(a, b),
  );
}

export type TaskSections<T extends TaskRow> = {
  overdue: T[];
  /** Open, dated, due today or later. */
  upcoming: T[];
  /** Open with no due date. */
  undated: T[];
  done: T[];
};

/** Split tasks into the list view's sections, each sorted. */
export function sectionTasks<T extends TaskRow>(tasks: T[], today: CalendarDate): TaskSections<T> {
  const sorted = [...tasks].sort(compareTasks);
  return {
    overdue: sorted.filter((t) => isOverdue(t, today)),
    upcoming: sorted.filter((t) => !isDone(t) && t.dueDate !== null && !isOverdue(t, today)),
    undated: sorted.filter((t) => !isDone(t) && t.dueDate === null),
    done: sorted.filter(isDone),
  };
}

/** Board columns in workflow order; overdue cards float to the top of each column. */
export function groupByStatus<T extends TaskRow>(tasks: T[], today: CalendarDate): Array<{ status: TaskStatus; tasks: T[] }> {
  return TASK_STATUSES.map((status) => ({
    status,
    tasks: sortOverdueFirst(
      tasks.filter((t) => t.status === status),
      today,
    ),
  }));
}

// ─── Status of one task ────────────────────────────────────────────────────────

export type TaskDue = { state: DueState | "done" | "none"; days: number | null };

/** How a task's date reads today: overdue, due soon (within `soonDays`), on track, done, or undated. */
export function taskDue(t: Pick<TaskRow, "status" | "dueDate">, today: CalendarDate, soonDays = 14): TaskDue {
  if (isDone(t)) return { state: "done", days: t.dueDate ? daysBetween(today, t.dueDate) : null };
  if (!t.dueDate) return { state: "none", days: null };
  return { state: dueState(t.dueDate, today, soonDays), days: daysBetween(today, t.dueDate) };
}

export type TaskStats = {
  total: number;
  done: number;
  open: number;
  overdue: number;
  milestonesAhead: number;
  /** The next open task due today or later. */
  next: TaskRow | null;
};

export function taskStats(tasks: TaskRow[], today: CalendarDate): TaskStats {
  const open = tasks.filter((t) => !isDone(t));
  const next =
    open
      .filter((t) => t.dueDate !== null && compareDates(t.dueDate, today) >= 0)
      .sort(compareTasks)[0] ?? null;
  return {
    total: tasks.length,
    done: tasks.length - open.length,
    open: open.length,
    overdue: open.filter((t) => isOverdue(t, today)).length,
    milestonesAhead: open.filter((t) => t.isMilestone).length,
    next,
  };
}
