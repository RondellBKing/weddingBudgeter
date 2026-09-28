import { compareDates, daysBetween, dueState, type CalendarDate } from "../dates";
import type { Cents } from "../money";
import {
  itemTotals,
  resolvePaymentAmount,
  type AmountContext,
  type ItemRow,
  type ItemTotals,
  type PaymentRow,
} from "./budget";

// What we owe a vendor, rolled up from its budget items and their payments. Nothing about a
// vendor's money is stored on the vendor: contracted is the sum of its items' contracts, and
// committed / paid / next-due come from the payment rows (the headcount overage resolved live).

export type VendorPaymentState = "paid" | "overdue" | "due-soon" | "upcoming";

export type VendorPaymentLine = {
  payment: PaymentRow;
  item: ItemRow;
  /** Paid payments keep what was paid; the headcount overage is computed at today's headcount. */
  amountCents: Cents | null;
  /** The amount recalculates until it's paid (the headcount overage). */
  isLive: boolean;
  state: VendorPaymentState;
  /** Days from today to the due date (negative when overdue). */
  daysUntil: number;
};

export type VendorMoney = {
  items: Array<{ item: ItemRow; totals: ItemTotals }>;
  /** Σ contracted amounts of the vendor's items, or null when none has a contract yet. */
  contracted: Cents | null;
  committed: Cents;
  paid: Cents;
  leftToPay: Cents;
  paymentCount: number;
  paidCount: number;
  /** Payments whose amount isn't known yet. */
  unknownAmountCount: number;
  /** Every payment across the vendor's items, by due date. */
  payments: VendorPaymentLine[];
  /** The earliest unpaid payment (overdue ones come first because they're earliest). */
  nextDue: VendorPaymentLine | null;
};

export function paymentState(p: PaymentRow, today: CalendarDate): VendorPaymentState {
  if (p.paidDate !== null) return "paid";
  const s = dueState(p.dueDate, today);
  return s === "on-track" ? "upcoming" : s;
}

export function vendorMoney(
  vendorId: string,
  input: {
    items: ItemRow[];
    ctx: AmountContext;
    today: CalendarDate;
    /** Totals already worked out by summarizeBudget (plan.budget.itemTotals). */
    totals?: Map<string, ItemTotals>;
  },
): VendorMoney {
  const { ctx, today } = input;
  const items = input.items
    .filter((i) => i.vendorId === vendorId)
    .map((item) => ({ item, totals: input.totals?.get(item.id) ?? itemTotals(item, ctx) }));

  const contractedItems = items.filter(({ item }) => item.contractedCents !== null);
  const payments: VendorPaymentLine[] = items
    .flatMap(({ item }) =>
      item.payments.map((payment) => ({
        payment,
        item,
        amountCents: resolvePaymentAmount(payment, ctx),
        isLive: payment.paidDate === null && payment.amountRule !== null,
        state: paymentState(payment, today),
        daysUntil: daysBetween(today, payment.dueDate),
      })),
    )
    .sort(
      (a, b) =>
        compareDates(a.payment.dueDate, b.payment.dueDate) ||
        (a.payment.sequence ?? 0) - (b.payment.sequence ?? 0),
    );

  return {
    items,
    contracted: contractedItems.length ? contractedItems.reduce((s, { item }) => s + (item.contractedCents ?? 0), 0) : null,
    committed: items.reduce((s, { totals }) => s + totals.committed, 0),
    paid: items.reduce((s, { totals }) => s + totals.paid, 0),
    leftToPay: items.reduce((s, { totals }) => s + totals.leftToPay, 0),
    paymentCount: payments.length,
    paidCount: payments.filter((p) => p.state === "paid").length,
    unknownAmountCount: items.reduce((s, { totals }) => s + totals.unknownAmountCount, 0),
    payments,
    nextDue: payments.find((p) => p.state !== "paid") ?? null,
  };
}
