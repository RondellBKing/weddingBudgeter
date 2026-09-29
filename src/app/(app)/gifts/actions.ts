"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth/require-session";
import { compareDates, todayIn, toDbDate, WEDDING_TZ } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { fieldErrors, formObject, zDate, zOptionalId, zOptionalText, zRequiredDate, zText, type ActionState } from "@/lib/forms";

// The gift log. Whether a thank-you is owed is never stored: it's "no thankYouSentOn".

/** Failed saves hand back what was typed; a successful add carries a nonce so the form clears. */
export type GiftFormState = ActionState & { values?: Record<string, string>; nonce?: number };

const zId = z.string().trim().min(1).max(64);

function refresh() {
  revalidatePath("/", "layout");
}

/** Today on the wedding's calendar (never the server's clock). */
async function weddingToday() {
  const s = await prisma.weddingSettings.findUnique({ where: { id: 1 }, select: { timezone: true } });
  return todayIn(s?.timezone ?? WEDDING_TZ);
}

const giftSchema = z.object({
  fromName: zText(200),
  guestId: zOptionalId,
  description: zText(300),
  receivedOn: zRequiredDate,
  thankYouSentOn: zDate,
  notes: zOptionalText(2000),
});

/** Log a gift (id null, stays on the page) or save an edit (back to the list). */
export async function saveGift(id: string | null, _prev: GiftFormState, form: FormData): Promise<GiftFormState> {
  await requireSession();
  const values = formObject(form);
  const parsed = giftSchema.safeParse(values);
  if (!parsed.success) return { ...fieldErrors(parsed.error), values };
  const v = parsed.data;
  const today = await weddingToday();

  const errors: Record<string, string> = {};
  if (compareDates(v.receivedOn, today) > 0) errors.receivedOn = "That's in the future. Log the gift once it arrives.";
  if (v.thankYouSentOn) {
    if (compareDates(v.thankYouSentOn, today) > 0) errors.thankYouSentOn = "That's in the future. Add the date once it's sent.";
    else if (compareDates(v.thankYouSentOn, v.receivedOn) < 0) errors.thankYouSentOn = "The note goes out after the gift arrives.";
  }
  if (v.guestId && (await prisma.guest.count({ where: { id: v.guestId } })) === 0) {
    errors.fromName = "That guest is no longer on the list. Pick again or unlink.";
  }
  if (Object.keys(errors).length > 0) return { ok: false, message: "Check the highlighted fields.", errors, values };

  const data = {
    fromName: v.fromName,
    guestId: v.guestId,
    description: v.description,
    receivedOn: toDbDate(v.receivedOn),
    thankYouSentOn: toDbDate(v.thankYouSentOn),
    notes: v.notes,
  };
  if (id) {
    const updated = await prisma.gift.updateMany({ where: { id }, data });
    if (updated.count === 0) return { ok: false, message: "This gift has been deleted.", values };
    refresh();
    redirect("/gifts");
  }
  await prisma.gift.create({ data });
  refresh();
  return { ok: true, message: `Logged the gift from ${v.fromName}.`, nonce: Date.now() };
}

/** One tap from the thank-you list. Leaves an existing date alone. */
export async function markThankYouSent(id: string): Promise<void> {
  await requireSession();
  const today = await weddingToday();
  await prisma.gift.updateMany({ where: { id: zId.parse(id), thankYouSentOn: null }, data: { thankYouSentOn: toDbDate(today) } });
  refresh();
}

export async function deleteGift(id: string): Promise<void> {
  await requireSession();
  await prisma.gift.deleteMany({ where: { id: zId.parse(id) } });
  refresh();
  redirect("/gifts");
}
