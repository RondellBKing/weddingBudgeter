import { summarizeBudget, type CategoryRow, type ItemRow } from "./budget";
import { firstToken, normalizeText, type DiffRow, type GuestSide, type Relationship, type RsvpStatus } from "./guest-import";
import { computeHeadroom, overageCents, projectHeadcount, type Headroom, type OverageRule, type ProjectedHeadcount } from "./headcount";
import type { Cents } from "../money";

// The guest list: counts, households, filters, and the checks that make the headcount honest
// (are the two of us and the wedding party on the list?). All derived; nothing here is stored.

export type { GuestSide, Relationship, RsvpStatus } from "./guest-import";

/** Pending and "don't know yet" both count as coming. */
export function isComing(rsvp: RsvpStatus | null): boolean {
  return rsvp !== "DECLINED";
}

/** RSVP as a status word + tone: attending is on track, waiting is "due soon", declined is quiet. */
export function rsvpDisplay(rsvp: RsvpStatus | null): { label: string; tone: "on-track" | "due-soon" | "neutral" } {
  if (rsvp === "ATTENDING") return { label: "Attending", tone: "on-track" };
  if (rsvp === "DECLINED") return { label: "Declined", tone: "neutral" };
  return { label: "Pending", tone: "due-soon" };
}

export type GuestListItem = {
  id: string;
  fullName: string;
  householdName: string;
  side: GuestSide;
  relationship: Relationship;
  isChild: boolean;
  plusOneOf: { id: string; fullName: string } | null;
  rsvpStatus: RsvpStatus | null;
  mealChoice: string | null;
  dietaryNotes: string | null;
  notes: string | null;
  externalId: string | null;
  isDemo: boolean;
  seat: { tableLabel: string; seatNumber: number | null } | null;
  /** "Best Man", "Bridesmaid"… when this guest is in the wedding party. */
  partyRole: string | null;
};

export type GuestCounts = {
  total: number;
  coming: number;
  attending: number;
  pending: number;
  declined: number;
  children: number;
  households: number;
  seated: number;
};

export function guestCounts(guests: Array<Pick<GuestListItem, "rsvpStatus" | "isChild" | "householdName" | "seat">>): GuestCounts {
  const c: GuestCounts = { total: 0, coming: 0, attending: 0, pending: 0, declined: 0, children: 0, households: 0, seated: 0 };
  const households = new Set<string>();
  for (const g of guests) {
    c.total++;
    if (g.rsvpStatus === "ATTENDING") c.attending++;
    else if (g.rsvpStatus === "DECLINED") c.declined++;
    else c.pending++;
    if (isComing(g.rsvpStatus)) {
      c.coming++;
      if (g.seat) c.seated++;
    }
    if (g.isChild) c.children++;
    households.add(normalizeText(g.householdName));
  }
  c.households = households.size;
  return c;
}

// ─── Filters (kept in the URL) ─────────────────────────────────────────────────

export type GuestFilters = {
  q: string;
  side: GuestSide | null;
  rsvp: RsvpStatus | null;
  rel: Relationship | null;
};

const SIDES: GuestSide[] = ["BRIDE_SIDE", "GROOM_SIDE", "BOTH"];
const RSVPS: RsvpStatus[] = ["ATTENDING", "PENDING", "DECLINED"];
const RELS: Relationship[] = ["COUPLE", "FAMILY", "FRIEND", "WORK", "OTHER"];

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const pick = <T extends string>(allowed: T[], v: string): T | null => (allowed.includes(v as T) ? (v as T) : null);

export function parseGuestFilters(params: Record<string, string | string[] | undefined>): GuestFilters {
  return {
    q: one(params.q).trim().slice(0, 100),
    side: pick(SIDES, one(params.side)),
    rsvp: pick(RSVPS, one(params.rsvp)),
    rel: pick(RELS, one(params.rel)),
  };
}

export function hasFilters(f: GuestFilters): boolean {
  return Boolean(f.q || f.side || f.rsvp || f.rel);
}

/** Search matches the name or household, ignoring case, accents and punctuation. */
export function filterGuests<T extends Pick<GuestListItem, "fullName" | "householdName" | "side" | "rsvpStatus" | "relationship">>(
  guests: T[],
  f: GuestFilters,
): T[] {
  const q = normalizeText(f.q);
  return guests.filter((g) => {
    if (f.side && g.side !== f.side) return false;
    if (f.rel && g.relationship !== f.rel) return false;
    if (f.rsvp && (g.rsvpStatus ?? "PENDING") !== f.rsvp) return false;
    if (q && !normalizeText(g.fullName).includes(q) && !normalizeText(g.householdName).includes(q)) return false;
    return true;
  });
}

// ─── Households ───────────────────────────────────────────────────────────────

export type Household<T> = { key: string; name: string; guests: T[]; coming: number };

const sortName = (name: string) => normalizeText(name).replace(/^the /, "");

/** Guests grouped by household (the couple's household first, then A to Z), adults before children. */
export function groupHouseholds<T extends Pick<GuestListItem, "householdName" | "isChild" | "rsvpStatus" | "relationship">>(
  guests: T[],
): Array<Household<T>> {
  const map = new Map<string, Household<T>>();
  for (const g of guests) {
    const key = normalizeText(g.householdName);
    let h = map.get(key);
    if (!h) {
      h = { key, name: g.householdName, guests: [], coming: 0 };
      map.set(key, h);
    }
    h.guests.push(g);
    if (isComing(g.rsvpStatus)) h.coming++;
  }
  const isCouple = (h: Household<T>) => h.guests.some((g) => g.relationship === "COUPLE");
  for (const h of map.values()) h.guests.sort((a, b) => Number(a.isChild) - Number(b.isChild));
  return [...map.values()].sort(
    (a, b) => Number(isCouple(b)) - Number(isCouple(a)) || sortName(a.name).localeCompare(sortName(b.name)),
  );
}

// ─── Is everyone eating on the list? ──────────────────────────────────────────

export type NamedGuest = { id?: string; fullName: string; relationship: Relationship };

export type CouplePartnerCheck = {
  partner: string;
  onList: boolean;
  /** The guest who looks like them. */
  guestName: string | null;
  /** True when that guest is marked as one of the couple; false when it's only a name match. */
  markedAsCouple: boolean;
};

/**
 * Are the two of us on the list? A guest marked as one of the couple counts; failing that, a
 * guest whose name (or first name) is the partner's name probably is them.
 */
export function coupleOnList(partners: string[], guests: NamedGuest[]): CouplePartnerCheck[] {
  const used = new Set<NamedGuest>();
  const matches = (g: NamedGuest, p: string) => {
    const name = normalizeText(g.fullName);
    return name === normalizeText(p) || firstToken(g.fullName) === firstToken(p);
  };
  return partners.map((partner) => {
    const marked = guests.find((g) => !used.has(g) && g.relationship === "COUPLE" && matches(g, partner));
    const byName = marked ?? guests.find((g) => !used.has(g) && matches(g, partner));
    if (byName) used.add(byName);
    return {
      partner,
      onList: Boolean(byName),
      guestName: byName?.fullName ?? null,
      markedAsCouple: Boolean(marked),
    };
  });
}

export type PartyMemberRef = {
  id: string;
  name: string | null;
  /** "Best Man", "Bridesmaid". */
  roleLabel: string;
  /** Their name, or a placeholder like "Bridesmaid 3" until it's filled in. */
  displayName: string;
  guestId: string | null;
};

export type PartyCheck = {
  total: number;
  /** Members with a name filled in (the rest can't be checked yet). */
  named: number;
  found: number;
  members: Array<{ id: string; name: string | null; displayName: string; roleLabel: string; guestName: string | null }>;
};

/** Which attendants are on the guest list: linked to a guest row, or a guest with the same name. */
export function partyOnList(members: PartyMemberRef[], guests: NamedGuest[]): PartyCheck {
  const byId = new Map(guests.filter((g) => g.id).map((g) => [g.id!, g]));
  const byName = new Map<string, NamedGuest>();
  for (const g of guests) {
    const n = normalizeText(g.fullName);
    if (!byName.has(n)) byName.set(n, g);
    // "First Last" also finds "First Middle Last".
    const parts = n.split(" ");
    if (parts.length > 2) {
      const short = `${parts[0]} ${parts[parts.length - 1]}`;
      if (!byName.has(short)) byName.set(short, g);
    }
  }
  const out = members.map((m) => {
    const linked = m.guestId ? byId.get(m.guestId) : undefined;
    const named = m.name && m.name.trim() ? byName.get(normalizeText(m.name)) : undefined;
    const hit = linked ?? named;
    return { id: m.id, name: m.name?.trim() || null, displayName: m.displayName, roleLabel: m.roleLabel, guestName: hit?.fullName ?? null };
  });
  return {
    total: members.length,
    named: out.filter((m) => m.name).length,
    found: out.filter((m) => m.guestName).length,
    members: out,
  };
}

/** Guest id → wedding party role label, for tags on the list. */
export function partyRoles(members: PartyMemberRef[], guests: Array<NamedGuest & { id: string }>): Map<string, string> {
  const out = new Map<string, string>();
  const byName = new Map<string, string[]>();
  for (const g of guests) {
    const n = normalizeText(g.fullName);
    byName.set(n, [...(byName.get(n) ?? []), g.id]);
  }
  for (const m of members) {
    if (m.guestId) {
      out.set(m.guestId, m.roleLabel);
      continue;
    }
    const ids = m.name ? (byName.get(normalizeText(m.name)) ?? []) : [];
    if (ids.length === 1 && !out.has(ids[0])) out.set(ids[0], m.roleLabel);
  }
  return out;
}

// ─── What an import would do to the headcount ─────────────────────────────────

export type ListEntry = { id?: string; fullName: string; relationship: Relationship; rsvpStatus: RsvpStatus | null };

/** The guest list as it would be after applying the accepted rows of an import. */
export function listAfterImport(
  existing: Array<ListEntry & { id: string }>,
  rows: Array<Pick<DiffRow, "rowNumber" | "kind" | "guestId" | "fullName" | "after">>,
  accepted: ReadonlySet<number>,
): ListEntry[] {
  const updates = new Map<string, Pick<DiffRow, "fullName" | "after">>();
  const added: ListEntry[] = [];
  for (const r of rows) {
    if (!accepted.has(r.rowNumber)) continue;
    if (r.kind === "changed" && r.guestId) updates.set(r.guestId, r);
    if (r.kind === "new") added.push({ fullName: r.fullName, relationship: r.after.relationship, rsvpStatus: r.after.rsvpStatus });
  }
  const kept = existing.map((g) => {
    const u = updates.get(g.id);
    return u ? { ...g, fullName: u.fullName, rsvpStatus: u.after.rsvpStatus } : g;
  });
  return [...kept, ...added];
}

/** Everything the headcount → overage → contingency pipeline needs, minus the headcount. */
export type BudgetBasis = {
  rule: OverageRule;
  totalBudgetCents: Cents;
  headcountTarget: number;
  /** Booked vendors' meals that count toward the headcount (0 when the setting says they don't). */
  vendorMeals: number;
  categories: CategoryRow[];
  items: ItemRow[];
};

export type Impact = {
  headcount: ProjectedHeadcount;
  headroom: Headroom;
  contingencyAvailable: Cents;
};

/** Run the plan's money pipeline for a given number of people on the guest list. */
export function projectImpact(basis: BudgetBasis, people: number, hasGuestList: boolean): Impact {
  const headcount = projectHeadcount({
    guestsNotDeclined: people,
    hasGuestList,
    headcountTarget: basis.headcountTarget,
    vendorMeals: basis.vendorMeals,
    vendorMealsCountTowardHeadcount: true,
  });
  const ctx = { headcountOverageCents: overageCents(headcount.headcount, basis.rule) };
  const budget = summarizeBudget({ totalBudgetCents: basis.totalBudgetCents, categories: basis.categories, items: basis.items, ctx });
  return {
    headcount,
    headroom: computeHeadroom(headcount.headcount, basis.rule, budget.contingency.available),
    contingencyAvailable: budget.contingency.available,
  };
}
