// Wedding party rules. Dress menu and attire status are derived from other fields, never stored.
import { formatDate, type CalendarDate } from "../dates";

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

/** The status in the words that fit the outfit ("Measurements sent", "Rental ordered" for suits). */
export function attireStatusLabel(status: AttireStatus, outfitType: OutfitType): string {
  if (outfitType === "SUIT") {
    if (status === "SIZING_SUBMITTED") return "Measurements sent";
    if (status === "ORDERED") return "Rental ordered";
    if (status === "ALTERED") return "Fitted";
  }
  return ATTIRE_LABEL[status];
}

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

// ─── Labels and menus ─────────────────────────────────────────────────────────

export type PartySide = "BRIDE_SIDE" | "GROOM_SIDE";
export type ShoeStatus = "NOT_SELECTED" | "SELECTED" | "SUBMITTED" | "APPROVED" | "REJECTED";
/** The menus attire options belong to (Menu C is a suit, so it has no options). */
export type OptionMenu = "A" | "B" | "SHOES";

export const SIDE_LABEL: Record<PartySide, string> = {
  BRIDE_SIDE: "Bride's side",
  GROOM_SIDE: "Groom's side",
};

export const OUTFIT_LABEL: Record<OutfitType, string> = { DRESS: "Dress", SUIT: "Suit" };

export const MENU_LABEL: Record<DressMenu, string> = {
  A: "Menu A · Dusty Rose dress",
  B: "Menu B · Desert Rose dress",
  C: "Menu C · suit, Dusty Rose bow tie",
};

/** Hair: their own natural or protective style, elegant and off the face. */
export const HAIR_STYLES = [
  "Sleek low bun or ponytail",
  "Curly ponytail or low ponytail",
  "Box braids in an updo bun",
  "Boho braids, or half-up half-down",
  "Twists gathered low or in an updo",
  "Faux locs in a low updo",
] as const;

export const ACCESSORY_NOTES = [
  "Yellow gold metals only, no silver",
  "Studs, or simple gold, pearl or diamond earrings",
  "A delicate necklace (optional)",
  "One or two minimal bracelets or rings",
  "A small clutch",
  "Watches off for the aisle",
] as const;

/** Where a member's dress style comes from: Menu A or B for dresses, nothing for suits. */
export function styleMenuFor(role: PartyRole, outfitType: OutfitType): "A" | "B" | null {
  const menu = dressMenu(role, outfitType);
  return menu === "A" || menu === "B" ? menu : null;
}

/**
 * The chosen dress style must come from the member's own menu: Menu A for bridesmaids,
 * Menu B for the maid and matron of honor, and nothing for suits. Returns a message, or null.
 */
export function chosenStyleError(
  member: { role: PartyRole; outfitType: OutfitType },
  option: { menu: OptionMenu } | null | undefined,
): string | null {
  if (!option) return null;
  const allowed = styleMenuFor(member.role, member.outfitType);
  if (allowed === null) return "Suits don't have a dress style. Clear the style, or change the outfit to a dress.";
  if (option.menu === allowed) return null;
  return allowed === "A"
    ? "Pick a Menu A style (Dusty Rose). Menu A is the bridesmaids' menu."
    : "Pick a Menu B style (Desert Rose). Menu B is for the maid and matron of honor.";
}

/** Shoes come from the shoe menu, and only dresses pick from it (suits match the groom's party). */
export function shoeOptionError(
  member: { outfitType: OutfitType },
  option: { menu: OptionMenu } | null | undefined,
): string | null {
  if (!option) return null;
  if (member.outfitType === "SUIT") return "Suits wear shoes that match the groom's party, not the shoe menu.";
  if (option.menu !== "SHOES") return "Pick a shoe from the shoe menu.";
  return null;
}

/** Gentle nudges about shoes that don't block saving. */
export function shoeWarnings(m: {
  outfitType: OutfitType;
  shoeOptionId: string | null;
  shoeOwnedDescription: string | null;
  shoeStatus: ShoeStatus;
}): string[] {
  if (m.outfitType !== "DRESS") return [];
  const chosen = Boolean(m.shoeOptionId || m.shoeOwnedDescription);
  const out: string[] = [];
  if (!chosen && m.shoeStatus !== "NOT_SELECTED") {
    out.push("The shoe status is set, but no shoe is chosen or described.");
  }
  if (m.shoeOwnedDescription && !m.shoeOptionId && m.shoeStatus === "SELECTED") {
    out.push("Shoes they already own need approval: mark them “Sent for approval”, then approve them.");
  }
  return out;
}

// ─── Progress checklist ───────────────────────────────────────────────────────

export type DateStepKey =
  | "askedOn"
  | "acceptedOn"
  | "sizingSubmittedOn"
  | "orderedOn"
  | "arrivedOn"
  | "alteredOn"
  | "readyOn";

type StepDates = Partial<Record<DateStepKey, CalendarDate | null>>;

const STEP_LABEL: Record<DateStepKey, Record<OutfitType, string>> = {
  askedOn: { DRESS: "Asked", SUIT: "Asked" },
  acceptedOn: { DRESS: "Said yes", SUIT: "Said yes" },
  sizingSubmittedOn: { DRESS: "Sizing sent", SUIT: "Measurements sent" },
  orderedOn: { DRESS: "Dress ordered", SUIT: "Rental ordered" },
  arrivedOn: { DRESS: "Arrived", SUIT: "Arrived" },
  alteredOn: { DRESS: "Altered", SUIT: "Fitted" },
  readyOn: { DRESS: "Ready", SUIT: "Ready" },
};

export function stepLabel(key: DateStepKey, outfitType: OutfitType): string {
  return STEP_LABEL[key][outfitType];
}

/** The dated steps, in the order they should happen. */
export const DATE_STEPS: DateStepKey[] = [
  "askedOn",
  "acceptedOn",
  "sizingSubmittedOn",
  "orderedOn",
  "arrivedOn",
  "alteredOn",
  "readyOn",
];

export type ChecklistStep = {
  key: DateStepKey | "style";
  label: string;
  done: boolean;
  date: CalendarDate | null;
  detail: string | null;
};

/**
 * Asked → said yes → style chosen (dresses only) → sizing → ordered → arrived → altered → ready.
 * The style step has no date of its own; it shows the style's name.
 */
export function attireChecklist(m: StepDates & { outfitType: OutfitType; styleName: string | null }): ChecklistStep[] {
  const steps: ChecklistStep[] = [];
  for (const key of DATE_STEPS) {
    const date = m[key] ?? null;
    steps.push({ key, label: stepLabel(key, m.outfitType), done: Boolean(date), date, detail: null });
    if (key === "acceptedOn" && m.outfitType === "DRESS") {
      steps.push({ key: "style", label: "Style chosen", done: Boolean(m.styleName), date: null, detail: m.styleName });
    }
  }
  return steps;
}

/** Dates that run backwards (said yes before being asked, ready before ordered…). Warnings, not errors. */
export function dateOrderWarnings(m: StepDates & { outfitType: OutfitType }): string[] {
  const out: string[] = [];
  let last: { key: DateStepKey; date: CalendarDate } | null = null;
  for (const key of DATE_STEPS) {
    const date = m[key];
    if (!date) continue;
    if (last && date < last.date) {
      out.push(
        `“${stepLabel(key, m.outfitType)}” (${formatDate(date, "medium")}) is before “${stepLabel(last.key, m.outfitType)}” (${formatDate(last.date, "medium")}).`,
      );
    } else {
      last = { key, date };
    }
  }
  return out;
}

/** "tel:" link for a phone number as typed ("(201) 555-0142 x3" → "tel:2015550142,3"). */
export function telHref(phone: string): string {
  const [main, ext] = phone.split(/\s*(?:ext\.?|x)\s*/i);
  const digits = (main ?? "").replace(/[^\d+]/g, "");
  const extDigits = (ext ?? "").replace(/\D/g, "");
  return `tel:${digits}${extDigits ? `,${extDigits}` : ""}`;
}
