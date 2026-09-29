import type { AgendaKind } from "@/lib/domain/agenda";

// How each kind of calendar item looks. Colors are fills only; every item also carries its
// kind as a word (visible, or for screen readers in tight spots like the month grid).

export const KIND: Record<AgendaKind, { label: string; dot: string; chip: string }> = {
  milestone: { label: "Milestone", dot: "bg-desert-rose", chip: "bg-desert-rose/15 hover:bg-desert-rose/25" },
  payment: { label: "Payment", dot: "bg-gold", chip: "bg-gold/15 hover:bg-gold/25" },
  event: { label: "Appointment", dot: "bg-garden", chip: "bg-garden/15 hover:bg-garden/25" },
  task: { label: "Task", dot: "border border-desert-rose bg-paper", chip: "border border-desert-rose/50 bg-paper hover:bg-linen/60" },
  deadline: { label: "Deadline", dot: "bg-cocoa", chip: "bg-cocoa/10 hover:bg-cocoa/20" },
};

export const KIND_ORDER: AgendaKind[] = ["payment", "milestone", "deadline", "task", "event"];

/** Where an agenda item is edited. Payments live on the budget page; deadlines on their section. */
export function agendaHref(id: string, back: string): string {
  const [kind, rawId] = id.split(":") as [string, string];
  const q = `?back=${encodeURIComponent(back)}`;
  if (kind === "task") return `/tasks/${rawId}${q}`;
  if (kind === "event") return `/calendar/events/${rawId}${q}`;
  if (kind === "deadline") return rawId.startsWith("hotel-") ? "/travel" : "/design";
  return "/budget";
}
