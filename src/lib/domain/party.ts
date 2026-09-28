// Wedding party rules. Dress menu and attire status are derived from other fields, never stored.

export type PartyRole =
  | "BEST_MAN"
  | "MAID_OF_HONOR"
  | "MATRON_OF_HONOR"
  | "GROOMSMAN"
  | "BRIDESMAID"
  | "BRIDESMAN"
  | "OTHER";
export type OutfitType = "DRESS" | "SUIT";
export type DressMenu = "A" | "B" | "C";

export const ROLE_LABEL: Record<PartyRole, string> = {
  BEST_MAN: "Best Man",
  MAID_OF_HONOR: "Maid of Honor",
  MATRON_OF_HONOR: "Matron of Honor",
  GROOMSMAN: "Groomsman",
  BRIDESMAID: "Bridesmaid",
  BRIDESMAN: "Bridesman",
  OTHER: "Attendant",
};

/** A: bridesmaids (Dusty Rose). B: maid and matron of honor (Desert Rose). C: the bridesman's suit. */
export function dressMenu(role: PartyRole, outfitType: OutfitType): DressMenu | null {
  if (outfitType === "DRESS") return role === "MAID_OF_HONOR" || role === "MATRON_OF_HONOR" ? "B" : "A";
  if (role === "BRIDESMAN") return "C";
  return null;
}

export const ATTIRE_STEPS = [
  "NOT_STARTED",
  "STYLE_CHOSEN",
  "SIZING_SUBMITTED",
  "ORDERED",
  "ARRIVED",
  "ALTERED",
  "READY",
] as const;
export type AttireStatus = (typeof ATTIRE_STEPS)[number];

export const ATTIRE_LABEL: Record<AttireStatus, string> = {
  NOT_STARTED: "Not started",
  STYLE_CHOSEN: "Style chosen",
  SIZING_SUBMITTED: "Sizing sent",
  ORDERED: "Ordered",
  ARRIVED: "Arrived",
  ALTERED: "Altered",
  READY: "Ready",
};

/** The furthest step that has happened. */
export function attireStatus(m: {
  chosenStyleId?: string | null;
  sizingSubmittedOn?: unknown;
  orderedOn?: unknown;
  arrivedOn?: unknown;
  alteredOn?: unknown;
  readyOn?: unknown;
}): AttireStatus {
  if (m.readyOn) return "READY";
  if (m.alteredOn) return "ALTERED";
  if (m.arrivedOn) return "ARRIVED";
  if (m.orderedOn) return "ORDERED";
  if (m.sizingSubmittedOn) return "SIZING_SUBMITTED";
  if (m.chosenStyleId) return "STYLE_CHOSEN";
  return "NOT_STARTED";
}

/** Display names, numbering blank placeholders per role ("Bridesmaid 1", "Bridesmaid 2"). */
export function displayNames<T extends { id: string; name: string | null; role: PartyRole }>(
  members: T[],
): Map<string, { name: string; isPlaceholder: boolean }> {
  const counts = new Map<PartyRole, number>();
  const totals = new Map<PartyRole, number>();
  for (const m of members) totals.set(m.role, (totals.get(m.role) ?? 0) + 1);
  const out = new Map<string, { name: string; isPlaceholder: boolean }>();
  for (const m of members) {
    const n = (counts.get(m.role) ?? 0) + 1;
    counts.set(m.role, n);
    if (m.name && m.name.trim()) {
      out.set(m.id, { name: m.name.trim(), isPlaceholder: false });
    } else {
      const label = ROLE_LABEL[m.role];
      out.set(m.id, { name: (totals.get(m.role) ?? 0) > 1 ? `${label} ${n}` : label, isPlaceholder: true });
    }
  }
  return out;
}
