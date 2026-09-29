// The run of show: wall-clock times, the three days around the wedding, derived rows (venue
// access and vendor arrivals come from settings and vendor pages, never stored here), and the
// draft templates. Pure functions only; loaders and actions feed them rows.
//
// Times are "HH:MM" strings on the wedding's wall clock, never instants. An item lives on one
// date: anything after midnight belongs to the next date.

import { addDays, daysBetween, formatClockTime, formatDate, type CalendarDate } from "../dates";
import { coversCategory, type VendorCategory, type VendorStatus } from "./vendors";

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DAY_MINUTES = 24 * 60;

// ─── Clock times ───────────────────────────────────────────────────────────────

export function isClockTime(value: unknown): value is string {
  return typeof value === "string" && HHMM.test(value);
}

/** "16:30" → 990. */
export function toMinutes(hhmm: string): number {
  const m = HHMM.exec(hhmm);
  if (!m) throw new Error(`Not an HH:MM time: ${hhmm}`);
  return Number(m[1]) * 60 + Number(m[2]);
}

/** 990 → "16:30". Only for minutes within one day. */
export function fromMinutes(total: number): string {
  if (!Number.isInteger(total) || total < 0 || total >= DAY_MINUTES) throw new Error(`Out of range: ${total}`);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Minutes from start to end, or null when there's no end (a single moment). */
export function durationMinutes(start: string, end: string | null): number | null {
  if (!end || !isClockTime(start) || !isClockTime(end)) return null;
  const d = toMinutes(end) - toMinutes(start);
  return d > 0 ? d : null;
}

/** 45 → "45 min", 60 → "1 hr", 90 → "1 hr 30 min". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/**
 * The end is optional and must come after the start on the same date. Something that runs past
 * midnight is split: this date ends by 11:59 PM (or has no end), the rest goes on the next date.
 */
export function timeRangeError(start: string, end: string | null, date: CalendarDate): string | null {
  if (!end || !isClockTime(start) || !isClockTime(end)) return null;
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (e === s) return "The end is the same as the start. Leave the end blank for a single moment, like an arrival.";
  if (e < s) {
    return (
      `The end has to be after the start. If this runs past midnight, end it by 11:59 PM or leave the end blank, ` +
      `and add what happens after midnight on ${formatDate(addDays(date, 1), "weekday-long")}.`
    );
  }
  return null;
}

// ─── The three days ────────────────────────────────────────────────────────────

export type DayKey = "rehearsal" | "wedding" | "after";
export type ViewKey = DayKey | "other";

export type TimelineDay = { key: DayKey; date: CalendarDate; label: string; tab: string };

/** Rehearsal day (wedding − 1), the wedding day, and the day after (wedding + 1). */
export function timelineDays(weddingDate: CalendarDate): TimelineDay[] {
  return [
    { key: "rehearsal", date: addDays(weddingDate, -1), label: "Rehearsal day", tab: "Rehearsal" },
    { key: "wedding", date: weddingDate, label: "The wedding day", tab: "Wedding day" },
    { key: "after", date: addDays(weddingDate, 1), label: "The day after", tab: "Day after" },
  ];
}

/** "Rehearsal Wed, Apr 12 · Wedding Thu, Apr 13 · Day after Fri, Apr 14", under a date field. */
export function dateHint(weddingDate: CalendarDate): string {
  const names: Record<DayKey, string> = { rehearsal: "Rehearsal", wedding: "Wedding", after: "Day after" };
  return timelineDays(weddingDate)
    .map((d) => `${names[d.key]} ${formatDate(d.date, "weekday-short")}, ${formatDate(d.date, "month-day")}`)
    .join(" · ");
}

export function viewKeyFor(date: CalendarDate, weddingDate: CalendarDate): ViewKey {
  const offset = daysBetween(weddingDate, date);
  if (offset === -1) return "rehearsal";
  if (offset === 0) return "wedding";
  if (offset === 1) return "after";
  return "other";
}

export function parseViewKey(value: string | string[] | undefined): ViewKey {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "rehearsal" || v === "after" || v === "other" ? v : "wedding";
}

/** "/timeline?day=after", with the wedding day as the plain URL. */
export function timelineHref(view: ViewKey, hash?: string): string {
  return `${view === "wedding" ? "/timeline" : `/timeline?day=${view}`}${hash ? `#${hash}` : ""}`;
}

// ─── Rows: stored items plus derived ones ─────────────────────────────────────

export type TimelineEntry = {
  id: string;
  date: CalendarDate;
  startTime: string;
  endTime: string | null;
  title: string;
  location: string | null;
  lead: string | null;
  involves: string | null;
  notes: string | null;
  vendor: { id: string; name: string } | null;
  isDemo: boolean;
};

export type ArrivalVendor = {
  id: string;
  name: string;
  category: VendorCategory;
  status: VendorStatus;
  arrivalTime: string | null;
};

/** Who arrives, in the words a run of show uses ("Florist arrives"). */
export const ARRIVAL_NOUN: Record<VendorCategory, string | null> = {
  VENUE: "Venue team",
  CATERING: "Caterer",
  PHOTOGRAPHY: "Photographer",
  VIDEOGRAPHY: "Videographer",
  FLORAL: "Florist",
  MUSIC_DJ: "DJ",
  MUSIC_CEREMONY: "Ceremony musicians",
  CAKE: "Cake delivery",
  ATTIRE: "Attire delivery",
  BEAUTY: "Hair and makeup team",
  STATIONERY: "Stationer",
  RENTALS: "Rentals",
  TRANSPORT: "Transportation",
  OFFICIANT: "Officiant",
  LODGING: null,
  OTHER: null,
};

export type ScheduleRow = {
  key: string;
  /** item: stored and editable. vendor: a booked vendor's arrival. venue: when the venue opens. */
  source: "item" | "vendor" | "venue";
  date: CalendarDate;
  startTime: string;
  endTime: string | null;
  title: string;
  location: string | null;
  lead: string | null;
  involves: string | null;
  notes: string | null;
  vendor: { id: string; name: string } | null;
  itemId: string | null;
  isDemo: boolean;
};

const SOURCE_ORDER: Record<ScheduleRow["source"], number> = { venue: 0, vendor: 1, item: 2 };

function itemRow(i: TimelineEntry): ScheduleRow {
  return {
    key: `item-${i.id}`,
    source: "item",
    date: i.date,
    startTime: i.startTime,
    endTime: i.endTime,
    title: i.title,
    location: i.location,
    lead: i.lead,
    involves: i.involves,
    notes: i.notes,
    vendor: i.vendor,
    itemId: i.id,
    isDemo: i.isDemo,
  };
}

/** Booked vendors with an arrival time, as wedding-day rows. */
export function arrivalRows(vendors: ArrivalVendor[], weddingDate: CalendarDate): ScheduleRow[] {
  return vendors
    .filter((v) => v.status === "BOOKED" && isClockTime(v.arrivalTime))
    .map((v) => ({
      key: `vendor-${v.id}`,
      source: "vendor" as const,
      date: weddingDate,
      startTime: v.arrivalTime!,
      endTime: null,
      title: `${ARRIVAL_NOUN[v.category] ?? v.name} arrives`,
      location: null,
      lead: null,
      involves: null,
      notes: null,
      vendor: { id: v.id, name: v.name },
      itemId: null,
      isDemo: false,
    }));
}

/**
 * One date's run of show, sorted by start time. On the wedding day it also has the derived rows:
 * the venue opening to vendors and each booked vendor's arrival. Ties keep venue, then
 * arrivals, then items in the order given.
 */
export function daySchedule(input: {
  date: CalendarDate;
  items: TimelineEntry[];
  weddingDate: CalendarDate;
  vendors: ArrivalVendor[];
  venueAccessTime: string;
  venueName: string;
}): ScheduleRow[] {
  const rows: ScheduleRow[] = input.items.filter((i) => i.date === input.date && isClockTime(i.startTime)).map(itemRow);
  if (input.date === input.weddingDate) {
    if (isClockTime(input.venueAccessTime)) {
      rows.push({
        key: "venue-access",
        source: "venue",
        date: input.date,
        startTime: input.venueAccessTime,
        endTime: null,
        title: "Venue opens to vendors",
        location: input.venueName,
        lead: null,
        involves: null,
        notes: null,
        vendor: null,
        itemId: null,
        isDemo: false,
      });
    }
    rows.push(...arrivalRows(input.vendors, input.weddingDate));
  }
  return rows
    .map((row, index) => ({ row, index }))
    .sort(
      (a, b) =>
        toMinutes(a.row.startTime) - toMinutes(b.row.startTime) ||
        SOURCE_ORDER[a.row.source] - SOURCE_ORDER[b.row.source] ||
        a.index - b.index,
    )
    .map((x) => x.row);
}

/** The wedding night's small hours: next-day rows that start before the venue opens again. */
export function afterMidnight(nextDayRows: ScheduleRow[], venueAccessTime: string): ScheduleRow[] {
  if (!isClockTime(venueAccessTime)) return [];
  const cutoff = toMinutes(venueAccessTime);
  return nextDayRows.filter((r) => toMinutes(r.startTime) < cutoff);
}

/** First start to last finish, with the finish possibly after midnight. */
export function scheduleSpan(rows: ScheduleRow[], nightRows: ScheduleRow[] = []): { from: string; to: string; nextDay: boolean } | null {
  if (rows.length === 0) return null;
  let last = -1;
  for (const r of rows) last = Math.max(last, toMinutes(r.endTime ?? r.startTime));
  for (const r of nightRows) last = Math.max(last, DAY_MINUTES + toMinutes(r.endTime ?? r.startTime));
  const nextDay = last >= DAY_MINUTES;
  return { from: rows[0].startTime, to: fromMinutes(last % DAY_MINUTES), nextDay };
}

/** Items dated outside the three days, grouped by date, earliest first. */
export function otherDays(items: TimelineEntry[], weddingDate: CalendarDate): Array<{ date: CalendarDate; rows: ScheduleRow[] }> {
  const byDate = new Map<CalendarDate, TimelineEntry[]>();
  for (const i of items) {
    if (viewKeyFor(i.date, weddingDate) !== "other") continue;
    byDate.set(i.date, [...(byDate.get(i.date) ?? []), i]);
  }
  return [...byDate.keys()]
    .sort()
    .map((date) => ({
      date,
      rows: daySchedule({ date, items: byDate.get(date)!, weddingDate, vendors: [], venueAccessTime: "", venueName: "" }),
    }));
}

/** "4:00 PM" or "4:00 PM to 4:30 PM". */
export function formatTimeRange(start: string, end: string | null): string {
  return end ? `${formatClockTime(start)} to ${formatClockTime(end)}` : formatClockTime(start);
}

// ─── Templates ────────────────────────────────────────────────────────────────

export type TemplateItem = {
  key: string;
  date: CalendarDate;
  startTime: string;
  endTime: string | null;
  title: string;
  location: string | null;
  lead: string | null;
  involves: string | null;
  notes: string | null;
  /** Linked to the booked vendor covering this category, if there is one. */
  vendorCategory: VendorCategory | null;
};

type Step = {
  key: string;
  title: string;
  /** Minutes from the anchor (the ceremony, or the rehearsal). */
  at: number;
  /** Minutes long, or null for a single moment. */
  length: number | null;
  location?: string | null;
  lead?: string;
  involves?: string;
  notes?: string;
  vendorCategory?: VendorCategory;
  /** A vendor arriving. Left out when that vendor's page already has an arrival time. */
  arrival?: boolean;
};

/** Earliest and latest ceremony start the wedding-day template is built for. */
export const TEMPLATE_CEREMONY_RANGE = { earliest: "10:00", latest: "19:00" } as const;
/** The template needs this long between the venue opening and the ceremony. */
const MIN_PREP_MINUTES = 3 * 60;
/** The last hour before the ceremony keeps its shape; only earlier steps are compressed. */
const FIXED_LEAD_IN = 60;

/** Why a ceremony time can't be used for the template, or null. */
export function weddingTemplateError(ceremonyTime: string, venueAccessTime: string): string | null {
  if (!isClockTime(ceremonyTime)) return "Use a time like 4:00 PM.";
  const { earliest, latest } = TEMPLATE_CEREMONY_RANGE;
  if (ceremonyTime < earliest || ceremonyTime > latest) {
    return `The template is built for ceremonies between ${formatClockTime(earliest)} and ${formatClockTime(latest)}. For another time, add the day by hand.`;
  }
  if (isClockTime(venueAccessTime) && toMinutes(ceremonyTime) - toMinutes(venueAccessTime) < MIN_PREP_MINUTES) {
    return `The venue opens to vendors at ${formatClockTime(venueAccessTime)}, which leaves less than 3 hours to get ready. Pick a later ceremony, or add the day by hand.`;
  }
  return null;
}

export const REHEARSAL_RANGE = { earliest: "10:00", latest: "20:00" } as const;

export function rehearsalTemplateError(rehearsalTime: string): string | null {
  if (!isClockTime(rehearsalTime)) return "Use a time like 5:00 PM.";
  const { earliest, latest } = REHEARSAL_RANGE;
  if (rehearsalTime < earliest || rehearsalTime > latest) {
    return `Pick a start between ${formatClockTime(earliest)} and ${formatClockTime(latest)}, or add the day by hand.`;
  }
  return null;
}

function round5(n: number): number {
  return Math.round(n / 5) * 5;
}

/** Absolute minutes from the anchor date's midnight → a row on the right date. */
function place(
  step: Step,
  date: CalendarDate,
  start: number,
  end: number | null,
  titleOverride?: string,
): TemplateItem {
  const dayOffset = Math.floor(start / DAY_MINUTES);
  const startInDay = start - dayOffset * DAY_MINUTES;
  let endInDay: number | null = end === null ? null : end - dayOffset * DAY_MINUTES;
  let notes = step.notes ?? null;
  if (endInDay !== null && endInDay >= DAY_MINUTES) {
    // Runs past midnight: this date keeps the start, and the note says when it really ends.
    const until = endInDay - DAY_MINUTES;
    const runs = until === 0 ? "Runs until midnight." : `Runs until ${formatClockTime(fromMinutes(until))}, after midnight.`;
    notes = notes ? `${runs} ${notes}` : runs;
    endInDay = null;
  }
  return {
    key: step.key,
    date: addDays(date, dayOffset),
    startTime: fromMinutes(startInDay),
    endTime: endInDay === null || endInDay <= startInDay ? null : fromMinutes(endInDay),
    title: titleOverride ?? step.title,
    location: step.location ?? null,
    lead: step.lead ?? null,
    involves: step.involves ?? null,
    notes,
    vendorCategory: step.vendorCategory ?? null,
  };
}

function sortTemplate(items: TemplateItem[]): TemplateItem[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => a.item.date.localeCompare(b.item.date) || a.item.startTime.localeCompare(b.item.startTime) || a.index - b.index)
    .map((x) => x.item);
}

const SUITE = "Getting-ready suites";
const GROUNDS = "On the grounds";
const CEREMONY_SITE = "Ceremony site";
const RECEPTION = "Reception room";

function weddingSteps(venueName: string, firstLook: boolean): Step[] {
  const before: Step[] = [
    {
      key: "setup",
      title: "Vendor setup",
      at: -360,
      length: 300,
      location: venueName,
      lead: "Coordinator",
      involves: "Florist, rentals, décor and the venue team",
      notes: "Ceremony site, cocktail area and reception room.",
    },
    {
      key: "hair-makeup",
      title: "Hair and makeup",
      at: -330,
      length: firstLook ? 195 : 210,
      location: SUITE,
      lead: "Hair and makeup team",
      involves: "Bride's side attendants, family and the couple, as booked",
      notes: "Last touch-ups just before getting dressed.",
      vendorCategory: "BEAUTY",
    },
    {
      key: "photographer-arrives",
      title: "Photographer arrives",
      at: -240,
      length: null,
      location: SUITE,
      lead: "Photographer",
      notes: "Have the details gathered in one box so photos can start right away.",
      vendorCategory: "PHOTOGRAPHY",
      arrival: true,
    },
    {
      key: "details",
      title: "Details photos",
      at: -235,
      length: 40,
      location: SUITE,
      lead: "Photographer",
      notes: "Rings, invitation suite, shoes, florals and heirlooms.",
      vendorCategory: "PHOTOGRAPHY",
    },
  ];

  const withFirstLook: Step[] = [
    {
      key: "getting-dressed",
      title: "Getting dressed",
      at: -135,
      length: 30,
      location: SUITE,
      lead: "Photographer",
      involves: "The couple, each in their own suite",
    },
    {
      key: "first-look",
      title: "First look and portraits of the two of you",
      at: -100,
      length: 30,
      location: GROUNDS,
      lead: "Photographer",
      involves: "The couple",
      notes: "A private moment before the ceremony. Pick a quiet spot guests won't pass.",
      vendorCategory: "PHOTOGRAPHY",
    },
    {
      key: "party-family-photos",
      title: "Wedding party and family photos",
      at: -70,
      length: 40,
      location: GROUNDS,
      lead: "Photographer",
      involves: "Wedding party, parents and immediate family",
      notes: "Send the photographer the family photo list ahead of time, and name a family helper to gather people.",
      vendorCategory: "PHOTOGRAPHY",
    },
  ];

  const withoutFirstLook: Step[] = [
    {
      key: "getting-dressed",
      title: "Getting dressed",
      at: -120,
      length: 30,
      location: SUITE,
      lead: "Photographer",
      involves: "The couple, each in their own suite",
    },
    {
      key: "party-family-photos",
      title: "Wedding party and family photos, each side",
      at: -85,
      length: 45,
      location: GROUNDS,
      lead: "Photographer",
      involves: "Wedding party, parents and immediate family",
      notes: "Each side on its own, so the two of you don't see each other before the aisle.",
      vendorCategory: "PHOTOGRAPHY",
    },
  ];

  const ceremony: Step[] = [
    {
      key: "guests-arrive",
      title: "Guests arrive",
      at: -30,
      length: 30,
      location: CEREMONY_SITE,
      lead: "Coordinator",
      involves: "Guests and ushers",
      notes: "Prelude music plays. The couple stays out of sight.",
      vendorCategory: "MUSIC_CEREMONY",
    },
    {
      key: "ceremony",
      title: "Ceremony",
      at: 0,
      length: 30,
      location: CEREMONY_SITE,
      lead: "Officiant",
      involves: "The couple, wedding party, officiant and readers",
      notes: "Processional, vows, rings, recessional.",
      vendorCategory: "OFFICIANT",
    },
    {
      key: "cocktail-hour",
      title: "Cocktail hour",
      at: 30,
      length: 60,
      location: "Cocktail area",
      lead: "Venue team",
      involves: "Guests",
      notes: firstLook
        ? "Most photos are done, so the two of you can join your guests."
        : "The two of you join once the photos together are done.",
      vendorCategory: "CATERING",
    },
  ];

  const photosTogether: Step[] = firstLook
    ? []
    : [
        {
          key: "photos-together",
          title: "Photos together: the two of you, the full wedding party and both families",
          at: 35,
          length: 40,
          location: GROUNDS,
          lead: "Photographer",
          involves: "The couple, wedding party and family",
          vendorCategory: "PHOTOGRAPHY",
        },
      ];

  const reception: Step[] = [
    {
      key: "grand-entrance",
      title: "Grand entrance and first dance",
      at: 95,
      length: 10,
      location: RECEPTION,
      lead: "DJ",
      involves: "The couple and the wedding party",
      notes: "Guests are seated a few minutes before.",
      vendorCategory: "MUSIC_DJ",
    },
    {
      key: "welcome",
      title: "Welcome",
      at: 105,
      length: 5,
      location: RECEPTION,
      lead: "DJ",
      involves: "A host or parent",
      notes: "A short thank-you, and a blessing if you'd like one.",
    },
    {
      key: "meal",
      title: "Dinner",
      at: 110,
      length: 60,
      location: RECEPTION,
      lead: "Venue team",
      involves: "Everyone",
      notes: "Vendors eat now too, so they're ready for the toasts.",
      vendorCategory: "CATERING",
    },
    {
      key: "toasts",
      title: "Toasts",
      at: 170,
      length: 15,
      location: RECEPTION,
      lead: "DJ",
      involves: "Best man, maid of honor and matron of honor",
    },
    {
      key: "parent-dances",
      title: "Parent dances",
      at: 185,
      length: 10,
      location: RECEPTION,
      lead: "DJ",
      involves: "The couple and parents",
      vendorCategory: "MUSIC_DJ",
    },
    {
      key: "cake-cutting",
      title: "Cake cutting",
      at: 195,
      length: 10,
      location: RECEPTION,
      lead: "DJ",
      involves: "The couple",
      vendorCategory: "CAKE",
    },
    {
      key: "open-dancing",
      title: "Open dancing",
      at: 205,
      length: 140,
      location: RECEPTION,
      lead: "DJ",
      involves: "Everyone",
      vendorCategory: "MUSIC_DJ",
    },
    {
      key: "last-dance",
      title: "Last dance",
      at: 345,
      length: 5,
      location: RECEPTION,
      lead: "DJ",
      involves: "Everyone",
      vendorCategory: "MUSIC_DJ",
    },
    {
      key: "send-off",
      title: "Send-off",
      at: 350,
      length: 10,
      location: "Front entrance",
      lead: "Coordinator",
      involves: "Guests and the couple",
      notes: "Sparklers, bubbles or petals, if the venue allows them.",
    },
    {
      key: "load-out",
      title: "Vendor load-out",
      at: 360,
      length: 60,
      location: venueName,
      lead: "Coordinator",
      involves: "Vendors and the venue team",
      notes: "Gifts, cards, personal items and anything you own go home with a named person.",
    },
  ];

  return [...before, ...(firstLook ? withFirstLook : withoutFirstLook), ...ceremony, ...photosTogether, ...reception];
}

/**
 * A draft wedding-day run of show around the ceremony time.
 *
 * - Nothing starts before the venue opens: when the morning is short, the steps before the last
 *   hour are compressed evenly (the last hour before the ceremony keeps its shape).
 * - Anything that would start after midnight moves to the next date. Something that starts
 *   before midnight and runs past it keeps its start, drops its end and says when it ends.
 * - The meal is lunch when it starts before 3:00 PM.
 */
export function buildWeddingDayTemplate(input: {
  weddingDate: CalendarDate;
  ceremonyTime: string;
  venueAccessTime: string;
  venueName: string;
  firstLook: boolean;
  /** Categories whose booked vendor already has an arrival time (shown from their page). */
  arrivalsKnown?: VendorCategory[];
}): TemplateItem[] {
  const c = toMinutes(input.ceremonyTime);
  const access = isClockTime(input.venueAccessTime) ? toMinutes(input.venueAccessTime) : 0;
  const known = new Set(input.arrivalsKnown ?? []);
  const steps = weddingSteps(input.venueName, input.firstLook).filter((s) => !(s.arrival && s.vendorCategory && known.has(s.vendorCategory)));

  // Compress the early steps if the morning is shorter than the template wants.
  const want = Math.max(...steps.map((s) => -s.at));
  const have = c - access;
  const shift = (offset: number): number => {
    const before = -offset;
    if (before <= FIXED_LEAD_IN || want <= have) return offset;
    const scaled = FIXED_LEAD_IN + ((before - FIXED_LEAD_IN) * Math.max(0, have - FIXED_LEAD_IN)) / (want - FIXED_LEAD_IN);
    return -Math.min(round5(scaled), Math.max(have, 0));
  };

  const items = steps.map((s) => {
    let start = c + shift(s.at);
    let end = s.length === null ? null : c + shift(s.at + s.length);
    if (start < access) start = access;
    if (end !== null && end <= start) end = null;
    const title = s.key === "meal" && start < 15 * 60 ? "Lunch" : s.title;
    return place(s, input.weddingDate, start, end, title);
  });
  return sortTemplate(items);
}

/** A smaller draft for the rehearsal day: drop-off, rehearsal, rehearsal dinner. */
export function buildRehearsalTemplate(input: { rehearsalDate: CalendarDate; rehearsalTime: string; venueName: string }): TemplateItem[] {
  const r = toMinutes(input.rehearsalTime);
  const steps: Step[] = [
    {
      key: "drop-off",
      title: "Drop off décor, signs and the guest book",
      at: -60,
      length: 30,
      location: input.venueName,
      lead: "Coordinator",
      notes: "Ask the venue what can stay overnight.",
    },
    {
      key: "rehearsal",
      title: "Ceremony rehearsal",
      at: 0,
      length: 60,
      location: input.venueName,
      lead: "Officiant or coordinator",
      involves: "Wedding party, officiant, readers and parents",
      notes: "Walk the processional and recessional twice, and confirm where everyone stands.",
      vendorCategory: "OFFICIANT",
    },
    {
      key: "rehearsal-dinner",
      title: "Rehearsal dinner",
      at: 90,
      length: 150,
      lead: "Hosts",
      involves: "Wedding party, families and invited guests",
      notes: "Toasts from the hosts. A good time to give the wedding party their gifts.",
    },
  ];
  return sortTemplate(
    steps.map((s) => place(s, input.rehearsalDate, Math.max(0, r + s.at), s.length === null ? null : Math.max(0, r + s.at) + s.length)),
  );
}

/** The booked vendor for a template row: one whose category (or "also covers") matches. */
export function vendorForCategory<V extends { id: string; name: string; category: VendorCategory; alsoCovers: VendorCategory[]; status: VendorStatus }>(
  category: VendorCategory | null,
  vendors: V[],
): V | null {
  if (!category) return null;
  const booked = vendors.filter((v) => v.status === "BOOKED").sort((a, b) => a.name.localeCompare(b.name, "en-US"));
  return booked.find((v) => v.category === category) ?? booked.find((v) => coversCategory(v, category)) ?? null;
}
