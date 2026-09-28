"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { TaskFormState } from "@/app/(app)/tasks/actions";
import { CheckboxField, FormMessage, SelectField, TextareaField, TextField } from "@/components/form/Fields";
import { SubmitButton } from "@/components/form/SubmitButton";
import { buttonClass } from "@/components/ui/Button";
import { OWNER_LABEL, PRIORITY_LABEL, TASK_AREA_LABEL, TASK_STATUS_LABEL, optionsFrom } from "@/lib/labels";

export type TaskFormValues = {
  title: string;
  notes: string;
  dueDate: string;
  owner: string;
  status: string;
  priority: string;
  area: string;
  vendorId: string;
  partyMemberId: string;
  isMilestone: boolean;
};

type Option = { value: string; label: string };

const initial: TaskFormState = { ok: true, message: "" };

export function TaskForm({
  action,
  values,
  vendors,
  party,
  submitLabel,
  cancelHref,
}: {
  action: (prev: TaskFormState, form: FormData) => Promise<TaskFormState>;
  values: TaskFormValues;
  vendors: Option[];
  party: Option[];
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, initial);
  const e = state.errors ?? {};
  // After a failed save, show what was typed rather than the original values.
  const typed = state.values;
  const v = (k: Exclude<keyof TaskFormValues, "isMilestone">) => (typed ? (typed[k] ?? "") : values[k]);

  return (
    // React resets a form after its action runs, and a <select> resets to the default it was
    // mounted with. Remounting with the typed values keeps them after a failed save.
    <form key={typed ? JSON.stringify(typed) : "form"} action={formAction} className="grid gap-9">
      <fieldset className="grid gap-5">
        <legend className="float-left mb-1 w-full font-display text-2xl">
          The <em className="italic">task</em>
        </legend>
        <TextField name="title" label="What needs doing" required defaultValue={v("title")} error={e.title} />
        <TextareaField name="notes" label="Notes" rows={3} defaultValue={v("notes")} error={e.notes} placeholder="Anything worth remembering" />
        <div className="grid gap-5 sm:grid-cols-3">
          <TextField name="dueDate" label="Due" type="date" defaultValue={v("dueDate")} error={e.dueDate} hint="Leave blank if there's no date yet." />
          <SelectField name="owner" label="Who" options={optionsFrom(OWNER_LABEL)} defaultValue={v("owner")} error={e.owner} />
          <SelectField name="status" label="Status" options={optionsFrom(TASK_STATUS_LABEL)} defaultValue={v("status")} error={e.status} />
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <SelectField name="priority" label="Priority" options={optionsFrom(PRIORITY_LABEL)} defaultValue={v("priority")} error={e.priority} />
          <SelectField name="area" label="Area" options={optionsFrom(TASK_AREA_LABEL)} defaultValue={v("area")} error={e.area} />
          <CheckboxField
            name="isMilestone"
            label="Milestone"
            hint="A big moment. Shown on the timeline."
            defaultChecked={typed ? typed.isMilestone === "on" : values.isMilestone}
            className="sm:pt-7"
          />
        </div>
      </fieldset>

      <fieldset className="grid gap-5 border-t border-rule pt-8">
        <legend className="float-left mb-1 w-full font-display text-2xl">
          Linked <em className="italic">to</em>
        </legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField name="vendorId" label="Vendor" options={vendors} placeholder="No vendor" defaultValue={v("vendorId")} error={e.vendorId} />
          <SelectField
            name="partyMemberId"
            label="Wedding party duty"
            options={party}
            placeholder="Not a wedding party duty"
            defaultValue={v("partyMemberId")}
            error={e.partyMemberId}
            hint="Pick someone to make this one of their duties."
          />
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4 border-t border-rule pt-7">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link href={cancelHref} className={buttonClass("secondary")}>
          Cancel
        </Link>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
