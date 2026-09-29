"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { TimelineFormState } from "@/app/(app)/timeline/actions";
import { FormMessage, SelectField, TextareaField, TextField } from "@/components/form/Fields";
import { SubmitButton } from "@/components/form/SubmitButton";
import { buttonClass } from "@/components/ui/Button";

export type TimelineItemValues = {
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  location: string;
  lead: string;
  involves: string;
  vendorId: string;
  notes: string;
};

const initial: TimelineFormState = { ok: true, message: "" };

export function TimelineItemForm({
  action,
  values,
  vendors,
  dateHint,
  cancelHref,
  submitLabel,
}: {
  action: (prev: TimelineFormState, form: FormData) => Promise<TimelineFormState>;
  values: TimelineItemValues;
  vendors: Array<{ value: string; label: string }>;
  /** "Rehearsal Wed, Apr 12 · Wedding Thu, Apr 13 · Day after Fri, Apr 14" */
  dateHint: string;
  cancelHref: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, initial);
  const e = state.errors ?? {};
  const typed = state.values;
  const v = (k: keyof TimelineItemValues) => (typed ? (typed[k] ?? "") : values[k]);

  return (
    // Remount with the typed values after a failed save, so the select keeps them.
    <form key={typed ? JSON.stringify(typed) : "form"} action={formAction} className="grid gap-9">
      <fieldset className="grid gap-5">
        <legend className="float-left mb-1 w-full font-display text-2xl">
          The <em className="italic">moment</em>
        </legend>
        <TextField name="title" label="What" required defaultValue={v("title")} error={e.title} placeholder="Grand entrance and first dance" />
        <div className="grid gap-5 sm:grid-cols-3">
          <TextField name="date" label="Day" type="date" required defaultValue={v("date")} error={e.date} hint={dateHint} />
          <TextField name="startTime" label="Starts" type="time" required defaultValue={v("startTime")} error={e.startTime} />
          <TextField
            name="endTime"
            label="Ends (optional)"
            type="time"
            defaultValue={v("endTime")}
            error={e.endTime}
            hint="Leave blank for a single moment, like an arrival."
          />
        </div>
        {e.range ? (
          <p className="max-w-2xl text-[13px] leading-relaxed text-brick" role="alert">
            {e.range}
          </p>
        ) : null}
      </fieldset>

      <fieldset className="grid gap-5 border-t border-rule pt-8">
        <legend className="float-left mb-1 w-full font-display text-2xl">
          Where and <em className="italic">who</em>
        </legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField name="location" label="Where" defaultValue={v("location")} error={e.location} placeholder="Ceremony site" />
          <TextField
            name="lead"
            label="Who runs it"
            defaultValue={v("lead")}
            error={e.lead}
            placeholder="Coordinator"
            hint="A name or a role, like DJ or Coordinator."
          />
        </div>
        <TextField
          name="involves"
          label="Who needs to be there"
          defaultValue={v("involves")}
          error={e.involves}
          placeholder="Wedding party and parents"
        />
        <SelectField
          name="vendorId"
          label="Vendor"
          options={vendors}
          placeholder="No vendor"
          defaultValue={v("vendorId")}
          error={e.vendorId}
          className="sm:max-w-md"
        />
      </fieldset>

      <fieldset className="grid gap-5 border-t border-rule pt-8">
        <legend className="float-left mb-1 w-full font-display text-2xl">
          <em className="italic">Notes</em>
        </legend>
        <TextareaField
          name="notes"
          label="Notes (optional)"
          rows={4}
          defaultValue={v("notes")}
          error={e.notes}
          placeholder="Song cues, what to have ready, who to find."
        />
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
