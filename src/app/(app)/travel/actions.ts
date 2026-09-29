"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth/require-session";
import { compareDates, todayIn, toDbDate, WEDDING_TZ } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { isLikelyPhone, normalizeWebUrl } from "@/lib/domain/vendor-contact";
import {
  fieldErrors,
  formObject,
  zDate,
  zMoney,
  zOptionalId,
  zOptionalText,
  zRequiredDate,
  zText,
  type ActionState,
} from "@/lib/forms";

// Hotel blocks, shuttle runs and welcome-bag items. Every write refreshes the whole app, so the
// dashboard and calendar stay current.

/** Failed saves hand back what was typed; successful adds carry a nonce so the form can clear. */
export type TravelFormState = ActionState & { values?: Record<string, string>; nonce?: number };

const zId = z.string().trim().min(1).max(64);

function refresh() {
  revalidatePath("/", "layout");
}

/** Today on the wedding's calendar (never the server's clock). */
async function weddingToday() {
  const s = await prisma.weddingSettings.findUnique({ where: { id: 1 }, select: { timezone: true } });
  return todayIn(s?.timezone ?? WEDDING_TZ);
}

/** Optional text that must pass a check; the check may also normalize it. */
function zChecked(max: number, check: (s: string) => string | null, message: string) {
  return zOptionalText(max).transform((s, ctx) => {
    if (s === null) return null;
    const out = check(s);
    if (out === null) {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return out;
  });
}

/** Optional whole number from min to max ("" → null). */
function zCount(min: number, max: number) {
  return z
    .string()
    .optional()
    .transform((s, ctx) => {
      const t = (s ?? "").trim();
      if (t === "") return null;
      if (!/^\d{1,5}$/.test(t) || Number(t) < min || Number(t) > max) {
        ctx.addIssue({ code: "custom", message: `A whole number from ${min} to ${max}` });
        return z.NEVER;
      }
      return Number(t);
    });
}

const zClock = z.string().transform((s, ctx) => {
  const t = s.trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) {
    ctx.addIssue({ code: "custom", message: "Pick a time" });
    return z.NEVER;
  }
  return t;
});

async function vendorExists(id: string | null) {
  if (!id) return true;
  return (await prisma.vendor.count({ where: { id } })) > 0;
}

function fail(values: Record<string, string>, errors: Record<string, string>): TravelFormState {
  return { ok: false, message: "Check the highlighted fields.", errors, values };
}

// ─── Hotel blocks ─────────────────────────────────────────────────────────────

const hotelSchema = z.object({
  name: zText(160),
  address: zOptionalText(300),
  phone: zChecked(40, (s) => (isLikelyPhone(s) ? s : null), "Enter a phone number like (201) 555-0142"),
  bookingUrl: zChecked(1000, normalizeWebUrl, "Paste the booking link, like hotel.com/our-group"),
  groupCode: zOptionalText(80),
  roomsHeld: zCount(0, 1000),
  nightlyRate: zMoney,
  cutoffDate: zDate,
  checkIn: zDate,
  checkOut: zDate,
  vendorId: zOptionalId,
  notes: zOptionalText(4000),
});

/** Create (id null) or update a hotel block, then go back to Hotels & Travel. */
export async function saveHotel(id: string | null, _prev: TravelFormState, form: FormData): Promise<TravelFormState> {
  await requireSession();
  const values = formObject(form);
  const parsed = hotelSchema.safeParse(values);
  if (!parsed.success) return { ...fieldErrors(parsed.error), values };
  const v = parsed.data;

  const errors: Record<string, string> = {};
  if (v.checkIn && v.checkOut && compareDates(v.checkOut, v.checkIn) <= 0) errors.checkOut = "Check-out comes after check-in.";
  if (!(await vendorExists(v.vendorId))) errors.vendorId = "That vendor no longer exists. Pick another.";
  if (Object.keys(errors).length > 0) return fail(values, errors);

  const data = {
    name: v.name,
    address: v.address,
    phone: v.phone,
    bookingUrl: v.bookingUrl,
    groupCode: v.groupCode,
    roomsHeld: v.roomsHeld,
    nightlyRateCents: v.nightlyRate,
    cutoffDate: toDbDate(v.cutoffDate),
    checkIn: toDbDate(v.checkIn),
    checkOut: toDbDate(v.checkOut),
    vendorId: v.vendorId,
    notes: v.notes,
  };
  if (id) {
    const updated = await prisma.hotelBlock.updateMany({ where: { id }, data });
    if (updated.count === 0) return { ok: false, message: "This hotel block has been deleted.", values };
  } else {
    await prisma.hotelBlock.create({ data });
  }
  refresh();
  redirect("/travel#hotels");
}

export async function deleteHotel(id: string): Promise<void> {
  await requireSession();
  await prisma.hotelBlock.deleteMany({ where: { id: zId.parse(id) } });
  refresh();
  redirect("/travel#hotels");
}

// ─── Shuttles ─────────────────────────────────────────────────────────────────

const shuttleSchema = z.object({
  date: zRequiredDate,
  departTime: zClock,
  fromPlace: zText(160),
  toPlace: zText(160),
  seats: zCount(1, 500),
  vendorId: zOptionalId,
  notes: zOptionalText(2000),
});

/** Add (id null) or update a shuttle run. Stays on the page. */
export async function saveShuttle(id: string | null, _prev: TravelFormState, form: FormData): Promise<TravelFormState> {
  await requireSession();
  const values = formObject(form);
  const parsed = shuttleSchema.safeParse(values);
  if (!parsed.success) return { ...fieldErrors(parsed.error), values };
  const v = parsed.data;
  if (!(await vendorExists(v.vendorId))) return fail(values, { vendorId: "That vendor no longer exists. Pick another." });

  const data = {
    date: toDbDate(v.date),
    departTime: v.departTime,
    fromPlace: v.fromPlace,
    toPlace: v.toPlace,
    seats: v.seats,
    vendorId: v.vendorId,
    notes: v.notes,
  };
  if (id) {
    const updated = await prisma.shuttleRun.updateMany({ where: { id }, data });
    if (updated.count === 0) return { ok: false, message: "This shuttle run has been deleted.", values };
  } else {
    await prisma.shuttleRun.create({ data });
  }
  refresh();
  return { ok: true, message: id ? "Saved." : "Shuttle run added.", nonce: Date.now() };
}

export async function deleteShuttle(id: string): Promise<void> {
  await requireSession();
  await prisma.shuttleRun.deleteMany({ where: { id: zId.parse(id) } });
  refresh();
}

// ─── Welcome bags ─────────────────────────────────────────────────────────────

const bagItemSchema = z.object({
  name: zText(160),
  perBag: z.coerce.number({ error: "A whole number from 1 to 50" }).int("A whole number from 1 to 50").min(1, "At least 1").max(50, "At most 50"),
  orderedOn: zDate,
  receivedOn: zDate,
  notes: zOptionalText(2000),
});

/** Add (id null) or update a welcome-bag item. Stays on the page. */
export async function saveBagItem(id: string | null, _prev: TravelFormState, form: FormData): Promise<TravelFormState> {
  await requireSession();
  const values = formObject(form);
  const parsed = bagItemSchema.safeParse(values);
  if (!parsed.success) return { ...fieldErrors(parsed.error), values };
  const v = parsed.data;
  const today = await weddingToday();

  const errors: Record<string, string> = {};
  if (v.orderedOn && compareDates(v.orderedOn, today) > 0) errors.orderedOn = "That's in the future. Add it once it's ordered.";
  if (v.receivedOn && compareDates(v.receivedOn, today) > 0) errors.receivedOn = "That's in the future. Add it once it arrives.";
  if (v.orderedOn && v.receivedOn && compareDates(v.receivedOn, v.orderedOn) < 0) errors.receivedOn = "It can't arrive before it was ordered.";
  if (Object.keys(errors).length > 0) return fail(values, errors);

  const data = { name: v.name, perBag: v.perBag, orderedOn: toDbDate(v.orderedOn), receivedOn: toDbDate(v.receivedOn), notes: v.notes };
  if (id) {
    const updated = await prisma.welcomeBagItem.updateMany({ where: { id }, data });
    if (updated.count === 0) return { ok: false, message: "This item has been deleted.", values };
  } else {
    const last = await prisma.welcomeBagItem.aggregate({ _max: { sortOrder: true } });
    await prisma.welcomeBagItem.create({ data: { ...data, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
  }
  refresh();
  return { ok: true, message: id ? "Saved." : `Added ${v.name}.`, nonce: Date.now() };
}

/** One tap: ordered today, or received today. Never overwrites a date already set. */
export async function markBagItem(id: string, step: "ordered" | "received"): Promise<void> {
  await requireSession();
  const itemId = zId.parse(id);
  const today = toDbDate(await weddingToday());
  if (step === "ordered") {
    await prisma.welcomeBagItem.updateMany({ where: { id: itemId, orderedOn: null }, data: { orderedOn: today } });
  } else {
    await prisma.welcomeBagItem.updateMany({ where: { id: itemId, receivedOn: null }, data: { receivedOn: today } });
  }
  refresh();
}

export async function deleteBagItem(id: string): Promise<void> {
  await requireSession();
  await prisma.welcomeBagItem.deleteMany({ where: { id: zId.parse(id) } });
  refresh();
}
