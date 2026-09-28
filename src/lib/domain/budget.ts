import { compareDates, daysBetween, dueState, type CalendarDate, type DueState } from "../dates";
import type { Cents } from "../money";

// Every number here is derived from payments, contracts and estimates. Nothing is stored.
//
// Definitions (see CLAUDE.md):
//   paid(item)       = Σ amounts of payments with a paid date
//   scheduled(item)  = Σ amounts of all payments (the headcount overage resolved live)
//   committed(item)  = max(contracted, scheduled)
//   leftToPay(item)  = committed − paid
//   overrun(cat)     = max(0, committed − estimate) for every non-contingency category
//   contingency left = contingency estimate − Σ overruns + unspent estimate of closed categories
//                      − anything committed directly against the contingency category
//   over budget      = contingency left < 0

export type AmountRuleKind = "HEADCOUNT_OVERAGE";

export type PaymentRow = {
  id: string;
  budgetItemId: string;
  sequence: number | null;
  kind: string;
  amountCents: Cents | null;
  amountRule: AmountRuleKind | null;
  isEstimate: boolean;
  dueDate: CalendarDate;
  paidDate: CalendarDate | null;
  notes?: string | null;
};

export type ItemRow = {
  id: string;
  categoryId: string;
  vendorId: string | null;
  vendorName?: string | null;
  description: string;
  estimateCents: Cents | null;
  contractedCents: Cents | null;
  payments: PaymentRow[];
};

export type CategoryRow = {
  id: string;
  name: string;
  estimateCents: Cents;
  sortOrder: number;
  isContingency: boolean;
  isClosed: boolean;
};

export type AmountContext = {
  /** Headcount overage at the current projected headcount, tax included. */
  headcountOverageCents: Cents;
};

/** The amount a payment stands for right now. Paid payments are frozen at what was paid. */
export function resolvePaymentAmount(p: PaymentRow, ctx: AmountContext): Cents | null {
  if (p.paidDate !== null) return p.amountCents;
  if (p.amountRule === "HEADCOUNT_OVERAGE") return ctx.headcountOverageCents;
  return p.amountCents;
}

export type ItemTotals = {
  paid: Cents;
  scheduled: Cents;
  committed: Cents;
  leftToPay: Cents;
  /** Payments whose amount isn't known yet. */
  unknownAmountCount: number;
  nextDue: { payment: PaymentRow; amountCents: Cents | null } | null;
  /** Scheduled payments compared to the contract, to catch data-entry mistakes. */
  reconciliation: "no-contract" | "matches" | "payments-short" | "payments-over";
};

export function itemTotals(item: ItemRow, ctx: AmountContext): ItemTotals {
  let paid = 0;
  let scheduled = 0;
  let unknownAmountCount = 0;
  let nextDue: ItemTotals["nextDue"] = null;
  for (const p of item.payments) {
    const amount = resolvePaymentAmount(p, ctx);
    if (amount === null) unknownAmountCount++;
    scheduled += amount ?? 0;
    if (p.paidDate !== null) {
      paid += amount ?? 0;
    } else if (!nextDue || compareDates(p.dueDate, nextDue.payment.dueDate) < 0) {
      nextDue = { payment: p, amountCents: amount };
    }
  }
  const contracted = item.contractedCents ?? 0;
  const committed = Math.max(contracted, scheduled);
  let reconciliation: ItemTotals["reconciliation"] = "no-contract";
  if (item.contractedCents !== null) {
    // Rule-computed payments (the overage) sit on top of the contract, so compare fixed amounts only.
    const fixed = item.payments
      .filter((p) => p.amountRule === null || p.paidDate !== null)
      .reduce((sum, p) => sum + (p.amountCents ?? 0), 0);
    reconciliation = fixed === contracted ? "matches" : fixed < contracted ? "payments-short" : "payments-over";
  }
  return {
    paid,
    scheduled,
    committed,
    leftToPay: Math.max(0, committed - paid),
    unknownAmountCount,
    nextDue,
    reconciliation,
  };
}

export type CategoryTotals = CategoryRow & {
  committed: Cents;
  paid: Cents;
  leftToPay: Cents;
  /** How far committed is above the estimate (0 when within). Contingency category: always 0. */
  overrun: Cents;
  /** Estimate not yet committed (0 when over). */
  uncommitted: Cents;
  itemCount: number;
};

export type BudgetSummary = {
  totalBudget: Cents;
  /** Σ category estimates. */
  allocated: Cents;
  /** Budget not assigned to any category. Not counted as headroom. */
  unallocated: Cents;
  committed: Cents;
  paid: Cents;
  leftToPay: Cents;
  /** Budget not yet under contract. */
  uncommitted: Cents;
  contingency: {
    categoryId: string | null;
    estimate: Cents;
    overruns: Cents;
    closedSavings: Cents;
    spentDirectly: Cents;
    available: Cents;
  };
  /** How far the plan is over budget (contingency below zero). */
  overBudgetCents: Cents;
  /** Contracts alone exceed the total budget. */
  contractedOverBudgetCents: Cents;
  categories: CategoryTotals[];
  itemTotals: Map<string, ItemTotals>;
};

export function summarizeBudget(input: {
  totalBudgetCents: Cents;
  categories: CategoryRow[];
  items: ItemRow[];
  ctx: AmountContext;
}): BudgetSummary {
  const { totalBudgetCents, categories, items, ctx } = input;
  const totalsByItem = new Map<string, ItemTotals>();
  const byCategory = new Map<string, { committed: Cents; paid: Cents; leftToPay: Cents; count: number }>();
  for (const c of categories) byCategory.set(c.id, { committed: 0, paid: 0, leftToPay: 0, count: 0 });

  let committed = 0;
  let paid = 0;
  let leftToPay = 0;
  for (const item of items) {
    const t = itemTotals(item, ctx);
    totalsByItem.set(item.id, t);
    committed += t.committed;
    paid += t.paid;
    leftToPay += t.leftToPay;
    const agg = byCategory.get(item.categoryId);
    if (agg) {
      agg.committed += t.committed;
      agg.paid += t.paid;
      agg.leftToPay += t.leftToPay;
      agg.count++;
    }
  }

  const contingencyCat = categories.find((c) => c.isContingency) ?? null;
  let overruns = 0;
  let closedSavings = 0;
  const categoryTotals: CategoryTotals[] = categories
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => {
      const agg = byCategory.get(c.id)!;
      const overrun = c.isContingency ? 0 : Math.max(0, agg.committed - c.estimateCents);
      if (!c.isContingency) {
        overruns += overrun;
        if (c.isClosed) closedSavings += Math.max(0, c.estimateCents - agg.committed);
      }
      return {
        ...c,
        committed: agg.committed,
        paid: agg.paid,
        leftToPay: agg.leftToPay,
        overrun,
        uncommitted: Math.max(0, c.estimateCents - agg.committed),
        itemCount: agg.count,
      };
    });

  const contingencyEstimate = contingencyCat?.estimateCents ?? 0;
  const spentDirectly = contingencyCat ? byCategory.get(contingencyCat.id)!.committed : 0;
  const available = contingencyEstimate - overruns + closedSavings - spentDirectly;
  const allocated = categories.reduce((sum, c) => sum + c.estimateCents, 0);

  return {
    totalBudget: totalBudgetCents,
    allocated,
    unallocated: totalBudgetCents - allocated,
    committed,
    paid,
    leftToPay,
    uncommitted: Math.max(0, totalBudgetCents - committed),
    contingency: {
      categoryId: contingencyCat?.id ?? null,
      estimate: contingencyEstimate,
      overruns,
      closedSavings,
      spentDirectly,
      available,
    },
    overBudgetCents: Math.max(0, -available),
    contractedOverBudgetCents: Math.max(0, committed - totalBudgetCents),
    categories: categoryTotals,
    itemTotals: totalsByItem,
  };
}

export type UpcomingPayment = {
  payment: PaymentRow;
  item: ItemRow;
  amountCents: Cents | null;
  daysUntil: number;
  state: DueState;
};

/** Unpaid payments in due-date order, overdue first. */
export function upcomingPayments(
  items: ItemRow[],
  ctx: AmountContext,
  today: CalendarDate,
  limit = 5,
): UpcomingPayment[] {
  const rows: UpcomingPayment[] = [];
  for (const item of items) {
    for (const p of item.payments) {
      if (p.paidDate !== null) continue;
      rows.push({
        payment: p,
        item,
        amountCents: resolvePaymentAmount(p, ctx),
        daysUntil: daysBetween(today, p.dueDate),
        state: dueState(p.dueDate, today),
      });
    }
  }
  rows.sort(
    (a, b) =>
      compareDates(a.payment.dueDate, b.payment.dueDate) ||
      (a.payment.sequence ?? 0) - (b.payment.sequence ?? 0),
  );
  return rows.slice(0, limit);
}
