"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth/require-session";
import { loadPlan } from "@/lib/data/plan";
import { formatClockTime, formatDate, toDbDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { safeReturnPath } from "@/lib/domain/tasks";
import { zonedTimeToInstant } from "@/lib/domain/zoned-time";
import { fieldErrors, formObject, zOptionalId, zOptionalText, zRequiredDate, zText, zTime, type ActionState } from "@/lib/forms";
import { EVENT_TYPE_LABEL, valuesOf } from "@/lib/labels";

// Appointment mutations. Times are typed in New York time and stored as instants; an all-day
// appointment stores only its date. The database requires exactly one of the two.

export type EventFormState = ActionState & { values?: Record<string, string> };

const zId = z.string().min(1).max(64);

function refresh() {
  revalidatePath("/", "layout");
}

const safeBack = (back: unknown) => safeReturnPath(back, "/calendar");

const schema = z.object({
  title: zText(200),
  type: z.enum(valuesOf(EVENT_TYPE_LABEL), { error: "Pick what kind of appointment it is" }),
  timing: z.enum(["allDay", "timed"], { error: "Choose all day or a time" }),
  date: zRequiredDate,
  startTime: zTime,
  endTime: zTime,
  location: zOptionalText(200),
  vendorId: zOptionalId,
  notes: zOptionalText(4000),
});

/** Create (id null) or update an appointment, then return to the calendar. */
export async function saveEvent(id: string | null, back: string, _prev: EventFormState, form: FormData): Promise<EventFormState> {
  await requireSession();
  const raw = formObject(form);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ...fieldErrors(parsed.error), values: raw };
  const v = parsed.data;
  const { settings } = await loadPlan();
  const tz = settings.timezone;

  const errors: Record<string, string> = {};
  let startAt: Date | null = null;
  let endAt: Date | null = null;
  if (v.timing === "timed") {
    if (!v.startTime) {
      errors.startTime = "Add a start time, or choose All day";
    } else {
      const start = zonedTimeToInstant(v.date, v.startTime, tz);
      if (start.kind === "skipped") {
        errors.startTime = `${formatClockTime(v.startTime)} doesn't happen on ${formatDate(v.date, "long")}: the clocks jump from 2:00 to 3:00 AM. Pick another time.`;
      }
      startAt = start.instant;
      if (v.endTime) {
        const end = zonedTimeToInstant(v.date, v.endTime, tz);
        if (end.kind === "skipped") {
          errors.endTime = `${formatClockTime(v.endTime)} doesn't happen that night (clocks jump ahead). Pick another time.`;
        } else if (end.instant.getTime() <= start.instant.getTime()) {
          errors.endTime = "The end time has to be after the start time";
        }
        endAt = end.instant;
      }
    }
  }

  const [existing, vendor] = await Promise.all([
    id ? prisma.calendarEvent.findUnique({ where: { id }, select: { id: true } }) : null,
    v.vendorId ? prisma.vendor.findUnique({ where: { id: v.vendorId }, select: { id: true } }) : null,
  ]);
  if (id && !existing) return { ok: false, message: "This appointment has been deleted.", values: raw };
  if (v.vendorId && !vendor) errors.vendorId = "That vendor no longer exists. Pick another.";
  if (Object.keys(errors).length > 0) return { ok: false, message: "Check the highlighted fields.", errors, values: raw };

  const data = {
    title: v.title,
    type: v.type,
    allDayDate: v.timing === "allDay" ? toDbDate(v.date) : null,
    startAt: v.timing === "timed" ? startAt : null,
    endAt: v.timing === "timed" ? endAt : null,
    location: v.location,
    vendorId: v.vendorId,
    notes: v.notes,
  };
  if (id) await prisma.calendarEvent.update({ where: { id }, data });
  else await prisma.calendarEvent.create({ data });
  refresh();
  redirect(safeBack(back));
}

/** Delete an appointment after the two-step confirm. */
export async function deleteEvent(id: string, back: string): Promise<void> {
  await requireSession();
  await prisma.calendarEvent.deleteMany({ where: { id: zId.parse(id) } });
  refresh();
  redirect(safeBack(back));
}
