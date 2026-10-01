import { addDays, addMonths, compareDates, daysBetween, type CalendarDate } from "../dates";

// The honeymoon: when we leave, when we're home, and the shortlist of places. Pure functions.

/** Leave two days after the wedding (the day after is for brunch, gifts and packing), for eight nights. */
export const SUGGESTED_GAP_DAYS = 2;
export const SUGGESTED_NIGHTS = 8;

export function suggestedTrip(weddingDate: CalendarDate): { departOn: CalendarDate; returnOn: CalendarDate } {
  const departOn = addDays(weddingDate, SUGGESTED_GAP_DAYS);
  return { departOn, returnOn: addDays(departOn, SUGGESTED_NIGHTS) };
}

export function tripNights(departOn: CalendarDate, returnOn: CalendarDate): number {
  return daysBetween(departOn, returnOn);
}

/** Why these dates can't be saved, or null. Either both dates or neither. */
export function tripDatesError(weddingDate: CalendarDate, departOn: CalendarDate | null, returnOn: CalendarDate | null): string | null {
  if ((departOn === null) !== (returnOn === null)) return "Pick both dates, or leave both blank.";
  if (departOn === null || returnOn === null) return null;
  if (compareDates(departOn, weddingDate) < 0) return "The honeymoon starts after the wedding.";
  if (compareDates(returnOn, departOn) <= 0) return "The day you're home comes after the day you leave.";
  if (tripNights(departOn, returnOn) > 60) return "That's more than 60 nights. Check the dates.";
  return null;
}

/** Many countries want a passport to stay valid six months past the day you leave them. */
export function passportValidUntil(returnOn: CalendarDate): CalendarDate {
  return addMonths(returnOn, 6);
}

/** A short trip is one with no real jet lag: about six hours' flying or less. */
export const SHORT_FLIGHT_HOURS = 6;

export type IdeaGroupKey = "short" | "long" | "own";

/** The shortlist in three groups: a short flight, a long one, and ideas without a flight time yet. */
export function groupIdeas<T extends { flightHours: number | null; sortOrder: number; name: string }>(
  ideas: T[],
): Array<{ key: IdeaGroupKey; title: string; ideas: T[] }> {
  const sorted = ideas.slice().sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  const groups: Array<{ key: IdeaGroupKey; title: string; ideas: T[] }> = [
    { key: "short", title: "A short flight, no jet lag", ideas: sorted.filter((i) => i.flightHours !== null && i.flightHours <= SHORT_FLIGHT_HOURS) },
    { key: "long", title: "Worth the long flight", ideas: sorted.filter((i) => i.flightHours !== null && i.flightHours > SHORT_FLIGHT_HOURS) },
    { key: "own", title: "More ideas", ideas: sorted.filter((i) => i.flightHours === null) },
  ];
  return groups.filter((g) => g.ideas.length > 0);
}
