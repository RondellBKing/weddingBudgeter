"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/require-session";
import { LIST_ORDER } from "@/lib/data/music";
import { prisma } from "@/lib/db";
import { draftProcessional, nextSortOrder, reorderUpdates } from "@/lib/domain/music";
import { fieldErrors, formObject, zOptionalText, zText, type ActionState } from "@/lib/forms";
import { MUSIC_MOMENT_LABEL, valuesOf } from "@/lib/labels";

// Songs by moment, the must-play and do-not-play lists, and the processional order.

const zId = z.string().min(1).max(64);
const zDirection = z.enum(["up", "down"]);
const zMoment = z.enum(valuesOf(MUSIC_MOMENT_LABEL), { error: "Pick a moment" });

function refresh() {
  revalidatePath("/", "layout");
}

// ─── Songs ───────────────────────────────────────────────────────────────────

const songSchema = z.object({
  moment: zMoment,
  title: zText(200),
  artist: zOptionalText(200),
  notes: zOptionalText(1000),
});

/** Add a song to the end of its moment. */
export async function addSong(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = songSchema.safeParse(formObject(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  const v = parsed.data;
  const inMoment = await prisma.songRequest.findMany({ where: { moment: v.moment }, select: { sortOrder: true } });
  await prisma.songRequest.create({ data: { ...v, sortOrder: nextSortOrder(inMoment) } });
  refresh();
  return { ok: true, message: `Added “${v.title}”.` };
}

/** Save a song. Moving it to another moment puts it at the end of that moment. */
export async function saveSong(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = songSchema.safeParse(formObject(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  const v = parsed.data;
  const song = await prisma.songRequest.findUnique({ where: { id: zId.parse(id) }, select: { moment: true } });
  if (!song) return { ok: false, message: "This song was deleted." };
  let sortOrder: number | undefined;
  if (song.moment !== v.moment) {
    const inMoment = await prisma.songRequest.findMany({ where: { moment: v.moment }, select: { sortOrder: true } });
    sortOrder = nextSortOrder(inMoment);
  }
  await prisma.songRequest.update({ where: { id }, data: { ...v, sortOrder } });
  refresh();
  return { ok: true, message: "Saved." };
}

export async function deleteSong(id: string): Promise<void> {
  await requireSession();
  await prisma.songRequest.deleteMany({ where: { id: zId.parse(id) } });
  refresh();
}

/** Swap a song with its neighbor in the same moment. */
export async function moveSong(id: string, direction: "up" | "down"): Promise<void> {
  await requireSession();
  const songId = zId.parse(id);
  const dir = zDirection.parse(direction);
  await prisma.$transaction(async (tx) => {
    const song = await tx.songRequest.findUnique({ where: { id: songId }, select: { moment: true } });
    if (!song) return;
    const rows = await tx.songRequest.findMany({ where: { moment: song.moment }, select: { id: true, sortOrder: true }, orderBy: LIST_ORDER });
    for (const u of reorderUpdates(rows, songId, dir)) {
      await tx.songRequest.update({ where: { id: u.id }, data: { sortOrder: u.sortOrder } });
    }
  });
  refresh();
}

// ─── Processional ────────────────────────────────────────────────────────────

const entrySchema = z.object({ walkers: zText(200), notes: zOptionalText(1000) });

/** Add a line to the end of the processional. */
export async function addProcessionalEntry(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = entrySchema.safeParse(formObject(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  const all = await prisma.processionalEntry.findMany({ select: { sortOrder: true } });
  await prisma.processionalEntry.create({ data: { ...parsed.data, sortOrder: nextSortOrder(all) } });
  refresh();
  return { ok: true, message: "Added to the processional." };
}

export async function saveProcessionalEntry(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = entrySchema.safeParse(formObject(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { count } = await prisma.processionalEntry.updateMany({ where: { id: zId.parse(id) }, data: parsed.data });
  if (count === 0) return { ok: false, message: "This line was deleted." };
  refresh();
  return { ok: true, message: "Saved." };
}

export async function deleteProcessionalEntry(id: string): Promise<void> {
  await requireSession();
  await prisma.processionalEntry.deleteMany({ where: { id: zId.parse(id) } });
  refresh();
}

export async function moveProcessionalEntry(id: string, direction: "up" | "down"): Promise<void> {
  await requireSession();
  const entryId = zId.parse(id);
  const dir = zDirection.parse(direction);
  await prisma.$transaction(async (tx) => {
    const rows = await tx.processionalEntry.findMany({ select: { id: true, sortOrder: true }, orderBy: LIST_ORDER });
    for (const u of reorderUpdates(rows, entryId, dir)) {
      await tx.processionalEntry.update({ where: { id: u.id }, data: { sortOrder: u.sortOrder } });
    }
  });
  refresh();
}

/**
 * First draft of the processional from the wedding party. Only when the list is empty, so a
 * second click (or a second device) never doubles it.
 */
export async function startProcessionalFromParty(): Promise<void> {
  await requireSession();
  try {
    await prisma.$transaction(
      async (tx) => {
        if ((await tx.processionalEntry.count()) > 0) return;
        const members = await tx.weddingPartyMember.findMany({
          select: { id: true, name: true, side: true, role: true, sortOrder: true },
          orderBy: { sortOrder: "asc" },
        });
        const lines = draftProcessional(members);
        await tx.processionalEntry.createMany({ data: lines.map((l, sortOrder) => ({ ...l, sortOrder })) });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (err) {
    // Two drafts at once: the other one won, and the page shows its rows.
    console.error("startProcessionalFromParty failed", err);
  }
  refresh();
}

/** Clear the whole processional (after the two-step confirm), to start again from the party. */
export async function clearProcessional(): Promise<void> {
  await requireSession();
  await prisma.processionalEntry.deleteMany({});
  refresh();
}
