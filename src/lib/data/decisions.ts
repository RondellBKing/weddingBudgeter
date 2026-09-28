import "server-only";
import { requireSession } from "../auth/require-session";
import { fromDbDate, type CalendarDate } from "../dates";
import { prisma } from "../db";
import type { Partner } from "@/generated/prisma/client";

export type DecisionRow = {
  id: string;
  decidedOn: CalendarDate;
  title: string;
  decision: string;
  rationale: string | null;
  decidedBy: Partner;
  vendor: { id: string; name: string } | null;
  budgetItem: { id: string; description: string } | null;
};

const include = {
  vendor: { select: { id: true, name: true } },
  budgetItem: { select: { id: true, description: true } },
} as const;

function toRow(d: Awaited<ReturnType<typeof findOne>>): DecisionRow | null {
  if (!d) return null;
  return {
    id: d.id,
    decidedOn: fromDbDate(d.decidedOn),
    title: d.title,
    decision: d.decision,
    rationale: d.rationale,
    decidedBy: d.decidedBy,
    vendor: d.vendor,
    budgetItem: d.budgetItem,
  };
}

function findOne(id: string) {
  return prisma.decision.findUnique({ where: { id }, include });
}

/** Newest first. */
export async function loadDecisions(): Promise<DecisionRow[]> {
  await requireSession();
  const rows = await prisma.decision.findMany({ include, orderBy: [{ decidedOn: "desc" }, { createdAt: "desc" }] });
  return rows.map((d) => toRow(d)!);
}

export async function loadDecision(id: string): Promise<DecisionRow | null> {
  await requireSession();
  return toRow(await findOne(id));
}

/** The vendor and budget-line pickers. */
export async function loadDecisionOptions() {
  await requireSession();
  const [vendors, items] = await Promise.all([
    prisma.vendor.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.budgetItem.findMany({
      select: { id: true, description: true, category: { select: { name: true, sortOrder: true } } },
    }),
  ]);
  return {
    vendors: vendors.map((v) => ({ value: v.id, label: v.name })),
    budgetItems: items
      .sort((a, b) => a.category.sortOrder - b.category.sortOrder || a.description.localeCompare(b.description))
      .map((i) => ({ value: i.id, label: `${i.category.name} · ${i.description}` })),
  };
}
