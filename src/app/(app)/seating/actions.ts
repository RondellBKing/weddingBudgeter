"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/require-session";
import { prisma } from "@/lib/db";
import {
  clampToCanvas,
  MAX_CAPACITY,
  nextFreeSpot,
  nextTableLabels,
  tableFootprint,
  type TableShape,
} from "@/lib/domain/seating";
import { fieldErrors, formObject, zInt, zText, type ActionState } from "@/lib/forms";
import { TABLE_SHAPE_LABEL, valuesOf } from "@/lib/labels";

// Seating chart actions. Seat assignments are the only thing a move writes: which guests sit at
// which table. Counts and capacity warnings are always worked out from those rows.

const zId = z.string().trim().min(1).max(64);

function refresh() {
  // The board, the floor plan and the printout.
  revalidatePath("/seating", "layout");
}

// ─── Moving guests ─────────────────────────────────────────────────────────────

const moveSchema = z.object({
  guestIds: z.array(zId).min(1).max(2000),
  tableId: zId.nullable(),
});

/**
 * Seat guests at a table, or send them back to the unassigned list (tableId null). One
 * transaction: their old seats are removed, then new ones created. Guests already at the target
 * table keep their seat.
 */
export async function moveGuests(guestIds: string[], tableId: string | null): Promise<ActionState> {
  await requireSession();
  const parsed = moveSchema.safeParse({ guestIds, tableId });
  if (!parsed.success) return { ok: false, message: "That move didn't go through. Reload the page and try again." };
  const ids = [...new Set(parsed.data.guestIds)];
  const target = parsed.data.tableId;

  let result: ActionState;
  try {
    result = await prisma.$transaction(async (tx): Promise<ActionState> => {
      if (target) {
        const table = await tx.seatingTable.findUnique({ where: { id: target }, select: { id: true } });
        if (!table) return { ok: false, message: "That table was deleted. The chart has been refreshed." };
      }
      const guests = await tx.guest.findMany({
        where: { id: { in: ids } },
        select: { id: true, rsvpStatus: true, seat: { select: { tableId: true } } },
      });
      if (guests.length !== ids.length) {
        return { ok: false, message: "Some of those guests are no longer on the list. The chart has been refreshed." };
      }
      if (target && guests.some((g) => g.rsvpStatus === "DECLINED")) {
        return { ok: false, message: "Guests who declined can't be seated." };
      }
      const moving = guests.filter((g) => (g.seat?.tableId ?? null) !== target).map((g) => g.id);
      if (moving.length === 0) return { ok: true, message: "" };
      await tx.seatAssignment.deleteMany({ where: { guestId: { in: moving } } });
      if (target) {
        await tx.seatAssignment.createMany({ data: moving.map((guestId) => ({ guestId, tableId: target })) });
      }
      return { ok: true, message: "" };
    });
  } catch (err) {
    console.error("moveGuests failed", err);
    result = { ok: false, message: "That move couldn't be saved, so nothing changed. Try again." };
  }
  refresh();
  return result;
}

// ─── Tables ──────────────────────────────────────────────────────────────────

const tableSchema = z.object({
  label: zText(40),
  shape: z.enum(valuesOf(TABLE_SHAPE_LABEL)),
  capacity: zInt(1, MAX_CAPACITY),
});

async function labelTaken(label: string, exceptId?: string): Promise<boolean> {
  const clash = await prisma.seatingTable.findFirst({
    where: { label: { equals: label, mode: "insensitive" }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
  return clash !== null;
}

export async function createTable(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = tableSchema.safeParse(formObject(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  const v = parsed.data;
  if (await labelTaken(v.label)) {
    return { ok: false, message: "Check the highlighted fields.", errors: { label: `There's already a table called ${v.label}.` } };
  }
  const existing = await prisma.seatingTable.findMany({ select: { x: true, y: true, shape: true, capacity: true, sortOrder: true } });
  const spot = nextFreeSpot(existing, v.shape, v.capacity);
  await prisma.seatingTable.create({
    data: {
      label: v.label,
      shape: v.shape,
      capacity: v.capacity,
      x: spot.x,
      y: spot.y,
      sortOrder: existing.reduce((m, t) => Math.max(m, t.sortOrder), 0) + 1,
    },
  });
  refresh();
  return { ok: true, message: `Added ${v.label}.` };
}

const batchSchema = z.object({
  count: zInt(1, 30),
  capacity: zInt(1, MAX_CAPACITY),
});

/** "Add 10 round tables of 10": numbered tables that continue the existing numbering. */
export async function addNumberedTables(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = batchSchema.safeParse(formObject(form));
  if (!parsed.success) return { ok: false, message: "Choose how many tables, and how many seats at each." };
  const { count, capacity } = parsed.data;
  const shape: TableShape = "ROUND";

  const labels = await prisma.$transaction(async (tx) => {
    const existing = await tx.seatingTable.findMany({ select: { label: true, x: true, y: true, shape: true, capacity: true, sortOrder: true } });
    const placed = [...existing];
    let sortOrder = existing.reduce((m, t) => Math.max(m, t.sortOrder), 0);
    const names = nextTableLabels(
      existing.map((t) => t.label),
      count,
    );
    for (const label of names) {
      const spot = nextFreeSpot(placed, shape, capacity);
      sortOrder++;
      await tx.seatingTable.create({ data: { label, shape, capacity, x: spot.x, y: spot.y, sortOrder } });
      placed.push({ label, x: spot.x, y: spot.y, shape, capacity, sortOrder });
    }
    return names;
  });
  refresh();
  return {
    ok: true,
    message: labels.length === 1 ? `Added ${labels[0]}.` : `Added ${labels[0]} through ${labels.at(-1)}.`,
  };
}

const updateSchema = tableSchema.extend({ id: zId });

export async function updateTable(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = updateSchema.safeParse(formObject(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  const v = parsed.data;
  const table = await prisma.seatingTable.findUnique({ where: { id: v.id } });
  if (!table) {
    refresh();
    return { ok: false, message: "That table was deleted. The chart has been refreshed." };
  }
  if (await labelTaken(v.label, v.id)) {
    return { ok: false, message: "Check the highlighted fields.", errors: { label: `There's already a table called ${v.label}.` } };
  }
  // A new shape or size can push the table past the edge of the floor plan.
  const spot = clampToCanvas({ x: table.x, y: table.y }, tableFootprint(v.shape, v.capacity));
  await prisma.seatingTable.update({
    where: { id: v.id },
    data: { label: v.label, shape: v.shape, capacity: v.capacity, x: spot.x, y: spot.y },
  });
  refresh();
  return { ok: true, message: `Saved ${v.label}.` };
}

/** Deletes a table. Its guests go back to the unassigned list (their seats cascade away). */
export async function deleteTable(id: string): Promise<void> {
  await requireSession();
  const parsed = zId.safeParse(id);
  if (parsed.success) await prisma.seatingTable.deleteMany({ where: { id: parsed.data } });
  refresh();
}

const moveTableSchema = z.object({
  id: zId,
  x: z.number().finite(),
  y: z.number().finite(),
});

/** Saves a table's spot on the floor plan, kept inside the canvas. */
export async function moveTable(id: string, x: number, y: number): Promise<ActionState> {
  await requireSession();
  const parsed = moveTableSchema.safeParse({ id, x, y });
  if (!parsed.success) return { ok: false, message: "That spot is off the floor plan." };
  const table = await prisma.seatingTable.findUnique({ where: { id: parsed.data.id }, select: { shape: true, capacity: true } });
  if (!table) {
    refresh();
    return { ok: false, message: "That table was deleted. The floor plan has been refreshed." };
  }
  const spot = clampToCanvas(parsed.data, tableFootprint(table.shape, table.capacity));
  await prisma.seatingTable.update({ where: { id: parsed.data.id }, data: { x: spot.x, y: spot.y } });
  refresh();
  return { ok: true, message: "" };
}
