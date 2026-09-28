"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth/require-session";
import { prisma } from "@/lib/db";
import { matchKeyFor } from "@/lib/domain/guest-import";
import { coupleOnList } from "@/lib/domain/guests";
import { fieldErrors, formObject, zCheckbox, zOptionalId, zOptionalText, zText, type ActionState } from "@/lib/forms";
import { GUEST_SIDE_LABEL, RELATIONSHIP_LABEL, RSVP_LABEL, valuesOf } from "@/lib/labels";

const schema = z.object({
  fullName: zText(120),
  householdName: zText(120),
  side: z.enum(valuesOf(GUEST_SIDE_LABEL), { message: "Pick a side" }),
  relationship: z.enum(valuesOf(RELATIONSHIP_LABEL), { message: "Pick one" }),
  isChild: zCheckbox,
  plusOneOfId: zOptionalId,
  rsvpStatus: z
    .union([z.literal(""), z.enum(valuesOf(RSVP_LABEL))], { message: "Pick a reply" })
    .optional()
    .transform((v) => (v ? v : null)),
  mealChoice: zOptionalText(120),
  dietaryNotes: zOptionalText(500),
  notes: zOptionalText(2000),
});

type GuestInput = z.infer<typeof schema>;

/** The plus-one must be another guest who exists and isn't already this guest's plus-one. */
async function plusOneProblem(v: GuestInput, selfId: string | null): Promise<string | null> {
  if (!v.plusOneOfId) return null;
  if (v.plusOneOfId === selfId) return "A guest can't be their own plus-one.";
  const host = await prisma.guest.findUnique({ where: { id: v.plusOneOfId }, select: { plusOneOfId: true } });
  if (!host) return "That guest isn't on the list any more.";
  if (selfId && host.plusOneOfId === selfId) return "That guest is already this guest's plus-one.";
  return null;
}

function data(v: GuestInput) {
  return {
    fullName: v.fullName,
    householdName: v.householdName,
    side: v.side,
    relationship: v.relationship,
    isChild: v.isChild,
    plusOneOfId: v.plusOneOfId,
    rsvpStatus: v.rsvpStatus,
    mealChoice: v.mealChoice,
    dietaryNotes: v.dietaryNotes,
    notes: v.notes,
    matchKey: matchKeyFor(v.fullName, v.householdName),
  };
}

/** Form state, plus what was typed so a failed save doesn't clear the form. */
export type GuestFormState = ActionState & { values?: Record<string, string> };

export async function createGuest(_prev: GuestFormState, form: FormData): Promise<GuestFormState> {
  await requireSession();
  const raw = formObject(form);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ...fieldErrors(parsed.error), values: raw };
  const problem = await plusOneProblem(parsed.data, null);
  if (problem) return { ok: false, message: "Check the highlighted fields.", errors: { plusOneOfId: problem }, values: raw };

  await prisma.guest.create({ data: data(parsed.data) });
  revalidatePath("/", "layout");
  redirect("/guests");
}

export async function updateGuest(id: string, _prev: GuestFormState, form: FormData): Promise<GuestFormState> {
  await requireSession();
  const raw = formObject(form);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ...fieldErrors(parsed.error), values: raw };
  const problem = await plusOneProblem(parsed.data, id);
  if (problem) return { ok: false, message: "Check the highlighted fields.", errors: { plusOneOfId: problem }, values: raw };

  const found = await prisma.guest.findUnique({ where: { id }, select: { id: true } });
  if (!found) return { ok: false, message: "This guest has been deleted." };
  await prisma.guest.update({ where: { id }, data: data(parsed.data) });
  revalidatePath("/", "layout");
  redirect("/guests");
}

/** Deletes the guest. Their seat goes with them; their plus-ones and wedding party link are kept, unlinked. */
export async function deleteGuest(id: string): Promise<void> {
  await requireSession();
  await prisma.guest.deleteMany({ where: { id } });
  revalidatePath("/", "layout");
  redirect("/guests");
}

/** Adds the couple as guests (they count toward the venue's included headcount), if they aren't on the list. */
export async function addCouple(): Promise<void> {
  await requireSession();
  const settings = await prisma.weddingSettings.findUnique({
    where: { id: 1 },
    select: { partnerOneName: true, partnerTwoName: true },
  });
  if (!settings) return;
  const partners = [settings.partnerOneName, settings.partnerTwoName];
  const guests = await prisma.guest.findMany({ select: { fullName: true, relationship: true } });
  const missing = coupleOnList(partners, guests).filter((c) => !c.onList);
  if (missing.length > 0) {
    const householdName = `${partners[0]} & ${partners[1]}`;
    await prisma.guest.createMany({
      data: missing.map((c) => ({
        fullName: c.partner,
        householdName,
        side: "BOTH" as const,
        relationship: "COUPLE" as const,
        rsvpStatus: "ATTENDING" as const,
        matchKey: matchKeyFor(c.partner, householdName),
      })),
    });
  }
  revalidatePath("/", "layout");
}
