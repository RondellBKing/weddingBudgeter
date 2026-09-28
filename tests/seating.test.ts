import { describe, expect, it } from "vitest";
import {
  applyMove,
  arrivingAt,
  CANVAS,
  capacityStatus,
  capacityWords,
  clampToCanvas,
  filterHouseholds,
  guestIndex,
  nextFreeSpot,
  nextTableLabels,
  nextTableNumber,
  orderAtTable,
  planHouseholdMove,
  seatingCounts,
  shortTableLabel,
  sortTables,
  suggestLabel,
  surnameFirst,
  surnameKey,
  tableFootprint,
  tablesWithRoom,
  unassignedHouseholds,
  type SeatGuest,
  type SeatTable,
} from "../src/lib/domain/seating";

function table(id: string, capacity: number, extra: Partial<SeatTable> = {}): SeatTable {
  return { id, label: `Table ${id}`, shape: "ROUND", capacity, x: 0, y: 0, sortOrder: 0, ...extra };
}

let n = 0;
function guest(fullName: string, householdName: string, extra: Partial<SeatGuest> = {}): SeatGuest {
  n++;
  return { id: `g${n}`, fullName, householdName, rsvpStatus: "PENDING", isChild: false, tableId: null, seatNumber: null, ...extra };
}

describe("capacity status", () => {
  it("names each state", () => {
    expect(capacityStatus(0, 10)).toEqual({ seated: 0, capacity: 10, open: 10, over: 0, state: "empty" });
    expect(capacityStatus(7, 10)).toMatchObject({ open: 3, over: 0, state: "open" });
    expect(capacityStatus(10, 10)).toMatchObject({ open: 0, over: 0, state: "full" });
    expect(capacityStatus(12, 10)).toMatchObject({ open: 0, over: 2, state: "over" });
  });

  it("has short words for each state", () => {
    expect(capacityWords(capacityStatus(0, 10))).toBe("Empty");
    expect(capacityWords(capacityStatus(7, 10))).toBe("3 open");
    expect(capacityWords(capacityStatus(10, 10))).toBe("Full");
    expect(capacityWords(capacityStatus(11, 10))).toBe("Over by 1");
  });
});

describe("seating counts", () => {
  const tables = [table("1", 2), table("2", 10)];
  const guests = [
    guest("Ava Rivera", "Rivera", { tableId: "1" }),
    guest("Marcus Rivera", "Rivera", { tableId: "1" }),
    guest("Jada Rivera", "Rivera", { tableId: "1" }),
    guest("Nia Brooks", "Brooks", { tableId: "2" }),
    guest("Andre Brooks", "Brooks"),
    guest("Simone Hayes", "Hayes", { rsvpStatus: "DECLINED" }),
    guest("Darius Hayes", "Hayes", { rsvpStatus: "DECLINED", tableId: "2" }),
    guest("Imani Ward", "Ward", { rsvpStatus: null }),
    guest("Malik Ward", "Ward", { rsvpStatus: "ATTENDING" }),
  ];

  it("excludes declined guests from every count", () => {
    const c = seatingCounts(tables, guests);
    expect(c.guests).toBe(7);
    expect(c.seated).toBe(4);
    expect(c.unassigned).toBe(3);
    expect(c.tables).toBe(2);
    expect(c.seats).toBe(12);
    expect(c.declinedSeated).toBe(1);
  });

  it("lists tables over capacity and doesn't count their overflow as open seats", () => {
    const c = seatingCounts(tables, guests);
    expect(c.overCapacity).toEqual([{ id: "1", label: "Table 1", over: 1 }]);
    // Table 2 has 1 of 10 (the declined guest doesn't take a seat).
    expect(c.openSeats).toBe(9);
  });

  it("works with no tables and no guests", () => {
    expect(seatingCounts([], [])).toEqual({
      guests: 0,
      seated: 0,
      unassigned: 0,
      tables: 0,
      seats: 0,
      openSeats: 0,
      overCapacity: [],
      declinedSeated: 0,
    });
  });

  it("offers only tables with a free seat on phones", () => {
    const rooms = tablesWithRoom(tables, guests);
    expect(rooms.map((t) => [t.id, t.open])).toEqual([["2", 9]]);
  });
});

describe("the unassigned pool", () => {
  const guests = [
    guest("Ava Rivera", "The Rivera Household 10"),
    guest("Marcus Rivera", "The Rivera Household 10", { tableId: "t1" }),
    guest("Jada Coleman", "The Coleman Family 2"),
    guest("Terrence Coleman", "The Coleman Family 2"),
    guest("Nia Coleman", "The Coleman Family 2", { rsvpStatus: "DECLINED" }),
    guest("Zoë Price", "The Price Household 3"),
    guest("Everyone Seated", "The Seated Household 1", { tableId: "t1" }),
  ];

  it("groups guests still to seat by household, in natural order", () => {
    const pool = unassignedHouseholds(guests);
    expect(pool.map((h) => h.name)).toEqual(["The Coleman Family 2", "The Price Household 3", "The Rivera Household 10"]);
    expect(pool[0]!.guests.map((g) => g.fullName)).toEqual(["Jada Coleman", "Terrence Coleman"]);
    expect(pool[2]!.seatedElsewhere).toBe(1);
  });

  it("searches household and guest names, ignoring case and accents", () => {
    const pool = unassignedHouseholds(guests);
    expect(filterHouseholds(pool, "coleman").map((h) => h.name)).toEqual(["The Coleman Family 2"]);
    expect(filterHouseholds(pool, "zoe").map((h) => h.name)).toEqual(["The Price Household 3"]);
    expect(filterHouseholds(pool, "AVA rivera").map((h) => h.name)).toEqual(["The Rivera Household 10"]);
    expect(filterHouseholds(pool, "   ")).toHaveLength(3);
    expect(filterHouseholds(pool, "nobody")).toEqual([]);
  });

  it("plans a household move: unseated members who are coming", () => {
    const plan = planHouseholdMove(guests, "The Coleman Family 2");
    expect(plan.move).toEqual([guests[2]!.id, guests[3]!.id]);
    expect(plan.declined).toBe(1);
    expect(plan.alreadySeated).toBe(0);

    const rivera = planHouseholdMove(guests, "The Rivera Household 10");
    expect(rivera.move).toEqual([guests[0]!.id]);
    expect(rivera.alreadySeated).toBe(1);
  });

  it("counts only guests who are new to a table", () => {
    const ids = [guests[0]!.id, guests[1]!.id, guests[4]!.id];
    // Marcus is already at t1 and Nia declined, so only Ava arrives.
    expect(arrivingAt("t1", guests, ids)).toBe(1);
    expect(arrivingAt("t2", guests, ids)).toBe(2);
  });

  it("applies a move and a move back to the pool", () => {
    const ids = [guests[2]!.id, guests[3]!.id];
    const moved = applyMove(guests, ids, "t2");
    expect(moved.filter((g) => g.tableId === "t2").map((g) => g.fullName)).toEqual(["Jada Coleman", "Terrence Coleman"]);
    expect(moved[0]).toBe(guests[0]); // untouched rows keep their identity
    const back = applyMove(moved, [guests[2]!.id], null);
    expect(back.find((g) => g.id === guests[2]!.id)!.tableId).toBeNull();
  });
});

describe("table labels", () => {
  it("continues the numbering", () => {
    expect(nextTableNumber([])).toBe(1);
    expect(nextTableNumber(["Table 1", "Table 2", "Head Table", "table 9", "Table 3b"])).toBe(10);
    expect(nextTableLabels(["Table 1", "Table 3"], 3)).toEqual(["Table 4", "Table 5", "Table 6"]);
    expect(nextTableLabels([], 10)).toHaveLength(10);
    expect(nextTableLabels([], 10).at(-1)).toBe("Table 10");
  });

  it("suggests names for the couple's tables", () => {
    expect(suggestLabel(["Table 1"], "HEAD_TABLE")).toBe("Head Table");
    expect(suggestLabel(["Table 1", "Head Table"], "HEAD_TABLE")).toBe("Table 2");
    expect(suggestLabel([], "SWEETHEART")).toBe("Sweetheart Table");
    expect(suggestLabel(["Table 4"], "ROUND")).toBe("Table 5");
  });

  it("shortens labels for the floor plan", () => {
    expect(shortTableLabel("Table 12")).toBe("12");
    expect(shortTableLabel("Head Table")).toBe("Head");
    expect(shortTableLabel("Garden")).toBe("Garden");
  });
});

describe("ordering", () => {
  it("puts the couple's tables first, then natural order", () => {
    const sorted = sortTables([
      table("a", 10, { label: "Table 10" }),
      table("b", 10, { label: "Table 2" }),
      table("c", 16, { label: "Head Table", shape: "HEAD_TABLE" }),
      table("d", 2, { label: "Us", shape: "SWEETHEART" }),
    ]);
    expect(sorted.map((t) => t.label)).toEqual(["Us", "Head Table", "Table 2", "Table 10"]);
  });

  it("sorts by surname, skipping suffixes", () => {
    expect(surnameKey("Ava Rivera")).toBe("rivera ava");
    expect(surnameKey("Jerome Carver Jr.")).toBe("carver jerome jr.");
    expect(surnameKey("Cher")).toBe("cher");
  });

  it("writes names surname first for the index", () => {
    expect(surnameFirst("Ava Rivera")).toBe("Rivera, Ava");
    expect(surnameFirst("Mary Ann van Dyke")).toBe("van Dyke, Mary Ann");
    expect(surnameFirst("Rosa de la Cruz")).toBe("de la Cruz, Rosa");
    expect(surnameFirst("Van Morrison")).toBe("Morrison, Van");
    expect(surnameFirst("Jerome Carver Jr.")).toBe("Carver, Jerome Jr.");
    expect(surnameFirst("Cher")).toBe("Cher");
  });

  it("orders a table by seat number, then surname", () => {
    const people = [
      guest("Zed Adams", "B House"),
      guest("Amy Adams", "B House"),
      guest("Cal Young", "A House"),
      guest("Seat Two", "Z House", { seatNumber: 2 }),
      guest("Seat One", "Z House", { seatNumber: 1 }),
    ];
    expect(orderAtTable(people).map((g) => g.fullName)).toEqual(["Seat One", "Seat Two", "Amy Adams", "Zed Adams", "Cal Young"]);
  });

  it("builds the alphabetical guest index, without declined guests", () => {
    const t = table("1", 10);
    const index = guestIndex(
      [t],
      [
        guest("Marcus Warren", "W", { tableId: "1" }),
        guest("Ava Brooks", "B"),
        guest("Nia Adeyemi", "A", { rsvpStatus: "DECLINED" }),
      ],
    );
    expect(index.map((r) => [r.guest.fullName, r.table?.label ?? null])).toEqual([
      ["Ava Brooks", null],
      ["Marcus Warren", "Table 1"],
    ]);
  });
});

describe("floor plan", () => {
  it("sizes tables by shape and capacity", () => {
    expect(tableFootprint("ROUND", 10)).toEqual({ w: 110, h: 110 });
    expect(tableFootprint("ROUND", 100).w).toBe(170);
    expect(tableFootprint("SWEETHEART", 2)).toEqual({ w: 104, h: 64 });
    expect(tableFootprint("HEAD_TABLE", 16).w).toBeGreaterThan(tableFootprint("RECTANGLE", 16).w - 1);
  });

  it("clamps a table inside the canvas", () => {
    const size = { w: 110, h: 110 };
    expect(clampToCanvas({ x: -40, y: 5000 }, size)).toEqual({ x: 55, y: CANVAS.height - 55 });
    expect(clampToCanvas({ x: 600.4, y: 300.6 }, size)).toEqual({ x: 600, y: 301 });
    expect(clampToCanvas({ x: Number.NaN, y: 10 }, size)).toEqual({ x: CANVAS.width / 2, y: 55 });
    // Wider than the canvas: centered.
    expect(clampToCanvas({ x: 0, y: 0 }, { w: 5000, h: 10 })).toEqual({ x: CANVAS.width / 2, y: 5 });
  });

  it("finds a free spot for each new table", () => {
    const placed: SeatTable[] = [];
    for (let i = 0; i < 20; i++) {
      const p = nextFreeSpot(placed, "ROUND", 10);
      placed.push(table(String(i), 10, p));
    }
    const size = tableFootprint("ROUND", 10);
    for (const [i, a] of placed.entries()) {
      expect(a.x - size.w / 2).toBeGreaterThanOrEqual(0);
      expect(a.y + size.h / 2).toBeLessThanOrEqual(CANVAS.height);
      for (const b of placed.slice(i + 1)) {
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(size.w);
      }
    }
  });

  it("puts the head table and sweetheart table along the top", () => {
    const head = nextFreeSpot([], "HEAD_TABLE", 16);
    expect(head.x).toBe(CANVAS.width / 2);
    expect(head.y).toBeLessThan(100);
    const sweet = nextFreeSpot([{ ...head, shape: "HEAD_TABLE", capacity: 16 }], "SWEETHEART", 2);
    expect(sweet.y).toBeLessThan(100);
    expect(sweet.x).not.toBe(CANVAS.width / 2);
  });
});
