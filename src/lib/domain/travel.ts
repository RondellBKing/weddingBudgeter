import { compareDates, daysBetween, type CalendarDate } from "../dates";
import { deadlineUrgency, type Tone, type UrgencyLevel } from "./deadlines";
import { normalizeText } from "./guest-import";

// Hotels & travel: how loudly each hotel's group-rate cutoff should speak, shuttle runs in
// order, and the welcome bags (what's in them, how many to make, where each item stands).
// Pure functions only; the loader feeds them database rows.

// ─── Hotel blocks ─────────────────────────────────────────────────────────────

export type CutoffStatus = {
  daysLeft: number;
  level: UrgencyLevel;
  tone: Tone;
  /** The level in words: status is never color alone. */
  label: string;
  /** What to do about it now. */
  message: string;
};

export const CUTOFF_LABEL: Record<UrgencyLevel, string> = {
  calm: "Plenty of time",
  "90": "Under 90 days",
  "60": "Under 60 days",
  "30": "Under 30 days",
  "14": "Two weeks left",
  "7": "Final week",
  overdue: "Cutoff passed",
};

const CUTOFF_MESSAGE: Record<UrgencyLevel, string> = {
  calm: "Share the booking link and group code when the invitations go out.",
  "90": "About three months left. A friendly reminder to guests helps.",
  "60": "Two months left. Ask the hotel how many rooms are booked, and whether it can hold more.",
  "30": "One month left. Remind anyone who hasn't booked. Unbooked rooms go back to the hotel after the cutoff.",
  "14": "Two weeks left. Send one more reminder and confirm the count with the hotel.",
  "7": "Final week at the group rate. Send a last reminder today.",
  overdue: "The group rate has ended. Guests who still need a room book at the hotel's regular rate.",
};

/** Urgency for a hotel's cutoff date, using the same steps as every other hard deadline. */
export function cutoffStatus(cutoff: CalendarDate, today: CalendarDate): CutoffStatus {
  const u = deadlineUrgency(cutoff, today);
  return { ...u, label: CUTOFF_LABEL[u.level], message: CUTOFF_MESSAGE[u.level] };
}

/** The big figure and its caption for a cutoff ("12" / "days left", "Today" / "last day"). */
export function cutoffCountdown(daysLeft: number): { figure: string; caption: string } {
  if (daysLeft === 0) return { figure: "Today", caption: "last day at the group rate" };
  const n = Math.abs(daysLeft).toLocaleString("en-US");
  if (daysLeft > 0) return { figure: n, caption: daysLeft === 1 ? "day left" : "days left" };
  return { figure: n, caption: daysLeft === -1 ? "day since the cutoff" : "days since the cutoff" };
}

/** Nights between check-in and check-out, or null when either is missing or they're out of order. */
export function nights(checkIn: CalendarDate | null, checkOut: CalendarDate | null): number | null {
  if (!checkIn || !checkOut) return null;
  const n = daysBetween(checkIn, checkOut);
  return n > 0 ? n : null;
}

/** Soonest cutoff first; hotels without a cutoff last; then by name. */
export function sortHotels<T extends { name: string; cutoffDate: CalendarDate | null }>(hotels: T[]): T[] {
  return [...hotels].sort((a, b) => {
    if (a.cutoffDate && b.cutoffDate) {
      const c = compareDates(a.cutoffDate, b.cutoffDate);
      if (c !== 0) return c;
    } else if (a.cutoffDate || b.cutoffDate) {
      return a.cutoffDate ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

// ─── Shuttles ─────────────────────────────────────────────────────────────────

export type ShuttleDay<T> = { date: CalendarDate; runs: T[]; seats: number };

/**
 * Runs grouped by date, earliest day first, each day in departure order. Times are "HH:MM"
 * wall-clock strings on the wedding's calendar, so comparing them as strings is enough.
 */
export function groupShuttles<T extends { date: CalendarDate; departTime: string; seats: number | null }>(
  runs: T[],
): Array<ShuttleDay<T>> {
  const days = new Map<string, ShuttleDay<T>>();
  for (const r of runs) {
    let day = days.get(r.date);
    if (!day) {
      day = { date: r.date, runs: [], seats: 0 };
      days.set(r.date, day);
    }
    day.runs.push(r);
    day.seats += r.seats ?? 0;
  }
  const out = [...days.values()].sort((a, b) => compareDates(a.date, b.date));
  for (const d of out) d.runs.sort((a, b) => (a.departTime < b.departTime ? -1 : a.departTime > b.departTime ? 1 : 0));
  return out;
}

// ─── Welcome bags ─────────────────────────────────────────────────────────────

export type BagItemStatus = "not-ordered" | "ordered" | "received";

export const BAG_STATUS: Record<BagItemStatus, { label: string; tone: "on-track" | "due-soon" | "neutral" }> = {
  "not-ordered": { label: "Not ordered", tone: "neutral" },
  ordered: { label: "Ordered", tone: "due-soon" },
  received: { label: "Received", tone: "on-track" },
};

/** Where an item stands, from its dates. Received wins even if nobody noted the order date. */
export function bagItemStatus(item: { orderedOn: CalendarDate | null; receivedOn: CalendarDate | null }): BagItemStatus {
  if (item.receivedOn) return "received";
  if (item.orderedOn) return "ordered";
  return "not-ordered";
}

export type BagCount = {
  /** False until a guest list exists; then there's nothing to count yet. */
  hasGuestList: boolean;
  /** Households with at least one guest who hasn't declined: the suggested number of bags. */
  bags: number;
  /** Every household on the list, declined or not. */
  households: number;
};

/**
 * One bag per household that hasn't fully declined. Pending counts as coming, as it does for
 * the headcount. Household names are compared loosely ("The Riveras" = "the riveras").
 */
export function bagCount(guests: Array<{ householdName: string; rsvpStatus: "PENDING" | "ATTENDING" | "DECLINED" | null }>): BagCount {
  const all = new Set<string>();
  const coming = new Set<string>();
  for (const g of guests) {
    const key = normalizeText(g.householdName) || g.householdName;
    all.add(key);
    if (g.rsvpStatus !== "DECLINED") coming.add(key);
  }
  return { hasGuestList: guests.length > 0, bags: coming.size, households: all.size };
}

/** How many of an item to buy: per bag × bags. Null until there's a guest list to count. */
export function toBuy(perBag: number, count: BagCount): number | null {
  return count.hasGuestList ? perBag * count.bags : null;
}

/** Items still to order and still to arrive, for the summary line. */
export function bagProgress(items: Array<{ orderedOn: CalendarDate | null; receivedOn: CalendarDate | null }>) {
  const c = { total: items.length, notOrdered: 0, ordered: 0, received: 0 };
  for (const i of items) {
    const s = bagItemStatus(i);
    if (s === "received") c.received++;
    else if (s === "ordered") c.ordered++;
    else c.notOrdered++;
  }
  return c;
}
