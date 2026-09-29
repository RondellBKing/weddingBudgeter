// Calendar dates vs. instants.
//
// A due date is a day on the wedding's calendar ("2027-11-07"), not a moment in time. In app
// code it is a CalendarDate string. In Postgres it is a `date` column, which Prisma hands us as
// a JS Date at 00:00 UTC. Converting that Date with local-time getters (or letting
// toLocaleDateString use the device's zone) is how a due date slides back a day in New York.
//
// Rules:
// - Read @db.Date values with fromDbDate(), write them with toDbDate(). UTC getters only.
// - Do calendar arithmetic on the y/m/d numbers (Date.UTC), never on milliseconds between
//   local midnights (Nov 7, 2027 is a 25-hour day in New York; Mar 12, 2028 is 23 hours).
// - "Today" is always today in the wedding's time zone, never the server's (Vercel runs in UTC).

export const WEDDING_TZ = "America/New_York";

declare const calendarDateBrand: unique symbol;
/** "YYYY-MM-DD" on the wedding's calendar. */
export type CalendarDate = string & { readonly [calendarDateBrand]: true };

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

function parts(d: CalendarDate): [number, number, number] {
  const m = ISO_DATE.exec(d);
  if (!m) throw new Error(`Not a calendar date: ${d}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function fromParts(y: number, m: number, d: number): CalendarDate {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` as CalendarDate;
}

/** Validate and brand a "YYYY-MM-DD" string. Returns null if it isn't a real date. */
export function parseCalendarDate(input: string | null | undefined): CalendarDate | null {
  if (!input) return null;
  const m = ISO_DATE.exec(input.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const probe = new Date(Date.UTC(y, mo - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) return null;
  return fromParts(y, mo, d);
}

/** Assert-style constructor for literals in code and seeds. */
export function cd(input: string): CalendarDate {
  const parsed = parseCalendarDate(input);
  if (!parsed) throw new Error(`Invalid calendar date: ${input}`);
  return parsed;
}

/** Prisma @db.Date value → CalendarDate. Uses UTC getters on purpose. */
export function fromDbDate(value: Date): CalendarDate;
export function fromDbDate(value: Date | null | undefined): CalendarDate | null;
export function fromDbDate(value: Date | null | undefined): CalendarDate | null {
  if (!value) return null;
  return fromParts(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
}

/** CalendarDate → value for a Prisma @db.Date column (00:00 UTC of that day). */
export function toDbDate(date: CalendarDate): Date;
export function toDbDate(date: CalendarDate | null | undefined): Date | null;
export function toDbDate(date: CalendarDate | null | undefined): Date | null {
  if (!date) return null;
  const [y, m, d] = parts(date);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Today's date in a time zone (defaults to the wedding's), for an optional reference instant. */
export function todayIn(timeZone: string = WEDDING_TZ, now: Date = new Date()): CalendarDate {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const p = Object.fromEntries(fmt.formatToParts(now).map((x) => [x.type, x.value]));
  return fromParts(Number(p.year), Number(p.month), Number(p.day));
}

function dayNumber(date: CalendarDate): number {
  const [y, m, d] = parts(date);
  return Date.UTC(y, m - 1, d) / DAY_MS;
}

/** Whole calendar days from `from` to `to` (positive when `to` is later). DST-proof. */
export function daysBetween(from: CalendarDate, to: CalendarDate): number {
  return dayNumber(to) - dayNumber(from);
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  const [y, m, d] = parts(date);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return fromParts(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** Add calendar months, clamping to the end of shorter months (Mar 31 − 1 month = Feb 29 in 2028). */
export function addMonths(date: CalendarDate, months: number): CalendarDate {
  const [y, m, d] = parts(date);
  const targetMonthIndex = m - 1 + months;
  const ty = y + Math.floor(targetMonthIndex / 12);
  const tm = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  return fromParts(ty, tm + 1, Math.min(d, lastDay));
}

export function compareDates(a: CalendarDate, b: CalendarDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(date: CalendarDate): number {
  const [y, m, d] = parts(date);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

type DateStyle =
  | "long"
  | "medium"
  | "short"
  | "weekday-long"
  | "weekday-medium"
  | "month-day"
  | "month-day-long"
  | "month-year"
  | "weekday-short";

const DATE_FORMATS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  long: { year: "numeric", month: "long", day: "numeric" },
  medium: { year: "numeric", month: "short", day: "numeric" },
  short: { year: "2-digit", month: "numeric", day: "numeric" },
  "weekday-long": { weekday: "long", year: "numeric", month: "long", day: "numeric" },
  "weekday-medium": { weekday: "short", year: "numeric", month: "short", day: "numeric" },
  "month-day": { month: "short", day: "numeric" },
  "month-day-long": { month: "long", day: "numeric" },
  "month-year": { month: "long", year: "numeric" },
  "weekday-short": { weekday: "short" },
};

/** Format a calendar date. Formats the UTC-midnight instant in UTC, so the day never moves. */
export function formatDate(date: CalendarDate, style: DateStyle = "medium"): string {
  const [y, m, d] = parts(date);
  return new Intl.DateTimeFormat("en-US", { ...DATE_FORMATS[style], timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

/** Format a real instant (appointment, log entry) in the wedding's time zone. */
export function formatInstant(
  value: Date,
  timeZone: string = WEDDING_TZ,
  opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
): string {
  return new Intl.DateTimeFormat("en-US", { ...opts, timeZone }).format(value);
}

/** "HH:MM" (24h) → "6:00 AM". */
export function formatClockTime(hhmm: string): string {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return hhmm;
  const h = Number(m[1]);
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m[2]} ${suffix}`;
}

/** "In 21 days", "Tomorrow", "Today", "2 days overdue". */
export function relativeDays(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "1 day overdue";
  if (days < 0) return `${-days} days overdue`;
  return `In ${days.toLocaleString("en-US")} days`;
}

export type DueState = "overdue" | "due-soon" | "on-track";

/**
 * A due date is on time through 11:59 pm (wedding time zone) on that date, and overdue from
 * the next calendar day. "Due soon" is within `soonDays` days, inclusive.
 */
export function dueState(due: CalendarDate, today: CalendarDate, soonDays = 30): DueState {
  const days = daysBetween(today, due);
  if (days < 0) return "overdue";
  if (days <= soonDays) return "due-soon";
  return "on-track";
}

/** Whole months, then leftover days, from one date to a later one ("18 months, 16 days"). */
export function monthsAndDaysBetween(from: CalendarDate, to: CalendarDate): { months: number; days: number } {
  if (compareDates(to, from) < 0) return { months: 0, days: 0 };
  let months = 0;
  while (compareDates(addMonths(from, months + 1), to) <= 0) months++;
  return { months, days: daysBetween(addMonths(from, months), to) };
}

/** "Good morning" / "Good afternoon" / "Good evening" for the wedding's time zone. */
export function greetingFor(timeZone: string = WEDDING_TZ, now: Date = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(now));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** "YYYY-MM" month key for grouping. */
export function monthKey(date: CalendarDate): string {
  return date.slice(0, 7);
}
