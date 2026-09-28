import type { CalendarDate } from "../dates";
import { deadlineUrgency, type Tone, type UrgencyLevel } from "./deadlines";
import { ATTIRE_STEPS, attireStatus, styleMenuFor, type OptionMenu, type OutfitType, type PartyRole } from "./party";

// The Nov 7, 2027 roll-up: who still owes a dress selection or sizes, how loudly to say so,
// and how the styles are spreading across the menus. Everything here is derived.

// ─── Who hasn't sent sizing ───────────────────────────────────────────────────

/** How far along someone is, from furthest behind to nearly done. */
export const SIZING_STAGES = ["NOT_ASKED", "ASKED", "ACCEPTED", "STYLE_CHOSEN", "STYLE_MISSING"] as const;
export type SizingStage = (typeof SIZING_STAGES)[number];

export const SIZING_STAGE_LABEL: Record<SizingStage, string> = {
  NOT_ASKED: "Not asked yet",
  ASKED: "Asked, no answer yet",
  ACCEPTED: "Said yes",
  STYLE_CHOSEN: "Style chosen",
  STYLE_MISSING: "Sizes in",
};

export type RollupInput = {
  id: string;
  role: PartyRole;
  outfitType: OutfitType;
  sortOrder: number;
  askedOn: CalendarDate | null;
  acceptedOn: CalendarDate | null;
  chosenStyleId: string | null;
  sizingSubmittedOn: CalendarDate | null;
  orderedOn?: CalendarDate | null;
  arrivedOn?: CalendarDate | null;
  alteredOn?: CalendarDate | null;
  readyOn?: CalendarDate | null;
};

export type Owed = { style: boolean; sizes: boolean };

/** What someone still owes. Anyone whose outfit is already ordered owes nothing. */
export function owedBy(m: RollupInput): Owed {
  const pastSizing = ATTIRE_STEPS.indexOf(attireStatus(m)) >= ATTIRE_STEPS.indexOf("ORDERED");
  if (pastSizing) return { style: false, sizes: false };
  const needsStyle = styleMenuFor(m.role, m.outfitType) !== null;
  return { style: needsStyle && !m.chosenStyleId, sizes: !m.sizingSubmittedOn };
}

export function sizingStage(m: RollupInput): SizingStage {
  const hasStyle = styleMenuFor(m.role, m.outfitType) !== null && Boolean(m.chosenStyleId);
  if (m.sizingSubmittedOn) return "STYLE_MISSING";
  if (hasStyle) return "STYLE_CHOSEN";
  if (m.acceptedOn) return "ACCEPTED";
  if (m.askedOn) return "ASKED";
  return "NOT_ASKED";
}

/** "Style and sizes", "Sizes", "Measurements", "Style". */
export function owedLabel(owed: Owed, outfitType: OutfitType): string {
  const sizes = outfitType === "SUIT" ? "measurements" : "sizes";
  if (owed.style && owed.sizes) return `Style and ${sizes}`;
  if (owed.sizes) return sizes.charAt(0).toUpperCase() + sizes.slice(1);
  return "Style";
}

export type RollupRow<T> = T & { stage: SizingStage; owed: Owed };

/**
 * Everyone who still owes something, dresses and suits apart, furthest behind first:
 * not asked, then asked, then said yes, then style chosen (sizes missing), then sizes in
 * (style missing). Ties keep the roster order.
 */
export function sizingRollup<T extends RollupInput>(members: T[]): { dresses: RollupRow<T>[]; suits: RollupRow<T>[] } {
  const rows = members
    .map((m) => ({ ...m, stage: sizingStage(m), owed: owedBy(m) }))
    .filter((m) => m.owed.style || m.owed.sizes)
    .sort((a, b) => SIZING_STAGES.indexOf(a.stage) - SIZING_STAGES.indexOf(b.stage) || a.sortOrder - b.sortOrder);
  return {
    dresses: rows.filter((m) => m.outfitType === "DRESS"),
    suits: rows.filter((m) => m.outfitType === "SUIT"),
  };
}

// ─── How loudly to say it ─────────────────────────────────────────────────────

/** The urgency level in words. */
export const URGENCY_LABEL: Record<UrgencyLevel, string> = {
  calm: "Plenty of time",
  "90": "Under 90 days",
  "60": "Under 60 days",
  "30": "Under 30 days",
  "14": "Two weeks left",
  "7": "Final week",
  overdue: "Overdue",
};

const URGENCY_MESSAGE: Record<UrgencyLevel, string> = {
  calm: "No rush yet. Share the menus and let everyone choose in their own time.",
  "90": "Three months to go. Send a friendly reminder to anyone who hasn't chosen a style.",
  "60": "Two months to go. Check in with everyone who hasn't sent a style and sizes.",
  "30": "One month to go. Follow up, one by one, with each person who still owes a style or sizes.",
  "14": "Two weeks to go. Call anyone still outstanding. The bride orders every dress right after the deadline.",
  "7": "Final week. Get every missing style and size now, or the whole dress order waits.",
  overdue: "The deadline has passed and the dress order is waiting. Get the missing sizes today.",
};

export type SizingUrgency = {
  level: UrgencyLevel;
  tone: Tone;
  daysLeft: number;
  /** The level in words, or "Everything is in". */
  label: string;
  message: string;
  /** 0 (calm or all in) to 6 (overdue): how strongly the page should lean on it. */
  emphasis: number;
  allIn: boolean;
};

const EMPHASIS: Record<UrgencyLevel, number> = { calm: 0, "90": 1, "60": 2, "30": 3, "14": 4, "7": 5, overdue: 6 };

/** deadlineUrgency plus the words to go with it. Once nobody owes anything, it calms down. */
export function sizingUrgency(deadline: CalendarDate, today: CalendarDate, outstanding: number): SizingUrgency {
  const u = deadlineUrgency(deadline, today);
  if (outstanding === 0) {
    return {
      ...u,
      tone: "on-track",
      label: "Everything is in",
      message: "Every style and size is in, so the bride can place the dress order.",
      emphasis: 0,
      allIn: true,
    };
  }
  return { ...u, label: URGENCY_LABEL[u.level], message: URGENCY_MESSAGE[u.level], emphasis: EMPHASIS[u.level], allIn: false };
}

// ─── Style distribution ───────────────────────────────────────────────────────

export type DistributionInput = {
  role: PartyRole;
  outfitType: OutfitType;
  chosenStyleId: string | null;
  shoeOptionId: string | null;
  shoeOwnedDescription: string | null;
};

export type MenuDistribution = {
  /** People choosing from this menu. */
  eligible: number;
  rows: Array<{ id: string; name: string; count: number }>;
  undecided: number;
  /** Shoes only: people wearing a pair they already own. */
  owned: number;
};

/** How many people chose each Menu A style, each Menu B style and each shoe. */
export function styleDistribution(
  members: DistributionInput[],
  options: Array<{ id: string; menu: OptionMenu; name: string }>,
): Record<OptionMenu, MenuDistribution> {
  const menuOf = new Map(options.map((o) => [o.id, o.menu]));
  const build = (menu: OptionMenu): MenuDistribution => {
    const onMenu =
      menu === "SHOES"
        ? members.filter((m) => m.outfitType === "DRESS")
        : members.filter((m) => styleMenuFor(m.role, m.outfitType) === menu);
    const pick = (m: DistributionInput) => (menu === "SHOES" ? m.shoeOptionId : m.chosenStyleId);
    const counted = onMenu.filter((m) => {
      const id = pick(m);
      return id !== null && menuOf.get(id) === menu;
    });
    const owned = menu === "SHOES" ? onMenu.filter((m) => !m.shoeOptionId && m.shoeOwnedDescription).length : 0;
    return {
      eligible: onMenu.length,
      rows: options
        .filter((o) => o.menu === menu)
        .map((o) => ({ id: o.id, name: o.name, count: counted.filter((m) => pick(m) === o.id).length })),
      undecided: onMenu.length - counted.length - owned,
      owned,
    };
  };
  return { A: build("A"), B: build("B"), SHOES: build("SHOES") };
}
