import type { Tone } from "@/components/ui/Tone";
import type { AttireStatus, DressMenu, ShoeStatus } from "@/lib/domain/party";

// Colors for the attire menus and status words, shared by the party screens.

export const MENU_STYLE: Record<DressMenu, { swatch: string; avatar: string; bar: string; label: string }> = {
  A: { swatch: "bg-dusty-rose", avatar: "bg-dusty-rose/45", bar: "bg-dusty-rose", label: "Menu A · Dusty Rose dress" },
  B: { swatch: "bg-desert-rose", avatar: "bg-desert-rose/40", bar: "bg-desert-rose", label: "Menu B · Desert Rose dress" },
  C: { swatch: "bg-cocoa", avatar: "bg-linen", bar: "bg-cocoa", label: "Suit · Dusty Rose bow tie" },
};

/** Groom's side suits have no menu letter. */
export const SUIT_STYLE = { swatch: "bg-chocolate", avatar: "bg-linen", label: "Suit" };

export const SHOE_TONE: Record<ShoeStatus, Tone> = {
  NOT_SELECTED: "neutral",
  SELECTED: "neutral",
  SUBMITTED: "due-soon",
  APPROVED: "on-track",
  REJECTED: "overdue",
};

export function attireTone(status: AttireStatus): Tone {
  return status === "READY" ? "on-track" : "neutral";
}
