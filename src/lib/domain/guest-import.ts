import Papa from "papaparse";

// Importing the guest list from the RSVP app's CSV export.
//
// Everything here is pure: parse the file, guess which column is which, read each row, and
// compare it with the guests already on the list. The server runs the same functions again at
// commit time, so the preview a person reviews and the writes that follow come from one place.
//
// Matching, in order:
//   1. The RSVP app's own guest ID (externalId).
//   2. Normalized full name + household (the stored matchKey).
//   3. Normalized full name alone, when exactly one guest on the list and one row in the file
//      share it (the RSVP app renamed a household).
//   4. One of the couple added here by first name only ("Rondell"), when the file has them in full.
// A guest is only claimable when it isn't demo data and its own ID (if any) isn't in the file.
//
// Field ownership: the import may update the name, household, RSVP, meal and dietary notes (and
// sets the RSVP app ID and match key). Side, relationship and notes are only set on new guests.
// Plus-one links and seats are never touched.

export type GuestSide = "BRIDE_SIDE" | "GROOM_SIDE" | "BOTH";
export type Relationship = "COUPLE" | "FAMILY" | "FRIEND" | "WORK" | "OTHER";
export type RsvpStatus = "PENDING" | "ATTENDING" | "DECLINED";

// ─── Normalizing ──────────────────────────────────────────────────────────────

// Letters that Unicode decomposition leaves alone.
const FOLD: Record<string, string> = {
  ß: "ss",
  æ: "ae",
  Æ: "ae",
  œ: "oe",
  Œ: "oe",
  ø: "o",
  Ø: "o",
  ł: "l",
  Ł: "l",
  đ: "d",
  Đ: "d",
  ð: "d",
  Ð: "d",
  þ: "th",
  Þ: "th",
  ı: "i",
};

/**
 * Lowercase, accents and punctuation stripped, whitespace collapsed. "José O'Brien-Smith" and
 * "jose obrien smith" normalize the same. "&" reads as "and".
 */
export function normalizeText(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/[ßæÆœŒøØłŁđĐðÐþÞı]/g, (c) => FOLD[c] ?? c)
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’‘`´.]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** The fallback match key: normalized full name + "|" + normalized household. */
export function matchKeyFor(fullName: string, householdName: string): string {
  return `${normalizeText(fullName)}|${normalizeText(householdName)}`;
}

/** First word of a normalized name ("rondell" for "Rondell King"). */
export function firstToken(name: string): string {
  return normalizeText(name).split(" ")[0] ?? "";
}

/** Trim and collapse whitespace, and undo the apostrophe our CSV export puts before = + - @. */
export function tidy(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  return value
    .replace(/^'(?=[=+\-@])/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tidyOrNull(value: string | null | undefined): string | null {
  const t = tidy(value);
  return t === "" ? null : t;
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

export type CsvRecord = { /** Spreadsheet row number (the header is row 1). */ rowNumber: number; cells: string[] };

export type ParsedCsv = {
  headers: string[];
  records: CsvRecord[];
  /** Set when the file can't be used at all. */
  error: string | null;
  /** Something odd that didn't stop parsing (e.g. an unclosed quote). */
  warning: string | null;
};

/** Parse CSV text (comma, tab or semicolon separated). The first non-blank row is the header. */
export function parseCsv(text: string): ParsedCsv {
  const clean = text.replace(/^﻿/, "");
  if (clean.trim() === "") return { headers: [], records: [], error: "The file is empty.", warning: null };

  // Detect the separator on non-blank lines (blank lines throw the guess off), then parse the
  // whole file keeping blank lines, so row numbers match the spreadsheet.
  const { delimiter } = Papa.parse<string[]>(clean, { skipEmptyLines: "greedy", preview: 50 }).meta;
  const result = Papa.parse<string[]>(clean, { delimiter, skipEmptyLines: false });
  const data = result.data.map((row) => (Array.isArray(row) ? row.map((c) => (c ?? "").toString()) : []));
  const isBlank = (row: string[]) => row.every((c) => c.trim() === "");

  const headerIndex = data.findIndex((row) => !isBlank(row));
  if (headerIndex < 0) return { headers: [], records: [], error: "The file is empty.", warning: null };

  const seen = new Map<string, number>();
  const headers = data[headerIndex].map((h, i) => {
    const base = tidy(h) || `Column ${i + 1}`;
    const n = (seen.get(base.toLowerCase()) ?? 0) + 1;
    seen.set(base.toLowerCase(), n);
    return n > 1 ? `${base} (${n})` : base;
  });

  const records: CsvRecord[] = [];
  for (let i = headerIndex + 1; i < data.length; i++) {
    if (isBlank(data[i])) continue;
    records.push({ rowNumber: i + 1, cells: data[i] });
  }

  if (headers.length < 1) return { headers, records, error: "We couldn't find a header row.", warning: null };
  if (records.length === 0) {
    return { headers, records, error: "There are no guests under the header row.", warning: null };
  }
  const quoteProblem = result.errors.find((e) => e.type === "Quotes");
  return {
    headers,
    records,
    error: null,
    warning: quoteProblem
      ? `Row ${(quoteProblem.row ?? 0) + 1} has a quote mark that isn't closed, so some cells may run together. Check that row in the preview.`
      : null,
  };
}

// ─── Column mapping ───────────────────────────────────────────────────────────

export const IMPORT_FIELDS = [
  "fullName",
  "firstName",
  "lastName",
  "householdName",
  "externalId",
  "rsvpStatus",
  "mealChoice",
  "dietaryNotes",
  "side",
  "relationship",
  "notes",
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];

export const IMPORT_FIELD_LABEL: Record<ImportField, string> = {
  fullName: "Full name",
  firstName: "First name",
  lastName: "Last name",
  householdName: "Household",
  externalId: "RSVP app guest ID",
  rsvpStatus: "RSVP",
  mealChoice: "Meal",
  dietaryNotes: "Dietary notes",
  side: "Side",
  relationship: "Relationship",
  notes: "Notes",
};

/** field → header name in the file. */
export type ColumnMapping = Partial<Record<ImportField, string>>;
/** normalized side value from the file → side. Overrides the built-in guesses. */
export type SideValueMap = Record<string, GuestSide>;

export type ImportMapping = {
  columns: ColumnMapping;
  sideValues: SideValueMap;
};

/** What we remember between imports (stored in GuestImport.mapping). */
export type SavedMapping = ImportMapping & {
  /** The headers of the file it was made for, so a column left unmapped on purpose stays that way. */
  headers: string[];
};

type Matcher = { exact: string[]; loose?: (h: string) => boolean };

const hasId = (h: string) => /\b(id|uuid|uid|guid)\b/.test(h);

// In priority order: a header claimed by an earlier field isn't offered to later ones.
const GUESS_ORDER: Array<[ImportField, Matcher]> = [
  [
    "externalId",
    {
      exact: ["id", "guest id", "guestid", "rsvp app id", "rsvp app guest id", "external id", "record id", "contact id", "invitee id", "person id", "attendee id", "uid", "uuid", "guest uid"],
      loose: (h) => hasId(h) && !/\b(household|party|group|invitation|invite|family|table|event)\b/.test(h),
    },
  ],
  [
    "dietaryNotes",
    {
      exact: ["dietary", "dietary notes", "dietary restrictions", "dietary requirements", "dietary needs", "allergies", "allergy", "food allergies", "restrictions"],
      loose: (h) => /\b(dietary|diet|allerg\w*|restrictions?)\b/.test(h),
    },
  ],
  [
    "mealChoice",
    {
      exact: ["meal", "meal choice", "meal selection", "entree", "entree choice", "entree selection", "dinner", "dinner choice", "menu", "menu choice", "food choice", "main course"],
      loose: (h) => /\b(meal|entree|dinner|menu)\b/.test(h),
    },
  ],
  ["firstName", { exact: ["first name", "first", "firstname", "given name", "fname", "guest first name"] }],
  ["lastName", { exact: ["last name", "last", "lastname", "surname", "family name", "lname", "guest last name"] }],
  [
    "fullName",
    {
      exact: ["name", "full name", "fullname", "guest name", "guest", "guest full name", "attendee", "attendee name", "invitee", "invitee name", "contact name", "display name", "person"],
      loose: (h) => /\bname\b/.test(h) && !/\b(household|party|group|invitation|invite|family|first|last|table|event|plus|partner|spouse|date)\b/.test(h),
    },
  ],
  [
    "householdName",
    {
      exact: ["household", "household name", "party", "party name", "group", "group name", "invitation", "invitation name", "invitation group", "invite", "family", "addressed to", "mailing name"],
      loose: (h) =>
        /\b(household|party|group|invitation|invite)\b/.test(h) &&
        !hasId(h) &&
        !/\b(size|count|status|sent|date|rsvp|response|wedding party)\b/.test(h),
    },
  ],
  [
    "side",
    {
      exact: ["side", "guest side", "guest of", "whose guest", "bride or groom", "bride groom", "side of family", "which side"],
      loose: (h) => /\bside\b/.test(h),
    },
  ],
  [
    "relationship",
    {
      exact: ["relationship", "relation", "relationship to couple", "relationship to us", "connection", "how we know them", "how do we know them"],
      loose: (h) => /\brelation(ship)?\b/.test(h),
    },
  ],
  [
    "rsvpStatus",
    {
      exact: ["rsvp", "rsvp status", "status", "attending", "attendance", "response", "rsvp response", "reply", "will attend", "wedding rsvp", "ceremony rsvp", "reception rsvp", "coming"],
      loose: (h) => /\b(rsvp|attend\w*|response|reply)\b/.test(h) && !hasId(h) && !/\b(date|at|on|time|note|notes|message)\b/.test(h),
    },
  ],
  [
    "notes",
    {
      exact: ["notes", "note", "comments", "comment", "remarks", "message", "internal notes"],
      loose: (h) => /\b(notes?|comments?)\b/.test(h),
    },
  ],
];

/** Guess which header holds each field. Each header is used at most once. */
export function guessMapping(headers: string[], skip: Set<string> = new Set(), only?: Set<ImportField>): ColumnMapping {
  const normalized = headers.map((h) => ({ h, n: normalizeText(h) }));
  const used = new Set(skip);
  const out: ColumnMapping = {};
  for (const [field, m] of GUESS_ORDER) {
    if (only && !only.has(field)) continue;
    const exact = normalized.find(({ h, n }) => !used.has(h) && m.exact.includes(n));
    const hit = exact ?? (m.loose ? normalized.find(({ h, n }) => !used.has(h) && m.loose!(n)) : undefined);
    if (hit) {
      out[field] = hit.h;
      used.add(hit.h);
    }
  }
  return out;
}

function findHeader(headers: string[], wanted: string): string | undefined {
  return headers.find((h) => h === wanted) ?? headers.find((h) => normalizeText(h) === normalizeText(wanted));
}

/**
 * The mapping to start from: the last one we used, wherever this file has the same headers,
 * and guesses for the rest. A column that was left unmapped on purpose last time stays unmapped.
 */
export function resolveMapping(
  headers: string[],
  saved: SavedMapping | null,
): { mapping: ImportMapping; remembered: ImportField[] } {
  if (!saved) return { mapping: { columns: guessMapping(headers), sideValues: {} }, remembered: [] };

  const columns: ColumnMapping = {};
  const remembered: ImportField[] = [];
  const used = new Set<string>();
  for (const field of IMPORT_FIELDS) {
    const want = saved.columns[field];
    const hit = want ? findHeader(headers, want) : undefined;
    if (hit && !used.has(hit)) {
      columns[field] = hit;
      used.add(hit);
      remembered.push(field);
    }
  }

  // Guess the fields we have no memory of, unless last time's file offered the same column and
  // it was deliberately left out.
  const savedHeaders = new Set(saved.headers.map(normalizeText));
  const open = new Set(IMPORT_FIELDS.filter((f) => !columns[f]));
  const guesses = guessMapping(headers, used, open);
  for (const [field, header] of Object.entries(guesses) as Array<[ImportField, string]>) {
    const declinedBefore = !saved.columns[field] && savedHeaders.has(normalizeText(header));
    if (!declinedBefore) columns[field] = header;
  }
  return { mapping: { columns, sideValues: { ...saved.sideValues } }, remembered };
}

/** A mapping must say where the name is. Returns a plain-language problem, or null. */
export function mappingProblem(mapping: ImportMapping, headers: string[]): string | null {
  const has = (f: ImportField) => Boolean(mapping.columns[f] && headers.includes(mapping.columns[f]!));
  if (!has("fullName") && !has("firstName") && !has("lastName")) {
    return "Choose the column with each guest's name (a full name, or first and last name).";
  }
  const used = new Map<string, ImportField>();
  for (const f of IMPORT_FIELDS) {
    const h = mapping.columns[f];
    if (!h) continue;
    if (!headers.includes(h)) return `The column “${h}” isn't in this file.`;
    const other = used.get(h);
    if (other) return `“${h}” is chosen for both ${IMPORT_FIELD_LABEL[other]} and ${IMPORT_FIELD_LABEL[f]}.`;
    used.set(h, f);
  }
  return null;
}

// ─── Values ───────────────────────────────────────────────────────────────────

export type Mapped<T> = { value: T | null; /** false when the cell had something we don't understand */ known: boolean };

/** RSVP words from any RSVP app. Blank means "no information" (keep what we have). */
export function mapRsvp(raw: string | null | undefined): Mapped<RsvpStatus> {
  const v = normalizeText(raw);
  if (v === "" || /^(n a|na|none|null|nil)$/.test(v)) return { value: null, known: true };
  if (/^\d+$/.test(v)) return { value: Number(v) > 0 ? "ATTENDING" : "DECLINED", known: true };
  if (/\b(pending|awaiting|no response|not responded|no reply|unanswered|not answered|maybe|tentative|undecided|unsure|not sure|tbd|unknown|invited|not yet|waiting|no rsvp)\b/.test(v)) {
    return { value: "PENDING", known: true };
  }
  if (/\b(no|n|declined?|declines|declining|regrets?|regretfully|not attending|not coming|not going|wont|will not|unable|absent|false)\b/.test(v) || /\b(cant|cannot) (make|attend|come|go)\b/.test(v)) {
    return { value: "DECLINED", known: true };
  }
  if (/\b(yes|y|accept|accepts|accepted|accepting|attending|will attend|coming|going|confirmed|joyfully|true|present|attend)\b/.test(v)) {
    return { value: "ATTENDING", known: true };
  }
  return { value: null, known: false };
}

/** Side values: bride / partner A style, groom / partner B style, both / mutual. */
export function mapSide(raw: string | null | undefined, overrides: SideValueMap = {}): Mapped<GuestSide> {
  const v = normalizeText(raw);
  if (v === "") return { value: null, known: true };
  if (overrides[v]) return { value: overrides[v], known: true };
  const bride = /\b(brides?|partner a|partner 1|partner one|first partner|p1)\b/.test(v) || v === "a";
  const groom = /\b(grooms?|partner b|partner 2|partner two|second partner|p2)\b/.test(v) || v === "b";
  if (bride && groom) return { value: "BOTH", known: true };
  if (bride) return { value: "BRIDE_SIDE", known: true };
  if (groom) return { value: "GROOM_SIDE", known: true };
  if (/\b(both|mutual|shared|joint|either|couple|ours|common|both of us)\b/.test(v)) return { value: "BOTH", known: true };
  return { value: null, known: false };
}

export function mapRelationship(raw: string | null | undefined): Mapped<Relationship> {
  const v = normalizeText(raw);
  if (v === "") return { value: null, known: true };
  if (/^(the )?(couple|bride|groom|newlyweds?|us)$/.test(v)) return { value: "COUPLE", known: true };
  if (/\bfamily friends?\b/.test(v)) return { value: "FRIEND", known: true };
  if (/\b(family|relatives?|parents?|mother|mom|mum|father|dad|sisters?|brothers?|siblings?|aunts?|uncles?|cousins?|grand\w*|nieces?|nephews?|in laws?|godparents?|godmother|godfather|step\w*|sons?|daughters?|kin)\b/.test(v)) {
    return { value: "FAMILY", known: true };
  }
  if (/\b(work|coworkers?|co workers?|colleagues?|office|business|professional|boss|manager|clients?|team)\b/.test(v)) {
    return { value: "WORK", known: true };
  }
  if (/\b(friends?|college|school|university|neighbou?rs?|church|childhood|roommates?|teammates?|classmates?)\b/.test(v)) {
    return { value: "FRIEND", known: true };
  }
  if (/\b(other|misc|miscellaneous)\b/.test(v)) return { value: "OTHER", known: true };
  return { value: null, known: false };
}

/** Distinct, non-blank side values in the file (normalized → first spelling seen). */
export function distinctSideValues(parsed: ParsedCsv, mapping: ImportMapping): Array<{ key: string; label: string; count: number }> {
  const header = mapping.columns.side;
  if (!header) return [];
  const i = parsed.headers.indexOf(header);
  if (i < 0) return [];
  const out = new Map<string, { key: string; label: string; count: number }>();
  for (const r of parsed.records) {
    const label = tidy(r.cells[i]);
    const key = normalizeText(label);
    if (!key) continue;
    const hit = out.get(key);
    if (hit) hit.count++;
    else out.set(key, { key, label, count: 1 });
  }
  return [...out.values()].sort((a, b) => b.count - a.count);
}

// ─── Reading rows ─────────────────────────────────────────────────────────────

export type ImportRow = {
  rowNumber: number;
  externalId: string | null;
  /** "" when the row has no name. */
  fullName: string;
  /** Null when the file doesn't say: a new guest becomes a household of one, a known guest keeps theirs. */
  householdName: string | null;
  rsvpStatus: RsvpStatus | null;
  side: GuestSide | null;
  relationship: Relationship | null;
  mealChoice: string | null;
  dietaryNotes: string | null;
  notes: string | null;
  warnings: string[];
  /** Only matter if the row becomes a new guest (side, relationship). */
  newGuestWarnings: string[];
};

/** The household a row stands for: the file's, or the person's own name when there isn't one. */
export const rowHousehold = (row: Pick<ImportRow, "fullName" | "householdName">) => row.householdName ?? row.fullName;

export function readRows(parsed: ParsedCsv, mapping: ImportMapping): ImportRow[] {
  const col = (f: ImportField) => {
    const h = mapping.columns[f];
    return h ? parsed.headers.indexOf(h) : -1;
  };
  const idx = Object.fromEntries(IMPORT_FIELDS.map((f) => [f, col(f)])) as Record<ImportField, number>;
  const cell = (r: CsvRecord, f: ImportField) => (idx[f] >= 0 ? (r.cells[idx[f]] ?? "") : "");

  return parsed.records.map((r) => {
    const warnings: string[] = [];
    const newGuestWarnings: string[] = [];
    const whole = tidy(cell(r, "fullName"));
    const fullName = whole || tidy(`${tidy(cell(r, "firstName"))} ${tidy(cell(r, "lastName"))}`);
    const household = tidy(cell(r, "householdName"));
    if (!household && idx.householdName >= 0 && fullName) {
      newGuestWarnings.push("No household in the file, so they'll be a household of one.");
    }

    const rsvpRaw = tidy(cell(r, "rsvpStatus"));
    const rsvp = mapRsvp(rsvpRaw);
    if (!rsvp.known) warnings.push(`RSVP “${rsvpRaw}” isn't a reply we recognize, so it's treated as no answer.`);

    const sideRaw = tidy(cell(r, "side"));
    const side = mapSide(sideRaw, mapping.sideValues);
    if (!side.known) newGuestWarnings.push(`Side “${sideRaw}” wasn't recognized, so they'll be on both sides.`);

    const relRaw = tidy(cell(r, "relationship"));
    const rel = mapRelationship(relRaw);
    if (!rel.known) newGuestWarnings.push(`Relationship “${relRaw}” wasn't recognized, so it'll be Other.`);

    const notesCell = idx.notes >= 0 ? (r.cells[idx.notes] ?? "").replace(/\r\n?/g, "\n").trim() : "";
    return {
      rowNumber: r.rowNumber,
      externalId: tidyOrNull(cell(r, "externalId")),
      fullName,
      householdName: household || null,
      rsvpStatus: rsvp.value,
      side: side.value,
      relationship: rel.value,
      mealChoice: tidyOrNull(cell(r, "mealChoice")),
      dietaryNotes: tidyOrNull(cell(r, "dietaryNotes")),
      notes: notesCell === "" ? null : notesCell.replace(/^'(?=[=+\-@])/, ""),
      warnings,
      newGuestWarnings,
    };
  });
}

// ─── Comparing with the list ──────────────────────────────────────────────────

export type ExistingGuest = {
  id: string;
  fullName: string;
  householdName: string;
  side: GuestSide;
  relationship: Relationship;
  rsvpStatus: RsvpStatus | null;
  mealChoice: string | null;
  dietaryNotes: string | null;
  externalId: string | null;
  /** Set once an import has written to this guest. Null for guests added here. */
  lastImportedAt: Date | string | null;
  isDemo: boolean;
};

/** Fields the import is allowed to change on a guest that's already on the list. */
export type OwnedField = "fullName" | "householdName" | "rsvpStatus" | "mealChoice" | "dietaryNotes" | "externalId";

export const OWNED_FIELD_LABEL: Record<OwnedField, string> = {
  fullName: "Name",
  householdName: "Household",
  rsvpStatus: "RSVP",
  mealChoice: "Meal",
  dietaryNotes: "Dietary notes",
  externalId: "RSVP app ID",
};

export type FieldChange = { field: OwnedField; before: string | null; after: string | null };

export type GuestCreate = {
  fullName: string;
  householdName: string;
  side: GuestSide;
  relationship: Relationship;
  rsvpStatus: RsvpStatus;
  mealChoice: string | null;
  dietaryNotes: string | null;
  notes: string | null;
  externalId: string | null;
  matchKey: string;
};

export type GuestUpdate = Partial<Pick<GuestCreate, "fullName" | "householdName" | "rsvpStatus" | "mealChoice" | "dietaryNotes" | "externalId">> & {
  matchKey: string;
};

export type DiffKind = "new" | "changed" | "unchanged" | "problem";
export type MatchedBy = "id" | "name-household" | "name" | "couple";

export type DiffRow = {
  rowNumber: number;
  kind: DiffKind;
  fullName: string;
  householdName: string;
  externalId: string | null;
  /** The guest this row matched, when it matched one. */
  guestId: string | null;
  matchedBy: MatchedBy | null;
  /** For changed rows: what the import would change. */
  changes: FieldChange[];
  /** Why a problem row is skipped. */
  problems: string[];
  warnings: string[];
  /** The guest's details after this row is applied (for new rows, what will be created). */
  after: {
    rsvpStatus: RsvpStatus | null;
    mealChoice: string | null;
    dietaryNotes: string | null;
    side: GuestSide;
    relationship: Relationship;
  };
  /** Counted in the headcount before and after (not declined; pending counts as coming). */
  comingBefore: boolean;
  comingAfter: boolean;
  acceptByDefault: boolean;
  create: GuestCreate | null;
  update: GuestUpdate | null;
};

export type MissingGuest = {
  id: string;
  fullName: string;
  householdName: string;
  rsvpStatus: RsvpStatus | null;
  relationship: Relationship;
  /** Added in this app rather than by an import. */
  addedHere: boolean;
};

export type ImportDiff = {
  rows: DiffRow[];
  /** On the list but not in this file. Never deleted; listed so nothing disappears silently. */
  missing: MissingGuest[];
  counts: { rows: number; new: number; changed: number; unchanged: number; problem: number; missing: number };
  /** Demo guests are never matched or listed as missing. */
  ignoredDemo: number;
};

const isComing = (s: RsvpStatus | null) => s !== "DECLINED";
/** Null ("we don't know") and PENDING mean the same thing, so moving between them isn't a change. */
const sameRsvp = (a: RsvpStatus | null, b: RsvpStatus | null) => (a ?? "PENDING") === (b ?? "PENDING");

export function diffImport(rows: ImportRow[], existing: ExistingGuest[]): ImportDiff {
  const real = existing.filter((g) => !g.isDemo);
  const byId = new Map(real.filter((g) => g.externalId).map((g) => [g.externalId!, g]));
  const rowKey = (r: ImportRow) => matchKeyFor(r.fullName, rowHousehold(r));

  // 1. Rows that can't be imported: no name, or a repeat of an earlier row. Two rows with the
  //    same name and household are only different people if the RSVP app gave them different IDs.
  const problems = new Map<number, string>();
  const firstById = new Map<string, number>();
  const firstByKey = new Map<string, ImportRow>();
  for (const row of rows) {
    let problem: string | null = null;
    if (!row.fullName) {
      problem = "No name in this row.";
    } else if (row.externalId && firstById.has(row.externalId)) {
      problem = `Same RSVP app ID as row ${firstById.get(row.externalId)}.`;
    } else {
      const prior = firstByKey.get(rowKey(row));
      const distinctIds = prior?.externalId && row.externalId && prior.externalId !== row.externalId;
      if (prior && !distinctIds) problem = `Same name and household as row ${prior.rowNumber}.`;
    }
    if (problem) {
      problems.set(row.rowNumber, problem);
      continue;
    }
    if (row.externalId) firstById.set(row.externalId, row.rowNumber);
    if (!firstByKey.has(rowKey(row))) firstByKey.set(rowKey(row), row);
  }

  const valid = rows.filter((r) => !problems.has(r.rowNumber));
  const fileIds = new Set(valid.map((r) => r.externalId).filter((x): x is string => Boolean(x)));
  const claimed = new Set<string>();
  const match = new Map<number, { guest: ExistingGuest; by: MatchedBy }>();
  const claimable = (g: ExistingGuest) => !claimed.has(g.id) && (!g.externalId || !fileIds.has(g.externalId));
  const take = (row: ImportRow, guest: ExistingGuest, by: MatchedBy) => {
    match.set(row.rowNumber, { guest, by });
    claimed.add(guest.id);
  };
  const unmatched = () => valid.filter((r) => !match.has(r.rowNumber));

  // 2. The RSVP app's ID.
  for (const row of valid) {
    const g = row.externalId ? byId.get(row.externalId) : undefined;
    if (g) take(row, g, "id");
  }

  // 3. Name + household.
  const byKey = groupBy(real, (g) => matchKeyFor(g.fullName, g.householdName));
  for (const row of unmatched()) {
    const g = (byKey.get(rowKey(row)) ?? []).find(claimable);
    if (g) take(row, g, "name-household");
  }

  // 4. Name alone, when it's unambiguous on both sides (the household was renamed).
  const rowsByName = groupBy(unmatched(), (r) => normalizeText(r.fullName));
  const guestsByName = groupBy(real.filter(claimable), (g) => normalizeText(g.fullName));
  for (const [name, rs] of rowsByName) {
    const gs = guestsByName.get(name) ?? [];
    if (rs.length === 1 && gs.length === 1) take(rs[0], gs[0], "name");
  }

  // 5. One of the couple, added here by first name only ("Rondell"), in the file in full.
  const rowsByFirst = groupBy(unmatched(), (r) => firstToken(r.fullName));
  for (const g of real) {
    if (g.relationship !== "COUPLE" || !claimable(g)) continue;
    const name = normalizeText(g.fullName);
    if (name.includes(" ")) continue;
    const rs = (rowsByFirst.get(name) ?? []).filter((r) => !match.has(r.rowNumber));
    if (rs.length === 1) take(rs[0], g, "couple");
  }

  // 6. Describe every row.
  const out: DiffRow[] = rows.map((row): DiffRow => {
    const problem = problems.get(row.rowNumber);
    const hit = match.get(row.rowNumber);

    if (problem) {
      return {
        rowNumber: row.rowNumber,
        kind: "problem",
        fullName: row.fullName,
        householdName: rowHousehold(row),
        externalId: row.externalId,
        guestId: null,
        matchedBy: null,
        changes: [],
        problems: [problem],
        warnings: row.warnings,
        after: {
          rsvpStatus: row.rsvpStatus,
          mealChoice: row.mealChoice,
          dietaryNotes: row.dietaryNotes,
          side: row.side ?? "BOTH",
          relationship: row.relationship ?? "OTHER",
        },
        comingBefore: false,
        comingAfter: false,
        acceptByDefault: false,
        create: null,
        update: null,
      };
    }

    if (!hit) {
      const householdName = rowHousehold(row);
      const rsvpStatus = row.rsvpStatus ?? "PENDING";
      const create: GuestCreate = {
        fullName: row.fullName,
        householdName,
        side: row.side ?? "BOTH",
        relationship: row.relationship ?? "OTHER",
        rsvpStatus,
        mealChoice: row.mealChoice,
        dietaryNotes: row.dietaryNotes,
        notes: row.notes,
        externalId: row.externalId,
        matchKey: matchKeyFor(row.fullName, householdName),
      };
      const warnings = [...row.warnings, ...row.newGuestWarnings];
      // Someone left over with the same name, whom we couldn't safely match: ask before adding.
      const sameName = real.filter((g) => !claimed.has(g.id) && normalizeText(g.fullName) === normalizeText(row.fullName));
      if (sameName.length > 0) {
        const who = sameName.length === 1 ? "A guest with this name is" : `${sameName.length} guests with this name are`;
        warnings.push(
          `${who} already on the list (${sameName.map((g) => g.householdName).join("; ")}). Check it isn't the same person before adding.`,
        );
      }
      return {
        rowNumber: row.rowNumber,
        kind: "new",
        fullName: row.fullName,
        householdName,
        externalId: row.externalId,
        guestId: null,
        matchedBy: null,
        changes: [],
        problems: [],
        warnings,
        after: { rsvpStatus, mealChoice: row.mealChoice, dietaryNotes: row.dietaryNotes, side: create.side, relationship: create.relationship },
        comingBefore: false,
        comingAfter: isComing(rsvpStatus),
        acceptByDefault: sameName.length === 0,
        create,
        update: null,
      };
    }

    const g = hit.guest;
    const householdName = row.householdName ?? tidy(g.householdName);
    const changes: FieldChange[] = [];
    const update: GuestUpdate = { matchKey: matchKeyFor(row.fullName, householdName) };
    if (row.fullName !== tidy(g.fullName)) {
      changes.push({ field: "fullName", before: g.fullName, after: row.fullName });
      update.fullName = row.fullName;
    }
    if (householdName !== tidy(g.householdName)) {
      changes.push({ field: "householdName", before: g.householdName, after: householdName });
      update.householdName = householdName;
    }
    // Blank cells never erase what we have.
    if (row.rsvpStatus !== null && !sameRsvp(row.rsvpStatus, g.rsvpStatus)) {
      changes.push({ field: "rsvpStatus", before: g.rsvpStatus, after: row.rsvpStatus });
      update.rsvpStatus = row.rsvpStatus;
    }
    if (row.mealChoice !== null && row.mealChoice !== (g.mealChoice ?? null)) {
      changes.push({ field: "mealChoice", before: g.mealChoice, after: row.mealChoice });
      update.mealChoice = row.mealChoice;
    }
    if (row.dietaryNotes !== null && row.dietaryNotes !== (g.dietaryNotes ?? null)) {
      changes.push({ field: "dietaryNotes", before: g.dietaryNotes, after: row.dietaryNotes });
      update.dietaryNotes = row.dietaryNotes;
    }
    if (row.externalId !== null && row.externalId !== g.externalId) {
      changes.push({ field: "externalId", before: g.externalId, after: row.externalId });
      update.externalId = row.externalId;
    }
    const rsvpAfter = update.rsvpStatus ?? g.rsvpStatus;
    const changed = changes.length > 0;
    return {
      rowNumber: row.rowNumber,
      kind: changed ? "changed" : "unchanged",
      fullName: row.fullName,
      householdName,
      externalId: row.externalId ?? g.externalId,
      guestId: g.id,
      matchedBy: hit.by,
      changes,
      problems: [],
      warnings: row.warnings,
      after: {
        rsvpStatus: rsvpAfter,
        mealChoice: update.mealChoice ?? g.mealChoice,
        dietaryNotes: update.dietaryNotes ?? g.dietaryNotes,
        side: g.side,
        relationship: g.relationship,
      },
      comingBefore: isComing(g.rsvpStatus),
      comingAfter: isComing(rsvpAfter),
      acceptByDefault: changed,
      create: null,
      update: changed ? update : null,
    };
  });

  const missing: MissingGuest[] = real
    .filter((g) => !claimed.has(g.id))
    .map((g) => ({
      id: g.id,
      fullName: g.fullName,
      householdName: g.householdName,
      rsvpStatus: g.rsvpStatus,
      relationship: g.relationship,
      addedHere: !g.lastImportedAt,
    }))
    .sort((a, b) => a.householdName.localeCompare(b.householdName) || a.fullName.localeCompare(b.fullName));

  const count = (k: DiffKind) => out.filter((r) => r.kind === k).length;
  return {
    rows: out,
    missing,
    counts: {
      rows: rows.length,
      new: count("new"),
      changed: count("changed"),
      unchanged: count("unchanged"),
      problem: count("problem"),
      missing: missing.length,
    },
    ignoredDemo: existing.length - real.length,
  };
}

function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    if (!k) continue;
    m.set(k, [...(m.get(k) ?? []), it]);
  }
  return m;
}

/** Row numbers checked when the preview first opens: every new and changed row without a doubt. */
export function defaultAccepted(diff: ImportDiff): number[] {
  return diff.rows.filter((r) => r.acceptByDefault).map((r) => r.rowNumber);
}

/** The writes for the rows a person accepted. Problem and unchanged rows are never written. */
export function planWrites(
  diff: ImportDiff,
  accepted: Iterable<number>,
): { creates: GuestCreate[]; updates: Array<{ id: string; data: GuestUpdate }>; notAccepted: number } {
  const yes = new Set(accepted);
  const creates: GuestCreate[] = [];
  const updates: Array<{ id: string; data: GuestUpdate }> = [];
  let notAccepted = 0;
  for (const r of diff.rows) {
    if (r.kind !== "new" && r.kind !== "changed") continue;
    if (!yes.has(r.rowNumber)) {
      notAccepted++;
      continue;
    }
    if (r.kind === "new" && r.create) creates.push(r.create);
    if (r.kind === "changed" && r.update && r.guestId) updates.push({ id: r.guestId, data: r.update });
  }
  return { creates, updates, notAccepted };
}

/**
 * A stable description of what the import would do. The commit recomputes the diff and refuses
 * to write if this changed since the preview (someone edited the list in between).
 */
export function diffFingerprint(diff: ImportDiff): string {
  return JSON.stringify([
    diff.rows.map((r) => [r.rowNumber, r.kind, r.guestId, r.changes.map((c) => [c.field, c.before, c.after])]),
    diff.missing.map((m) => m.id),
  ]);
}

/** Parse → read → compare, in one call. */
export function buildImport(text: string, mapping: ImportMapping, existing: ExistingGuest[]) {
  const parsed = parseCsv(text);
  if (parsed.error) return { ok: false as const, error: parsed.error };
  const problem = mappingProblem(mapping, parsed.headers);
  if (problem) return { ok: false as const, error: problem };
  const rows = readRows(parsed, mapping);
  return { ok: true as const, parsed, diff: diffImport(rows, existing) };
}
