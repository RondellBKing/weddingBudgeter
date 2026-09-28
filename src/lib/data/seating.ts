import "server-only";
import { requireSession } from "../auth/require-session";
import { prisma } from "../db";
import { sortTables, type SeatGuest, type SeatTable } from "../domain/seating";

// Loaders for the seating chart and its printout: plain, serializable rows. Whether a guest is
// seated comes from their SeatAssignment row; every count is worked out from these lists.

export type SeatingData = { tables: SeatTable[]; guests: SeatGuest[] };
export type PrintGuest = SeatGuest & { mealChoice: string | null; dietaryNotes: string | null };

async function query() {
  return Promise.all([
    prisma.seatingTable.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.guest.findMany({
      orderBy: [{ householdName: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        fullName: true,
        householdName: true,
        rsvpStatus: true,
        isChild: true,
        mealChoice: true,
        dietaryNotes: true,
        seat: { select: { tableId: true, seatNumber: true } },
      },
    }),
  ]);
}

type Rows = Awaited<ReturnType<typeof query>>;

function toTables(rows: Rows[0]): SeatTable[] {
  return sortTables(
    rows.map((t) => ({ id: t.id, label: t.label, shape: t.shape, capacity: t.capacity, x: t.x, y: t.y, sortOrder: t.sortOrder })),
  );
}

function toGuest(g: Rows[1][number]): SeatGuest {
  return {
    id: g.id,
    fullName: g.fullName,
    householdName: g.householdName,
    rsvpStatus: g.rsvpStatus,
    isChild: g.isChild,
    tableId: g.seat?.tableId ?? null,
    seatNumber: g.seat?.seatNumber ?? null,
  };
}

export async function loadSeating(): Promise<SeatingData> {
  await requireSession();
  const [tables, guests] = await query();
  return { tables: toTables(tables), guests: guests.map(toGuest) };
}

/** Same rows plus what the caterer needs on the printout. */
export async function loadSeatingPrint(): Promise<{ tables: SeatTable[]; guests: PrintGuest[] }> {
  await requireSession();
  const [tables, guests] = await query();
  return {
    tables: toTables(tables),
    guests: guests.map((g) => ({ ...toGuest(g), mealChoice: g.mealChoice, dietaryNotes: g.dietaryNotes })),
  };
}
