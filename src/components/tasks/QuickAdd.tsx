"use client";

import { useActionState } from "react";
import { quickAddTask, type TaskFormState } from "@/app/(app)/tasks/actions";
import { SelectField, TextField } from "@/components/form/Fields";
import { SubmitButton } from "@/components/form/SubmitButton";
import { OWNER_LABEL, optionsFrom } from "@/lib/labels";

const initial: TaskFormState = { ok: true, message: "" };
const OWNERS = optionsFrom(OWNER_LABEL);

/** One line on wide screens: what, when, who. Everything else can be added on the task itself. */
export function QuickAdd() {
  const [state, action] = useActionState(quickAddTask, initial);
  const e = state.errors ?? {};
  const v = state.ok ? {} : (state.values ?? {});
  return (
    // React resets a form after its action runs, and a <select> resets to the default it was
    // mounted with. Remounting with the typed values keeps them after a failed save.
    <form key={state.values ? JSON.stringify(state.values) : "form"} action={action} aria-label="Add a task">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10.5rem_10.5rem] lg:grid-cols-[minmax(0,1fr)_10.5rem_10.5rem_auto] lg:items-start">
        <TextField name="title" label="New task" placeholder="Book the cake tasting" required defaultValue={v.title} error={e.title} />
        <TextField name="dueDate" label="Due" type="date" defaultValue={v.dueDate} error={e.dueDate} />
        <SelectField name="owner" label="Who" options={OWNERS} defaultValue={v.owner ?? "BOTH"} error={e.owner} />
        <div className="grid content-start gap-1.5 sm:col-span-3 lg:col-span-1">
          <span aria-hidden className="label-caps hidden select-none lg:block">&nbsp;</span>
          <SubmitButton pendingLabel="Adding…" className="w-full py-[11px] lg:w-auto">
            Add task
          </SubmitButton>
        </div>
      </div>
      <p role="status" aria-live="polite" className={`text-sm not-empty:mt-3 ${state.ok ? "text-garden-ink" : "text-brick"}`}>
        {state.message}
      </p>
    </form>
  );
}
