import { addDays, addMonths, compareDates, type CalendarDate } from "../dates";

// The planning timeline: every milestone and appointment from the signed contract to the day
// after, in chapters counted back from the wedding. Pure functions; nothing is stored.

export type JourneyEntry = {
  id: string;
  kind: "milestone" | "appointment" | "honeymoon";
  date: CalendarDate;
  title: string;
  notes: string | null;
  done: boolean;
  /** Where it's edited. */
  href: string;
  /** Milestones: the task id, for the tick box. */
  taskId?: string;
  /** Appointments: "6:00 PM", and where. */
  time?: string | null;
  location?: string | null;
  /** "Wedding party", "Venue"… */
  meta?: string | null;
};

export type ChapterKey = "foundations" | "twelve" | "nine" | "six" | "three" | "final" | "week" | "day" | "after";

export type Chapter = {
  key: ChapterKey;
  title: string;
  span: string;
  from: CalendarDate | null;
  /** Exclusive. */
  until: CalendarDate | null;
  entries: JourneyEntry[];
  /** Holds today: entries before `todayAt` are in the past. */
  current: boolean;
  todayAt: number | null;
};

/** The chapters for a wedding date, as date ranges (from inclusive, until exclusive). */
export function chapterRanges(wedding: CalendarDate): Array<Omit<Chapter, "entries" | "current" | "todayAt">> {
  const m = (n: number) => addMonths(wedding, -n);
  return [
    { key: "foundations", title: "The foundations", span: "A year and more before", from: null, until: m(12) },
    { key: "twelve", title: "Twelve to nine months", span: "Setting the scene", from: m(12), until: m(9) },
    { key: "nine", title: "Nine to six months", span: "The look takes shape", from: m(9), until: m(6) },
    { key: "six", title: "Six to three months", span: "Fittings, tastings and parties", from: m(6), until: m(3) },
    { key: "three", title: "Three months to one", span: "Invitations out", from: m(3), until: m(1) },
    { key: "final", title: "The final month", span: "Confirm everything", from: m(1), until: addDays(wedding, -7) },
    { key: "week", title: "The week of", span: "Rehearsal and last details", from: addDays(wedding, -7), until: wedding },
    { key: "day", title: "The day", span: "Everything leads here", from: wedding, until: addDays(wedding, 1) },
    { key: "after", title: "After", span: "The honeymoon, thank-yous and keepsakes", from: addDays(wedding, 1), until: null },
  ];
}

const inRange = (d: CalendarDate, from: CalendarDate | null, until: CalendarDate | null) =>
  (from === null || compareDates(d, from) >= 0) && (until === null || compareDates(d, until) < 0);

/**
 * Entries sorted into chapters by date (milestones before appointments on the same day), empty
 * chapters left out, and the chapter holding today marked with where today falls in it.
 */
export function planningChapters(entries: JourneyEntry[], wedding: CalendarDate, today: CalendarDate): Chapter[] {
  const sorted = [...entries].sort(
    (a, b) => compareDates(a.date, b.date) || (a.kind === b.kind ? 0 : a.kind === "milestone" ? -1 : 1) || a.title.localeCompare(b.title),
  );
  return chapterRanges(wedding)
    .map((r) => {
      const list = sorted.filter((e) => inRange(e.date, r.from, r.until));
      const current = inRange(today, r.from, r.until);
      const idx = list.findIndex((e) => compareDates(e.date, today) >= 0);
      return { ...r, entries: list, current, todayAt: current ? (idx === -1 ? list.length : idx) : null };
    })
    .filter((c) => c.entries.length > 0 || c.current);
}

export type JourneyStats = { milestones: number; done: number; next: JourneyEntry | null; appointmentsAhead: number };

export function journeyStats(entries: JourneyEntry[], today: CalendarDate): JourneyStats {
  const milestones = entries.filter((e) => e.kind === "milestone");
  const ahead = [...entries].filter((e) => !e.done && compareDates(e.date, today) >= 0).sort((a, b) => compareDates(a.date, b.date));
  return {
    milestones: milestones.length,
    done: milestones.filter((m) => m.done).length,
    next: ahead.find((e) => e.kind === "milestone") ?? null,
    appointmentsAhead: ahead.filter((e) => e.kind === "appointment").length,
  };
}
