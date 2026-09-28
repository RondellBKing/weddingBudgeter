import { addDays, compareDates, formatDate, weekday, type CalendarDate } from "../dates";
import type { AgendaItem } from "./agenda";

// Views over the merged calendar: the month grid, the milestone timeline, and the month
// parameter in the URL. Pure functions over calendar dates (no instants, no server clock).

/** "YYYY-MM". */
export type MonthKey = string;

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function monthParts(month: MonthKey): [number, number] {
  const m = MONTH.exec(month);
  if (!m) throw new Error(`Not a month: ${month}`);
  return [Number(m[1]), Number(m[2])];
}

function key(y: number, m: number): MonthKey {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}`;
}

/** A valid "YYYY-MM" from the URL, or the month containing `fallback`. */
export function parseMonth(input: string | string[] | undefined, fallback: CalendarDate): MonthKey {
  const v = Array.isArray(input) ? input[0] : input;
  if (v && MONTH.exec(v)) {
    const year = Number(v.slice(0, 4));
    if (year >= 1900 && year <= 2200) return v;
  }
  return fallback.slice(0, 7);
}

export function shiftMonth(month: MonthKey, delta: number): MonthKey {
  const [y, m] = monthParts(month);
  const index = y * 12 + (m - 1) + delta;
  return key(Math.floor(index / 12), (index % 12) + 1);
}

export function firstOfMonth(month: MonthKey): CalendarDate {
  monthParts(month);
  return `${month}-01` as CalendarDate;
}

export function lastOfMonth(month: MonthKey): CalendarDate {
  const [y, m] = monthParts(month);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${month}-${String(last).padStart(2, "0")}` as CalendarDate;
}

/** "April 2028". */
export function monthTitle(month: MonthKey): string {
  return formatDate(firstOfMonth(month), "month-year");
}

export type MonthCell<T> = { date: CalendarDate; inMonth: boolean; items: T[] };

/**
 * The month as whole weeks, Sunday to Saturday. Leading and trailing days from the next and
 * previous months fill the first and last weeks (and carry their items too, marked inMonth
 * false). Items are placed on their date in the order given.
 */
export function monthGrid<T extends { date: CalendarDate }>(month: MonthKey, items: T[] = []): MonthCell<T>[][] {
  const first = firstOfMonth(month);
  const last = lastOfMonth(month);
  const start = addDays(first, -weekday(first));
  const end = addDays(last, 6 - weekday(last));

  const byDate = new Map<string, T[]>();
  for (const item of items) {
    if (compareDates(item.date, start) < 0 || compareDates(item.date, end) > 0) continue;
    const list = byDate.get(item.date);
    if (list) list.push(item);
    else byDate.set(item.date, [item]);
  }

  const weeks: MonthCell<T>[][] = [];
  for (let d = start; compareDates(d, end) <= 0; d = addDays(d, 7)) {
    const week: MonthCell<T>[] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(d, i);
      week.push({ date, inMonth: date.slice(0, 7) === month, items: byDate.get(date) ?? [] });
    }
    weeks.push(week);
  }
  return weeks;
}

/** Only the days of the month that have something on them (the phone version of the grid). */
export function daysWithItems<T extends { date: CalendarDate }>(month: MonthKey, items: T[]): Array<{ date: CalendarDate; items: T[] }> {
  return monthGrid(month, items)
    .flat()
    .filter((c) => c.inMonth && c.items.length > 0)
    .map((c) => ({ date: c.date, items: c.items }));
}

// ─── Timeline ──────────────────────────────────────────────────────────────────

export type Timeline<T> = {
  /** Past their date and still not done or paid, oldest first. */
  behind: T[];
  /** From today through the wedding day. */
  ahead: T[];
};

/**
 * The road to the wedding: milestones and payments only. Anything dated before today that
 * isn't done (or paid) is "behind"; everything from today to the wedding day is ahead,
 * done or not. Items after the wedding are left out.
 */
export function buildTimeline<T extends Pick<AgendaItem, "date" | "kind" | "done">>(
  items: T[],
  today: CalendarDate,
  weddingDate: CalendarDate,
): Timeline<T> {
  const relevant = items
    .filter((i) => i.kind === "milestone" || i.kind === "payment")
    .sort((a, b) => compareDates(a.date, b.date));
  return {
    behind: relevant.filter((i) => compareDates(i.date, today) < 0 && !i.done),
    ahead: relevant.filter((i) => compareDates(i.date, today) >= 0 && compareDates(i.date, weddingDate) <= 0),
  };
}

/**
 * Within each day, put appointments in clock order (all-day ones first). Everything else keeps
 * its place: buildAgenda already orders by date and kind, this only reorders the events among
 * the slots events already hold on that day.
 */
export function sortByTime<T extends Pick<AgendaItem, "id" | "date" | "kind">>(items: T[], startOf: (id: string) => number | null): T[] {
  const out = [...items];
  const slotsByDay = new Map<string, number[]>();
  items.forEach((item, index) => {
    if (item.kind !== "event") return;
    const slots = slotsByDay.get(item.date);
    if (slots) slots.push(index);
    else slotsByDay.set(item.date, [index]);
  });
  for (const slots of slotsByDay.values()) {
    const ordered = slots
      .map((index) => ({ item: items[index]!, index, at: startOf(items[index]!.id) }))
      .sort((a, b) => {
        if (a.at === b.at) return a.index - b.index;
        if (a.at === null) return -1;
        if (b.at === null) return 1;
        return a.at - b.at;
      });
    slots.forEach((slot, i) => {
      out[slot] = ordered[i]!.item;
    });
  }
  return out;
}
