import { createHash, timingSafeEqual } from "node:crypto";
import { addDays, formatClockTime, parseCalendarDate, type CalendarDate } from "./dates";
import { formatCents, type Cents } from "./money";

// iCalendar (RFC 5545) feed for phone calendars.
//
// - Date-only items (payments, task due dates, all-day appointments) are written as all-day
//   events: DTSTART;VALUE=DATE and DTEND the next day. Floating dates have no time zone, so
//   they land on the same day on every phone, wherever it is.
// - Timed appointments are written in UTC ("…Z"); the phone shows them in its own zone.
// - Text is escaped and long lines are folded at 75 octets (not characters) with CRLF + space,
//   never splitting a multi-byte character. Every line ends in CRLF.

export type IcsEvent =
  | {
      uid: string;
      kind: "date";
      date: CalendarDate;
      summary: string;
      description?: string | null;
      location?: string | null;
      /** Don't block time on the phone calendar (reminders like payments and tasks). */
      transparent?: boolean;
      lastModified?: Date | null;
    }
  | {
      uid: string;
      kind: "timed";
      start: Date;
      /** Defaults to an hour after the start when the appointment has no end time. */
      end?: Date | null;
      summary: string;
      description?: string | null;
      location?: string | null;
      transparent?: boolean;
      lastModified?: Date | null;
    };

export type IcsCalendar = {
  name: string;
  /** Shown by clients that honor it (Apple, Google); timed events are in UTC regardless. */
  timezone?: string;
  now: Date;
  events: IcsEvent[];
};

const CRLF = "\r\n";
const MAX_OCTETS = 75;
const DEFAULT_DURATION_MS = 60 * 60 * 1000;

/** Escape a TEXT value: backslash, semicolon, comma and line breaks. */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

const encoder = new TextEncoder();

/**
 * Fold one content line so no physical line is longer than 75 octets. Continuation lines
 * start with a single space, which counts toward their 75.
 */
export function foldLine(line: string): string {
  if (encoder.encode(line).length <= MAX_OCTETS) return line;
  const out: string[] = [];
  let current = "";
  let octets = 0;
  let limit = MAX_OCTETS;
  // for…of walks code points, so surrogate pairs (emoji) stay together.
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    if (octets + size > limit) {
      out.push(current);
      current = " ";
      octets = 1;
      limit = MAX_OCTETS;
    }
    current += ch;
    octets += size;
  }
  out.push(current);
  return out.join(CRLF);
}

/** "2028-04-13" → "20280413". */
export function icsDate(date: CalendarDate): string {
  const d = parseCalendarDate(date);
  if (!d) throw new Error(`Not a calendar date: ${date}`);
  return d.replace(/-/g, "");
}

/** An instant as UTC date-time: "20280413T203000Z". */
export function icsUtc(instant: Date): string {
  return instant.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function prop(name: string, value: string): string {
  return foldLine(`${name}:${value}`);
}

function textProp(name: string, value: string): string {
  return prop(name, escapeText(value));
}

function eventLines(e: IcsEvent, stamp: string): string[] {
  const lines = ["BEGIN:VEVENT", prop("UID", e.uid), prop("DTSTAMP", stamp)];
  if (e.kind === "date") {
    lines.push(`DTSTART;VALUE=DATE:${icsDate(e.date)}`, `DTEND;VALUE=DATE:${icsDate(addDays(e.date, 1))}`);
  } else {
    const end = e.end && e.end.getTime() > e.start.getTime() ? e.end : new Date(e.start.getTime() + DEFAULT_DURATION_MS);
    lines.push(`DTSTART:${icsUtc(e.start)}`, `DTEND:${icsUtc(end)}`);
  }
  lines.push(textProp("SUMMARY", e.summary));
  if (e.description) lines.push(textProp("DESCRIPTION", e.description));
  if (e.location) lines.push(textProp("LOCATION", e.location));
  if (e.lastModified) lines.push(prop("LAST-MODIFIED", icsUtc(e.lastModified)));
  lines.push(`TRANSP:${e.transparent ? "TRANSPARENT" : "OPAQUE"}`, "END:VEVENT");
  return lines;
}

/** The whole VCALENDAR as a string with CRLF line endings (including the last line). */
export function buildIcs(cal: IcsCalendar): string {
  const stamp = icsUtc(cal.now);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wedding HQ//Calendar feed//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    textProp("X-WR-CALNAME", cal.name),
    ...(cal.timezone ? [textProp("X-WR-TIMEZONE", cal.timezone)] : []),
    // Ask subscribing apps to check back a few times a day.
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
    ...cal.events.flatMap((e) => eventLines(e, stamp)),
    "END:VCALENDAR",
  ];
  return lines.join(CRLF) + CRLF;
}

/**
 * Compare a feed token from the URL with the stored one in constant time. Both are hashed
 * first so the buffers always have equal length and the length itself isn't leaked.
 */
export function tokensMatch(given: string, expected: string): boolean {
  if (!given || !expected) return false;
  const a = createHash("sha256").update(given, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

/** "abc.ics" → "abc". The feed URL ends in .ics so phones recognize it as a calendar. */
export function tokenFromPathSegment(segment: string): string {
  let s = segment;
  try {
    s = decodeURIComponent(segment);
  } catch {
    // Leave malformed escapes as they are; they won't match anyway.
  }
  return s.toLowerCase().endsWith(".ics") ? s.slice(0, -4) : s;
}

// ─── What goes in the Wedding HQ feed ─────────────────────────────────────────

export type FeedInput = {
  couple: string;
  weddingDate: CalendarDate;
  ceremonyTime: string | null;
  venue: { name: string; address: string };
  /** Unpaid payments only. */
  payments: Array<{ id: string; dueDate: CalendarDate; title: string; detail: string; amountCents: Cents | null; isEstimate: boolean }>;
  /** Open tasks with a due date. */
  tasks: Array<{
    id: string;
    dueDate: CalendarDate;
    title: string;
    notes: string | null;
    isMilestone: boolean;
    ownerLabel: string;
    /** The seeded "Wedding day" task; the feed's own wedding-day event stands in for it. */
    isWeddingMarker?: boolean;
    updatedAt?: Date | null;
  }>;
  events: Array<{
    id: string;
    title: string;
    typeLabel: string;
    allDayDate: CalendarDate | null;
    startAt: Date | null;
    endAt: Date | null;
    location: string | null;
    vendorName: string | null;
    notes: string | null;
    updatedAt?: Date | null;
  }>;
  /** Open planner deadlines: hotel block cutoffs, décor return-by dates. */
  deadlines?: Array<{ id: string; date: CalendarDate; title: string; detail: string | null }>;
};

function lines(...parts: Array<string | null | undefined | false>): string {
  return parts.filter(Boolean).join("\n");
}

const DOLLARS = /[-−]?\$\s?\d[\d,]*(?:\.\d+)?(?:\s?(?:k|m|thousand|million)\b)?/gi;

/** Replace dollar amounts typed into free text ("up to $1,200 of overage"). */
export function hideAmounts(text: string): string {
  return text.replace(DOLLARS, "(amount hidden)");
}

/**
 * Turn the plan into feed events. With `includeAmounts: false` no dollar amount appears
 * anywhere in the feed, including amounts typed into titles and notes (for a link that's safe
 * to share with a planner or family).
 */
export function feedEvents(input: FeedInput, opts: { includeAmounts: boolean }): IcsEvent[] {
  const events = buildFeedEvents(input, opts);
  if (opts.includeAmounts) return events;
  const clean = (s: string | null | undefined) => (s ? hideAmounts(s) : s);
  return events.map((e) => ({ ...e, summary: hideAmounts(e.summary), description: clean(e.description), location: clean(e.location) }));
}

function buildFeedEvents(input: FeedInput, opts: { includeAmounts: boolean }): IcsEvent[] {
  const money = (cents: Cents | null, estimate: boolean) =>
    opts.includeAmounts && cents !== null ? `${formatCents(cents)}${estimate ? " (estimate)" : ""}` : null;

  const wedding: IcsEvent = {
    uid: "wedding-day@wedding-hq",
    kind: "date",
    date: input.weddingDate,
    summary: `The wedding of ${input.couple}`,
    location: `${input.venue.name}, ${input.venue.address}`,
    description: lines(
      input.ceremonyTime ? `Ceremony at ${formatClockTime(input.ceremonyTime)}.` : null,
      "Rehearsal dinner the evening before.",
    ),
  };

  const payments = input.payments.map((p): IcsEvent => {
    const amount = money(p.amountCents, p.isEstimate);
    return {
      uid: `payment-${p.id}@wedding-hq`,
      kind: "date",
      date: p.dueDate,
      summary: `Payment due: ${p.title}${amount ? ` · ${amount}` : ""}`,
      description: lines(p.detail, amount ? `Amount: ${amount}` : null, "Mark it paid in Wedding HQ once it's sent."),
      transparent: true,
    };
  });

  const tasks = input.tasks
    .filter((t) => !t.isWeddingMarker)
    .map(
      (t): IcsEvent => ({
        uid: `task-${t.id}@wedding-hq`,
        kind: "date",
        date: t.dueDate,
        summary: `${t.isMilestone ? "Milestone" : "To do"}: ${t.title}`,
        description: lines(t.notes, `Owner: ${t.ownerLabel}`),
        transparent: true,
        lastModified: t.updatedAt ?? null,
      }),
    );

  const events = input.events.flatMap((e): IcsEvent[] => {
    const description = lines(e.typeLabel, e.vendorName ? `With ${e.vendorName}` : null, e.notes);
    const base = { uid: `event-${e.id}@wedding-hq`, summary: e.title, description, location: e.location, lastModified: e.updatedAt ?? null };
    if (e.allDayDate) return [{ ...base, kind: "date", date: e.allDayDate }];
    if (e.startAt) return [{ ...base, kind: "timed", start: e.startAt, end: e.endAt }];
    return [];
  });

  const deadlines = (input.deadlines ?? []).map(
    (d): IcsEvent => ({
      uid: `deadline-${d.id}@wedding-hq`,
      kind: "date",
      date: d.date,
      summary: `Deadline: ${d.title}`,
      description: d.detail,
      transparent: true,
    }),
  );

  return [wedding, ...payments, ...events, ...tasks, ...deadlines];
}
