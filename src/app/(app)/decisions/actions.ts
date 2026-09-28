"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth/require-session";
import { toDbDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { fieldErrors, formObject, zOptionalId, zOptionalText, zRequiredDate, zText, type ActionState } from "@/lib/forms";
import { PARTNER_LABEL, valuesOf } from "@/lib/labels";

// The decision log: what we chose, when, why, and optionally which vendor or budget line it's about.

export type DecisionFormState = ActionState & { values?: Record<string, string> };

const zId = z.string().min(1).max(64);

function refresh() {
  revalidatePath("/", "layout");
}

const schema = z.object({
  decidedOn: zRequiredDate,
  title: zText(200),
  decision: zText(4000),
  rationale: zOptionalText(4000),
  decidedBy: z.enum(valuesOf(PARTNER_LABEL), { error: "Pick who decided" }),
  vendorId: zOptionalId,
  budgetItemId: zOptionalId,
});

/** Create (id null) or update a decision, then return to the log. */
export async function saveDecision(id: string | null, _prev: DecisionFormState, form: FormData): Promise<DecisionFormState> {
  await requireSession();
  const raw = formObject(form);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ...fieldErrors(parsed.error), values: raw };
  const v = parsed.data;

  const [existing, vendor, item] = await Promise.all([
    id ? prisma.decision.findUnique({ where: { id }, select: { id: true } }) : null,
    v.vendorId ? prisma.vendor.findUnique({ where: { id: v.vendorId }, select: { id: true } }) : null,
    v.budgetItemId ? prisma.budgetItem.findUnique({ where: { id: v.budgetItemId }, select: { id: true } }) : null,
  ]);
  if (id && !existing) return { ok: false, message: "This decision has been deleted.", values: raw };
  const errors: Record<string, string> = {};
  if (v.vendorId && !vendor) errors.vendorId = "That vendor no longer exists. Pick another.";
  if (v.budgetItemId && !item) errors.budgetItemId = "That budget line no longer exists. Pick another.";
  if (Object.keys(errors).length > 0) return { ok: false, message: "Check the highlighted fields.", errors, values: raw };

  const data = {
    decidedOn: toDbDate(v.decidedOn),
    title: v.title,
    decision: v.decision,
    rationale: v.rationale,
    decidedBy: v.decidedBy,
    vendorId: v.vendorId,
    budgetItemId: v.budgetItemId,
  };
  if (id) await prisma.decision.update({ where: { id }, data });
  else await prisma.decision.create({ data });
  refresh();
  redirect("/decisions");
}

/** Delete a decision after the two-step confirm. */
export async function deleteDecision(id: string): Promise<void> {
  await requireSession();
  await prisma.decision.deleteMany({ where: { id: zId.parse(id) } });
  refresh();
  redirect("/decisions");
}
