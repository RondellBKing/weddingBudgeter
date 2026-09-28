// Seating rules. Everything here is derived from two lists: tables and guests (with the table
// each guest sits at, if any). Counts, capacity status, the unassigned pool and the floor-plan
// geometry are all computed; nothing here is stored.

export type TableShape = "ROUND" | "RECTANGLE" | "SWEETHEART" | "HEAD_TABLE";
export type Rsvp = "PENDING" | "ATTENDING" | "DECLINED";

export type SeatTable = {
  id: string;
  label: string;
  shape: TableShape;
  capacity: number;
  /** Center of the table on the floor plan, in canvas units (see CANVAS). */
  x: number;
  y: number;
  sortOrder: number;
};

export type SeatGuest = {
  id: string;
  fullName: string;
  householdName: string;
  /** Null means we don't know yet (counts as coming). */
  rsvpStatus: Rsvp | null;
  isChild: boolean;
  tableId: string | null;
  seatNumber: number | null;
};

/** Declined guests aren't seated or counted. Pending and unknown count as coming. */
export function isComing(g: Pick<SeatGuest, "rsvpStatus">): boolean {
  return g.rsvpStatus !== "DECLINED";
}

// ─── Capacity ────────────────────────────────────────────────────────────────

/** Sensible starting capacity for each shape. The head table seats the couple and the 14 attendants. */
export const DEFAULT_CAPACITY: Record<TableShape, number> = {
  ROUND: 10,
  RECTANGLE: 8,
  SWEETHEART: 2,
  HEAD_TABLE: 16,
};

export const MAX_CAPACITY = 40;

export type CapacityState = "empty" | "open" | "full" | "over";

export type Capacity = {
  seated: number;
  capacity: number;
  /** Seats still free (0 when full or over). */
  open: number;
  /** People above capacity (0 unless over). */
  over: number;
  state: CapacityState;
};

export function capacityStatus(seated: number, capacity: number): Capacity {
  const open = Math.max(0, capacity - seated);
  const over = Math.max(0, seated - capacity);
  const state: CapacityState = over > 0 ? "over" : seated === 0 ? "empty" : open === 0 ? "full" : "open";
  return { seated, capacity, open, over, state };
}

/** Short status words for a table ("3 open", "Full", "Over by 2"). */
export function capacityWords(c: Capacity): string {
  switch (c.state) {
    case "over":
      return `Over by ${c.over}`;
    case "full":
      return "Full";
    case "empty":
      return "Empty";
    default:
      return `${c.open} open`;
  }
}

/** Guests coming (not declined) at each table, keyed by table id. Tables with nobody map to []. */
export function guestsByTable<G extends SeatGuest>(tables: Pick<SeatTable, "id">[], guests: G[]): Map<string, G[]> {
  const map = new Map<string, G[]>(tables.map((t) => [t.id, []]));
  for (const g of guests) {
    if (g.tableId && isComing(g)) map.get(g.tableId)?.push(g);
  }
  return map;
}

/** Declined guests who still hold a seat (e.g. they declined after being seated). */
export function declinedButSeated(tables: SeatTable[], guests: SeatGuest[]): SeatGuest[] {
  const ids = new Set(tables.map((t) => t.id));
  return guests.filter((g) => !isComing(g) && g.tableId !== null && ids.has(g.tableId));
}

export type SeatingCounts = {
  /** Guests not declined. */
  guests: number;
  seated: number;
  unassigned: number;
  tables: number;
  seats: number;
  /** Free seats across tables that aren't over capacity. */
  openSeats: number;
  overCapacity: Array<{ id: string; label: string; over: number }>;
  declinedSeated: number;
};

export function seatingCounts(tables: SeatTable[], guests: SeatGuest[]): SeatingCounts {
  const byTable = guestsByTable(tables, guests);
  const coming = guests.filter(isComing);
  const seated = coming.filter((g) => g.tableId !== null && byTable.has(g.tableId)).length;
  let openSeats = 0;
  const overCapacity: SeatingCounts["overCapacity"] = [];
  for (const t of sortTables(tables)) {
    const c = capacityStatus(byTable.get(t.id)!.length, t.capacity);
    openSeats += c.open;
    if (c.state === "over") overCapacity.push({ id: t.id, label: t.label, over: c.over });
  }
  return {
    guests: coming.length,
    seated,
    unassigned: coming.length - seated,
    tables: tables.length,
    seats: tables.reduce((s, t) => s + t.capacity, 0),
    openSeats,
    overCapacity,
    declinedSeated: declinedButSeated(tables, guests).length,
  };
}

/** Tables with at least one free seat, for the phone "assign to table" menus. */
export function tablesWithRoom(tables: SeatTable[], guests: SeatGuest[]): Array<SeatTable & { open: number }> {
  const byTable = guestsByTable(tables, guests);
  return sortTables(tables)
    .map((t) => ({ ...t, open: capacityStatus(byTable.get(t.id)!.length, t.capacity).open }))
    .filter((t) => t.open > 0);
}

// ─── Ordering ────────────────────────────────────────────────────────────────

const collator = new Intl.Collator("en-US", { numeric: true, sensitivity: "base" });

/** Natural order, so "Table 2" comes before "Table 10". */
export function compareLabels(a: string, b: string): number {
  return collator.compare(a, b);
}

const SHAPE_RANK: Record<TableShape, number> = { SWEETHEART: 0, HEAD_TABLE: 1, ROUND: 2, RECTANGLE: 2 };

/** The couple's tables first, then by label in natural order. */
export function sortTables<T extends Pick<SeatTable, "shape" | "label" | "sortOrder">>(tables: T[]): T[] {
  return [...tables].sort(
    (a, b) => SHAPE_RANK[a.shape] - SHAPE_RANK[b.shape] || compareLabels(a.label, b.label) || a.sortOrder - b.sortOrder,
  );
}

const SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "v", "md", "phd", "esq"]);

/** Lowercase particles that belong to the surname ("van Dyke", "de la Cruz"). */
const PARTICLES = new Set(["van", "von", "de", "del", "della", "da", "di", "du", "la", "le", "st.", "der", "den", "ter", "bin", "al"]);

function splitName(fullName: string): { surname: string; rest: string } {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  let end = words.length - 1;
  while (end > 0 && SUFFIXES.has(words[end]!.toLowerCase().replace(/[.,]/g, ""))) end--;
  let start = end;
  while (start > 1 && PARTICLES.has(words[start - 1]!)) start--;
  return {
    surname: words.slice(start, end + 1).join(" "),
    rest: [...words.slice(0, start), ...words.slice(end + 1)].join(" "),
  };
}

/** "Ava Rivera" → "rivera ava". Suffixes like "Jr." are skipped, so the index sorts by surname. */
export function surnameKey(fullName: string): string {
  const { surname, rest } = splitName(fullName);
  return `${surname} ${rest}`.trim().toLowerCase();
}

/** "Ava Rivera" → "Rivera, Ava", for an index sorted by surname. */
export function surnameFirst(fullName: string): string {
  const { surname, rest } = splitName(fullName);
  return rest ? `${surname}, ${rest}` : surname;
}

/** Guests at one table: seat number first (when set), then alphabetical by surname. */
export function orderAtTable<T extends Pick<SeatGuest, "seatNumber" | "householdName" | "fullName">>(guests: T[]): T[] {
  return [...guests].sort((a, b) => {
    if (a.seatNumber !== null || b.seatNumber !== null) {
      if (a.seatNumber === null) return 1;
      if (b.seatNumber === null) return -1;
      if (a.seatNumber !== b.seatNumber) return a.seatNumber - b.seatNumber;
    }
    return compareLabels(surnameKey(a.fullName), surnameKey(b.fullName)) || compareLabels(a.householdName, b.householdName);
  });
}

/** Alphabetical guest → table index for the printout (by surname). Unseated guests have no table. */
export function guestIndex<G extends SeatGuest>(tables: SeatTable[], guests: G[]): Array<{ guest: G; table: SeatTable | null }> {
  const byId = new Map(tables.map((t) => [t.id, t]));
  return guests
    .filter(isComing)
    .map((guest) => ({ guest, table: guest.tableId ? (byId.get(guest.tableId) ?? null) : null }))
    .sort(
      (a, b) =>
        compareLabels(surnameKey(a.guest.fullName), surnameKey(b.guest.fullName)) ||
        compareLabels(a.guest.householdName, b.guest.householdName),
    );
}

// ─── The unassigned pool ─────────────────────────────────────────────────────

export type PoolHousehold = {
  name: string;
  /** Members still to seat (coming, no table). */
  guests: SeatGuest[];
  /** Members of the same household already at a table. */
  seatedElsewhere: number;
};

/** Guests still to seat, grouped by household, households in natural order. */
export function unassignedHouseholds(guests: SeatGuest[]): PoolHousehold[] {
  const groups = new Map<string, PoolHousehold>();
  for (const g of guests) {
    if (!isComing(g)) continue;
    let group = groups.get(g.householdName);
    if (!group) {
      group = { name: g.householdName, guests: [], seatedElsewhere: 0 };
      groups.set(g.householdName, group);
    }
    if (g.tableId === null) group.guests.push(g);
    else group.seatedElsewhere++;
  }
  return [...groups.values()].filter((h) => h.guests.length > 0).sort((a, b) => compareLabels(a.name, b.name));
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Households whose name, or any member's name, contains every word of the query. */
export function filterHouseholds(households: PoolHousehold[], query: string): PoolHousehold[] {
  const words = normalize(query).split(" ").filter(Boolean);
  if (words.length === 0) return households;
  return households.filter((h) => {
    const haystack = normalize([h.name, ...h.guests.map((g) => g.fullName)].join(" "));
    return words.every((w) => haystack.includes(w));
  });
}

/**
 * Which guests move when a household is seated at a table: every member who is coming and not
 * yet seated. Declined members and members already at a table stay where they are.
 */
export function planHouseholdMove(guests: SeatGuest[], householdName: string): {
  move: string[];
  alreadySeated: number;
  declined: number;
} {
  const members = guests.filter((g) => g.householdName === householdName);
  const coming = members.filter(isComing);
  return {
    move: coming.filter((g) => g.tableId === null).map((g) => g.id),
    alreadySeated: coming.filter((g) => g.tableId !== null).length,
    declined: members.length - coming.length,
  };
}

/** How many of `guestIds` would be new at the table (guests already there don't count twice). */
export function arrivingAt(tableId: string, guests: SeatGuest[], guestIds: string[]): number {
  const ids = new Set(guestIds);
  return guests.filter((g) => ids.has(g.id) && isComing(g) && g.tableId !== tableId).length;
}

/** The guest list after moving `guestIds` to a table (or back to the pool with null). */
export function applyMove(guests: SeatGuest[], guestIds: string[], tableId: string | null): SeatGuest[] {
  const ids = new Set(guestIds);
  return guests.map((g) => (ids.has(g.id) && g.tableId !== tableId ? { ...g, tableId, seatNumber: null } : g));
}

// ─── Table labels ────────────────────────────────────────────────────────────

const NUMBERED = /^table\s+(\d+)$/i;

/** The number after the highest "Table N" label (1 when there are none). */
export function nextTableNumber(labels: string[]): number {
  let max = 0;
  for (const label of labels) {
    const m = NUMBERED.exec(label.trim());
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

/** Labels for `count` new numbered tables, continuing the existing numbering. */
export function nextTableLabels(labels: string[], count: number): string[] {
  const start = nextTableNumber(labels);
  return Array.from({ length: count }, (_, i) => `Table ${start + i}`);
}

/** A suggested label for a new table of a given shape. */
export function suggestLabel(labels: string[], shape: TableShape): string {
  const taken = new Set(labels.map((l) => l.trim().toLowerCase()));
  const base = shape === "HEAD_TABLE" ? "Head Table" : shape === "SWEETHEART" ? "Sweetheart Table" : null;
  if (base && !taken.has(base.toLowerCase())) return base;
  return `Table ${nextTableNumber(labels)}`;
}

/** What to print inside a small table on the floor plan: "Table 12" → "12". */
export function shortTableLabel(label: string): string {
  const m = NUMBERED.exec(label.trim());
  if (m) return m[1]!;
  return label.trim().replace(/\s+table$/i, "");
}

// ─── Floor plan ──────────────────────────────────────────────────────────────

/** The floor plan's coordinate space. Tables store their center in these units. */
export const CANVAS = { width: 1200, height: 800 } as const;
export type Canvas = { width: number; height: number };
export type Size = { w: number; h: number };
export type Point = { x: number; y: number };

/** How much floor a table takes up, seats included, in canvas units. */
export function tableFootprint(shape: TableShape, capacity: number): Size {
  switch (shape) {
    case "ROUND": {
      const d = Math.min(170, Math.max(80, 60 + capacity * 5));
      return { w: d, h: d };
    }
    case "RECTANGLE":
      return { w: Math.max(100, Math.ceil(capacity / 2) * 28 + 36), h: 84 };
    case "HEAD_TABLE":
      return { w: Math.min(CANVAS.width - 40, Math.max(160, capacity * 22 + 40)), h: 72 };
    case "SWEETHEART":
      return { w: 104, h: 64 };
  }
}

/** Keep a table's center where the whole table stays inside the canvas. */
export function clampToCanvas(p: Point, size: Size, canvas: Canvas = CANVAS): Point {
  const clampAxis = (v: number, half: number, max: number) => {
    if (!Number.isFinite(v)) return max / 2;
    if (half * 2 >= max) return max / 2;
    return Math.min(max - half, Math.max(half, v));
  };
  return {
    x: Math.round(clampAxis(p.x, size.w / 2, canvas.width)),
    y: Math.round(clampAxis(p.y, size.h / 2, canvas.height)),
  };
}

type Placed = Pick<SeatTable, "x" | "y" | "shape" | "capacity">;

function overlaps(a: Point, as: Size, b: Point, bs: Size, gap: number): boolean {
  return Math.abs(a.x - b.x) * 2 < as.w + bs.w + gap * 2 && Math.abs(a.y - b.y) * 2 < as.h + bs.h + gap * 2;
}

/**
 * Where to put a new table on the floor plan: the couple's tables along the top, everything else
 * in rows below, in the first spot that doesn't overlap an existing table.
 */
export function nextFreeSpot(existing: Placed[], shape: TableShape, capacity: number, canvas: Canvas = CANVAS): Point {
  const size = tableFootprint(shape, capacity);
  const placed = existing.map((t) => ({ p: { x: t.x, y: t.y }, s: tableFootprint(t.shape, t.capacity) }));
  const free = (p: Point) => placed.every((o) => !overlaps(p, size, o.p, o.s, 12));

  const candidates: Point[] = [];
  if (shape === "HEAD_TABLE" || shape === "SWEETHEART") {
    for (const dx of [0, -300, 300, -500, 500]) candidates.push({ x: canvas.width / 2 + dx, y: 70 });
  }
  const step = 150;
  for (let y = 230; y <= canvas.height - 60; y += step) {
    for (let x = 100; x <= canvas.width - 60; x += step) candidates.push({ x, y });
  }
  for (const c of candidates) {
    const p = clampToCanvas(c, size, canvas);
    if (free(p)) return p;
  }
  return clampToCanvas({ x: canvas.width / 2, y: canvas.height / 2 }, size, canvas);
}
