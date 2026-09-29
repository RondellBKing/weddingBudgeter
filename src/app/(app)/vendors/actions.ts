"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth/require-session";
import { todayIn, toDbDate, WEDDING_TZ } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { readVendorForm, vendorSchema, type VendorFormState } from "@/lib/domain/vendor-form";
import { fieldErrors, zOptionalText, zText, type ActionState } from "@/lib/forms";
import { nextPackageOrder } from "@/lib/domain/package";
import { INCLUSION_STATUS_LABEL, PACKAGE_SECTION_LABEL, PARTNER_LABEL, valuesOf } from "@/lib/labels";

/** Today on the wedding's calendar (never the server's clock). */
async function weddingToday() {
  const s = await prisma.weddingSettings.findUnique({ where: { id: 1 }, select: { timezone: true } });
  return todayIn(s?.timezone ?? WEDDING_TZ);
}

function revalidateVendor(vendorId: string) {
  revalidatePath("/vendors");
  revalidatePath(`/vendors/${vendorId}`);
}

// ─── Vendors ───────────────────────────────────────────────────────────────────

/** Create (vendorId null) or update a vendor, then open its page. */
export async function saveVendor(vendorId: string | null, _prev: VendorFormState, form: FormData): Promise<VendorFormState> {
  await requireSession();
  const values = readVendorForm(form);
  const parsed = vendorSchema.safeParse(values);
  if (!parsed.success) return { ...fieldErrors(parsed.error), values };
  const v = parsed.data;
  const data = {
    name: v.name,
    category: v.category,
    alsoCovers: v.alsoCovers,
    status: v.status,
    contactName: v.contactName,
    email: v.email,
    phone: v.phone,
    website: v.website,
    instagram: v.instagram,
    quotedCents: v.quoted,
    contractSignedOn: toDbDate(v.contractSignedOn),
    contractUrl: v.contractUrl,
    arrivalTime: v.arrivalTime,
    mealsRequired: v.mealsRequired,
    notes: v.notes,
  };

  let id = vendorId;
  if (vendorId) {
    const updated = await prisma.vendor.updateMany({ where: { id: vendorId }, data });
    if (updated.count === 0) return { ok: false, message: "This vendor no longer exists. It may have been deleted.", values };
  } else {
    id = (await prisma.vendor.create({ data, select: { id: true } })).id;
  }
  // Status and meals change the headcount (booked vendors' meals), so refresh every page.
  revalidatePath("/", "layout");
  redirect(`/vendors/${id}`);
}

/** Deletes the vendor with its questions and notes. Budget items, tasks and appointments stay, unlinked. */
export async function deleteVendor(vendorId: string): Promise<void> {
  await requireSession();
  await prisma.vendor.deleteMany({ where: { id: vendorId } });
  revalidatePath("/", "layout");
  redirect("/vendors");
}

// ─── Questions to ask ──────────────────────────────────────────────────────────

const questionText = zText(300);

export async function addQuestion(vendorId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = z.object({ text: questionText }).safeParse({ text: form.get("text") ?? "" });
  if (!parsed.success) return fieldErrors(parsed.error);
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true } });
  if (!vendor) return { ok: false, message: "This vendor no longer exists." };
  const last = await prisma.vendorQuestion.aggregate({ where: { vendorId }, _max: { sortOrder: true } });
  await prisma.vendorQuestion.create({
    data: { vendorId, text: parsed.data.text, sortOrder: (last._max.sortOrder ?? -1) + 1 },
  });
  revalidateVendor(vendorId);
  return { ok: true, message: "Question added." };
}

/**
 * Save a question's wording and answer. An answer marks it answered (dated today the first
 * time); a blank answer marks it open again.
 */
export async function saveQuestion(questionId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = z
    .object({ text: questionText, answer: zOptionalText(4000) })
    .safeParse({ text: form.get("text") ?? "", answer: form.get("answer") ?? "" });
  if (!parsed.success) return fieldErrors(parsed.error);
  const q = await prisma.vendorQuestion.findUnique({ where: { id: questionId }, select: { vendorId: true, answeredOn: true } });
  if (!q) return { ok: false, message: "This question was deleted." };
  const { text, answer } = parsed.data;
  await prisma.vendorQuestion.update({
    where: { id: questionId },
    data: {
      text,
      answer,
      answeredOn: answer === null ? null : (q.answeredOn ?? toDbDate(await weddingToday())),
    },
  });
  revalidateVendor(q.vendorId);
  return { ok: true, message: answer === null ? "Saved." : "Answer saved." };
}

export async function clearAnswer(questionId: string): Promise<void> {
  await requireSession();
  const q = await prisma.vendorQuestion.findUnique({ where: { id: questionId }, select: { vendorId: true } });
  if (!q) return;
  await prisma.vendorQuestion.update({ where: { id: questionId }, data: { answer: null, answeredOn: null } });
  revalidateVendor(q.vendorId);
}

export async function deleteQuestion(questionId: string): Promise<void> {
  await requireSession();
  const q = await prisma.vendorQuestion.findUnique({ where: { id: questionId }, select: { vendorId: true } });
  if (!q) return;
  await prisma.vendorQuestion.delete({ where: { id: questionId } });
  revalidateVendor(q.vendorId);
}

// ─── What the package includes ─────────────────────────────────────────────────

const packageSchema = z.object({
  name: zText(200),
  section: z.enum(valuesOf(PACKAGE_SECTION_LABEL), { error: "Pick where it belongs" }),
  status: z.enum(valuesOf(INCLUSION_STATUS_LABEL), { error: "Pick whether it's included" }),
  notes: zOptionalText(1000),
});

function readPackageForm(form: FormData) {
  return packageSchema.safeParse({
    name: form.get("name") ?? "",
    section: form.get("section") ?? "",
    status: form.get("status") ?? "TO_CONFIRM",
    notes: form.get("notes") ?? "",
  });
}

export async function addPackageItem(vendorId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = readPackageForm(form);
  if (!parsed.success) return fieldErrors(parsed.error);
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true } });
  if (!vendor) return { ok: false, message: "This vendor no longer exists." };
  const inSection = await prisma.packageItem.findMany({ where: { vendorId, section: parsed.data.section }, select: { sortOrder: true } });
  await prisma.packageItem.create({ data: { vendorId, ...parsed.data, sortOrder: nextPackageOrder(inSection) } });
  revalidatePath("/", "layout");
  return { ok: true, message: "Added." };
}

export async function savePackageItem(itemId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = readPackageForm(form);
  if (!parsed.success) return fieldErrors(parsed.error);
  const item = await prisma.packageItem.findUnique({ where: { id: itemId }, select: { id: true } });
  if (!item) return { ok: false, message: "This line was deleted." };
  await prisma.packageItem.update({ where: { id: itemId }, data: parsed.data });
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}

/** The tick box: ticked means "included"; unticking puts it back to "to confirm". */
export async function setPackageIncluded(itemId: string, included: boolean): Promise<void> {
  await requireSession();
  await prisma.packageItem.updateMany({ where: { id: itemId }, data: { status: included ? "INCLUDED" : "TO_CONFIRM" } });
  revalidatePath("/", "layout");
}

export async function deletePackageItem(itemId: string): Promise<void> {
  await requireSession();
  await prisma.packageItem.deleteMany({ where: { id: itemId } });
  revalidatePath("/", "layout");
}

// ─── Communication log ─────────────────────────────────────────────────────────

const noteSchema = z.object({
  author: z.enum(valuesOf(PARTNER_LABEL), { error: "Pick who's writing" }),
  body: zText(4000),
});

export async function addNote(vendorId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = noteSchema.safeParse({ author: form.get("author") ?? "", body: form.get("body") ?? "" });
  if (!parsed.success) return fieldErrors(parsed.error);
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true } });
  if (!vendor) return { ok: false, message: "This vendor no longer exists." };
  await prisma.vendorNote.create({ data: { vendorId, author: parsed.data.author, body: parsed.data.body } });
  revalidateVendor(vendorId);
  return { ok: true, message: "Added to the log." };
}

export async function deleteNote(noteId: string): Promise<void> {
  await requireSession();
  const n = await prisma.vendorNote.findUnique({ where: { id: noteId }, select: { vendorId: true } });
  if (!n) return;
  await prisma.vendorNote.delete({ where: { id: noteId } });
  revalidateVendor(n.vendorId);
}
