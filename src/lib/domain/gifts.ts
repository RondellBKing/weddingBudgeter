import { addDays, addMonths, compareDates, daysBetween, type CalendarDate } from "../dates";

// Gifts and thank-you notes. Whether a note is still owed comes only from thankYouSentOn.
//
// The gentle guideline: for a gift that arrives before the wedding, write within about two
// weeks. For a gift at or after the wedding, write within about three months of the wedding
// (and always allow at least two weeks, so a gift that arrives late isn't late on arrival).
//
// Pure functions; no imports beyond dates, so the client can use searchKey too.

export const BEFORE_WEDDING_DAYS = 14;
export const AFTER_WEDDING_MONTHS = 3;

export type ThankYouRule = "before-wedding" | "after-wedding";

/** When the note should go out by, and which rule set it. */
export function thankYouWriteBy(receivedOn: CalendarDate, weddingDate: CalendarDate): { writeBy: CalendarDate; rule: ThankYouRule } {
  const twoWeeks = addDays(receivedOn, BEFORE_WEDDING_DAYS);
  if (compareDates(receivedOn, weddingDate) < 0) return { writeBy: twoWeeks, rule: "before-wedding" };
  const threeMonths = addMonths(weddingDate, AFTER_WEDDING_MONTHS);
  return { writeBy: compareDates(twoWeeks, threeMonths) > 0 ? twoWeeks : threeMonths, rule: "after-wedding" };
}

export type ThankYouState = "on-time" | "soon" | "late";

export const THANK_YOU_STATE: Record<ThankYouState, { label: string; tone: "on-track" | "due-soon" | "overdue" }> = {
  "on-time": { label: "On time", tone: "on-track" },
  soon: { label: "Write this week", tone: "due-soon" },
  late: { label: "Running late", tone: "overdue" },
};

/** Late once the write-by date has passed; "this week" for the seven days before it. */
export function thankYouState(writeBy: CalendarDate, today: CalendarDate): { state: ThankYouState; daysLeft: number } {
  const daysLeft = daysBetween(today, writeBy);
  const state: ThankYouState = daysLeft < 0 ? "late" : daysLeft <= 7 ? "soon" : "on-time";
  return { state, daysLeft };
}

/** How long a gift has waited for its note: days for two weeks, then weeks, then months. */
export function waitedLabel(days: number): string {
  if (days <= 0) return "Arrived today";
  if (days === 1) return "Waiting 1 day";
  if (days < 14) return `Waiting ${days} days`;
  if (days < 60) return `Waiting ${Math.floor(days / 7)} weeks`;
  const months = Math.floor(days / 30);
  return `Waiting ${months} months`;
}

export type GiftLike = {
  id: string;
  receivedOn: CalendarDate;
  thankYouSentOn: CalendarDate | null;
};

export type OwedGift<T> = T & {
  waitedDays: number;
  writeBy: CalendarDate;
  rule: ThankYouRule;
  state: ThankYouState;
  daysLeft: number;
};

/** Gifts still waiting for a thank-you, oldest first (ties keep the input order). */
export function thankYousOwed<T extends GiftLike>(gifts: T[], weddingDate: CalendarDate, today: CalendarDate): Array<OwedGift<T>> {
  return gifts
    .map((g, i) => ({ g, i }))
    .filter(({ g }) => g.thankYouSentOn === null)
    .sort((a, b) => compareDates(a.g.receivedOn, b.g.receivedOn) || a.i - b.i)
    .map(({ g }) => {
      const { writeBy, rule } = thankYouWriteBy(g.receivedOn, weddingDate);
      const { state, daysLeft } = thankYouState(writeBy, today);
      return { ...g, waitedDays: Math.max(0, daysBetween(g.receivedOn, today)), writeBy, rule, state, daysLeft };
    });
}

export type GiftTotals = { received: number; thanked: number; toWrite: number; late: number };

export function giftTotals(gifts: GiftLike[], weddingDate: CalendarDate, today: CalendarDate): GiftTotals {
  const owed = thankYousOwed(gifts, weddingDate, today);
  return {
    received: gifts.length,
    thanked: gifts.length - owed.length,
    toWrite: owed.length,
    late: owed.filter((g) => g.state === "late").length,
  };
}

/** Newest gift first, for the full log. */
export function newestFirst<T extends GiftLike & { createdAt?: Date }>(gifts: T[]): T[] {
  return [...gifts].sort(
    (a, b) => compareDates(b.receivedOn, a.receivedOn) || (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
  );
}

// ─── Picking a guest ──────────────────────────────────────────────────────────

/** Lowercase, accents and punctuation stripped: "Zoë O'Neil" → "zoe oneil". */
export function searchKey(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’‘`´.]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export type GuestChoice = { id: string; fullName: string; householdName: string; key: string };

/**
 * Guests whose name or household matches every word typed, best matches first: a name that
 * starts with the query, then a word in the name, then a household match.
 */
export function matchGuests<T extends GuestChoice>(guests: T[], query: string, limit = 8): T[] {
  const q = searchKey(query);
  if (!q) return [];
  const words = q.split(" ");
  const scored: Array<{ g: T; score: number; i: number }> = [];
  guests.forEach((g, i) => {
    if (!words.every((w) => g.key.includes(w))) return;
    const name = searchKey(g.fullName);
    const score = name.startsWith(q) ? 0 : name.split(" ").some((part) => part.startsWith(words[0])) ? 1 : 2;
    scored.push({ g, score, i });
  });
  return scored.sort((a, b) => a.score - b.score || a.i - b.i).slice(0, limit).map((s) => s.g);
}
