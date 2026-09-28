"use client";

import { useActionState, useState } from "react";
import { FormMessage, MoneyField, SelectField, TextField, TextareaField } from "@/components/form/Fields";
import { SubmitButton } from "@/components/form/SubmitButton";
import type { AmountMode } from "@/lib/domain/payments";
import { idleState, type ActionState } from "@/lib/forms";
import { optionsFrom, PAYMENT_KIND_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/labels";

export type PaymentFormValues = {
  kind: string;
  amountMode: AmountMode;
  amount: string;
  dueDate: string;
  paidDate: string;
  method: string;
  reference: string;
  notes: string;
};

const MODES: Array<{ value: AmountMode; label: string; hint: string }> = [
  { value: "fixed", label: "A set amount", hint: "" },
  { value: "unknown", label: "Not known yet", hint: "You'll fill in the amount later." },
  { value: "overage", label: "Headcount overage", hint: "Worked out live from the headcount until it's paid." },
];

export function PaymentForm({
  action,
  values,
  submitLabel,
  idPrefix,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  values: PaymentFormValues;
  submitLabel: string;
  /** Unique per form on the page. */
  idPrefix: string;
}) {
  const [state, formAction] = useActionState(action, idleState);
  const [mode, setMode] = useState<AmountMode>(values.amountMode);
  const e = state.errors ?? {};
  return (
    <form action={formAction} className="grid gap-5">
      <fieldset className="grid gap-2">
        <legend className="label-caps mb-1">How much</legend>
        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <label
              key={m.value}
              className={`cursor-pointer rounded-[3px] border px-3 py-2 text-sm transition-colors ${
                mode === m.value ? "border-desert-rose bg-linen/60 text-chocolate" : "border-rule-strong text-cocoa hover:border-chocolate"
              }`}
            >
              <input
                type="radio"
                name="amountMode"
                value={m.value}
                checked={mode === m.value}
                onChange={() => setMode(m.value)}
                className="sr-only"
              />
              {m.label}
            </label>
          ))}
        </div>
        {MODES.find((m) => m.value === mode)?.hint ? (
          <p className="text-[13px] text-muted">{MODES.find((m) => m.value === mode)?.hint}</p>
        ) : null}
        {e.amountMode ? <p className="text-[13px] text-brick">{e.amountMode}</p> : null}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-3">
        {mode !== "overage" ? (
          <MoneyField idPrefix={idPrefix} name="amount" label={mode === "unknown" ? "Amount (if known)" : "Amount"} defaultValue={values.amount} error={e.amount} />
        ) : null}
        <TextField idPrefix={idPrefix} name="dueDate" label="Due" type="date" defaultValue={values.dueDate} error={e.dueDate} required />
        <SelectField idPrefix={idPrefix} name="kind" label="Kind" defaultValue={values.kind} error={e.kind} options={optionsFrom(PAYMENT_KIND_LABEL)} />
      </div>

      <details className="group rounded-[3px] border border-rule px-4 py-3" open={Boolean(values.paidDate)}>
        <summary className="cursor-pointer text-sm text-cocoa">Already paid? Method and confirmation number</summary>
        <div className="mt-4 grid gap-5 sm:grid-cols-3">
          <TextField idPrefix={idPrefix} name="paidDate" label="Paid on" type="date" defaultValue={values.paidDate} error={e.paidDate} />
          <SelectField idPrefix={idPrefix} name="method" label="Paid by" defaultValue={values.method} options={optionsFrom(PAYMENT_METHOD_LABEL)} placeholder="—" />
          <TextField idPrefix={idPrefix} name="reference" label="Confirmation number" defaultValue={values.reference} error={e.reference} />
          {mode === "overage" ? (
            <MoneyField
              idPrefix={idPrefix}
              name="amount"
              label="Amount paid"
              defaultValue={values.amount}
              error={e.amount}
              hint="Leave blank to use today's headcount amount"
            />
          ) : null}
        </div>
      </details>

      <TextareaField idPrefix={idPrefix} name="notes" label="Notes" defaultValue={values.notes} error={e.notes} rows={2} />
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton size="sm">{submitLabel}</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
