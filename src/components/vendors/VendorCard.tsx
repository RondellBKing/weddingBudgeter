import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { toneText } from "@/components/ui/Tone";
import type { VendorListItem } from "@/lib/data/vendors";
import { formatDate, relativeDays } from "@/lib/dates";
import { statusGroup, VENDOR_CATEGORY_LABEL } from "@/lib/domain/vendors";
import { formatCents } from "@/lib/money";
import { VendorStatusBadge } from "./VendorStatusBadge";

function Figure({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="grid min-w-0 content-start gap-1">
      <dt className="label-caps text-[10px]">{label}</dt>
      <dd className={`num text-[17px] leading-tight ${muted ? "text-muted" : ""}`}>{value}</dd>
    </div>
  );
}

/** One vendor in the list. The whole card is a link to the vendor's page. */
export function VendorCard({ v }: { v: VendorListItem }) {
  const closed = statusGroup(v.status) === "closed";
  const { money } = v;
  const hasContract = money.items.length > 0;
  const next = money.nextDue;

  return (
    <Card
      as="article"
      className={`group grid content-start gap-4 p-6 transition-colors hover:border-rule-strong has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-desert-rose ${closed ? "bg-ivory/70" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="label-caps text-rose-ink">{VENDOR_CATEGORY_LABEL[v.category]}</span>
        <VendorStatusBadge status={v.status} />
      </div>

      <div className="grid gap-1">
        <h3 className={`text-[26px] leading-[1.1] ${closed ? "text-cocoa" : ""}`}>
          <Link
            href={`/vendors/${v.id}`}
            className="decoration-rule-strong underline-offset-4 group-hover:underline after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
          >
            {v.name}
          </Link>
        </h3>
        <p className="text-sm text-cocoa">
          {v.contactName ?? <span className="text-muted">No contact yet</span>}
          {v.isDemo ? <span className="ml-2 text-[10px] font-semibold tracking-[0.12em] text-gold-ink uppercase">Demo</span> : null}
        </p>
        {v.alsoCovers.length > 0 ? (
          <p className="text-xs text-muted">Also covers {v.alsoCovers.map((c) => VENDOR_CATEGORY_LABEL[c].toLowerCase()).join(", ")}</p>
        ) : null}
      </div>

      <dl className="grid grid-cols-3 gap-3 border-t border-rule pt-4">
        <Figure label="Quote" value={v.quotedCents !== null ? formatCents(v.quotedCents) : "—"} muted={v.quotedCents === null} />
        <Figure label="Committed" value={hasContract ? formatCents(money.committed) : "—"} muted={!hasContract} />
        <Figure label="Paid" value={hasContract ? formatCents(money.paid) : "—"} muted={!hasContract} />
      </dl>

      <div className="grid gap-1 text-[13px]">
        {next ? (
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="label-caps text-[10px]">Next payment</span>
            <span className="num text-chocolate">
              {next.amountCents === null ? "TBD" : formatCents(next.amountCents)} · {formatDate(next.payment.dueDate, "medium")}
            </span>
            <span className={`text-[12px] ${toneText(next.state === "overdue" || next.state === "due-soon" ? next.state : "neutral")}`}>
              ({relativeDays(next.daysUntil).toLowerCase()})
            </span>
          </p>
        ) : hasContract && money.paymentCount > 0 ? (
          <p className="text-garden-ink">All payments made</p>
        ) : (
          <p className="text-muted">{closed ? "Not moving forward" : "No payments scheduled"}</p>
        )}
        {v.openQuestions > 0 ? (
          <p className="text-cocoa">
            {v.openQuestions} {v.openQuestions === 1 ? "question" : "questions"} to ask
          </p>
        ) : null}
      </div>
    </Card>
  );
}
