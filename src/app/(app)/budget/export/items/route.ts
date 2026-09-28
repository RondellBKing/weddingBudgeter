import { requireSession } from "@/lib/auth/require-session";
import { centsForCsv, csvResponse, toCsv } from "@/lib/csv";
import { loadPlan } from "@/lib/data/plan";
import { itemTableRows } from "@/lib/domain/payments";

export async function GET() {
  await requireSession();
  const plan = await loadPlan();
  const names = new Map(plan.budget.categories.map((c) => [c.id, c.name]));
  const rows = itemTableRows(plan.items, plan.budget.itemTotals, names);
  const csv = toCsv(rows, [
    { header: "Category", value: (r) => r.categoryName },
    { header: "Item", value: (r) => r.description },
    { header: "Vendor", value: (r) => r.vendorName ?? "" },
    { header: "Estimate", value: (r) => centsForCsv(r.estimateCents) },
    { header: "Contracted", value: (r) => centsForCsv(r.contractedCents) },
    { header: "Committed", value: (r) => centsForCsv(r.committed) },
    { header: "Paid", value: (r) => centsForCsv(r.paid) },
    { header: "Left to pay", value: (r) => centsForCsv(r.leftToPay) },
    { header: "Next payment due", value: (r) => r.nextDue ?? "" },
  ]);
  return csvResponse(`wedding-budget-items-${plan.today}.csv`, csv);
}
