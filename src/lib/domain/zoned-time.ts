import { parseCalendarDate, WEDDING_TZ, type CalendarDate } from "../dates";

// Wall-clock time in a time zone ↔ real instants, using Intl only (no date library).
//
// Appointments are typed in New York time ("Nov 7, 2027 at 1:30 PM") but stored as timestamptz
// instants. Twice a year the mapping is not one-to-one:
//
// - Fall back (e.g. Sunday Nov 7, 2027): 1:00–1:59 AM happens twice, first in EDT (UTC−4) and
//   then again in EST (UTC−5). We pick the EARLIER instant, the first time the clock shows it.
// - Spring forward (e.g. Sunday Mar 12, 2028): 2:00–2:59 AM never happens; clocks jump from
//   2:00 to 3:00. We move the time FORWARD by the length of the gap, so 2:30 becomes 3:30 AM
//   EDT, and report it as "skipped" so a form can ask for a real time instead.
//
// These are the same rules as Temporal's default ("compatible") disambiguation and what phone
// calendars do. Nothing here reads the server's own time zone.

export type Clock = string; // "HH:MM", 24-hour

const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

export type ZonedResolution = {
  instant: Date;
  /** exact: one match · ambiguous: repeated hour, earlier chosen · skipped: in a gap, moved forward. */
  kind: "exact" | "ambiguous" | "skipped";
};

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, f);
  }
  return f;
}

type WallParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function wallParts(instantMs: number, timeZone: string): WallParts {
  const p: Record<string, string> = {};
  for (const part of formatter(timeZone).formatToParts(new Date(instantMs))) p[part.type] = part.value;
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    // Some engines print midnight as "24" even with h23.
    hour: Number(p.hour) % 24,
    minute: Number(p.minute),
    second: Number(p.second),
  };
}

/** The zone's UTC offset at an instant, in minutes (New York in summer: −240). */
export function offsetMinutesAt(instant: Date | number, timeZone: string = WEDDING_TZ): number {
  const ms = typeof instant === "number" ? instant : instant.getTime();
  const w = wallParts(ms, timeZone);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  // Drop sub-second noise so the offset is a whole number of minutes.
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / MINUTE_MS);
}

/** Parse "HH:MM" (24-hour). Null if it isn't a real clock time. */
export function parseClock(input: string | null | undefined): Clock | null {
  if (!input) return null;
  const t = input.trim();
  return CLOCK.test(t) ? t : null;
}

/**
 * The instant a wall-clock date and time in `timeZone` refers to. See the file comment for
 * what happens on the two daylight-saving days.
 */
export function zonedTimeToInstant(date: CalendarDate, time: Clock, timeZone: string = WEDDING_TZ): ZonedResolution {
  const d = parseCalendarDate(date);
  const m = CLOCK.exec(time);
  if (!d || !m) throw new Error(`Not a date and time: ${date} ${time}`);
  const [y, mo, day] = d.split("-").map(Number) as [number, number, number];
  // The wall-clock reading written as if it were UTC.
  const local = Date.UTC(y, mo - 1, day, Number(m[1]), Number(m[2]));

  // Offsets a day either side bracket any transition near this time.
  const before = offsetMinutesAt(local - DAY_MS, timeZone);
  const after = offsetMinutesAt(local + DAY_MS, timeZone);
  const candidates = [...new Set([before, after])]
    .map((offset) => local - offset * MINUTE_MS)
    .filter((ms) => local - offsetMinutesAt(ms, timeZone) * MINUTE_MS === ms)
    .sort((a, b) => a - b);

  if (candidates.length === 1) return { instant: new Date(candidates[0]!), kind: "exact" };
  if (candidates.length > 1) return { instant: new Date(candidates[0]!), kind: "ambiguous" };
  // In the gap: read the time with the offset from before the jump, which lands after it.
  return { instant: new Date(local - before * MINUTE_MS), kind: "skipped" };
}

/** The wall-clock date and "HH:MM" an instant shows in `timeZone` (for filling in edit forms). */
export function instantToZoned(instant: Date, timeZone: string = WEDDING_TZ): { date: CalendarDate; time: Clock } {
  const w = wallParts(instant.getTime(), timeZone);
  const pad = (n: number, width = 2) => String(n).padStart(width, "0");
  return {
    date: `${pad(w.year, 4)}-${pad(w.month)}-${pad(w.day)}` as CalendarDate,
    time: `${pad(w.hour)}:${pad(w.minute)}`,
  };
}
