"use client";

import { useActionState } from "react";
import { FormMessage, SelectField, TextField } from "@/components/form/Fields";
import { SubmitButton } from "@/components/form/SubmitButton";
import type { ActionState } from "@/lib/forms";
import { addDuty } from "./actions";

const initial: ActionState = { ok: true, message: "" };

/**
 * Add a duty. With `memberId` it's for that one person (their page); otherwise it asks who.
 * The form clears itself after each successful add. Columns follow the card's width
 * (container queries), so it lays out the same in a wide or a narrow card.
 */
export function AddDutyForm({
  people,
  memberId,
}: {
  people?: Array<{ id: string; name: string }>;
  memberId?: string;
}) {
  const [state, action] = useActionState(addDuty, initial);
  const e = state.errors ?? {};
  const row = memberId
    ? {
        form: "@lg:grid-cols-[minmax(0,1fr)_11rem_auto] @lg:items-start",
        spacer: "@lg:block",
        button: "@lg:w-auto",
      }
    : {
        form: "@3xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)_11rem_auto] @3xl:items-start",
        spacer: "@3xl:block",
        button: "@3xl:w-auto",
      };
  return (
    <div className="@container">
      <form
        action={action}
        aria-label="Add a duty"
        className={`grid gap-4 rounded-[3px] border border-rule bg-ivory/45 p-4 sm:p-5 ${row.form}`}
      >
        {memberId ? (
          <input type="hidden" name="memberId" value={memberId} />
        ) : (
          <SelectField
            name="memberId"
            label="Who"
            placeholder="Choose a person"
            required
            error={e.memberId}
            options={(people ?? []).map((p) => ({ value: p.id, label: p.name }))}
          />
        )}
        <TextField name="title" label="Duty" placeholder="e.g. Plan the bridal shower" required error={e.title} />
        <TextField name="dueDate" label="Due by (optional)" type="date" error={e.dueDate} />
        <div className="grid content-start gap-1.5">
          {/* Keeps the button level with the inputs when the fields sit in a row. */}
          <span aria-hidden className={`label-caps hidden select-none text-transparent ${row.spacer}`}>
            Add
          </span>
          <SubmitButton pendingLabel="Adding…" className={`h-11 w-full ${row.button}`}>
            Add duty
          </SubmitButton>
        </div>
        {state.message ? (
          <div className="col-span-full">
            <FormMessage state={state} />
          </div>
        ) : null}
      </form>
    </div>
  );
}
