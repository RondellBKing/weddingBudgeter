"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { GiftFormState } from "@/app/(app)/gifts/actions";
import { FormMessage, TextareaField, TextField } from "@/components/form/Fields";
import { SubmitButton } from "@/components/form/SubmitButton";
import { buttonClass } from "@/components/ui/Button";
import type { GuestChoice } from "@/lib/domain/gifts";
import { idleState } from "@/lib/forms";
import { FromField } from "./FromField";

export type GiftValues = {
  fromName: string;
  guestId: string;
  description: string;
  receivedOn: string;
  thankYouSentOn: string;
  notes: string;
};

/**
 * Log a gift, or edit one. Adding clears the form for the next gift; a failed save keeps
 * what was typed (the form remounts with those values).
 */
export function GiftForm({
  action,
  values,
  guests,
  submitLabel,
  cancelHref,
  idPrefix = "",
}: {
  action: (prev: GiftFormState, form: FormData) => Promise<GiftFormState>;
  values: GiftValues;
  guests: GuestChoice[];
  submitLabel: string;
  /** Shown as a Cancel link when editing. */
  cancelHref?: string;
  idPrefix?: string;
}) {
  const [state, formAction] = useActionState(action, idleState as GiftFormState);
  const e = state.errors ?? {};
  const typed = state.values;
  const v = (k: keyof GiftValues) => (typed ? (typed[k] ?? "") : values[k]);
  const key = typed ? JSON.stringify(typed) : `saved-${state.nonce ?? 0}`;

  return (
    <form key={key} action={formAction} className="@container grid gap-5">
      <FromField guests={guests} defaultName={v("fromName")} defaultGuestId={v("guestId")} error={e.fromName} idPrefix={idPrefix} />
      <TextField idPrefix={idPrefix} name="description" label="What it was" required defaultValue={v("description")} error={e.description} placeholder="Champagne flutes" />
      <div className="grid gap-5 @md:grid-cols-2">
        <TextField idPrefix={idPrefix} name="receivedOn" label="Received" type="date" required defaultValue={v("receivedOn")} error={e.receivedOn} />
        <TextField
          idPrefix={idPrefix}
          name="thankYouSentOn"
          label="Thank-you sent"
          type="date"
          defaultValue={v("thankYouSentOn")}
          error={e.thankYouSentOn}
          hint="Leave blank until it's in the mail."
        />
      </div>
      <TextareaField idPrefix={idPrefix} name="notes" label="Notes (optional)" rows={2} defaultValue={v("notes")} error={e.notes} placeholder="From the registry, a card with a note" />
      <div className="flex flex-wrap items-center gap-4 border-t border-rule pt-5">
        <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
        {cancelHref ? (
          <Link href={cancelHref} className={buttonClass("secondary")}>
            Cancel
          </Link>
        ) : null}
        <FormMessage state={state} />
      </div>
    </form>
  );
}
