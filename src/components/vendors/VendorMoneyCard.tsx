import Link from "next/link";
import { Card, CardHeading } from "@/components/ui/Card";
import { buttonClass } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Meter } from "@/components/ui/Meter";
import { Stat, StatRow } from "@/components/ui/Stat";
import type { PaymentKind } from "@/generated/prisma/enums";
import { formatDate, relativeDays } from "@/lib/dates";
import type { VendorMoney, VendorPaymentLine } from "@/lib/domain/vendor-money";
import { PAYMENT_KIND_LABEL } from "@/lib/labels";
import { formatCents } from "@/lib/money";
import { PaymentStateBadge } from "./PaymentStateBadge";

function paymentTitle(line: VendorPaymentLine) {
  const { payment: p, item } = line;
  const kind = PAYMENT_KIND_LABEL[p.kind as PaymentKind] ?? "Payment";
  return p.sequence ? `${kind} · ${p.sequence} of ${item.payments.length}` : kind;
}

function amountText(line: VendorPaymentLine) {
  if (line.amountCents === null) return "TBD";
  const estimate = line.state !== "paid" && (line.isLive || line.payment.isEstimate);
  return `${estimate ? "est. " : ""}${formatCents(line.amountCents)}`;
}

/**
 * What we owe a vendor: quote vs. contract vs. committed, what's paid, and every payment across
 * its budget items. All of it is worked out from the budget items and payments.
 */
export function VendorMoneyCard({
  vendorId,
  vendorName,
  quotedCents,
  money,
  categoryName,
  headcount,
}: {
  vendorId: string;
  vendorName: string;
  quotedCents: number | null;
  money: VendorMoney;
  categoryName: Map<string, string>;
  headcount: number;
}) {
  const addHref = `/budget/items/new?vendorId=${encodeURIComponent(vendorId)}`;
  const hasItems = money.items.length > 0;
  const multipleItems = money.items.length > 1;

  return (
    <Card className="grid gap-7 p-6 sm:p-8" aria-labelledby="money-h">
      <CardHeading
        id="money-h"
        title="Money"
        action={
          hasItems ? (
            <Link href={addHref} className={buttonClass("secondary", "sm")}>
              Add a contract or budget item
            </Link>
          ) : undefined
        }
      />

      {hasItems ? (
        <StatRow label={`Money for ${vendorName}`}>
          <Stat label="Quoted" value={quotedCents !== null ? formatCents(quotedCents) : "—"} sub="their price before booking" />
          <Stat
            label="Contracted"
            value={money.contracted !== null ? formatCents(money.contracted) : "—"}
            sub={money.contracted !== null ? "signed amount" : "no contract yet"}
          />
          <Stat label="Committed" value={formatCents(money.committed)} sub="contract or payments, the larger" />
          <Stat label="Paid" value={formatCents(money.paid)} sub={`${money.paidCount} of ${money.paymentCount} payments`} />
          <Stat
            label="Left to pay"
            value={formatCents(money.leftToPay)}
            sub={money.nextDue ? `next ${formatDate(money.nextDue.payment.dueDate, "medium")}` : "nothing due"}
          />
        </StatRow>
      ) : null}

      {money.committed > 0 ? (
        <Meter
          label="Paid so far"
          value={money.paid}
          max={money.committed}
          detail={`${formatCents(money.paid)} of ${formatCents(money.committed)}`}
          fill="bg-desert-rose"
        />
      ) : null}

      {hasItems ? (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-10">
          <section aria-labelledby="payments-h" className="grid content-start gap-2">
            <h3 id="payments-h" className="label-caps">
              Payments
            </h3>
            {money.payments.length === 0 ? (
              <p className="text-sm text-muted">No payments scheduled yet. Add them from the budget item.</p>
            ) : (
              <ol className="grid">
                {money.payments.map((line) => {
                  const p = line.payment;
                  return (
                    <li
                      key={p.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1 border-b border-rule py-3.5 last:border-b-0 sm:grid-cols-[8.5rem_minmax(0,1fr)_auto]"
                    >
                      <span className="num text-sm text-cocoa max-sm:col-span-2">{formatDate(p.dueDate, "weekday-medium")}</span>
                      <span className="min-w-0">
                        <span className="block">{paymentTitle(line)}</span>
                        <span className="block text-xs text-muted">
                          {[
                            multipleItems ? line.item.description : null,
                            line.isLive ? `At today's headcount of ${headcount}` : null,
                            p.notes,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <span className="grid justify-items-end gap-1 text-right">
                        <span className="num">{amountText(line)}</span>
                        <PaymentStateBadge state={line.state} />
                        <span className="num text-[11px] text-muted">
                          {line.state === "paid" && p.paidDate ? formatDate(p.paidDate, "medium") : relativeDays(line.daysUntil)}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section aria-labelledby="items-h" className="grid content-start gap-2">
            <h3 id="items-h" className="label-caps">
              Budget {money.items.length === 1 ? "item" : "items"}
            </h3>
            <ul className="grid">
              {money.items.map(({ item, totals }) => (
                <li key={item.id} className="grid gap-2 border-b border-rule py-3.5 last:border-b-0">
                  <div className="grid gap-0.5">
                    <span>{item.description}</span>
                    <span className="text-xs text-muted">{categoryName.get(item.categoryId) ?? "Budget"}</span>
                  </div>
                  <dl className="grid grid-cols-3 gap-3 text-sm">
                    {[
                      ["Contract", item.contractedCents !== null ? formatCents(item.contractedCents) : "—"],
                      ["Committed", formatCents(totals.committed)],
                      ["Paid", formatCents(totals.paid)],
                    ].map(([label, value]) => (
                      <div key={label} className="grid gap-0.5">
                        <dt className="label-caps text-[10px]">{label}</dt>
                        <dd className="num">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  {totals.reconciliation === "payments-short" ? (
                    <p className="text-xs text-gold-ink">The scheduled payments add up to less than the contract.</p>
                  ) : totals.reconciliation === "payments-over" ? (
                    <p className="text-xs text-gold-ink">The scheduled payments add up to more than the contract.</p>
                  ) : null}
                  <Link
                    href={`/budget/items/${item.id}`}
                    className="inline-flex items-center gap-1.5 justify-self-start text-[13px] text-rose-ink hover:text-chocolate"
                  >
                    Manage payments
                    <span className="sr-only"> for {item.description}</span>
                    <Icon name="arrow" size={14} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-center sm:gap-8">
          <div className="grid content-start gap-2">
            <span className="label-caps">Quoted</span>
            <span className="num text-[30px] leading-none">{quotedCents !== null ? formatCents(quotedCents) : "—"}</span>
            <span className="text-xs text-muted">{quotedCents !== null ? "their price before booking" : "no quote yet"}</span>
          </div>
          <div className="grid justify-items-start gap-4 rounded-[3px] border border-dashed border-rule-strong px-5 py-5 sm:px-6">
            <p className="max-w-prose text-sm leading-relaxed text-cocoa">
              Nothing on the budget for {vendorName} yet. Once we book, add the contract as a budget item and schedule
              its payments. Committed, paid and what&rsquo;s due next are worked out from those.
            </p>
            <Link href={addHref} className={buttonClass("secondary", "sm")}>
              Add a contract or budget item
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
}
