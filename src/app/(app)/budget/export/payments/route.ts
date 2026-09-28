import { requireSession } from "@/lib/auth/require-session";
import { centsForCsv, csvResponse, toCsv } from "@/lib/csv";
import { loadPlan } from "@/lib/data/plan";
import { scheduleByMonth } from "@/lib/domain/payments";
import { PAYMENT_KIND_LABEL } from "@/lib/labels";

export async function GET() {
  await requireSession();
  const plan = await loadPlan();
  const names = new Map(plan.budget.categories.map((c) => [c.id, c.name]));
  const rows = scheduleByMonth(plan.items, { headcountOverageCents: plan.headroom.overageCents }).flatMap((m) => m.rows);
  const csv = toCsv(rows, [
    { header: "Due", value: (r) => r.payment.dueDate },
    { header: "Vendor", value: (r) => r.item.vendorName ?? "" },
    { header: "Item", value: (r) => r.item.description },
    { header: "Category", value: (r) => names.get(r.item.categoryId) ?? "" },
    { header: "Payment", value: (r) => (r.payment.sequence ? `${r.payment.sequence} of ${r.item.payments.length}` : "") },
    { header: "Kind", value: (r) => PAYMENT_KIND_LABEL[r.payment.kind as keyof typeof PAYMENT_KIND_LABEL] ?? r.payment.kind },
    { header: "Amount", value: (r) => centsForCsv(r.amountCents) },
    { header: "Estimate", value: (r) => (r.payment.isEstimate && !r.payment.paidDate ? "yes" : "") },
    { header: "Paid on", value: (r) => r.payment.paidDate ?? "" },
    { header: "Notes", value: (r) => r.payment.notes ?? "" },
  ]);
  return csvResponse(`wedding-payment-schedule-${plan.today}.csv`, csv);
}
