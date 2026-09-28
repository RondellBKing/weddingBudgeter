import "server-only";
import { notFound } from "next/navigation";
import { requireSession } from "../auth/require-session";
import { prisma } from "../db";
import { loadPlan } from "./plan";

// Loaders for the budget item pages. Totals come from loadPlan, never from stored columns.

export async function loadBudgetOptions() {
  await requireSession();
  const [categories, vendors] = await Promise.all([
    prisma.budgetCategory.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    prisma.vendor.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { categories, vendors };
}

export async function loadBudgetItemPage(id: string) {
  await requireSession();
  const plan = await loadPlan();
  const item = plan.items.find((i) => i.id === id);
  if (!item) notFound();
  const [row, options] = await Promise.all([
    prisma.budgetItem.findUnique({
      where: { id },
      include: { payments: true, category: { select: { name: true } }, vendor: { select: { id: true, name: true } } },
    }),
    loadBudgetOptions(),
  ]);
  if (!row) notFound();
  const payments = row.payments.map((p) => ({ id: p.id, method: p.method, reference: p.reference }));
  return {
    plan,
    item,
    row,
    extras: new Map(payments.map((p) => [p.id, p])),
    totals: plan.budget.itemTotals.get(id)!,
    ...options,
  };
}
