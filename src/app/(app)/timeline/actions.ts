"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth/require-session";
import { addDays, formatClockTime, fromDbDate, toDbDate, type CalendarDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import {
  buildRehearsalTemplate,
  buildWeddingDayTemplate,
  isClockTime,
  rehearsalTemplateError,
  timelineHref,
  timeRangeError,
  vendorForCategory,
  viewKeyFor,
  weddingTemplateError,
  type TemplateItem,
} from "@/lib/domain/timeline";
import {
  fieldErrors,
  formObject,
  zCheckbox,
  zOptionalId,
  zOptionalText,
  zRequiredDate,
  zText,
  zTime,
  type ActionState,
} from "@/lib/forms";

// The run of show: quick add, the full form, delete, the two templates and the rain plan.
// Vendor arrivals and the venue opening are derived on the page, never written here.

export type TimelineFormState = ActionState & { values?: Record<string, string> };

const zId = z.string().min(1).max(64);
const zStart = zTime.pipe(z.string({ error: "Pick a start time" }));

function refresh() {
  revalidatePath("/", "layout");
}

async function settings() {
  const s = await prisma.weddingSettings.findUnique({
    where: { id: 1 },
    select: { weddingDate: true, venueAccessTime: true, venueName: true, ceremonyTime: true },
  });
  if (!s) throw new Error("The database has no wedding settings yet. Run `npm run seed`.");
  return { ...s, weddingDate: fromDbDate(s.weddingDate) };
}

/** A short note on the end field, and the full explanation for the row under the times. */
function checkRange(start: string, end: string | null, date: CalendarDate): Record<string, string> {
  const error = timeRangeError(start, end, date);
  return error ? { endTime: "Needs to be after the start", range: error } : {};
}

const quickSchema = z.object({
  date: zRequiredDate,
  title: zText(160),
  startTime: zStart,
  endTime: zTime,
});

/** The one-line add on a day's view: what, start, end. The rest can be filled in later. */
export async function quickAddTimelineItem(_prev: TimelineFormState, form: FormData): Promise<TimelineFormState> {
  await requireSession();
  const raw = formObject(form);
  const parsed = quickSchema.safeParse(raw);
  if (!parsed.success) return { ...fieldErrors(parsed.error), values: raw };
  const v = parsed.data;
  // The compact form has narrow columns, so the full explanation goes in the status line.
  const rangeError = timeRangeError(v.startTime, v.endTime, v.date);
  if (rangeError) return { ok: false, message: rangeError, errors: { endTime: "Needs to be after the start" }, values: raw };

  await prisma.timelineItem.create({
    data: { date: toDbDate(v.date), startTime: v.startTime, endTime: v.endTime, title: v.title },
  });
  refresh();
  return { ok: true, message: `Added “${v.title}” at ${formatClockTime(v.startTime)}.` };
}

const itemSchema = z.object({
  date: zRequiredDate,
  title: zText(160),
  startTime: zStart,
  endTime: zTime,
  location: zOptionalText(160),
  lead: zOptionalText(120),
  involves: zOptionalText(240),
  vendorId: zOptionalId,
  notes: zOptionalText(2000),
});

/** Create (id null) or update an item from the full form, then show it on its day. */
export async function saveTimelineItem(id: string | null, _prev: TimelineFormState, form: FormData): Promise<TimelineFormState> {
  await requireSession();
  const raw = formObject(form);
  const parsed = itemSchema.safeParse(raw);
  if (!parsed.success) return { ...fieldErrors(parsed.error), values: raw };
  const v = parsed.data;

  const [existing, vendor, s] = await Promise.all([
    id ? prisma.timelineItem.findUnique({ where: { id: zId.parse(id) }, select: { id: true } }) : null,
    v.vendorId ? prisma.vendor.findUnique({ where: { id: v.vendorId }, select: { id: true } }) : null,
    settings(),
  ]);
  if (id && !existing) return { ok: false, message: "This item has been deleted.", values: raw };
  const errors = checkRange(v.startTime, v.endTime, v.date);
  if (v.vendorId && !vendor) errors.vendorId = "That vendor no longer exists. Pick another.";
  if (Object.keys(errors).length > 0) return { ok: false, message: "Check the highlighted fields.", errors, values: raw };

  const data = {
    date: toDbDate(v.date),
    startTime: v.startTime,
    endTime: v.endTime,
    title: v.title,
    location: v.location,
    lead: v.lead,
    involves: v.involves,
    vendorId: v.vendorId,
    notes: v.notes,
  };
  const saved = id
    ? await prisma.timelineItem.update({ where: { id }, data, select: { id: true } })
    : await prisma.timelineItem.create({ data, select: { id: true } });
  refresh();
  redirect(timelineHref(viewKeyFor(v.date, s.weddingDate), `item-${saved.id}`));
}

/** Delete an item after the two-step confirm, then go back to its day. */
export async function deleteTimelineItem(id: string): Promise<void> {
  await requireSession();
  const itemId = zId.parse(id);
  const [item, s] = await Promise.all([
    prisma.timelineItem.findUnique({ where: { id: itemId }, select: { date: true } }),
    settings(),
  ]);
  await prisma.timelineItem.deleteMany({ where: { id: itemId } });
  refresh();
  redirect(item ? timelineHref(viewKeyFor(fromDbDate(item.date), s.weddingDate)) : "/timeline");
}

// ─── Templates ────────────────────────────────────────────────────────────────

const weddingTemplateSchema = z.object({ ceremonyTime: zTime.pipe(z.string({ error: "Enter the ceremony start time" })), firstLook: zCheckbox });
const rehearsalTemplateSchema = z.object({ rehearsalTime: zTime.pipe(z.string({ error: "Enter the rehearsal start time" })) });

/**
 * Fill an empty day with a draft run of show. Only runs when the day has no items yet, so a
 * second click (or a stale tab) never doubles the day.
 */
export async function buildTimelineTemplate(
  kind: "wedding" | "rehearsal",
  _prev: TimelineFormState,
  form: FormData,
): Promise<TimelineFormState> {
  await requireSession();
  if (kind !== "wedding" && kind !== "rehearsal") throw new Error("Unknown template");
  const raw = formObject(form);
  const s = await settings();
  const vendors = await prisma.vendor.findMany({
    where: { status: "BOOKED" },
    select: { id: true, name: true, category: true, alsoCovers: true, status: true, arrivalTime: true },
  });

  let date: CalendarDate;
  let items: TemplateItem[];
  let saveCeremonyTime: string | null = null;
  if (kind === "wedding") {
    const parsed = weddingTemplateSchema.safeParse(raw);
    if (!parsed.success) return { ...fieldErrors(parsed.error), values: raw };
    const { ceremonyTime, firstLook } = parsed.data;
    const error = weddingTemplateError(ceremonyTime, s.venueAccessTime);
    if (error) return { ok: false, message: "Check the ceremony time.", errors: { ceremonyTime: error }, values: raw };
    date = s.weddingDate;
    items = buildWeddingDayTemplate({
      weddingDate: date,
      ceremonyTime,
      venueAccessTime: s.venueAccessTime,
      venueName: s.venueName,
      firstLook,
      arrivalsKnown: vendors.filter((v) => isClockTime(v.arrivalTime)).map((v) => v.category),
    });
    if (!s.ceremonyTime) saveCeremonyTime = ceremonyTime;
  } else {
    const parsed = rehearsalTemplateSchema.safeParse(raw);
    if (!parsed.success) return { ...fieldErrors(parsed.error), values: raw };
    const error = rehearsalTemplateError(parsed.data.rehearsalTime);
    if (error) return { ok: false, message: "Check the rehearsal time.", errors: { rehearsalTime: error }, values: raw };
    date = addDays(s.weddingDate, -1);
    items = buildRehearsalTemplate({ rehearsalDate: date, rehearsalTime: parsed.data.rehearsalTime, venueName: s.venueName });
  }

  const created = await prisma.$transaction(async (tx) => {
    if ((await tx.timelineItem.count({ where: { date: toDbDate(date) } })) > 0) return 0;
    await tx.timelineItem.createMany({
      data: items.map((i) => ({
        date: toDbDate(i.date),
        startTime: i.startTime,
        endTime: i.endTime,
        title: i.title,
        location: i.location,
        lead: i.lead,
        involves: i.involves,
        notes: i.notes,
        vendorId: vendorForCategory(i.vendorCategory, vendors)?.id ?? null,
      })),
    });
    if (saveCeremonyTime) await tx.weddingSettings.update({ where: { id: 1 }, data: { ceremonyTime: saveCeremonyTime } });
    return items.length;
  });
  if (created === 0) {
    return { ok: false, message: "This day already has items, so the template wasn't added. Delete them first to start over.", values: raw };
  }
  refresh();
  redirect(kind === "wedding" ? "/timeline?built=wedding" : "/timeline?day=rehearsal&built=rehearsal");
}

// ─── Rain plan ────────────────────────────────────────────────────────────────

const rainSchema = z.object({ rainPlan: zOptionalText(4000) });

export async function saveRainPlan(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = rainSchema.safeParse(formObject(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  await prisma.weddingSettings.update({ where: { id: 1 }, data: { rainPlan: parsed.data.rainPlan } });
  refresh();
  return { ok: true, message: parsed.data.rainPlan ? "Rain plan saved." : "Rain plan cleared." };
}
