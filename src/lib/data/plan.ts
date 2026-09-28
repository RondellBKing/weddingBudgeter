import "server-only";
import { cache } from "react";
import { requireSession } from "../auth/require-session";
import { fromDbDate, todayIn, type CalendarDate } from "../dates";
import { prisma } from "../db";
import {
  summarizeBudget,
  upcomingPayments,
  type BudgetSummary,
  type CategoryRow,
  type ItemRow,
  type PaymentRow,
  type UpcomingPayment,
} from "../domain/budget";
import {
  computeHeadroom,
  overageCents,
  projectHeadcount,
  type Headroom,
  type OverageRule,
  type ProjectedHeadcount,
} from "../domain/headcount";

// Loads everything the money math needs and runs the pipeline:
// headcount → overage → payments → budget → contingency → headroom.
// Cached per request, so the layout banner and the page share one set of queries.

export type Plan = {
  today: CalendarDate;
  settings: {
    partnerOneName: string;
    partnerTwoName: string;
    weddingDate: CalendarDate;
    ceremonyTime: string | null;
    timezone: string;
    venueName: string;
    venueAddress: string;
    venueAccessTime: string;
    headcountTarget: number;
    totalBudgetCents: number;
    includedHeadcount: number;
    perPersonOverageCents: number;
    overageTaxPpm: number;
    vendorMealsCountTowardHeadcount: boolean;
    dressSizingDeadline: CalendarDate;
  };
  rule: OverageRule;
  headcount: ProjectedHeadcount;
  headroom: Headroom;
  budget: BudgetSummary;
  items: ItemRow[];
  nextPayments: UpcomingPayment[];
  hasDemoData: boolean;
};

export class NotSeededError extends Error {
  constructor() {
    super("The database has no wedding settings yet. Run `npm run seed`.");
  }
}

/**
 * The whole plan, with no session check. Only for callers that authenticate some other way
 * (the calendar feed checks its secret token). Pages and actions use loadPlan().
 */
export async function computePlan(): Promise<Plan> {
  const s = await prisma.weddingSettings.findUnique({ where: { id: 1 } });
  if (!s) throw new NotSeededError();
  const today = todayIn(s.timezone);

  const [categories, items, guestsNotDeclined, anyGuests, vendorMeals, demoCounts] = await Promise.all([
    prisma.budgetCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.budgetItem.findMany({
      include: { payments: true, vendor: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.guest.count({ where: { OR: [{ rsvpStatus: null }, { rsvpStatus: { not: "DECLINED" } }] } }),
    prisma.guest.count(),
    prisma.vendor.aggregate({ where: { status: "BOOKED" }, _sum: { mealsRequired: true } }),
    Promise.all([
      prisma.vendor.count({ where: { isDemo: true } }),
      prisma.guest.count({ where: { isDemo: true } }),
      prisma.task.count({ where: { isDemo: true } }),
      prisma.calendarEvent.count({ where: { isDemo: true } }),
      prisma.budgetItem.count({ where: { isDemo: true } }),
    ]),
  ]);

  const settings: Plan["settings"] = {
    partnerOneName: s.partnerOneName,
    partnerTwoName: s.partnerTwoName,
    weddingDate: fromDbDate(s.weddingDate),
    ceremonyTime: s.ceremonyTime,
    timezone: s.timezone,
    venueName: s.venueName,
    venueAddress: s.venueAddress,
    venueAccessTime: s.venueAccessTime,
    headcountTarget: s.headcountTarget,
    totalBudgetCents: s.totalBudgetCents,
    includedHeadcount: s.includedHeadcount,
    perPersonOverageCents: s.perPersonOverageCents,
    overageTaxPpm: s.overageTaxPpm,
    vendorMealsCountTowardHeadcount: s.vendorMealsCountTowardHeadcount,
    dressSizingDeadline: fromDbDate(s.dressSizingDeadline),
  };

  const rule: OverageRule = {
    includedHeadcount: s.includedHeadcount,
    perPersonOverageCents: s.perPersonOverageCents,
    overageTaxPpm: s.overageTaxPpm,
  };

  const headcount = projectHeadcount({
    guestsNotDeclined,
    hasGuestList: anyGuests > 0,
    headcountTarget: s.headcountTarget,
    vendorMeals: vendorMeals._sum.mealsRequired ?? 0,
    vendorMealsCountTowardHeadcount: s.vendorMealsCountTowardHeadcount,
  });
  const ctx = { headcountOverageCents: overageCents(headcount.headcount, rule) };

  const categoryRows: CategoryRow[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    estimateCents: c.estimateCents,
    sortOrder: c.sortOrder,
    isContingency: c.isContingency,
    isClosed: c.isClosed,
  }));

  const itemRows: ItemRow[] = items.map((i) => ({
    id: i.id,
    categoryId: i.categoryId,
    vendorId: i.vendorId,
    vendorName: i.vendor?.name ?? null,
    description: i.description,
    estimateCents: i.estimateCents,
    contractedCents: i.contractedCents,
    payments: i.payments.map(
      (p): PaymentRow => ({
        id: p.id,
        budgetItemId: p.budgetItemId,
        sequence: p.sequence,
        kind: p.kind,
        amountCents: p.amountCents,
        amountRule: p.amountRule,
        isEstimate: p.isEstimate,
        dueDate: fromDbDate(p.dueDate),
        paidDate: fromDbDate(p.paidDate),
        notes: p.notes,
      }),
    ),
  }));

  const budget = summarizeBudget({
    totalBudgetCents: s.totalBudgetCents,
    categories: categoryRows,
    items: itemRows,
    ctx,
  });

  return {
    today,
    settings,
    rule,
    headcount,
    headroom: computeHeadroom(headcount.headcount, rule, budget.contingency.available),
    budget,
    items: itemRows,
    nextPayments: upcomingPayments(itemRows, ctx, today, 5),
    hasDemoData: demoCounts.some((n) => n > 0),
  };
}

/** The plan for the signed-in couple. Cached per request, so the layout and page share one load. */
export const loadPlan = cache(async (): Promise<Plan> => {
  await requireSession();
  return computePlan();
});
