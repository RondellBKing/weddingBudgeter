"use client";

import { useActionState } from "react";
import { inputClass } from "@/components/form/Fields";
import { SubmitButton } from "@/components/form/SubmitButton";
import { idleState, type ActionState } from "@/lib/forms";
import { optionsFrom, PAYMENT_METHOD_LABEL } from "@/lib/labels";

/** Compact "mark paid" form: date (today by default), amount (pre-filled), method, confirmation. */
export function MarkPaidForm({
  action,
  today,
  amount,
  amountHint,
  id,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  today: string;
  amount: string;
  amountHint?: string;
  id: string;
}) {
  const [state, formAction] = useActionState(action, idleState);
  const e = state.errors ?? {};
  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-[9.5rem_8.5rem_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
      <label className="grid gap-1">
        <span className="label-caps text-[10px]">Paid on</span>
        <input name="paidDate" type="date" defaultValue={today} required className={`${inputClass} num py-2`} />
      </label>
      <label className="grid gap-1">
        <span className="label-caps text-[10px]">Amount</span>
        <span className="relative">
          <span aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted">
            $
          </span>
          <input
            name="amount"
            inputMode="decimal"
            defaultValue={amount}
            placeholder="0.00"
            aria-invalid={e.amount ? true : undefined}
            aria-describedby={`${id}-amount-hint`}
            className={`${inputClass} num py-2 pl-6`}
          />
        </span>
      </label>
      <label className="grid gap-1">
        <span className="label-caps text-[10px]">Paid by</span>
        <select name="method" defaultValue="" className={`${inputClass} py-2`}>
          <option value="">—</option>
          {optionsFrom(PAYMENT_METHOD_LABEL).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1">
        <span className="label-caps text-[10px]">Confirmation</span>
        <input name="reference" className={`${inputClass} py-2`} />
      </label>
      <SubmitButton size="sm" pendingLabel="Saving…">
        Mark paid
      </SubmitButton>
      <p id={`${id}-amount-hint`} className={`text-xs sm:col-span-5 ${e.amount || !state.ok ? "text-brick" : state.message ? "text-garden-ink" : "text-muted"}`}>
        {e.amount ?? (state.message || amountHint || "")}
      </p>
    </form>
  );
}
