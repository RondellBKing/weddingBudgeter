"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/require-session";
import { fromDbDate, toDbDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { suggestedTrip, tripDatesError } from "@/lib/domain/honeymoon";
import { fieldErrors, zDate, zOptionalText, zText, type ActionState } from "@/lib/forms";

// The honeymoon: the trip dates (on the settings row) and the destination shortlist. Every write
// refreshes the whole app, so the planning timeline picks up the dates.

async function weddingDate() {
  const s = await prisma.weddingSettings.findUnique({ where: { id: 1 }, select: { weddingDate: true } });
  return s ? fromDbDate(s.weddingDate) : null;
}

/** Save the day we leave and the day we're home (both, or neither to clear them). */
export async function saveTripDates(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = z.object({ departOn: zDate, returnOn: zDate }).safeParse({
    departOn: form.get("departOn") ?? "",
    returnOn: form.get("returnOn") ?? "",
  });
  if (!parsed.success) return fieldErrors(parsed.error);
  const wedding = await weddingDate();
  if (!wedding) return { ok: false, message: "The wedding settings are missing. Run the seed first." };
  const { departOn, returnOn } = parsed.data;
  const error = tripDatesError(wedding, departOn, returnOn);
  if (error) return { ok: false, message: error };
  await prisma.weddingSettings.update({
    where: { id: 1 },
    data: { honeymoonDepartOn: toDbDate(departOn), honeymoonReturnOn: toDbDate(returnOn) },
  });
  revalidatePath("/", "layout");
  return { ok: true, message: departOn ? "Dates saved." : "Dates cleared." };
}

/** Take the suggested dates: leave two days after the wedding, eight nights away. */
export async function takeSuggestedDates(): Promise<void> {
  await requireSession();
  const wedding = await weddingDate();
  if (!wedding) return;
  const { departOn, returnOn } = suggestedTrip(wedding);
  await prisma.weddingSettings.update({
    where: { id: 1 },
    data: { honeymoonDepartOn: toDbDate(departOn), honeymoonReturnOn: toDbDate(returnOn) },
  });
  revalidatePath("/", "layout");
}

// ─── The shortlist ─────────────────────────────────────────────────────────────

const ideaSchema = z.object({
  name: zText(120),
  place: zOptionalText(120),
  flightHours: z
    .string()
    .trim()
    .transform((s, ctx) => {
      if (s === "") return null;
      const n = Number(s);
      if (!Number.isInteger(n) || n < 0 || n > 48) {
        ctx.addIssue({ code: "custom", message: "Whole hours, 0 to 48" });
        return z.NEVER;
      }
      return n;
    }),
  flight: zOptionalText(300),
  weather: zOptionalText(300),
  why: zOptionalText(600),
  watchOut: zOptionalText(600),
});

function readIdea(form: FormData) {
  return ideaSchema.safeParse({
    name: form.get("name") ?? "",
    place: form.get("place") ?? "",
    flightHours: form.get("flightHours") ?? "",
    flight: form.get("flight") ?? "",
    weather: form.get("weather") ?? "",
    why: form.get("why") ?? "",
    watchOut: form.get("watchOut") ?? "",
  });
}

export async function addIdea(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = readIdea(form);
  if (!parsed.success) return fieldErrors(parsed.error);
  const last = await prisma.honeymoonIdea.aggregate({ _max: { sortOrder: true } });
  await prisma.honeymoonIdea.create({ data: { ...parsed.data, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
  revalidatePath("/", "layout");
  return { ok: true, message: `${parsed.data.name} is on the shortlist.` };
}

export async function saveIdea(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = readIdea(form);
  if (!parsed.success) return fieldErrors(parsed.error);
  const updated = await prisma.honeymoonIdea.updateMany({ where: { id }, data: parsed.data });
  if (updated.count === 0) return { ok: false, message: "This idea was deleted." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}

export async function setIdeaFavorite(id: string, favorite: boolean): Promise<void> {
  await requireSession();
  await prisma.honeymoonIdea.updateMany({ where: { id }, data: { isFavorite: favorite } });
  revalidatePath("/", "layout");
}

/** Make this the honeymoon (only one can be), or pass null to go back to deciding. */
export async function chooseIdea(id: string | null): Promise<void> {
  await requireSession();
  await prisma.$transaction(async (tx) => {
    await tx.honeymoonIdea.updateMany({ where: { isChosen: true }, data: { isChosen: false } });
    if (id) await tx.honeymoonIdea.updateMany({ where: { id }, data: { isChosen: true, isFavorite: true } });
  });
  revalidatePath("/", "layout");
}

export async function deleteIdea(id: string): Promise<void> {
  await requireSession();
  await prisma.honeymoonIdea.deleteMany({ where: { id } });
  revalidatePath("/", "layout");
}
