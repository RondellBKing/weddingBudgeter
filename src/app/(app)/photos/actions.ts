"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/require-session";
import { LIST_ORDER } from "@/lib/data/music";
import { prisma } from "@/lib/db";
import { nextSortOrder, reorderUpdates } from "@/lib/domain/music";
import { templateRows } from "@/lib/domain/photos";
import { fieldErrors, formObject, zCheckbox, zOptionalText, zText, type ActionState } from "@/lib/forms";
import { SHOT_MOMENT_LABEL, valuesOf } from "@/lib/labels";

// The photographer's shot list: add, edit, reorder, must-haves, and the standard list.

const zId = z.string().min(1).max(64);

function refresh() {
  revalidatePath("/", "layout");
}

const shotSchema = z.object({
  moment: z.enum(valuesOf(SHOT_MOMENT_LABEL), { error: "Pick a moment" }),
  description: zText(300),
  people: zOptionalText(500),
  isMustHave: zCheckbox,
});

/** Add a shot to the end of its moment. */
export async function addShot(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = shotSchema.safeParse(formObject(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  const v = parsed.data;
  const inMoment = await prisma.shotListItem.findMany({ where: { moment: v.moment }, select: { sortOrder: true } });
  await prisma.shotListItem.create({ data: { ...v, sortOrder: nextSortOrder(inMoment) } });
  refresh();
  return { ok: true, message: "Shot added." };
}

/** Save a shot. Moving it to another moment puts it at the end of that moment. */
export async function saveShot(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = shotSchema.safeParse(formObject(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  const v = parsed.data;
  const shot = await prisma.shotListItem.findUnique({ where: { id: zId.parse(id) }, select: { moment: true } });
  if (!shot) return { ok: false, message: "This shot was deleted." };
  let sortOrder: number | undefined;
  if (shot.moment !== v.moment) {
    const inMoment = await prisma.shotListItem.findMany({ where: { moment: v.moment }, select: { sortOrder: true } });
    sortOrder = nextSortOrder(inMoment);
  }
  await prisma.shotListItem.update({ where: { id }, data: { ...v, sortOrder } });
  refresh();
  return { ok: true, message: "Saved." };
}

export async function setMustHave(id: string, isMustHave: boolean): Promise<void> {
  await requireSession();
  await prisma.shotListItem.updateMany({ where: { id: zId.parse(id) }, data: { isMustHave: z.boolean().parse(isMustHave) } });
  refresh();
}

export async function deleteShot(id: string): Promise<void> {
  await requireSession();
  await prisma.shotListItem.deleteMany({ where: { id: zId.parse(id) } });
  refresh();
}

/** Swap a shot with its neighbor in the same moment. */
export async function moveShot(id: string, direction: "up" | "down"): Promise<void> {
  await requireSession();
  const shotId = zId.parse(id);
  const dir = z.enum(["up", "down"]).parse(direction);
  await prisma.$transaction(async (tx) => {
    const shot = await tx.shotListItem.findUnique({ where: { id: shotId }, select: { moment: true } });
    if (!shot) return;
    const rows = await tx.shotListItem.findMany({ where: { moment: shot.moment }, select: { id: true, sortOrder: true }, orderBy: LIST_ORDER });
    for (const u of reorderUpdates(rows, shotId, dir)) {
      await tx.shotListItem.update({ where: { id: u.id }, data: { sortOrder: u.sortOrder } });
    }
  });
  refresh();
}

/** Load the standard shot list. Only when the list is empty, so it never doubles up. */
export async function startFromStandardList(): Promise<void> {
  await requireSession();
  try {
    await prisma.$transaction(
      async (tx) => {
        if ((await tx.shotListItem.count()) > 0) return;
        await tx.shotListItem.createMany({ data: templateRows() });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (err) {
    // Two clicks at once: the other one won, and the page shows its rows.
    console.error("startFromStandardList failed", err);
  }
  refresh();
}
