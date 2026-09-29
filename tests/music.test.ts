import { describe, expect, it } from "vitest";
import {
  DAY_MOMENTS,
  draftProcessional,
  groupByMoment,
  KEY_MOMENTS,
  nextSortOrder,
  reorderUpdates,
  stillToChoose,
  type PartyMemberForProcessional,
} from "../src/lib/domain/music";

// The confirmed wedding party, in the seeded order: best man + 6 groomsmen, then maid of honor,
// matron of honor, bridesman and 4 bridesmaids. Names are blank until the couple adds them.
function party(names: Record<string, string> = {}): PartyMemberForProcessional[] {
  const rows: Array<Omit<PartyMemberForProcessional, "sortOrder" | "name">> = [
    { id: "best", side: "GROOM_SIDE", role: "BEST_MAN" },
    ...[1, 2, 3, 4, 5, 6].map((n) => ({ id: `gm${n}`, side: "GROOM_SIDE" as const, role: "GROOMSMAN" as const })),
    { id: "maid", side: "BRIDE_SIDE", role: "MAID_OF_HONOR" },
    { id: "matron", side: "BRIDE_SIDE", role: "MATRON_OF_HONOR" },
    { id: "bman", side: "BRIDE_SIDE", role: "BRIDESMAN" },
    ...[1, 2, 3, 4].map((n) => ({ id: `bm${n}`, side: "BRIDE_SIDE" as const, role: "BRIDESMAID" as const })),
  ];
  return rows.map((r, i) => ({ ...r, name: names[r.id] ?? null, sortOrder: i }));
}

describe("songs still to choose", () => {
  it("lists the key moments without a song, in the order they happen", () => {
    expect(stillToChoose([])).toEqual(KEY_MOMENTS);
    expect(
      stillToChoose([{ moment: "FIRST_DANCE" }, { moment: "PRELUDE" }, { moment: "MUST_PLAY" }, { moment: "PROCESSIONAL" }]),
    ).toEqual(["COUPLE_ENTRANCE", "RECESSIONAL", "LAST_DANCE"]);
  });

  it("is empty once every key moment has a song", () => {
    expect(stillToChoose(KEY_MOMENTS.map((moment) => ({ moment })))).toEqual([]);
  });

  it("runs the day from prelude to send-off, without the two lists", () => {
    expect(DAY_MOMENTS[0]).toBe("PRELUDE");
    expect(DAY_MOMENTS.at(-1)).toBe("SEND_OFF");
    expect(DAY_MOMENTS).not.toContain("MUST_PLAY");
    expect(DAY_MOMENTS).not.toContain("DO_NOT_PLAY");
    expect(new Set(DAY_MOMENTS).size).toBe(11);
  });

  it("groups rows by moment and keeps their order", () => {
    const groups = groupByMoment([
      { id: "a", moment: "PRELUDE" },
      { id: "b", moment: "FIRST_DANCE" },
      { id: "c", moment: "PRELUDE" },
    ]);
    expect(groups.get("PRELUDE")?.map((r) => r.id)).toEqual(["a", "c"]);
    expect(groups.get("FIRST_DANCE")?.map((r) => r.id)).toEqual(["b"]);
    expect(groups.get("LAST_DANCE")).toBeUndefined();
  });
});

describe("moving a row up or down", () => {
  const rows = [
    { id: "a", sortOrder: 0 },
    { id: "b", sortOrder: 1 },
    { id: "c", sortOrder: 2 },
  ];

  it("swaps with the neighbor and writes only what changed", () => {
    expect(reorderUpdates(rows, "b", "up")).toEqual([
      { id: "b", sortOrder: 0 },
      { id: "a", sortOrder: 1 },
    ]);
    expect(reorderUpdates(rows, "b", "down")).toEqual([
      { id: "c", sortOrder: 1 },
      { id: "b", sortOrder: 2 },
    ]);
  });

  it("does nothing at the ends or for an unknown row", () => {
    expect(reorderUpdates(rows, "a", "up")).toEqual([]);
    expect(reorderUpdates(rows, "c", "down")).toEqual([]);
    expect(reorderUpdates(rows, "zzz", "up")).toEqual([]);
  });

  it("untangles rows that share a number", () => {
    const tied = [
      { id: "a", sortOrder: 0 },
      { id: "b", sortOrder: 0 },
      { id: "c", sortOrder: 0 },
    ];
    expect(reorderUpdates(tied, "c", "up")).toEqual([
      { id: "c", sortOrder: 1 },
      { id: "b", sortOrder: 2 },
    ]);
  });

  it("puts a new row at the end", () => {
    expect(nextSortOrder([])).toBe(0);
    expect(nextSortOrder([{ sortOrder: 4 }, { sortOrder: 1 }])).toBe(5);
  });
});

describe("processional draft from the wedding party", () => {
  it("seats family, pairs the attendants with the honor attendants last, then the couple", () => {
    expect(draftProcessional(party())).toEqual([
      { walkers: "Officiant", notes: "Takes their place at the front" },
      { walkers: "Groom's grandparents", notes: "Walk in and take their seats" },
      { walkers: "Bride's grandparents", notes: "Walk in and take their seats" },
      { walkers: "Groom's parents", notes: "Walk in and take their seats" },
      { walkers: "Bride's parents", notes: "Take their seats. If a parent walks the bride in, only the other one walks here" },
      { walkers: "Groomsman 1 with Bridesman", notes: null },
      { walkers: "Groomsman 2 with Bridesmaid 1", notes: null },
      { walkers: "Groomsman 3 with Bridesmaid 2", notes: null },
      { walkers: "Groomsman 4 with Bridesmaid 3", notes: null },
      { walkers: "Groomsman 5 with Bridesmaid 4", notes: null },
      { walkers: "Groomsman 6 with Matron of Honor", notes: null },
      { walkers: "Best Man with Maid of Honor", notes: null },
      { walkers: "The groom", notes: "Walks in here, or waits at the front from the start" },
      { walkers: "The bride", notes: "Guests stand. Add who walks with them, if anyone" },
    ]);
  });

  it("uses names once they're filled in, and keeps the roles in the notes", () => {
    const lines = draftProcessional(party({ best: "Jordan", maid: " Alexis ", gm1: "Sam" }));
    expect(lines).toContainEqual({ walkers: "Jordan with Alexis", notes: "Best Man and Maid of Honor" });
    expect(lines).toContainEqual({ walkers: "Sam with Bridesman", notes: "Groomsman and Bridesman" });
    // Unnamed groomsmen keep their number in the party's order.
    expect(lines).toContainEqual({ walkers: "Groomsman 2 with Bridesmaid 1", notes: null });
  });

  it("follows the party's own order, not the order rows arrive in", () => {
    expect(draftProcessional([...party()].reverse())).toEqual(draftProcessional(party()));
  });

  it("lets extra attendants on the longer side walk alone, first", () => {
    const uneven = party().filter((m) => m.id !== "gm1" && m.id !== "gm2");
    const pairs = draftProcessional(uneven).slice(5, -2);
    // 5 on the groom's side, 7 on the bride's: the first two bride's-side attendants walk alone.
    expect(pairs[0]).toEqual({ walkers: "Bridesman", notes: "Walks alone" });
    expect(pairs[1]).toEqual({ walkers: "Bridesmaid 1", notes: "Walks alone" });
    expect(pairs[2]).toEqual({ walkers: "Groomsman 1 with Bridesmaid 2", notes: null });
    expect(pairs.at(-1)).toEqual({ walkers: "Best Man with Maid of Honor", notes: null });
    expect(pairs).toHaveLength(7);
  });

  it("still drafts the family and the couple with no wedding party", () => {
    expect(draftProcessional([]).map((l) => l.walkers)).toEqual([
      "Officiant",
      "Groom's grandparents",
      "Bride's grandparents",
      "Groom's parents",
      "Bride's parents",
      "The groom",
      "The bride",
    ]);
  });

  it("never names either partner as the bride or the groom", () => {
    const text = JSON.stringify(draftProcessional(party()));
    expect(text).not.toMatch(/Rondell|Capri/);
  });
});
