"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { EventFormState } from "@/app/(app)/calendar/actions";
import { FormMessage, SelectField, TextareaField, TextField } from "@/components/form/Fields";
import { SubmitButton } from "@/components/form/SubmitButton";
import { buttonClass } from "@/components/ui/Button";
import { EVENT_TYPE_LABEL, optionsFrom } from "@/lib/labels";

export type EventFormValues = {
  title: string;
  type: string;
  timing: "allDay" | "timed";
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  vendorId: string;
  notes: string;
};

const initial: EventFormState = { ok: true, message: "" };

export function EventForm({
  action,
  values,
  vendors,
  submitLabel,
  cancelHref,
}: {
  action: (prev: EventFormState, form: FormData) => Promise<EventFormState>;
  values: EventFormValues;
  vendors: Array<{ value: string; label: string }>;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, initial);
  const [timing, setTiming] = useState<EventFormValues["timing"]>(values.timing);
  const e = state.errors ?? {};
  const typed = state.values;
  const v = (k: Exclude<keyof EventFormValues, "timing">) => (typed ? (typed[k] ?? "") : values[k]);

  const choice = (value: EventFormValues["timing"], label: string) => (
    <label
      className={`flex cursor-pointer items-center gap-2.5 rounded-[3px] border px-4 py-2.5 text-[14px] transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-desert-rose ${
        timing === value ? "border-chocolate bg-linen/50 text-chocolate" : "border-rule-strong text-cocoa hover:border-chocolate"
      }`}
    >
      <input
        type="radio"
        name="timing"
        value={value}
        checked={timing === value}
        onChange={() => setTiming(value)}
        className="size-4 accent-desert-rose"
      />
      {label}
    </label>
  );

  return (
    // React resets a form after its action runs, and a <select> resets to the default it was
    // mounted with. Remounting with the typed values keeps them after a failed save.
    <form key={typed ? JSON.stringify(typed) : "form"} action={formAction} className="grid gap-9">
      <fieldset className="grid gap-5">
        <legend className="float-left mb-1 w-full font-display text-2xl">
          The <em className="italic">appointment</em>
        </legend>
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_14rem]">
          <TextField name="title" label="What" required defaultValue={v("title")} error={e.title} placeholder="Menu tasting at the venue" />
          <SelectField name="type" label="Kind" options={optionsFrom(EVENT_TYPE_LABEL)} defaultValue={v("type")} error={e.type} />
        </div>
      </fieldset>

      <fieldset className="grid gap-5 border-t border-rule pt-8">
        <legend className="float-left mb-1 w-full font-display text-2xl">
          <em className="italic">When</em>
        </legend>
        <div role="radiogroup" aria-label="All day or at a time" className="flex flex-wrap gap-2.5">
          {choice("timed", "At a time")}
          {choice("allDay", "All day")}
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <TextField name="date" label="Date" type="date" required defaultValue={v("date")} error={e.date} />
          {timing === "timed" ? (
            <>
              <TextField name="startTime" label="Starts" type="time" defaultValue={v("startTime")} error={e.startTime} hint="New York time" />
              <TextField name="endTime" label="Ends (optional)" type="time" defaultValue={v("endTime")} error={e.endTime} hint="Same day" />
            </>
          ) : null}
        </div>
      </fieldset>

      <fieldset className="grid gap-5 border-t border-rule pt-8">
        <legend className="float-left mb-1 w-full font-display text-2xl">
          The <em className="italic">details</em>
        </legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField name="location" label="Where" defaultValue={v("location")} error={e.location} placeholder="Address or place" />
          <SelectField name="vendorId" label="With a vendor" options={vendors} placeholder="No vendor" defaultValue={v("vendorId")} error={e.vendorId} />
        </div>
        <TextareaField name="notes" label="Notes" rows={3} defaultValue={v("notes")} error={e.notes} placeholder="What to bring, who's coming" />
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
