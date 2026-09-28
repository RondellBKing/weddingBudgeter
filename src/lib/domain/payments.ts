import { compareDates, formatDate, monthKey, type CalendarDate } from "../dates";
import type { Cents } from "../money";
import { resolvePaymentAmount, type AmountContext, type ItemRow, type ItemTotals, type PaymentRow } from "./budget";

// Payment rules used by the budget screens. Payments are the spine: every "paid" and
// "remaining" number comes from these rows, so these functions decide what a row means.

export type AmountMode = "fixed" | "unknown" | "overage";

/** How a payment's amount is described in the form. */
export function amountModeOf(p: Pick<PaymentRow, "amountCents" | "amountRule" | "paidDate">): AmountMode {
  if (p.amountRule === "HEADCOUNT_OVERAGE") return "overage";
  if (p.amountCents === null) return "unknown";
  return "fixed";
}

/** The next "Payment N of M" number for an item. */
export function nextSequence(existing: Array<{ sequence: number | null }>): number {
  return existing.reduce((max, p) => Math.max(max, p.sequence ?? 0), 0) + 1;
}

export type MarkPaidInput = { paidDate: CalendarDate; amountCents: Cents | null };

/**
 * What to store when a payment is marked paid. A paid payment always has a real amount
 * (the database enforces it), so a computed payment freezes at today's computed value unless
 * a different amount is given, and a payment with an unknown amount needs one.
 */
export function planMarkPaid(
  p: Pick<PaymentRow, "amountCents" | "amountRule" | "paidDate">,
  input: MarkPaidInput,
  ctx: AmountContext,
): { ok: true; paidDate: CalendarDate; amountCents: Cents } | { ok: false; message: string } {
  const amount = input.amountCents ?? resolvePaymentAmount({ ...p, paidDate: null } as PaymentRow, ctx);
  if (amount === null) return { ok: false, message: "Enter the amount you paid." };
  return { ok: true, paidDate: input.paidDate, amountCents: amount };
}

/** Undo "paid". A computed payment goes back to being computed live. */
export function planMarkUnpaid(p: Pick<PaymentRow, "amountCents" | "amountRule">): { paidDate: null; amountCents: Cents | null } {
  return { paidDate: null, amountCents: p.amountRule ? null : p.amountCents };
}

export type ScheduleRow = {
  payment: PaymentRow;
  item: ItemRow;
  amountCents: Cents | null;
};

export type ScheduleMonth = {
  key: string;
  label: string;
  rows: ScheduleRow[];
  dueCents: Cents;
  paidCents: Cents;
  unknownCount: number;
};

/** Every payment across all items, grouped by the month it's due (cash flow). */
export function scheduleByMonth(
  items: ItemRow[],
  ctx: AmountContext,
  filter: "all" | "upcoming" | "paid" = "all",
): ScheduleMonth[] {
  const rows: ScheduleRow[] = items
    .flatMap((item) => item.payments.map((payment) => ({ payment, item, amountCents: resolvePaymentAmount(payment, ctx) })))
    .filter((r) => (filter === "upcoming" ? r.payment.paidDate === null : filter === "paid" ? r.payment.paidDate !== null : true))
    .sort(
      (a, b) =>
        compareDates(a.payment.dueDate, b.payment.dueDate) ||
        (a.payment.sequence ?? 0) - (b.payment.sequence ?? 0) ||
        a.item.description.localeCompare(b.item.description),
    );

  const months: ScheduleMonth[] = [];
  for (const r of rows) {
    const key = monthKey(r.payment.dueDate);
    let m = months[months.length - 1];
    if (!m || m.key !== key) {
      m = { key, label: formatDate(`${key}-01` as CalendarDate, "month-year"), rows: [], dueCents: 0, paidCents: 0, unknownCount: 0 };
      months.push(m);
    }
    m.rows.push(r);
    if (r.amountCents === null) m.unknownCount++;
    else if (r.payment.paidDate) m.paidCents += r.amountCents;
    else m.dueCents += r.amountCents;
  }
  return months;
}

export type ItemTableRow = {
  id: string;
  categoryId: string;
  categoryName: string;
  vendorId: string | null;
  vendorName: string | null;
  description: string;
  estimateCents: Cents | null;
  contractedCents: Cents | null;
  paid: Cents;
  leftToPay: Cents;
  committed: Cents;
  nextDue: CalendarDate | null;
};

export function itemTableRows(items: ItemRow[], totals: Map<string, ItemTotals>, categoryNames: Map<string, string>): ItemTableRow[] {
  return items.map((i) => {
    const t = totals.get(i.id);
    return {
      id: i.id,
      categoryId: i.categoryId,
      categoryName: categoryNames.get(i.categoryId) ?? "",
      vendorId: i.vendorId,
      vendorName: i.vendorName ?? null,
      description: i.description,
      estimateCents: i.estimateCents,
      contractedCents: i.contractedCents,
      paid: t?.paid ?? 0,
      leftToPay: t?.leftToPay ?? 0,
      committed: t?.committed ?? 0,
      nextDue: t?.nextDue?.payment.dueDate ?? null,
    };
  });
}

export type SortKey = "category" | "description" | "vendor" | "estimate" | "contracted" | "paid" | "leftToPay" | "nextDue";

/** Sort budget item rows. Empty values always sort last. */
export function sortItemRows(rows: ItemTableRow[], key: SortKey, dir: "asc" | "desc"): ItemTableRow[] {
  const value = (r: ItemTableRow): string | number | null => {
    switch (key) {
      case "category":
        return r.categoryName.toLowerCase();
      case "description":
        return r.description.toLowerCase();
      case "vendor":
        return r.vendorName?.toLowerCase() ?? null;
      case "estimate":
        return r.estimateCents;
      case "contracted":
        return r.contractedCents;
      case "paid":
        return r.paid;
      case "leftToPay":
        return r.leftToPay;
      case "nextDue":
        return r.nextDue;
    }
  };
  const sign = dir === "asc" ? 1 : -1;
  return rows.slice().sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    if (va === null && vb === null) return a.description.localeCompare(b.description);
    if (va === null) return 1;
    if (vb === null) return -1;
    const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
    return cmp * sign || a.description.localeCompare(b.description);
  });
}

export function filterItemRows(rows: ItemTableRow[], f: { categoryId?: string; vendorId?: string }): ItemTableRow[] {
  return rows.filter(
    (r) =>
      (!f.categoryId || r.categoryId === f.categoryId) &&
      (!f.vendorId || (f.vendorId === "none" ? r.vendorId === null : r.vendorId === f.vendorId)),
  );
}
