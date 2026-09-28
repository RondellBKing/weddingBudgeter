"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { requireSession } from "@/lib/auth/require-session";
import { loadPlan } from "@/lib/data/plan";
import { toDbDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import {
  chosenStyleError,
  dateOrderWarnings,
  OUTFIT_LABEL,
  ROLE_LABEL,
  shoeOptionError,
  shoeWarnings,
  SIDE_LABEL,
} from "@/lib/domain/party";
import { mergeSizes, sizesFromForm } from "@/lib/domain/party-sizes";
import {
  fieldErrors,
  formObject,
  zCheckbox,
  zDate,
  zOptionalId,
  zOptionalText,
  zText,
  type ActionState,
} from "@/lib/forms";
import { SHOE_STATUS_LABEL, valuesOf } from "@/lib/labels";

export type MemberFormState = ActionState & { warnings?: string[] };

const zId = z.string().trim().min(1).max(64);

const zEmail = zOptionalText(200).refine(
  (v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  "Enter an email like name@example.com",
);

const zPhone = zOptionalText(40).refine(
  (v) => v === null || (/^[\d\s()+.\-x]+$/i.test(v) && (v.match(/\d/g)?.length ?? 0) >= 7),
  "Enter a phone number like (201) 555-0142",
);

const memberSchema = z.object({
  name: zOptionalText(120),
  email: zEmail,
  phone: zPhone,
  role: z.enum(valuesOf(ROLE_LABEL), { error: "Pick a role" }),
  side: z.enum(valuesOf(SIDE_LABEL), { error: "Pick a side" }),
  outfitType: z.enum(valuesOf(OUTFIT_LABEL), { error: "Pick an outfit" }),
  askedOn: zDate,
  acceptedOn: zDate,
  chosenStyleId: zOptionalId,
  sizingSubmittedOn: zDate,
  orderedOn: zDate,
  arrivedOn: zDate,
  alteredOn: zDate,
  readyOn: zDate,
  attirePaid: zCheckbox,
  shoeOptionId: zOptionalId,
  shoeOwnedDescription: zOptionalText(300),
  shoeStatus: z.enum(valuesOf(SHOE_STATUS_LABEL), { error: "Pick a shoe status" }).default("NOT_SELECTED"),
  hairPlan: zOptionalText(200),
  accessoriesConfirmed: zCheckbox,
  giftIdea: zOptionalText(300),
  giftPurchased: zCheckbox,
  lodgingBooked: zCheckbox,
  notes: zOptionalText(4000),
});

function refresh() {
  // Party changes show up on the dashboard, tasks and calendar too.
  revalidatePath("/", "layout");
}

/** Save the per-person edit form. */
export async function saveMember(id: string, _prev: MemberFormState, form: FormData): Promise<MemberFormState> {
  await requireSession();
  const memberId = zId.parse(id);
  const raw = formObject(form);
  const parsed = memberSchema.safeParse(raw);
  if (!parsed.success) return fieldErrors(parsed.error);
  const v = parsed.data;

  const existing = await prisma.weddingPartyMember.findUnique({ where: { id: memberId }, select: { sizes: true } });
  if (!existing) return { ok: false, message: "That person isn't in the wedding party any more." };

  const isDress = v.outfitType === "DRESS";
  // Suits have no dress style; the form doesn't send one for them.
  const chosenStyleId = isDress ? v.chosenStyleId : null;
  const [style, shoe] = await Promise.all([
    chosenStyleId ? prisma.attireOption.findUnique({ where: { id: chosenStyleId }, select: { menu: true } }) : null,
    isDress && v.shoeOptionId ? prisma.attireOption.findUnique({ where: { id: v.shoeOptionId }, select: { menu: true } }) : null,
  ]);

  const errors: Record<string, string> = {};
  if (chosenStyleId && !style) errors.chosenStyleId = "That style isn't on the menu any more.";
  const styleError = chosenStyleError(v, style);
  if (styleError) errors.chosenStyleId = styleError;
  if (isDress && v.shoeOptionId && !shoe) errors.shoeOptionId = "That shoe isn't on the menu any more.";
  const shoeError = shoeOptionError(v, shoe);
  if (shoeError) errors.shoeOptionId = shoeError;
  if (Object.keys(errors).length > 0) return { ok: false, message: "Check the highlighted fields.", errors };

  const sizes = mergeSizes(existing.sizes, sizesFromForm(raw, v.outfitType), v.outfitType);

  await prisma.weddingPartyMember.update({
    where: { id: memberId },
    data: {
      name: v.name,
      email: v.email,
      phone: v.phone,
      role: v.role,
      side: v.side,
      outfitType: v.outfitType,
      askedOn: toDbDate(v.askedOn),
      acceptedOn: toDbDate(v.acceptedOn),
      chosenStyleId,
      sizingSubmittedOn: toDbDate(v.sizingSubmittedOn),
      orderedOn: toDbDate(v.orderedOn),
      arrivedOn: toDbDate(v.arrivedOn),
      alteredOn: toDbDate(v.alteredOn),
      readyOn: toDbDate(v.readyOn),
      sizes: sizes ?? Prisma.DbNull,
      hairPlan: v.hairPlan,
      accessoriesConfirmed: v.accessoriesConfirmed,
      giftIdea: v.giftIdea,
      giftPurchased: v.giftPurchased,
      lodgingBooked: v.lodgingBooked,
      notes: v.notes,
      // Shoe choices belong to dresses and rental payment to suits. The form only shows each to
      // the outfit it applies to, so the other one's saved values are left as they are.
      ...(isDress
        ? { shoeOptionId: v.shoeOptionId, shoeOwnedDescription: v.shoeOwnedDescription, shoeStatus: v.shoeStatus }
        : { attirePaid: v.attirePaid }),
    },
  });
  refresh();

  const warnings = [...dateOrderWarnings(v), ...(isDress ? shoeWarnings(v) : [])];
  return { ok: true, message: warnings.length > 0 ? "Saved, with a note or two below." : "Saved.", warnings };
}

/** One click from the roll-up: sizes arrived today (wedding time zone). Never overwrites a date. */
export async function markSizingReceived(id: string): Promise<void> {
  await requireSession();
  const memberId = zId.parse(id);
  const { today } = await loadPlan();
  await prisma.weddingPartyMember.updateMany({
    where: { id: memberId, sizingSubmittedOn: null },
    data: { sizingSubmittedOn: toDbDate(today) },
  });
  refresh();
}

const dutySchema = z.object({
  memberId: z.string({ error: "Pick a person" }).trim().min(1, "Pick a person").max(64),
  title: zText(200),
  dueDate: zDate,
});

/** Add a duty: a task owned by the wedding party and linked to one person. */
export async function addDuty(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = dutySchema.safeParse(formObject(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  const v = parsed.data;
  const member = await prisma.weddingPartyMember.findUnique({ where: { id: v.memberId }, select: { id: true } });
  if (!member) return { ok: false, message: "Pick a person.", errors: { memberId: "Pick a person" } };
  await prisma.task.create({
    data: {
      title: v.title,
      dueDate: toDbDate(v.dueDate),
      owner: "WEDDING_PARTY",
      area: "WEDDING_PARTY",
      partyMemberId: member.id,
    },
  });
  refresh();
  return { ok: true, message: `Added “${v.title}”.` };
}

/** Tick a duty done or not done. completedAt is set exactly when the status is DONE (a CHECK enforces it). */
export async function setDutyDone(id: string, done: boolean): Promise<void> {
  await requireSession();
  const taskId = zId.parse(id);
  const isDone = z.boolean().parse(done);
  await prisma.task.updateMany({
    where: { id: taskId, partyMemberId: { not: null } },
    data: isDone ?{ status: "DONE", completedAt: new Date() } : { status: "NOT_STARTED", completedAt: null },
  });
  refresh();
}

/** Delete a duty (the page asks first). Only wedding party duties can be deleted from here. */
export async function deleteDuty(id: string): Promise<void> {
  await requireSession();
  const taskId = zId.parse(id);
  await prisma.task.deleteMany({ where: { id: taskId, partyMemberId: { not: null } } });
  refresh();
}
