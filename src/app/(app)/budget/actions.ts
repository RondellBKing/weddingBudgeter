"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth/require-session";
import { loadPlan } from "@/lib/data/plan";
import { fromDbDate, toDbDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { nextSequence, planMarkPaid, planMarkUnpaid } from "@/lib/domain/payments";
import {
  fieldErrors,
  formObject,
  zCheckbox,
  zDate,
  zMoney,
  zOptionalId,
  zOptionalText,
  zRequiredDate,
  zRequiredMoney,
  zText,
  type ActionState,
} from "@/lib/forms";
import { PAYMENT_KIND_LABEL, PAYMENT_METHOD_LABEL, valuesOf } from "@/lib/labels";
import { parseMoneyToCents } from "@/lib/money";

// Money changes ripple everywhere (dashboard, banner, vendors), so refresh the whole app.
function refresh() {
  revalidatePath("/", "layout");
}

// ─── Categories ───────────────────────────────────────────────────────────────

const categorySchema = z.object({ name: zText(80), estimate: zRequiredMoney });

export async function createCategory(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = categorySchema.safeParse(formObject(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { name, estimate } = parsed.data;
  if (await prisma.budgetCategory.findUnique({ where: { name } })) {
    return { ok: false, message: "Check the highlighted fields.", errors: { name: "There's already a category with that name" } };
  }
  const last = await prisma.budgetCategory.aggregate({ _max: { sortOrder: true } });
  await prisma.budgetCategory.create({ data: { name, estimateCents: estimate, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
  refresh();
  return { ok: true, message: `Added ${name}.` };
}

/** Inline edit of one category field from the budget table. */
export async function saveCategoryField(id: string, field: "name" | "estimate", value: string): Promise<ActionState> {
  await requireSession();
  if (field === "estimate") {
    const cents = parseMoneyToCents(value);
    if (cents === null || cents < 0) return { ok: false, message: "Enter an amount like 7,000" };
    await prisma.budgetCategory.update({ where: { id }, data: { estimateCents: cents } });
  } else {
    const name = value.trim();
    if (!name || name.length > 80) return { ok: false, message: "Enter a name" };
    const clash = await prisma.budgetCategory.findFirst({ where: { name, NOT: { id } } });
    if (clash) return { ok: false, message: "There's already a category with that name" };
    await prisma.budgetCategory.update({ where: { id }, data: { name } });
  }
  refresh();
  return { ok: true, message: "Saved" };
}

/** Closing a category returns its unspent estimate to the contingency. */
export async function setCategoryClosed(id: string, closed: boolean): Promise<void> {
  await requireSession();
  await prisma.budgetCategory.update({ where: { id }, data: { isClosed: closed } });
  refresh();
}

export async function deleteCategory(id: string): Promise<void> {
  await requireSession();
  const cat = await prisma.budgetCategory.findUnique({ where: { id }, include: { _count: { select: { items: true } } } });
  if (!cat || cat.isContingency || cat._count.items > 0) return;
  await prisma.budgetCategory.delete({ where: { id } });
  refresh();
}

// ─── Budget items ─────────────────────────────────────────────────────────────

const itemSchema = z.object({
  categoryId: zText(40),
  vendorId: zOptionalId,
  description: zText(200),
  estimate: zMoney,
  contracted: zMoney,
  notes: zOptionalText(4000),
});

export async function createItem(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = itemSchema.safeParse(formObject(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  const v = parsed.data;
  const item = await prisma.budgetItem.create({
    data: {
      categoryId: v.categoryId,
      vendorId: v.vendorId,
      description: v.description,
      estimateCents: v.estimate,
      contractedCents: v.contracted,
      notes: v.notes,
    },
  });
  refresh();
  redirect(`/budget/items/${item.id}?created=1`);
}

export async function updateItem(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = itemSchema.safeParse(formObject(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  const v = parsed.data;
  await prisma.budgetItem.update({
    where: { id },
    data: {
      categoryId: v.categoryId,
      vendorId: v.vendorId,
      description: v.description,
      estimateCents: v.estimate,
      contractedCents: v.contracted,
      notes: v.notes,
    },
  });
  refresh();
  return { ok: true, message: "Saved." };
}

/** Inline edit from the items table. */
export async function saveItemField(id: string, field: "description" | "estimate" | "contracted", value: string): Promise<ActionState> {
  await requireSession();
  if (field === "description") {
    const d = value.trim();
    if (!d || d.length > 200) return { ok: false, message: "Enter a description" };
    await prisma.budgetItem.update({ where: { id }, data: { description: d } });
  } else {
    const blank = value.trim() === "";
    const cents = blank ? null : parseMoneyToCents(value);
    if (!blank && (cents === null || cents < 0)) return { ok: false, message: "Enter an amount like 6,500" };
    await prisma.budgetItem.update({
      where: { id },
      data: field === "estimate" ? { estimateCents: cents } : { contractedCents: cents },
    });
  }
  refresh();
  return { ok: true, message: "Saved" };
}

/** Deletes the item and its payments (the confirm step says how many were already paid). */
export async function deleteItem(id: string): Promise<void> {
  await requireSession();
  await prisma.$transaction([prisma.payment.deleteMany({ where: { budgetItemId: id } }), prisma.budgetItem.delete({ where: { id } })]);
  refresh();
  redirect("/budget?view=items");
}

// ─── Payments ─────────────────────────────────────────────────────────────────

const paymentSchema = z
  .object({
    kind: z.enum(valuesOf(PAYMENT_KIND_LABEL)),
    amountMode: z.enum(["fixed", "unknown", "overage"]),
    amount: zMoney,
    dueDate: zRequiredDate,
    paidDate: zDate,
    method: z.union([z.literal(""), z.enum(valuesOf(PAYMENT_METHOD_LABEL))]).optional(),
    reference: zOptionalText(120),
    notes: zOptionalText(2000),
    isEstimate: zCheckbox,
  })
  .superRefine((v, ctx) => {
    if (v.amountMode === "fixed" && v.amount === null) {
      ctx.addIssue({ code: "custom", path: ["amount"], message: "Enter the amount, or choose \"Not known yet\"" });
    }
    if (v.paidDate && v.amountMode === "unknown" && v.amount === null) {
      ctx.addIssue({ code: "custom", path: ["amount"], message: "Enter the amount you paid" });
    }
  });

type PaymentValues = z.infer<typeof paymentSchema>;

async function paymentData(v: PaymentValues, currentId?: string) {
  if (v.amountMode === "overage") {
    // Only one live headcount-overage payment, or the overage would be counted twice.
    const other = await prisma.payment.findFirst({
      where: { amountRule: "HEADCOUNT_OVERAGE", ...(currentId ? { NOT: { id: currentId } } : {}) },
    });
    if (other) return { error: "Only one payment can be the live headcount overage." } as const;
  }
  let amountCents = v.amountMode === "fixed" ? v.amount : v.amountMode === "unknown" ? v.amount : null;
  if (v.paidDate && amountCents === null) {
    const plan = await loadPlan();
    const planned = planMarkPaid(
      { amountCents: null, amountRule: v.amountMode === "overage" ? "HEADCOUNT_OVERAGE" : null, paidDate: null },
      { paidDate: v.paidDate, amountCents: v.amount },
      { headcountOverageCents: plan.headroom.overageCents },
    );
    if (!planned.ok) return { error: planned.message } as const;
    amountCents = planned.amountCents;
  }
  return {
    data: {
      kind: v.kind,
      amountCents,
      amountRule: v.amountMode === "overage" ? ("HEADCOUNT_OVERAGE" as const) : null,
      isEstimate: v.amountMode !== "fixed" || v.isEstimate,
      dueDate: toDbDate(v.dueDate),
      paidDate: v.paidDate ? toDbDate(v.paidDate) : null,
      method: v.method ? v.method : null,
      reference: v.reference,
      notes: v.notes,
    },
  } as const;
}

export async function createPayment(itemId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = paymentSchema.safeParse(formObject(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  const built = await paymentData(parsed.data);
  if ("error" in built) return { ok: false, message: built.error!, errors: { amountMode: built.error! } };
  const existing = await prisma.payment.findMany({ where: { budgetItemId: itemId }, select: { sequence: true } });
  await prisma.payment.create({ data: { ...built.data, budgetItemId: itemId, sequence: nextSequence(existing) } });
  refresh();
  return { ok: true, message: "Payment added." };
}

export async function updatePayment(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = paymentSchema.safeParse(formObject(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  const built = await paymentData(parsed.data, id);
  if ("error" in built) return { ok: false, message: built.error!, errors: { amountMode: built.error! } };
  await prisma.payment.update({ where: { id }, data: built.data });
  refresh();
  return { ok: true, message: "Saved." };
}

export async function deletePayment(id: string): Promise<void> {
  await requireSession();
  await prisma.payment.delete({ where: { id } });
  refresh();
}

const markPaidSchema = z.object({
  paidDate: zRequiredDate,
  amount: zMoney,
  method: z.union([z.literal(""), z.enum(valuesOf(PAYMENT_METHOD_LABEL))]).optional(),
  reference: zOptionalText(120),
});

/** Record a payment as paid. A computed payment freezes at today's computed amount. */
export async function markPaid(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = markPaidSchema.safeParse(formObject(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) return { ok: false, message: "That payment no longer exists." };
  const plan = await loadPlan();
  const planned = planMarkPaid(
    { amountCents: payment.amountCents, amountRule: payment.amountRule, paidDate: fromDbDate(payment.paidDate) },
    { paidDate: parsed.data.paidDate, amountCents: parsed.data.amount },
    { headcountOverageCents: plan.headroom.overageCents },
  );
  if (!planned.ok) return { ok: false, message: planned.message, errors: { amount: planned.message } };
  await prisma.payment.update({
    where: { id },
    data: {
      paidDate: toDbDate(planned.paidDate),
      amountCents: planned.amountCents,
      method: parsed.data.method ? parsed.data.method : payment.method,
      reference: parsed.data.reference ?? payment.reference,
    },
  });
  refresh();
  return { ok: true, message: "Marked paid." };
}

export async function markUnpaid(id: string): Promise<void> {
  await requireSession();
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) return;
  const planned = planMarkUnpaid({ amountCents: payment.amountCents, amountRule: payment.amountRule });
  await prisma.payment.update({ where: { id }, data: { paidDate: planned.paidDate, amountCents: planned.amountCents } });
  refresh();
}
