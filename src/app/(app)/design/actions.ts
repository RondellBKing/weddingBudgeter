"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth/require-session";
import { todayIn, toDbDate, WEDDING_TZ } from "@/lib/dates";
import { prisma } from "@/lib/db";
import {
  decorDateErrors,
  designHref,
  matchesBoard,
  moveInList,
  parseBoardFilters,
  parseHex,
  parseHttpUrl,
  safeDesignBack,
  type DecorStep,
} from "@/lib/domain/design";
import {
  fieldErrors,
  formObject,
  zCheckbox,
  zDate,
  zInt,
  zOptionalId,
  zOptionalText,
  zText,
  type ActionState,
} from "@/lib/forms";
import { DECOR_SOURCE_LABEL, DESIGN_AREA_LABEL, valuesOf } from "@/lib/labels";

// Vision & Décor: the inspiration board, the palette, and décor and rentals. Money never lives
// here (décor links to a budget item), and décor status is never stored: it comes from the dates.

export type DesignFormState = ActionState & { values?: Record<string, string>; nonce?: string };

const AREAS = valuesOf(DESIGN_AREA_LABEL);
const zId = z.string().min(1).max(64);
const zArea = z.enum(AREAS, { error: "Pick an area" });

function refresh() {
  revalidatePath("/", "layout");
}

/** Today on the wedding's calendar (never the server's clock). */
async function weddingToday() {
  const s = await prisma.weddingSettings.findUnique({ where: { id: 1 }, select: { timezone: true } });
  return todayIn(s?.timezone ?? WEDDING_TZ);
}

/** Optional http(s) link. "pinterest.com/pin/1" is fine; "javascript:" and the like are not. */
const zLink = z
  .string()
  .max(2048, "That link is too long")
  .optional()
  .transform((s, ctx) => {
    if (s === undefined || s.trim() === "") return null;
    const url = parseHttpUrl(s);
    if (!url) {
      ctx.addIssue({ code: "custom", message: "Paste a web link that starts with http:// or https://" });
      return z.NEVER;
    }
    return url;
  });

// ─── Inspiration board ───────────────────────────────────────────────────────────

const inspirationSchema = z.object({
  area: zArea,
  title: zOptionalText(120),
  imageUrl: zLink,
  sourceUrl: zLink,
  notes: zOptionalText(1000),
  isFavorite: zCheckbox,
});

/** Where to land after a save: back where they came from, if the item shows there. */
function boardBack(rawBack: string | undefined, item: { area: (typeof AREAS)[number]; isFavorite: boolean }): string {
  const back = safeDesignBack(rawBack, "/design");
  const query = back.split("?")[1] ?? "";
  const params = Object.fromEntries(new URLSearchParams(query));
  if (params.view && params.view !== "board") return back;
  return matchesBoard(item, parseBoardFilters(params, AREAS)) ? back : designHref("board");
}

/** Create (id null) or update an inspiration item, then return to the board. */
export async function saveInspiration(id: string | null, _prev: DesignFormState, form: FormData): Promise<DesignFormState> {
  await requireSession();
  const raw = formObject(form);
  const parsed = inspirationSchema.safeParse(raw);
  if (!parsed.success) return { ...fieldErrors(parsed.error), values: raw };
  const v = parsed.data;
  if (!v.imageUrl && !v.sourceUrl && !v.title) {
    return {
      ok: false,
      message: "Paste an image link or a source link, or give it a title.",
      errors: { imageUrl: "Paste an image link, a source link, or both." },
      values: raw,
    };
  }

  const data = { area: v.area, title: v.title, imageUrl: v.imageUrl, sourceUrl: v.sourceUrl, notes: v.notes, isFavorite: v.isFavorite };
  if (id) {
    const updated = await prisma.inspirationItem.updateMany({ where: { id: zId.parse(id) }, data });
    if (updated.count === 0) return { ok: false, message: "This item has been deleted.", values: raw };
  } else {
    const last = await prisma.inspirationItem.aggregate({ where: { area: v.area }, _max: { sortOrder: true } });
    await prisma.inspirationItem.create({ data: { ...data, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
  }
  refresh();
  redirect(boardBack(raw.back, v));
}

/** The star on a board card. */
export async function setFavorite(id: string, isFavorite: boolean): Promise<void> {
  await requireSession();
  await prisma.inspirationItem.updateMany({ where: { id: zId.parse(id) }, data: { isFavorite: isFavorite === true } });
  refresh();
}

/** Delete after the two-step confirm, then go back to the board as it was. */
export async function deleteInspiration(id: string, back: string): Promise<void> {
  await requireSession();
  await prisma.inspirationItem.deleteMany({ where: { id: zId.parse(id) } });
  refresh();
  redirect(safeDesignBack(back, designHref("board")));
}

// ─── Palette ─────────────────────────────────────────────────────────────────────

const paletteSchema = z.object({
  name: zText(60),
  hex: z
    .string()
    .optional()
    .transform((s, ctx) => {
      const hex = parseHex(s);
      if (!hex) {
        ctx.addIssue({ code: "custom", message: "Use a color code like #D9A3A0" });
        return z.NEVER;
      }
      return hex;
    }),
  usage: zOptionalText(200),
});

/** Add a color (stays on the palette with a fresh form) or update one (returns to the palette). */
export async function savePaletteColor(id: string | null, _prev: DesignFormState, form: FormData): Promise<DesignFormState> {
  await requireSession();
  const raw = formObject(form);
  const parsed = paletteSchema.safeParse(raw);
  if (!parsed.success) return { ...fieldErrors(parsed.error), values: raw };
  const v = parsed.data;

  if (id) {
    const updated = await prisma.paletteColor.updateMany({ where: { id: zId.parse(id) }, data: v });
    if (updated.count === 0) return { ok: false, message: "This color has been deleted.", values: raw };
    refresh();
    redirect(designHref("palette"));
  }

  const last = await prisma.paletteColor.aggregate({ _max: { sortOrder: true } });
  await prisma.paletteColor.create({ data: { ...v, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
  refresh();
  return { ok: true, message: `${v.name} is on the palette.`, nonce: randomUUID() };
}

/** Move a color one place earlier or later. Renumbers the whole palette so ties can't stick. */
export async function movePaletteColor(id: string, direction: "up" | "down"): Promise<void> {
  await requireSession();
  const colorId = zId.parse(id);
  const dir = z.enum(["up", "down"]).parse(direction);
  await prisma.$transaction(async (tx) => {
    const rows = await tx.paletteColor.findMany({
      select: { id: true, sortOrder: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    const order = moveInList(
      rows.map((r) => r.id),
      colorId,
      dir,
    );
    const current = new Map(rows.map((r) => [r.id, r.sortOrder]));
    for (const [i, rowId] of order.entries()) {
      if (current.get(rowId) !== i) await tx.paletteColor.update({ where: { id: rowId }, data: { sortOrder: i } });
    }
  });
  refresh();
}

export async function deletePaletteColor(id: string): Promise<void> {
  await requireSession();
  await prisma.paletteColor.deleteMany({ where: { id: zId.parse(id) } });
  refresh();
  redirect(designHref("palette"));
}

// ─── Décor and rentals ───────────────────────────────────────────────────────────

const decorSchema = z.object({
  name: zText(120),
  area: zArea,
  quantity: zInt(1, 10_000),
  source: z.enum(valuesOf(DECOR_SOURCE_LABEL), { error: "Pick where it comes from" }),
  vendorId: zOptionalId,
  budgetItemId: zOptionalId,
  orderedOn: zDate,
  receivedOn: zDate,
  returnBy: zDate,
  returnedOn: zDate,
  notes: zOptionalText(1000),
});

/** Create (id null) or update a piece of décor, then return to the list. */
export async function saveDecor(id: string | null, _prev: DesignFormState, form: FormData): Promise<DesignFormState> {
  await requireSession();
  const raw = formObject(form);
  const parsed = decorSchema.safeParse(raw);
  if (!parsed.success) return { ...fieldErrors(parsed.error), values: raw };
  const v = parsed.data;

  const [vendor, item] = await Promise.all([
    v.vendorId ? prisma.vendor.findUnique({ where: { id: v.vendorId }, select: { id: true } }) : null,
    v.budgetItemId ? prisma.budgetItem.findUnique({ where: { id: v.budgetItemId }, select: { id: true } }) : null,
  ]);
  const errors: Record<string, string> = { ...decorDateErrors(v) };
  if (v.vendorId && !vendor) errors.vendorId = "That vendor no longer exists. Pick another.";
  if (v.budgetItemId && !item) errors.budgetItemId = "That budget item no longer exists. Pick another.";
  if (Object.keys(errors).length > 0) return { ok: false, message: "Check the highlighted fields.", errors, values: raw };

  const data = {
    name: v.name,
    area: v.area,
    quantity: v.quantity,
    source: v.source,
    vendorId: v.vendorId,
    budgetItemId: v.budgetItemId,
    orderedOn: toDbDate(v.orderedOn),
    receivedOn: toDbDate(v.receivedOn),
    returnBy: toDbDate(v.returnBy),
    returnedOn: toDbDate(v.returnedOn),
    notes: v.notes,
  };
  if (id) {
    const updated = await prisma.decorItem.updateMany({ where: { id: zId.parse(id) }, data });
    if (updated.count === 0) return { ok: false, message: "This item has been deleted.", values: raw };
  } else {
    const last = await prisma.decorItem.aggregate({ where: { area: v.area }, _max: { sortOrder: true } });
    await prisma.decorItem.create({ data: { ...data, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
  }
  refresh();
  redirect(safeDesignBack(raw.back, designHref("decor")));
}

/**
 * "Mark ordered / received / returned today". Each one only fills an empty date, and only when
 * the earlier dates allow it, so a double click or a stale page can't rewrite history.
 */
export async function markDecor(id: string, step: DecorStep): Promise<void> {
  await requireSession();
  const itemId = zId.parse(id);
  const s = z.enum(["ordered", "received", "returned"]).parse(step);
  const today = toDbDate(await weddingToday());
  if (s === "ordered") {
    await prisma.decorItem.updateMany({ where: { id: itemId, orderedOn: null, receivedOn: null }, data: { orderedOn: today } });
  } else if (s === "received") {
    await prisma.decorItem.updateMany({
      where: { id: itemId, receivedOn: null, OR: [{ orderedOn: null }, { orderedOn: { lte: today } }] },
      data: { receivedOn: today },
    });
  } else {
    await prisma.decorItem.updateMany({
      where: { id: itemId, returnedOn: null, receivedOn: { lte: today } },
      data: { returnedOn: today },
    });
  }
  refresh();
}

export async function deleteDecor(id: string): Promise<void> {
  await requireSession();
  await prisma.decorItem.deleteMany({ where: { id: zId.parse(id) } });
  refresh();
  redirect(designHref("decor"));
}
