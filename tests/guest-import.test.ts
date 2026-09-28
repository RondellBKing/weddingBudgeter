import { describe, expect, it } from "vitest";
import {
  buildImport,
  defaultAccepted,
  diffFingerprint,
  diffImport,
  distinctSideValues,
  guessMapping,
  mapRelationship,
  mappingProblem,
  mapRsvp,
  mapSide,
  matchKeyFor,
  normalizeText,
  parseCsv,
  planWrites,
  readRows,
  resolveMapping,
  type ExistingGuest,
  type ImportMapping,
} from "../src/lib/domain/guest-import";

// A small RSVP-app style export.
const EXPORT = [
  "Guest ID,First Name,Last Name,Party,Side,Relationship,RSVP,Entrée,Allergies,Notes",
  "G1,Ava,Rivera,The Rivera Family,Bride,Family,Joyfully accepts,Chicken,,Aunt",
  "G2,Marcus,Rivera,The Rivera Family,Bride,Family,Joyfully accepts,Fish,Shellfish,",
  "G3,Jada,Coleman,Jada & Terrence,Groom,Friend,Regretfully declines,,,",
  "G4,Terrence,Hayes,Jada & Terrence,Groom,Friend,No response,,,",
  "G5,José,Núñez,The Núñez Household,Both,Work,,Vegetarian,,",
].join("\n");

const MAPPING: ImportMapping = {
  columns: {
    externalId: "Guest ID",
    firstName: "First Name",
    lastName: "Last Name",
    householdName: "Party",
    side: "Side",
    relationship: "Relationship",
    rsvpStatus: "RSVP",
    mealChoice: "Entrée",
    dietaryNotes: "Allergies",
    notes: "Notes",
  },
  sideValues: {},
};

function guest(over: Partial<ExistingGuest> & { id: string; fullName: string; householdName: string }): ExistingGuest {
  return {
    side: "BOTH",
    relationship: "OTHER",
    rsvpStatus: "PENDING",
    mealChoice: null,
    dietaryNotes: null,
    externalId: null,
    lastImportedAt: "2027-01-01T00:00:00Z",
    isDemo: false,
    ...over,
  };
}

/** Apply an import's writes to an in-memory list, the way the server action does. */
function apply(existing: ExistingGuest[], text: string, mapping: ImportMapping, accept?: number[]): ExistingGuest[] {
  const built = buildImport(text, mapping, existing);
  if (!built.ok) throw new Error(built.error);
  const writes = planWrites(built.diff, accept ?? defaultAccepted(built.diff));
  const next = existing.map((g) => {
    const u = writes.updates.find((w) => w.id === g.id);
    if (!u) return g;
    const data: Partial<typeof u.data> = { ...u.data };
    delete data.matchKey;
    return { ...g, ...data, lastImportedAt: "2027-02-01T00:00:00Z" };
  });
  writes.creates.forEach((c, i) =>
    next.push({
      id: `new-${existing.length + i}`,
      fullName: c.fullName,
      householdName: c.householdName,
      side: c.side,
      relationship: c.relationship,
      rsvpStatus: c.rsvpStatus,
      mealChoice: c.mealChoice,
      dietaryNotes: c.dietaryNotes,
      externalId: c.externalId,
      lastImportedAt: "2027-02-01T00:00:00Z",
      isDemo: false,
    }),
  );
  return next;
}

function diffOf(text: string, existing: ExistingGuest[], mapping = MAPPING) {
  const built = buildImport(text, mapping, existing);
  if (!built.ok) throw new Error(built.error);
  return built.diff;
}

describe("normalizing names", () => {
  it("ignores case, accents, punctuation and spacing", () => {
    expect(normalizeText("  José   Núñez ")).toBe("jose nunez");
    expect(normalizeText("JOSE NUNEZ")).toBe("jose nunez");
    expect(normalizeText("O'Brien")).toBe(normalizeText("OBrien"));
    expect(normalizeText("O’Brien, Jr.")).toBe("obrien jr");
    expect(normalizeText("Mary-Jane\tSmith")).toBe("mary jane smith");
    expect(normalizeText("Zoë Ångström")).toBe("zoe angstrom");
    expect(normalizeText("Łukasz Søren Weiß")).toBe("lukasz soren weiss");
  });

  it("reads & as and", () => {
    expect(normalizeText("Jada & Terrence")).toBe(normalizeText("Jada and Terrence"));
    expect(normalizeText("Dr. & Mrs. Smith")).toBe("dr and mrs smith");
  });

  it("builds the match key from name and household", () => {
    expect(matchKeyFor("José Núñez", "The Núñez Household")).toBe("jose nunez|the nunez household");
    expect(matchKeyFor("jose  nunez", "the nunez household.")).toBe(matchKeyFor("José Núñez", "The Núñez Household"));
  });
});

describe("parsing the file", () => {
  it("reads headers and rows, skipping blank lines, with spreadsheet row numbers", () => {
    const p = parseCsv("﻿Name,RSVP\n\nAva Rivera,Yes\n,\nMarcus Rivera,No\n");
    expect(p.error).toBeNull();
    expect(p.headers).toEqual(["Name", "RSVP"]);
    expect(p.records.map((r) => r.rowNumber)).toEqual([3, 5]);
    expect(p.records[1].cells).toEqual(["Marcus Rivera", "No"]);
  });

  it("handles quoted commas and new lines, and tab-separated files", () => {
    const p = parseCsv('Name,Notes\n"Rivera, Ava","Line one\nline two"\n');
    expect(p.records[0].cells).toEqual(["Rivera, Ava", "Line one\nline two"]);
    const t = parseCsv("Name\tRSVP\nAva Rivera\tYes\n");
    expect(t.headers).toEqual(["Name", "RSVP"]);
    expect(t.records[0].cells).toEqual(["Ava Rivera", "Yes"]);
  });

  it("names blank and repeated headers", () => {
    const p = parseCsv("Name,,Name\nA,B,C\n");
    expect(p.headers).toEqual(["Name", "Column 2", "Name (2)"]);
  });

  it("explains an empty file or one with only a header", () => {
    expect(parseCsv("  \n ").error).toMatch(/empty/);
    expect(parseCsv("Name,RSVP\n").error).toMatch(/no guests/);
  });
});

describe("guessing the columns", () => {
  it("maps a typical RSVP app export", () => {
    const p = parseCsv(EXPORT);
    expect(guessMapping(p.headers)).toEqual({
      externalId: "Guest ID",
      firstName: "First Name",
      lastName: "Last Name",
      householdName: "Party",
      side: "Side",
      relationship: "Relationship",
      rsvpStatus: "RSVP",
      mealChoice: "Entrée",
      dietaryNotes: "Allergies",
      notes: "Notes",
    });
  });

  it("recognizes other spellings", () => {
    expect(guessMapping(["Guest Name", "Household", "Attending", "Meal Choice", "Dietary Restrictions", "ID"])).toEqual({
      fullName: "Guest Name",
      householdName: "Household",
      rsvpStatus: "Attending",
      mealChoice: "Meal Choice",
      dietaryNotes: "Dietary Restrictions",
      externalId: "ID",
    });
    expect(guessMapping(["Full Name", "Invitation", "Status", "Response Date"])).toEqual({
      fullName: "Full Name",
      householdName: "Invitation",
      rsvpStatus: "Status",
    });
  });

  it("doesn't mistake a household ID or plus-one name for the guest's", () => {
    const m = guessMapping(["Household ID", "Name", "Plus One Name", "Group"]);
    expect(m.externalId).toBeUndefined();
    expect(m.fullName).toBe("Name");
    expect(m.householdName).toBe("Group");
  });

  it("reads back our own CSV export", () => {
    const m = guessMapping(["Name", "Household", "Side", "Relationship", "Child", "Plus-one of", "RSVP", "Meal", "Dietary notes", "Notes", "Table", "RSVP app ID"]);
    expect(m).toMatchObject({
      fullName: "Name",
      householdName: "Household",
      side: "Side",
      relationship: "Relationship",
      rsvpStatus: "RSVP",
      mealChoice: "Meal",
      dietaryNotes: "Dietary notes",
      notes: "Notes",
      externalId: "RSVP app ID",
    });
  });

  it("remembers the last mapping, guessing only what's new", () => {
    const saved = { columns: { fullName: "Who", rsvpStatus: "Reply?" }, sideValues: { rondell: "GROOM_SIDE" as const }, headers: ["Who", "Reply?", "Notes"] };
    const r = resolveMapping(["Who", "Reply?", "Notes", "Meal"], saved);
    expect(r.mapping.columns).toEqual({ fullName: "Who", rsvpStatus: "Reply?", mealChoice: "Meal" });
    expect(r.remembered).toEqual(["fullName", "rsvpStatus"]);
    // "Notes" was in last time's file and left unmapped on purpose, so it stays that way.
    expect(r.mapping.columns.notes).toBeUndefined();
    expect(r.mapping.sideValues).toEqual({ rondell: "GROOM_SIDE" });
  });

  it("insists on a name column and one field per column", () => {
    expect(mappingProblem({ columns: { rsvpStatus: "RSVP" }, sideValues: {} }, ["Name", "RSVP"])).toMatch(/name/);
    expect(mappingProblem({ columns: { fullName: "Name", householdName: "Name" }, sideValues: {} }, ["Name"])).toMatch(/both/);
    expect(mappingProblem({ columns: { lastName: "Last" }, sideValues: {} }, ["Last"])).toBeNull();
  });
});

describe("reading values", () => {
  it("maps RSVP words", () => {
    for (const v of ["Yes", "attending", "Accepted", "accept", "Joyfully accepts", "Will attend", "y", "2"]) {
      expect(mapRsvp(v).value, v).toBe("ATTENDING");
    }
    for (const v of ["No", "Declined", "Regrets", "decline", "Regretfully declines", "Not attending", "Won't attend", "0", "Can't make it"]) {
      expect(mapRsvp(v).value, v).toBe("DECLINED");
    }
    for (const v of ["Pending", "Awaiting reply", "No response", "maybe", "Not responded", "Invited"]) {
      expect(mapRsvp(v).value, v).toBe("PENDING");
    }
    expect(mapRsvp("")).toEqual({ value: null, known: true });
    expect(mapRsvp("N/A")).toEqual({ value: null, known: true });
    expect(mapRsvp("Later?")).toEqual({ value: null, known: false });
  });

  it("maps side values without guessing from names", () => {
    expect(mapSide("Bride").value).toBe("BRIDE_SIDE");
    expect(mapSide("bride's side").value).toBe("BRIDE_SIDE");
    expect(mapSide("Partner A").value).toBe("BRIDE_SIDE");
    expect(mapSide("GROOM").value).toBe("GROOM_SIDE");
    expect(mapSide("Partner 2").value).toBe("GROOM_SIDE");
    expect(mapSide("Both").value).toBe("BOTH");
    expect(mapSide("mutual").value).toBe("BOTH");
    expect(mapSide("Bride & Groom").value).toBe("BOTH");
    expect(mapSide("")).toEqual({ value: null, known: true });
    // A partner's name is not a side until someone says which it is.
    expect(mapSide("Rondell")).toEqual({ value: null, known: false });
    expect(mapSide("Rondell", { rondell: "GROOM_SIDE" }).value).toBe("GROOM_SIDE");
  });

  it("maps relationships", () => {
    expect(mapRelationship("Family").value).toBe("FAMILY");
    expect(mapRelationship("Cousin").value).toBe("FAMILY");
    expect(mapRelationship("College friend").value).toBe("FRIEND");
    expect(mapRelationship("Family friend").value).toBe("FRIEND");
    expect(mapRelationship("Coworker").value).toBe("WORK");
    expect(mapRelationship("The couple").value).toBe("COUPLE");
    expect(mapRelationship("Other").value).toBe("OTHER");
    expect(mapRelationship("Plumber")).toEqual({ value: null, known: false });
  });

  it("combines first and last names when there's no full-name column", () => {
    const rows = readRows(parseCsv(EXPORT), MAPPING);
    expect(rows.map((r) => r.fullName)).toEqual(["Ava Rivera", "Marcus Rivera", "Jada Coleman", "Terrence Hayes", "José Núñez"]);
    expect(rows[0]).toMatchObject({ externalId: "G1", householdName: "The Rivera Family", rsvpStatus: "ATTENDING", side: "BRIDE_SIDE", relationship: "FAMILY", mealChoice: "Chicken", dietaryNotes: null, notes: "Aunt" });
    expect(rows[4]).toMatchObject({ rsvpStatus: null, side: "BOTH", relationship: "WORK" });
  });

  it("uses a full name when there is one, and first + last when it's blank", () => {
    const text = "Name,First,Last\nAva Rivera,,\n,Marcus,Rivera\n,,\n";
    const rows = readRows(parseCsv(text), { columns: { fullName: "Name", firstName: "First", lastName: "Last" }, sideValues: {} });
    expect(rows.map((r) => r.fullName)).toEqual(["Ava Rivera", "Marcus Rivera"]);
  });

  it("lists distinct side values so they can be assigned", () => {
    const text = "Name,Side\nA,Rondell\nB,rondell\nC,Capri\nD,\n";
    const values = distinctSideValues(parseCsv(text), { columns: { fullName: "Name", side: "Side" }, sideValues: {} });
    expect(values).toEqual([
      { key: "rondell", label: "Rondell", count: 2 },
      { key: "capri", label: "Capri", count: 1 },
    ]);
  });
});

describe("first import", () => {
  it("adds everyone as new, with side and relationship set on creation", () => {
    const diff = diffOf(EXPORT, []);
    expect(diff.counts).toMatchObject({ rows: 5, new: 5, changed: 0, unchanged: 0, problem: 0, missing: 0 });
    const writes = planWrites(diff, defaultAccepted(diff));
    expect(writes.creates).toHaveLength(5);
    expect(writes.creates[0]).toEqual({
      fullName: "Ava Rivera",
      householdName: "The Rivera Family",
      side: "BRIDE_SIDE",
      relationship: "FAMILY",
      rsvpStatus: "ATTENDING",
      mealChoice: "Chicken",
      dietaryNotes: null,
      notes: "Aunt",
      externalId: "G1",
      matchKey: "ava rivera|the rivera family",
    });
    // A blank RSVP starts as pending.
    expect(writes.creates[4].rsvpStatus).toBe("PENDING");
  });

  it("defaults side and relationship when those columns aren't mapped", () => {
    const diff = diffOf("Name\nAva Rivera\n", [], { columns: { fullName: "Name" }, sideValues: {} });
    expect(diff.rows[0].create).toMatchObject({ side: "BOTH", relationship: "OTHER", rsvpStatus: "PENDING", householdName: "Ava Rivera" });
  });

  it("counts who's coming: declined no, pending yes", () => {
    const diff = diffOf(EXPORT, []);
    expect(diff.rows.map((r) => r.comingAfter)).toEqual([true, true, false, true, true]);
  });
});

describe("re-importing", () => {
  it("the same file changes nothing and creates no duplicates", () => {
    const after = apply([], EXPORT, MAPPING);
    expect(after).toHaveLength(5);
    const again = diffOf(EXPORT, after);
    expect(again.counts).toMatchObject({ new: 0, changed: 0, unchanged: 5, problem: 0, missing: 0 });
    expect(planWrites(again, defaultAccepted(again))).toEqual({ creates: [], updates: [], notAccepted: 0 });
    expect(apply(after, EXPORT, MAPPING)).toEqual(after);
  });

  it("matches by the RSVP app's ID first, so a corrected name is a change, not a new guest", () => {
    const list = apply([], EXPORT, MAPPING);
    const fixed = EXPORT.replace("G4,Terrence,Hayes", "G4,Terence,Hayes");
    const diff = diffOf(fixed, list);
    expect(diff.counts).toMatchObject({ new: 0, changed: 1, unchanged: 4 });
    const row = diff.rows.find((r) => r.kind === "changed")!;
    expect(row.matchedBy).toBe("id");
    expect(row.changes).toEqual([{ field: "fullName", before: "Terrence Hayes", after: "Terence Hayes" }]);
    expect(row.update).toEqual({ fullName: "Terence Hayes", matchKey: "terence hayes|jada and terrence" });
    expect(apply(list, fixed, MAPPING)).toHaveLength(5);
  });

  it("falls back to name + household when there's no ID, ignoring accents and spacing", () => {
    const list = [guest({ id: "a", fullName: "Jose Nunez", householdName: "the nunez household", rsvpStatus: null })];
    const diff = diffOf("Name,Household,RSVP\n  José  Núñez ,The Núñez Household,yes\n", list, {
      columns: { fullName: "Name", householdName: "Household", rsvpStatus: "RSVP" },
      sideValues: {},
    });
    expect(diff.rows[0]).toMatchObject({ kind: "changed", guestId: "a", matchedBy: "name-household" });
    // Spelling from the file wins for the fields the import owns.
    expect(diff.rows[0].changes.map((c) => c.field)).toEqual(["fullName", "householdName", "rsvpStatus"]);
  });

  it("follows a renamed household when the name is unambiguous", () => {
    const list = [guest({ id: "a", fullName: "Ava Rivera", householdName: "Riveras" })];
    const diff = diffOf("Name,Household\nAva Rivera,The Rivera Family\n", list, { columns: { fullName: "Name", householdName: "Household" }, sideValues: {} });
    expect(diff.rows[0]).toMatchObject({ kind: "changed", matchedBy: "name", changes: [{ field: "householdName", before: "Riveras", after: "The Rivera Family" }] });
    expect(diff.counts.missing).toBe(0);
  });

  it("links a guest added by hand to their RSVP app ID", () => {
    const list = [guest({ id: "a", fullName: "Ava Rivera", householdName: "The Rivera Family", rsvpStatus: "ATTENDING", lastImportedAt: null })];
    const diff = diffOf(EXPORT, list);
    const row = diff.rows[0];
    expect(row).toMatchObject({ kind: "changed", guestId: "a", matchedBy: "name-household" });
    expect(row.changes).toEqual([
      { field: "mealChoice", before: null, after: "Chicken" },
      { field: "externalId", before: null, after: "G1" },
    ]);
  });

  it("never matches a guest whose own ID is elsewhere in the file", () => {
    const list = [guest({ id: "a", fullName: "Ava Rivera", householdName: "The Rivera Family", externalId: "G9" })];
    const text = "ID,Name,Household\nG1,Ava Rivera,The Rivera Family\nG9,Ava Rivera-Brooks,The Rivera Family\n";
    const diff = diffOf(text, list, { columns: { externalId: "ID", fullName: "Name", householdName: "Household" }, sideValues: {} });
    expect(diff.rows[0]).toMatchObject({ kind: "new" });
    expect(diff.rows[1]).toMatchObject({ kind: "changed", guestId: "a", matchedBy: "id" });
  });

  it("matches one of the couple added here by first name to their full row", () => {
    const list = [guest({ id: "c1", fullName: "Rondell", householdName: "Rondell & Capri", relationship: "COUPLE", rsvpStatus: "ATTENDING", lastImportedAt: null })];
    const diff = diffOf("ID,Name,Household\nR1,Rondell King,Rondell & Capri\n", list, { columns: { externalId: "ID", fullName: "Name", householdName: "Household" }, sideValues: {} });
    expect(diff.rows[0]).toMatchObject({ kind: "changed", guestId: "c1", matchedBy: "couple" });
    expect(diff.counts.new).toBe(0);
  });

  it("lists guests missing from the file without deleting them", () => {
    const list = apply([], EXPORT, MAPPING);
    const withoutJada = EXPORT.split("\n").filter((l) => !l.startsWith("G3,")).join("\n");
    const diff = diffOf(withoutJada, list);
    expect(diff.counts).toMatchObject({ unchanged: 4, missing: 1 });
    expect(diff.missing[0]).toMatchObject({ fullName: "Jada Coleman", addedHere: false });
    const writes = planWrites(diff, defaultAccepted(diff));
    expect(writes).toEqual({ creates: [], updates: [], notAccepted: 0 });
    expect(apply(list, withoutJada, MAPPING)).toHaveLength(5);
  });

  it("marks guests added here, like the couple, as added here rather than removed", () => {
    const list = [guest({ id: "c1", fullName: "Capri", householdName: "Rondell & Capri", relationship: "COUPLE", lastImportedAt: null })];
    const diff = diffOf("Name\nAva Rivera\n", list, { columns: { fullName: "Name" }, sideValues: {} });
    expect(diff.missing).toEqual([{ id: "c1", fullName: "Capri", householdName: "Rondell & Capri", rsvpStatus: "PENDING", relationship: "COUPLE", addedHere: true }]);
  });

  it("ignores demo guests entirely", () => {
    const list = [guest({ id: "d", fullName: "Ava Rivera", householdName: "The Rivera Family", isDemo: true })];
    const diff = diffOf(EXPORT, list);
    expect(diff.counts).toMatchObject({ new: 5, missing: 0 });
    expect(diff.ignoredDemo).toBe(1);
  });
});

describe("field ownership", () => {
  const list = [
    guest({
      id: "a",
      fullName: "Ava Rivera",
      householdName: "The Rivera Family",
      side: "GROOM_SIDE",
      relationship: "FRIEND",
      rsvpStatus: "PENDING",
      mealChoice: "Fish",
      dietaryNotes: "No nuts",
      externalId: "G1",
    }),
  ];

  it("never overwrites side, relationship or notes on a guest who's already on the list", () => {
    const diff = diffOf(EXPORT, list);
    const row = diff.rows[0];
    expect(row.kind).toBe("changed");
    expect(row.changes.map((c) => c.field)).toEqual(["rsvpStatus", "mealChoice"]);
    expect(Object.keys(row.update!).sort()).toEqual(["matchKey", "mealChoice", "rsvpStatus"]);
    expect(row.after).toMatchObject({ side: "GROOM_SIDE", relationship: "FRIEND" });
    for (const w of planWrites(diff, [row.rowNumber]).updates) {
      expect(w.data).not.toHaveProperty("side");
      expect(w.data).not.toHaveProperty("relationship");
      expect(w.data).not.toHaveProperty("notes");
      expect(w.data).not.toHaveProperty("plusOneOfId");
    }
  });

  it("keeps what we have when a cell is blank", () => {
    const text = "Guest ID,First Name,Last Name,Party,RSVP,Entrée,Allergies\nG1,Ava,Rivera,,,,\n";
    const diff = diffOf(text, list, {
      columns: { externalId: "Guest ID", firstName: "First Name", lastName: "Last Name", householdName: "Party", rsvpStatus: "RSVP", mealChoice: "Entrée", dietaryNotes: "Allergies" },
      sideValues: {},
    });
    expect(diff.rows[0]).toMatchObject({ kind: "unchanged", householdName: "The Rivera Family" });
    expect(diff.rows[0].after).toMatchObject({ rsvpStatus: "PENDING", mealChoice: "Fish", dietaryNotes: "No nuts" });
  });

  it("treats no answer and pending as the same", () => {
    const blank = [guest({ id: "a", fullName: "Ava Rivera", householdName: "H", rsvpStatus: null })];
    const diff = diffOf("Name,Household,RSVP\nAva Rivera,H,Pending\n", blank, { columns: { fullName: "Name", householdName: "Household", rsvpStatus: "RSVP" }, sideValues: {} });
    expect(diff.rows[0].kind).toBe("unchanged");
  });

  it("applies only the rows that were accepted", () => {
    const diff = diffOf(EXPORT, list);
    const writes = planWrites(diff, [diff.rows[1].rowNumber]);
    expect(writes.updates).toEqual([]);
    expect(writes.creates.map((c) => c.fullName)).toEqual(["Marcus Rivera"]);
    expect(writes.notAccepted).toBe(4);
  });
});

describe("problems in the file", () => {
  it("skips rows without a name", () => {
    const diff = diffOf("Name,RSVP\n,Yes\nAva Rivera,Yes\n", [], { columns: { fullName: "Name", rsvpStatus: "RSVP" }, sideValues: {} });
    expect(diff.rows[0]).toMatchObject({ kind: "problem", problems: ["No name in this row."], acceptByDefault: false });
    expect(planWrites(diff, [2, 3]).creates.map((c) => c.fullName)).toEqual(["Ava Rivera"]);
  });

  it("flags a repeated row, by ID or by name and household", () => {
    const text = [
      "ID,Name,Household",
      "G1,Ava Rivera,Riveras",
      "G1,Ava Rivera (again),Riveras",
      ",Marcus Rivera,Riveras",
      ",marcus  rivera,RIVERAS",
    ].join("\n");
    const diff = diffOf(text, [], { columns: { externalId: "ID", fullName: "Name", householdName: "Household" }, sideValues: {} });
    expect(diff.rows.map((r) => r.kind)).toEqual(["new", "problem", "new", "problem"]);
    expect(diff.rows[1].problems[0]).toBe("Same RSVP app ID as row 2.");
    expect(diff.rows[3].problems[0]).toBe("Same name and household as row 4.");
    expect(planWrites(diff, [2, 3, 4, 5]).creates).toHaveLength(2);
  });

  it("keeps two people with the same name when the RSVP app gave them different IDs", () => {
    const text = "ID,Name,Household\nG1,John Smith,Smiths\nG2,John Smith,Smiths\n";
    const diff = diffOf(text, [], { columns: { externalId: "ID", fullName: "Name", householdName: "Household" }, sideValues: {} });
    expect(diff.rows.map((r) => r.kind)).toEqual(["new", "new"]);
  });

  it("warns, and leaves unchecked, a new guest who shares a name with someone we couldn't match", () => {
    const list = [
      guest({ id: "a", fullName: "John Smith", householdName: "Smiths" }),
      guest({ id: "b", fullName: "John Smith", householdName: "Work friends" }),
    ];
    const diff = diffOf("Name,Household\nJohn Smith,Cousins\n", list, { columns: { fullName: "Name", householdName: "Household" }, sideValues: {} });
    expect(diff.rows[0]).toMatchObject({ kind: "new", acceptByDefault: false });
    expect(diff.rows[0].warnings[0]).toMatch(/already on the list/);
  });

  it("warns about values it doesn't understand", () => {
    const diff = diffOf("Name,RSVP,Side\nAva Rivera,Later?,Rondell\n", [], { columns: { fullName: "Name", rsvpStatus: "RSVP", side: "Side" }, sideValues: {} });
    expect(diff.rows[0].warnings).toHaveLength(2);
    expect(diff.rows[0].create).toMatchObject({ rsvpStatus: "PENDING", side: "BOTH" });
  });

  it("refuses a mapping without a name", () => {
    const built = buildImport(EXPORT, { columns: { rsvpStatus: "RSVP" }, sideValues: {} }, []);
    expect(built.ok).toBe(false);
  });
});

describe("fingerprint", () => {
  it("is stable for the same inputs and changes when the list does", () => {
    const a = diffImport(readRows(parseCsv(EXPORT), MAPPING), []);
    const b = diffImport(readRows(parseCsv(EXPORT), MAPPING), []);
    expect(diffFingerprint(a)).toBe(diffFingerprint(b));
    const c = diffImport(readRows(parseCsv(EXPORT), MAPPING), [guest({ id: "x", fullName: "Someone Else", householdName: "Else" })]);
    expect(diffFingerprint(c)).not.toBe(diffFingerprint(a));
  });
});
