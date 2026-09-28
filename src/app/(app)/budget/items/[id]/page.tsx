import Link from "next/link";
import { ItemForm } from "@/components/budget/ItemForm";
import { MarkPaidForm } from "@/components/budget/MarkPaidForm";
import { PaymentForm } from "@/components/budget/PaymentForm";
import { ConfirmButton } from "@/components/form/ConfirmButton";
import { buttonClass } from "@/components/ui/Button";
import { Card, CardHeading } from "@/components/ui/Card";
import { Meter } from "@/components/ui/Meter";
import { PageTitle } from "@/components/ui/PageTitle";
import { ToneBadge } from "@/components/ui/Tone";
import { loadBudgetItemPage } from "@/lib/data/budget";
import { daysBetween, dueState, formatDate, relativeDays } from "@/lib/dates";
import { resolvePaymentAmount } from "@/lib/domain/budget";
import { amountModeOf } from "@/lib/domain/payments";
import { PAYMENT_KIND_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/labels";
import { centsToInputValue, formatCents } from "@/lib/money";
import { createPayment, deleteItem, deletePayment, markPaid, markUnpaid, updateItem, updatePayment } from "../../actions";

export const metadata = { title: "Budget item" };

const RECONCILE: Record<string, string> = {
  "payments-short": "The scheduled payments add up to less than the contract.",
  "payments-over": "The scheduled payments add up to more than the contract.",
};

export default async function ItemPage({ params, searchParams }: PageProps<"/budget/items/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const { plan, item, row, extras, totals, categories, vendors } = await loadBudgetItemPage(id);
  const ctx = { headcountOverageCents: plan.headroom.overageCents };
  const payments = item.payments.slice().sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : (a.sequence ?? 0) - (b.sequence ?? 0)));
  const paidCount = payments.filter((p) => p.paidDate).length;
  const paidOnes = payments.filter((p) => p.paidDate);
  const paidTotal = paidOnes.reduce((s, p) => s + (p.amountCents ?? 0), 0);
  const warning = RECONCILE[totals.reconciliation];

  return (
    <div className="grid gap-8 sm:gap-10">
      <PageTitle
        lead=""
        word={item.description}
        eyebrow={`${row.category.name}${row.vendor ? ` · ${row.vendor.name}` : ""}`}
        intro={sp.created ? "Created. Now add its payments: every deposit and installment gets its own row with a due date." : undefined}
        actions={
          row.vendor ? (
            <Link href={`/vendors/${row.vendor.id}`} className={buttonClass("secondary", "sm")}>
              Vendor page
            </Link>
          ) : null
        }
      />

      <Card className="grid gap-6 p-6 sm:grid-cols-4 sm:p-7">
        {[
          ["Contracted", item.contractedCents === null ? "—" : formatCents(item.contractedCents)],
          ["Committed", formatCents(totals.committed)],
          ["Paid", formatCents(totals.paid)],
          ["Left to pay", formatCents(totals.leftToPay)],
        ].map(([label, value]) => (
          <div key={label} className="grid gap-1.5">
            <span className="label-caps">{label}</span>
            <span className="num font-display text-[34px] leading-none">{value}</span>
          </div>
        ))}
        <div className="sm:col-span-4">
          <Meter label="Payments made" value={paidCount} max={payments.length} fill="bg-desert-rose" />
          {warning ? <p className="mt-3 text-sm text-gold-ink">{warning} Check the amounts below.</p> : null}
        </div>
      </Card>

      <Card className="grid gap-5 p-6 sm:p-7" aria-labelledby="payments-h">
        <CardHeading id="payments-h" title="Payments" />
        {payments.length === 0 ? (
          <p className="text-cocoa">No payments yet. Add the first one below.</p>
        ) : (
          <ol className="grid">
            {payments.map((p) => {
              const amount = resolvePaymentAmount(p, ctx);
              const state = dueState(p.dueDate, plan.today);
              const days = daysBetween(plan.today, p.dueDate);
              const extra = extras.get(p.id);
              return (
                <li key={p.id} className="grid gap-3 border-b border-rule py-5 last:border-b-0">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1 sm:grid-cols-[3rem_10rem_minmax(0,1fr)_auto]">
                    <span className="font-display text-2xl text-muted italic max-sm:hidden">{p.sequence ?? "·"}</span>
                    <span className="num text-sm text-cocoa">Due {formatDate(p.dueDate, "medium")}</span>
                    <span className="min-w-0 max-sm:col-span-2 max-sm:row-start-2">
                      <span className="block">{PAYMENT_KIND_LABEL[p.kind as keyof typeof PAYMENT_KIND_LABEL] ?? "Payment"}</span>
                      <span className="block text-xs text-muted">
                        {[
                          p.amountRule && !p.paidDate ? "Worked out from the headcount until it's paid" : p.notes,
                          p.paidDate
                            ? `Paid ${formatDate(p.paidDate, "medium")}${extra?.method ? ` by ${PAYMENT_METHOD_LABEL[extra.method]}` : ""}`
                            : null,
                          extra?.reference ? `Confirmation #${extra.reference}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="num block text-lg">
                        {amount === null ? "TBD" : `${p.isEstimate && !p.paidDate ? "est. " : ""}${formatCents(amount)}`}
                      </span>
                      {p.paidDate ? (
                        <ToneBadge tone="on-track">Paid</ToneBadge>
                      ) : (
                        <ToneBadge tone={state === "overdue" ? "overdue" : state === "due-soon" ? "due-soon" : "neutral"}>
                          {relativeDays(days)}
                        </ToneBadge>
                      )}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-3 sm:pl-[3rem]">
                    {!p.paidDate ? (
                      <details className="w-full">
                        <summary className="cursor-pointer text-[13px] font-medium text-rose-ink">Mark paid</summary>
                        <div className="mt-3 rounded-[3px] border border-rule bg-ivory/50 p-4">
                          <MarkPaidForm
                            id={`pay-${p.id}`}
                            action={markPaid.bind(null, p.id)}
                            today={plan.today}
                            amount={amount === null ? "" : centsToInputValue(amount)}
                            amountHint={p.amountRule ? "Pre-filled with today's headcount amount. Paying locks it in." : undefined}
                          />
                        </div>
                      </details>
                    ) : (
                      <form action={markUnpaid.bind(null, p.id)}>
                        <button type="submit" className="text-[13px] text-rose-ink hover:text-chocolate">
                          Mark unpaid
                        </button>
                      </form>
                    )}
                    <details className="w-full">
                      <summary className="cursor-pointer text-[13px] text-cocoa">Edit this payment</summary>
                      <div className="mt-3 grid gap-4 rounded-[3px] border border-rule p-4">
                        <PaymentForm
                          idPrefix={`p${p.id}-`}
                          action={updatePayment.bind(null, p.id)}
                          submitLabel="Save payment"
                          values={{
                            kind: p.kind,
                            amountMode: amountModeOf(p),
                            amount: p.amountCents === null ? "" : centsToInputValue(p.amountCents),
                            dueDate: p.dueDate,
                            paidDate: p.paidDate ?? "",
                            method: extra?.method ?? "",
                            reference: extra?.reference ?? "",
                            notes: p.notes ?? "",
                          }}
                        />
                        <div>
                          <ConfirmButton action={deletePayment.bind(null, p.id)} question="Delete this payment?" confirmLabel="Delete payment">
                            Delete payment
                          </ConfirmButton>
                        </div>
                      </div>
                    </details>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      <Card className="grid gap-5 p-6 sm:p-7" aria-labelledby="add-pay-h">
        <CardHeading id="add-pay-h" title="Add a payment" />
        <PaymentForm
          idPrefix="new-"
          action={createPayment.bind(null, id)}
          submitLabel="Add payment"
          values={{ kind: "INSTALLMENT", amountMode: "fixed", amount: "", dueDate: "", paidDate: "", method: "", reference: "", notes: "" }}
        />
      </Card>

      <Card className="grid gap-5 p-6 sm:p-7" aria-labelledby="item-h">
        <CardHeading id="item-h" title="Item details" />
        <ItemForm
          action={updateItem.bind(null, id)}
          submitLabel="Save item"
          categories={categories}
          vendors={vendors}
          values={{
            categoryId: item.categoryId,
            vendorId: item.vendorId ?? "",
            description: item.description,
            estimate: centsToInputValue(item.estimateCents),
            contracted: centsToInputValue(item.contractedCents),
            notes: row.notes ?? "",
          }}
        />
        <div className="border-t border-rule pt-5">
          <ConfirmButton
            action={deleteItem.bind(null, id)}
            question={
              paidOnes.length > 0
                ? `Delete this item and its ${payments.length} payments, including ${formatCents(paidTotal)} already paid?`
                : `Delete this item${payments.length ? ` and its ${payments.length} payments` : ""}?`
            }
            confirmLabel="Delete item"
          >
            Delete item
          </ConfirmButton>
        </div>
      </Card>

      <Link href="/budget?view=items" className="text-sm text-rose-ink hover:text-chocolate">
        ← Back to budget items
      </Link>
    </div>
  );
}
