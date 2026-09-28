"use client";

import { useActionState } from "react";
import { FormMessage, MoneyField, SelectField, TextareaField, TextField } from "@/components/form/Fields";
import { SubmitButton } from "@/components/form/SubmitButton";
import { idleState, type ActionState } from "@/lib/forms";

export type ItemFormValues = {
  categoryId: string;
  vendorId: string;
  description: string;
  estimate: string;
  contracted: string;
  notes: string;
};

export function ItemForm({
  action,
  values,
  categories,
  vendors,
  submitLabel,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  values: ItemFormValues;
  categories: Array<{ id: string; name: string }>;
  vendors: Array<{ id: string; name: string }>;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, idleState);
  const e = state.errors ?? {};
  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField name="description" label="What is it" defaultValue={values.description} error={e.description} placeholder="e.g. Photography package" required />
        <SelectField
          name="categoryId"
          label="Category"
          defaultValue={values.categoryId}
          error={e.categoryId}
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          placeholder="Choose a category"
          required
        />
        <SelectField
          name="vendorId"
          label="Vendor"
          defaultValue={values.vendorId}
          error={e.vendorId}
          options={vendors.map((v) => ({ value: v.id, label: v.name }))}
          placeholder="No vendor yet"
        />
        <div className="grid grid-cols-2 gap-4">
          <MoneyField name="estimate" label="Estimate" defaultValue={values.estimate} error={e.estimate} />
          <MoneyField
            name="contracted"
            label="Contracted"
            defaultValue={values.contracted}
            error={e.contracted}
            hint="From the signed contract"
          />
        </div>
      </div>
      <TextareaField name="notes" label="Notes" defaultValue={values.notes} error={e.notes} rows={3} />
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton>{submitLabel}</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
