"use client";

import { useActionState } from "react";
import { FormMessage, SelectField, TextareaField } from "@/components/form/Fields";
import { SubmitButton } from "@/components/form/SubmitButton";
import { idleState, type ActionState } from "@/lib/forms";
import { optionsFrom, PARTNER_LABEL } from "@/lib/labels";

const AUTHOR_OPTIONS = optionsFrom(PARTNER_LABEL);

/** Adds an entry to a vendor's communication log. Clears itself after saving. */
export function AddNoteForm({ action }: { action: (prev: ActionState, form: FormData) => Promise<ActionState> }) {
  const [state, formAction] = useActionState(action, idleState);
  const e = state.errors ?? {};
  return (
    <form action={formAction} className="grid gap-4">
      <TextareaField
        name="body"
        label="What happened"
        rows={3}
        placeholder="Called about their Thursday rate…"
        error={e.body}
      />
      <div className="flex flex-wrap items-end gap-3">
        <SelectField name="author" label="Who" defaultValue="BOTH" options={AUTHOR_OPTIONS} error={e.author} className="min-w-[9.5rem] flex-1 sm:flex-none" />
        <SubmitButton pendingLabel="Adding…">Add to log</SubmitButton>
      </div>
      {e.body || e.author ? null : <FormMessage state={state} />}
    </form>
  );
}
