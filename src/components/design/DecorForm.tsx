"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { DesignFormState } from "@/app/(app)/design/actions";
import { FormMessage, SelectField, TextareaField, TextField } from "@/components/form/Fields";
import { SubmitButton } from "@/components/form/SubmitButton";
import { buttonClass } from "@/components/ui/Button";
import { DECOR_SOURCE_LABEL, DESIGN_AREA_LABEL, optionsFrom } from "@/lib/labels";

export type DecorFormValues = {
  name: string;
  area: string;
  quantity: string;
  source: string;
  vendorId: string;
  budgetItemId: string;
  orderedOn: string;
  receivedOn: string;
  returnBy: string;
  returnedOn: string;
  notes: string;
};

type Option = { value: string; label: string };

const AREA_OPTIONS = optionsFrom(DESIGN_AREA_LABEL);
const SOURCE_OPTIONS = optionsFrom(DECOR_SOURCE_LABEL);
const initial: DesignFormState = { ok: true, message: "" };

export function DecorForm({
  action,
  values,
  vendors,
  budgetItems,
  back,
  submitLabel,
}: {
  action: (prev: DesignFormState, form: FormData) => Promise<DesignFormState>;
  values: DecorFormValues;
  vendors: Option[];
  budgetItems: Option[];
  back: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, initial);
  const e = state.errors ?? {};
  const typed = state.values;
  const v = (k: keyof DecorFormValues) => (typed ? (typed[k] ?? "") : values[k]);

  return (
    // Remount with the typed values after a failed save, so the selects keep them.
    <form key={typed ? JSON.stringify(typed) : "form"} action={formAction} className="grid gap-9">
      <input type="hidden" name="back" value={back} />
      <fieldset className="grid gap-5">
        <legend className="float-left mb-1 w-full font-display text-2xl">
          The <em className="italic">piece</em>
        </legend>
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_8rem]">
          <TextField name="name" label="What it is" required defaultValue={v("name")} error={e.name} placeholder="Gold taper candleholders" />
          <TextField name="quantity" label="How many" type="number" inputMode="numeric" required defaultValue={v("quantity")} error={e.quantity} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField name="area" label="Area" options={AREA_OPTIONS} defaultValue={v("area")} error={e.area} />
          <SelectField name="source" label="Where it comes from" options={SOURCE_OPTIONS} defaultValue={v("source")} error={e.source} />
        </div>
        <TextareaField
          name="notes"
          label="Notes (optional)"
          rows={3}
          defaultValue={v("notes")}
          error={e.notes}
          placeholder="Size, finish, who's bringing it, where it goes on the day."
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
            label="Budget item"
            options={budgetItems}
            placeholder="Not linked"
            defaultValue={v("budgetItemId")}
            error={e.budgetItemId}
            hint="The price lives on the budget item and its payments."
          />
        </div>
        <p className="text-[13px] text-muted">
          Nothing to link yet?{" "}
          <Link href="/budget/items/new" className="text-rose-ink underline-offset-4 hover:text-chocolate hover:underline">
            Add a budget item
          </Link>{" "}
          with its price, then come back and pick it here.
        </p>
      </fieldset>

      <fieldset className="grid gap-5 border-t border-rule pt-8">
        <legend className="float-left mb-1 w-full font-display text-2xl">
          The <em className="italic">dates</em>
        </legend>
        <p className="-mt-2 text-[13px] text-muted">
          The status comes from these. Leave them blank while it&apos;s still an idea. Return dates are for rentals and
          borrowed pieces.
        </p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <TextField name="orderedOn" label="Ordered" type="date" defaultValue={v("orderedOn")} error={e.orderedOn} />
          <TextField name="receivedOn" label="Received" type="date" defaultValue={v("receivedOn")} error={e.receivedOn} />
          <TextField name="returnBy" label="Return by" type="date" defaultValue={v("returnBy")} error={e.returnBy} />
          <TextField name="returnedOn" label="Returned" type="date" defaultValue={v("returnedOn")} error={e.returnedOn} />
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4 border-t border-rule pt-7">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link href={back} className={buttonClass("secondary")}>
          Cancel
        </Link>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
