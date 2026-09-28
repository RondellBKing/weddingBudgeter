import type { Tone } from "@/components/ui/Tone";
import type { Capacity } from "@/lib/domain/seating";

/** What's being dragged on the board: one guest, or the unseated members of a household. */
export type DragData = {
  kind: "guest" | "household";
  guestIds: string[];
  /** Guest or household name, for messages and screen-reader announcements. */
  label: string;
  /** Table the guest is at now, or null for the unassigned list. */
  from: string | null;
};

/** A drop target: a table, or the unassigned list (tableId null). */
export type DropData = { tableId: string | null; label: string };

export const POOL_LABEL = "the unassigned list";

/** Seat guests at a table (or send them back with null). `subject` names them in the message. */
export type MoveFn = (move: { guestIds: string[]; tableId: string | null; subject: string }) => void;

/** Over capacity reads as overdue (Brick), a full table as on track; everything else is quiet. */
export function capacityTone(c: Capacity): Tone {
  return c.state === "over" ? "overdue" : c.state === "full" ? "on-track" : "neutral";
}
