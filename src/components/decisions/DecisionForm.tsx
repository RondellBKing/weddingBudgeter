"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { DecisionFormState } from "@/app/(app)/decisions/actions";
import { FormMessage, SelectField, TextareaField, TextField } from "@/components/form/Fields";
import { SubmitButton } from "@/components/form/SubmitButton";
import { buttonClass } from "@/components/ui/Button";
import { PARTNER_LABEL, optionsFrom } from "@/lib/labels";

export type DecisionFormValues = {
  decidedOn: string;
  title: string;
  decision: string;
  rationale: string;
  decidedBy: string;
  vendorId: string;
  budgetItemId: string;
};

type Option = { value: string; label: string };

const initial: DecisionFormState = { ok: true, message: "" };

export function DecisionForm({
  action,
  values,
  vendors,
  budgetItems,
  submitLabel,
}: {
  action: (prev: DecisionFormState, form: FormData) => Promise<DecisionFormState>;
  values: DecisionFormValues;
  vendors: Option[];
  budgetItems: Option[];
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, initial);
  const e = state.errors ?? {};
  const typed = state.values;
  const v = (k: keyof DecisionFormValues) => (typed ? (typed[k] ?? "") : values[k]);

  return (
    // Remount with the typed values after a failed save, so the selects keep them.
    <form key={typed ? JSON.stringify(typed) : "form"} action={formAction} className="grid gap-9">
      <fieldset className="grid gap-5">
        <legend className="float-left mb-1 w-full font-display text-2xl">
          The <em className="italic">decision</em>
        </legend>
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <TextField name="title" label="About" required defaultValue={v("title")} error={e.title} placeholder="Photographer" />
          <TextField name="decidedOn" label="Decided on" type="date" required defaultValue={v("decidedOn")} error={e.decidedOn} />
        </div>
        <TextareaField
          name="decision"
          label="What we chose"
          rows={3}
          defaultValue={v("decision")}
          error={e.decision}
          placeholder="We're going with the eight-hour package, second shooter included."
        />
        <TextareaField
          name="rationale"
          label="Why (optional)"
          rows={3}
          defaultValue={v("rationale")}
          error={e.rationale}
          placeholder="So we remember later what tipped it."
        />
        <SelectField
          name="decidedBy"
          label="Decided by"
          options={optionsFrom(PARTNER_LABEL)}
          defaultValue={v("decidedBy")}
          error={e.decidedBy}
          className="sm:max-w-xs"
        />
      </fieldset>

      <fieldset className="grid gap-5 border-t border-rule pt-8">
        <legend className="float-left mb-1 w-full font-display text-2xl">
          Linked <em className="italic">to</em>
        </legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField name="vendorId" label="Vendor" options={vendors} placeholder="No vendor" defaultValue={v("vendorId")} error={e.vendorId} />
          <SelectField
            name="budgetItemId"
            label="Budget line"
            options={budgetItems}
            placeholder="No budget line"
            defaultValue={v("budgetItemId")}
            error={e.budgetItemId}
          />
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4 border-t border-rule pt-7">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link href="/decisions" className={buttonClass("secondary")}>
          Cancel
        </Link>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
