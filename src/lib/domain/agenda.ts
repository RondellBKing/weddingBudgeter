import { compareDates, dueState, formatDate, monthKey, type CalendarDate, type DueState } from "../dates";

// The calendar is a union of sources merged at read time: appointments, payment due dates,
// task due dates and planner deadlines (hotel cutoffs, décor returns). Nothing is copied into a
// second table to make this work.

export type AgendaKind = "payment" | "task" | "milestone" | "event" | "deadline";

export type AgendaItem = {
  id: string;
  date: CalendarDate;
  kind: AgendaKind;
  title: string;
  detail?: string;
  /** Wedding-day local time for timed events, "HH:MM". */
  time?: string;
  amountCents?: number | null;
  done: boolean;
  state: DueState;
};

export type AgendaSources = {
  payments: Array<{ id: string; dueDate: CalendarDate; paidDate: CalendarDate | null; title: string; detail?: string; amountCents: number | null }>;
  tasks: Array<{ id: string; dueDate: CalendarDate | null; title: string; isMilestone: boolean; done: boolean; detail?: string }>;
  events: Array<{ id: string; date: CalendarDate; title: string; time?: string; detail?: string }>;
  deadlines?: Array<{ id: string; date: CalendarDate; title: string; detail?: string; done: boolean }>;
};

const KIND_ORDER: Record<AgendaKind, number> = { milestone: 0, payment: 1, deadline: 2, event: 3, task: 4 };

export function buildAgenda(
  src: AgendaSources,
  today: CalendarDate,
  opts: { from?: CalendarDate; until?: CalendarDate; includeDone?: boolean } = {},
): AgendaItem[] {
  const items: AgendaItem[] = [];
  for (const p of src.payments) {
    items.push({
      id: `payment:${p.id}`,
      date: p.dueDate,
      kind: "payment",
      title: p.title,
      detail: p.detail,
      amountCents: p.amountCents,
      done: p.paidDate !== null,
      state: dueState(p.dueDate, today),
    });
  }
  for (const t of src.tasks) {
    if (!t.dueDate) continue;
    items.push({
      id: `task:${t.id}`,
      date: t.dueDate,
      kind: t.isMilestone ? "milestone" : "task",
      title: t.title,
      detail: t.detail,
      done: t.done,
      state: dueState(t.dueDate, today),
    });
  }
  for (const e of src.events) {
    items.push({
      id: `event:${e.id}`,
      date: e.date,
      kind: "event",
      title: e.title,
      time: e.time,
      detail: e.detail,
      done: compareDates(e.date, today) < 0,
      state: dueState(e.date, today),
    });
  }
  for (const d of src.deadlines ?? []) {
    items.push({
      id: `deadline:${d.id}`,
      date: d.date,
      kind: "deadline",
      title: d.title,
      detail: d.detail,
      done: d.done,
      state: dueState(d.date, today),
    });
  }
  return items
    .filter((i) => (opts.includeDone ? true : !i.done))
    .filter((i) => (opts.from ? compareDates(i.date, opts.from) >= 0 : true))
    .filter((i) => (opts.until ? compareDates(i.date, opts.until) <= 0 : true))
    .sort((a, b) => compareDates(a.date, b.date) || KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.title.localeCompare(b.title));
}

export function groupByMonth<T extends { date: CalendarDate }>(items: T[]): Array<{ key: string; label: string; items: T[] }> {
  const groups: Array<{ key: string; label: string; items: T[] }> = [];
  for (const item of items) {
    const key = monthKey(item.date);
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) {
      g = { key, label: formatDate(`${key}-01` as CalendarDate, "month-year"), items: [] };
      groups.push(g);
    }
    g.items.push(item);
  }
  return groups;
}

/** How a payment reads in the calendar ("Payment 2 of 6", "Headcount overage (estimate)"). */
export function paymentDetail(p: { kind: string; sequence: number | null }, paymentsOnItem: number): string {
  if (p.kind === "OVERAGE") return "Headcount overage (estimate)";
  if (p.kind === "SERVICE_CHARGE") return "Maître d' service charge";
  if (p.sequence) return `Payment ${p.sequence} of ${paymentsOnItem}`;
  return "Payment";
}
