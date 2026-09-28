"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckboxField, Field, FormMessage, inputClass, SelectField, TextareaField, TextField } from "@/components/form/Fields";
import { SubmitButton } from "@/components/form/SubmitButton";
import { buttonClass } from "@/components/ui/Button";
import { idleState, type ActionState } from "@/lib/forms";

type FormState = ActionState & { values?: Record<string, string> };
import { GUEST_SIDE_LABEL, RELATIONSHIP_LABEL, RSVP_LABEL, optionsFrom } from "@/lib/labels";

export type GuestFormValues = {
  fullName: string;
  householdName: string;
  side: string;
  relationship: string;
  isChild: boolean;
  plusOneOfId: string | null;
  rsvpStatus: string | null;
  mealChoice: string | null;
  dietaryNotes: string | null;
  notes: string | null;
};

export const EMPTY_GUEST: GuestFormValues = {
  fullName: "",
  householdName: "",
  side: "BOTH",
  relationship: "FRIEND",
  isChild: false,
  plusOneOfId: null,
  rsvpStatus: null,
  mealChoice: null,
  dietaryNotes: null,
  notes: null,
};

function Legend({ lead, word }: { lead: string; word: string }) {
  return (
    <legend className="mb-4 font-display text-2xl">
      {lead} <em className="italic">{word}</em>
    </legend>
  );
}

export function GuestForm({
  action,
  values,
  plusOneChoices,
  households,
  submitLabel,
  imported,
}: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  values: GuestFormValues;
  plusOneChoices: Array<{ value: string; label: string }>;
  households: string[];
  submitLabel: string;
  /** Came from the RSVP app: the next import updates some of these fields. */
  imported: boolean;
}) {
  const [state, formAction] = useActionState(action, idleState as FormState);
  const e = state.errors ?? {};
  // React resets the form after each submit; after a failed save, reset it to what was typed.
  const typed = state.values;
  const v: GuestFormValues = typed
    ? {
        fullName: typed.fullName ?? "",
        householdName: typed.householdName ?? "",
        side: typed.side ?? values.side,
        relationship: typed.relationship ?? values.relationship,
        isChild: typed.isChild === "on",
        plusOneOfId: typed.plusOneOfId || null,
        rsvpStatus: typed.rsvpStatus || null,
        mealChoice: typed.mealChoice ?? null,
        dietaryNotes: typed.dietaryNotes ?? null,
        notes: typed.notes ?? null,
      }
    : values;
  const householdId = "f-householdName";
  const owned = imported ? "Updated from the RSVP app on the next import." : undefined;

  return (
    <form action={formAction} className="grid gap-10" noValidate>
      <fieldset className="grid gap-5 sm:grid-cols-2">
        <Legend lead="Who" word="they are" />
        <TextField name="fullName" label="Full name" defaultValue={v.fullName} error={e.fullName} hint={owned} required autoComplete="off" />
        <Field
          id={householdId}
          label="Household"
          error={e.householdName}
          hint="Everyone invited together shares one household, e.g. “The Rivera Family”."
        >
          <input
            id={householdId}
            name="householdName"
            defaultValue={v.householdName}
            list="household-names"
            required
            autoComplete="off"
            aria-invalid={e.householdName ? true : undefined}
            aria-describedby={e.householdName ? `${householdId}-error` : `${householdId}-hint`}
            className={inputClass}
          />
          <datalist id="household-names">
            {households.map((h) => (
              <option key={h} value={h} />
            ))}
          </datalist>
        </Field>
        <SelectField name="side" label="Side" defaultValue={v.side} options={optionsFrom(GUEST_SIDE_LABEL)} error={e.side} />
        <SelectField
          name="relationship"
          label="Relationship"
          defaultValue={v.relationship}
          options={optionsFrom(RELATIONSHIP_LABEL)}
          error={e.relationship}
        />
        <SelectField
          name="plusOneOfId"
          label="Plus-one of"
          placeholder="Not a plus-one"
          defaultValue={v.plusOneOfId}
          options={plusOneChoices}
          error={e.plusOneOfId}
        />
        <CheckboxField
          name="isChild"
          label="A child"
          hint="Children count toward the headcount like everyone else."
          defaultChecked={v.isChild}
          className="sm:pt-7"
        />
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <Legend lead="Their" word="reply" />
        <SelectField
          name="rsvpStatus"
          label="RSVP"
          placeholder="No answer yet"
          defaultValue={v.rsvpStatus}
          options={optionsFrom(RSVP_LABEL)}
          error={e.rsvpStatus}
          hint={imported ? owned : "Pending and no answer both count as coming."}
        />
        <TextField name="mealChoice" label="Meal" defaultValue={v.mealChoice} error={e.mealChoice} placeholder="e.g. Chicken" />
        <TextareaField
          name="dietaryNotes"
          label="Dietary notes"
          rows={2}
          defaultValue={v.dietaryNotes}
          error={e.dietaryNotes}
          placeholder="Allergies, vegetarian…"
          className="sm:col-span-2"
        />
      </fieldset>

      <fieldset className="grid gap-5">
        <Legend lead="Our" word="notes" />
        <TextareaField
          name="notes"
          label="Notes"
          rows={3}
          defaultValue={v.notes}
          error={e.notes}
          hint="Just for the two of us. Imports never change notes, side, relationship or plus-ones."
        />
      </fieldset>

      <div className="flex flex-wrap items-center gap-4 border-t border-rule pt-6">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link href="/guests" className={buttonClass("quiet")}>
          Cancel
        </Link>
        {state.message ? <FormMessage state={state} /> : null}
      </div>
    </form>
  );
}
