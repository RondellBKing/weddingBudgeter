"use client";

import { useActionState } from "react";
import { createCategory } from "@/app/(app)/budget/actions";
import { FormMessage, MoneyField, TextField } from "@/components/form/Fields";
import { SubmitButton } from "@/components/form/SubmitButton";
import { idleState } from "@/lib/forms";

export function AddCategoryForm() {
  const [state, action] = useActionState(createCategory, idleState);
  const e = state.errors ?? {};
  return (
    <form action={action} className="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_12rem_auto]">
      <TextField name="name" label="New category" placeholder="e.g. Vendor tips" error={e.name} />
      <MoneyField name="estimate" label="Estimate" error={e.estimate} />
      <div className="grid gap-1">
        <SubmitButton variant="secondary" pendingLabel="Adding…">
          Add category
        </SubmitButton>
      </div>
      <div className="sm:col-span-3">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
