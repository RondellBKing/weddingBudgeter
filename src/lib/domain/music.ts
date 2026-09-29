// Music for the day: which moments need a song, reordering within a list, and the first draft
// of the processional built from the wedding party. Pure functions, no database.
import type { MusicMoment } from "../../generated/prisma/enums";
import { displayNames, ROLE_LABEL, type PartyRole, type PartySide } from "./party";

/** The day in order, from the prelude to the send-off. Must-play and do-not-play are lists, not moments. */
export const MUSIC_PARTS: Array<{ key: "ceremony" | "reception"; lead: string; word: string; moments: MusicMoment[] }> = [
  { key: "ceremony", lead: "The", word: "ceremony", moments: ["PRELUDE", "PROCESSIONAL", "COUPLE_ENTRANCE", "BROOM_JUMP", "RECESSIONAL"] },
  {
    key: "reception",
    lead: "Cocktails &",
    word: "reception",
    moments: ["COCKTAIL_HOUR", "GRAND_ENTRANCE", "FIRST_DANCE", "PARENT_DANCE", "CAKE_CUTTING", "LAST_DANCE", "SEND_OFF"],
  },
];

export const DAY_MOMENTS: MusicMoment[] = MUSIC_PARTS.flatMap((p) => p.moments);

/** The two lists the DJ keeps beside the timeline. */
export const LIST_MOMENTS = ["MUST_PLAY", "DO_NOT_PLAY"] as const satisfies readonly MusicMoment[];

/** The moments that can't be left to chance. Each needs a song picked by us. */
export const KEY_MOMENTS: MusicMoment[] = ["PROCESSIONAL", "COUPLE_ENTRANCE", "BROOM_JUMP", "RECESSIONAL", "FIRST_DANCE", "LAST_DANCE"];

export function isKeyMoment(moment: MusicMoment): boolean {
  return KEY_MOMENTS.includes(moment);
}

/** Key moments that don't have a song yet, in the order they happen. */
export function stillToChoose(songs: Array<{ moment: MusicMoment }>): MusicMoment[] {
  const chosen = new Set(songs.map((s) => s.moment));
  return KEY_MOMENTS.filter((m) => !chosen.has(m));
}

/** Rows grouped by moment, keeping the order they came in (the loader sorts them). */
export function groupByMoment<M extends string, T extends { moment: M }>(rows: T[]): Map<M, T[]> {
  const out = new Map<M, T[]>();
  for (const r of rows) {
    const list = out.get(r.moment);
    if (list) list.push(r);
    else out.set(r.moment, [r]);
  }
  return out;
}

// ─── Reordering ─────────────────────────────────────────────────────────────

export type Direction = "up" | "down";

/**
 * Move one row up or down a list. `rows` is the list as shown (sorted by sortOrder, then by
 * when it was added). Returns the sortOrder writes needed: the list is renumbered 0, 1, 2… with
 * the two rows swapped, and only rows whose number changes are returned. Rows that share a
 * sortOrder (all 0 by default) get distinct numbers on their first move. Empty when the row
 * can't move (already first or last, or not in the list).
 */
export function reorderUpdates(
  rows: Array<{ id: string; sortOrder: number }>,
  id: string,
  direction: Direction,
): Array<{ id: string; sortOrder: number }> {
  const from = rows.findIndex((r) => r.id === id);
  if (from < 0) return [];
  const to = direction === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= rows.length) return [];
  const order = rows.map((r) => r.id);
  [order[from], order[to]] = [order[to], order[from]];
  const current = new Map(rows.map((r) => [r.id, r.sortOrder]));
  return order.flatMap((rowId, i) => (current.get(rowId) === i ? [] : [{ id: rowId, sortOrder: i }]));
}

/** The number a new row gets so it lands at the end of its list. */
export function nextSortOrder(rows: Array<{ sortOrder: number }>): number {
  return rows.reduce((max, r) => Math.max(max, r.sortOrder + 1), 0);
}

// ─── Processional draft ─────────────────────────────────────────────────────

export type PartyMemberForProcessional = {
  id: string;
  name: string | null;
  side: PartySide;
  role: PartyRole;
  sortOrder: number;
};

export type ProcessionalDraftLine = { walkers: string; notes: string | null };

/**
 * How close to the couple an attendant walks. The honor attendants walk last, nearest the
 * couple; the maid of honor and best man last of all, so they walk in together.
 */
function honorRank(role: PartyRole): number {
  if (role === "BEST_MAN" || role === "MAID_OF_HONOR") return 2;
  if (role === "MATRON_OF_HONOR") return 1;
  return 0;
}

/**
 * A first draft of who walks, in order: the officiant takes their place; grandparents and
 * parents are seated; the attendants walk in pairs (one from each side, in the wedding party's
 * own order, honor attendants last); then the groom's and the bride's entrances. Names are used
 * where they're filled in, otherwise the role ("Groomsman 3"). If one side has more attendants,
 * the extra people walk alone at the start. The couple are only ever named by role here.
 */
export function draftProcessional(members: PartyMemberForProcessional[]): ProcessionalDraftLine[] {
  const ordered = [...members].sort((a, b) => a.sortOrder - b.sortOrder);
  const names = displayNames(ordered);
  const label = (m: PartyMemberForProcessional) => names.get(m.id)?.name ?? ROLE_LABEL[m.role];
  const named = (m: PartyMemberForProcessional) => names.get(m.id)?.isPlaceholder === false;

  // Walking order within a side: everyone else first, honor attendants last (a stable sort
  // keeps the party's own order inside each group).
  const side = (s: PartySide) =>
    ordered.filter((m) => m.side === s).sort((a, b) => honorRank(a.role) - honorRank(b.role));
  const groom = side("GROOM_SIDE");
  const bride = side("BRIDE_SIDE");

  // Pair from the end, so the honor attendants walk together, closest to the couple.
  const pairs: ProcessionalDraftLine[] = [];
  const count = Math.max(groom.length, bride.length);
  for (let k = 0; k < count; k++) {
    const g = groom[groom.length - 1 - k];
    const b = bride[bride.length - 1 - k];
    if (g && b) {
      const roles = named(g) || named(b) ? `${ROLE_LABEL[g.role]} and ${ROLE_LABEL[b.role]}` : null;
      pairs.unshift({ walkers: `${label(g)} with ${label(b)}`, notes: roles });
    } else {
      const m = (g ?? b)!;
      pairs.unshift({ walkers: label(m), notes: named(m) ? `${ROLE_LABEL[m.role]}, walks alone` : "Walks alone" });
    }
  }

  return [
    { walkers: "Officiant", notes: "Takes their place at the front" },
    { walkers: "Groom's grandparents", notes: "Walk in and take their seats" },
    { walkers: "Bride's grandparents", notes: "Walk in and take their seats" },
    { walkers: "Groom's parents", notes: "Walk in and take their seats" },
    { walkers: "Bride's parents", notes: "Take their seats. If a parent walks the bride in, only the other one walks here" },
    ...pairs,
    { walkers: "The groom", notes: "Walks in here, or waits at the front from the start" },
    { walkers: "The bride", notes: "Guests stand. Add who walks with them, if anyone" },
  ];
}
