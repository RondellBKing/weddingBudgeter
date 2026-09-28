"use client";

import Link from "next/link";
import { useActionState, useState, type FormEvent, type ReactNode } from "react";
import { Field, FormMessage, inputClass, MoneyField, SelectField, TextareaField, TextField } from "@/components/form/Fields";
import { SubmitButton } from "@/components/form/SubmitButton";
import { buttonClass } from "@/components/ui/Button";
import { formatClockTime } from "@/lib/dates";
import type { VendorFormState, VendorFormValues } from "@/lib/domain/vendor-form";
import {
  arrivesBeforeAccess,
  VENDOR_CATEGORIES,
  VENDOR_CATEGORY_LABEL,
  VENDOR_STATUS_HINT,
  VENDOR_STATUS_LABEL,
  type VendorStatus,
} from "@/lib/domain/vendors";
import { idleState } from "@/lib/forms";
import { optionsFrom } from "@/lib/labels";

const CATEGORY_OPTIONS = optionsFrom(VENDOR_CATEGORY_LABEL);
const STATUS_OPTIONS = optionsFrom(VENDOR_STATUS_LABEL);

/** Shared add / edit form for a vendor. `action` is saveVendor bound to the vendor id (or null). */
export function VendorForm({
  action,
  initial,
  venueAccessTime,
  submitLabel,
  cancelHref,
}: {
  action: (prev: VendorFormState, form: FormData) => Promise<VendorFormState>;
  initial: VendorFormValues;
  venueAccessTime: string;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, idleState as VendorFormState);
  // After a failed save the submitted values come back; remounting the fields with them keeps
  // what was typed (React resets a form after its action runs).
  const values = state.values ?? initial;

  return (
    <form action={formAction} className="grid">
      <VendorFields
        key={JSON.stringify(state.values ?? null)}
        values={values}
        errors={state.errors ?? {}}
        venueAccessTime={venueAccessTime}
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-rule pt-6">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link href={cancelHref} className={buttonClass("secondary")}>
          Cancel
        </Link>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

function Section({ id, title, word, note, children }: { id: string; title: string; word: string; note: string; children: ReactNode }) {
  return (
    <section
      aria-labelledby={id}
      className="grid gap-5 border-t border-rule py-8 first:border-t-0 first:pt-0 lg:grid-cols-[12.5rem_minmax(0,1fr)] lg:gap-10"
    >
      <div className="grid content-start gap-1.5">
        <h2 id={id} className="text-[26px] leading-tight">
          {title} <em className="italic">{word}</em>
        </h2>
        <p className="text-[13px] leading-relaxed text-muted">{note}</p>
      </div>
      <div className="grid content-start gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function VendorFields({
  values,
  errors: e,
  venueAccessTime,
}: {
  values: VendorFormValues;
  errors: Record<string, string>;
  venueAccessTime: string;
}) {
  const [category, setCategory] = useState(values.category);
  const [status, setStatus] = useState(values.status);
  const [arrival, setArrival] = useState(values.arrivalTime);
  const early = arrivesBeforeAccess(arrival, venueAccessTime);
  const opens = formatClockTime(venueAccessTime).replace(" ", "\u00a0");
  const extras = VENDOR_CATEGORIES.filter((c) => c !== category);

  // Field changes bubble up here, so the shared field components stay uncontrolled.
  function track(ev: FormEvent<HTMLDivElement>) {
    const t = ev.target as HTMLInputElement | HTMLSelectElement;
    if (t.name === "category") setCategory(t.value);
    else if (t.name === "status") setStatus(t.value);
    else if (t.name === "arrivalTime") setArrival(t.value);
  }

  const arrivalNoteId = "f-arrivalTime-note";

  return (
    <div onChange={track} className="grid">
      <Section id="sec-vendor" title="The" word="vendor" note="Who they are, what they do for us, and where things stand.">
        <TextField
          name="name"
          label="Name"
          required
          defaultValue={values.name}
          error={e.name}
          placeholder="Business or person"
          className="sm:col-span-2"
        />
        <SelectField
          name="category"
          label="Category"
          required
          defaultValue={values.category}
          placeholder="Pick a category"
          options={CATEGORY_OPTIONS}
          error={e.category}
        />
        <SelectField
          name="status"
          label="Status"
          defaultValue={values.status}
          options={STATUS_OPTIONS}
          error={e.status}
          hint={VENDOR_STATUS_HINT[status as VendorStatus]}
        />
        <MoneyField
          name="quoted"
          label="Quoted price"
          defaultValue={values.quoted}
          error={e.quoted}
          hint="Their price before booking. What we owe comes from the budget items."
        />

        <details open={values.alsoCovers.length > 0 || Boolean(e.alsoCovers)} className="group sm:col-span-2">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-[14px] text-rose-ink hover:text-chocolate [&::-webkit-details-marker]:hidden">
            <span aria-hidden className="inline-block transition-transform group-open:rotate-90">›</span>
            They also cover other categories
          </summary>
          <fieldset className="mt-4 grid gap-3" aria-describedby="also-hint">
            <legend className="label-caps mb-1">Also covers</legend>
            <p id="also-hint" className="text-[13px] text-muted">
              For example, an all-inclusive venue that also does the catering. Ticked categories count as booked
              when this vendor is.
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
              {extras.map((c) => (
                <label key={c} className="flex items-center gap-2.5 text-[14px]">
                  <input
                    type="checkbox"
                    name="alsoCovers"
                    value={c}
                    defaultChecked={values.alsoCovers.includes(c)}
                    className="size-4 shrink-0 accent-desert-rose"
                  />
                  {VENDOR_CATEGORY_LABEL[c]}
                </label>
              ))}
            </div>
            {e.alsoCovers ? <p className="text-[13px] text-brick">{e.alsoCovers}</p> : null}
          </fieldset>
        </details>
      </Section>

      <Section id="sec-contact" title="Getting in" word="touch" note="Who we deal with and how to reach them. All optional.">
        <TextField name="contactName" label="Contact name" defaultValue={values.contactName} error={e.contactName} className="sm:col-span-2" />
        <TextField
          name="email"
          label="Email"
          type="email"
          inputMode="email"
          defaultValue={values.email}
          error={e.email}
          placeholder="name@example.com"
        />
        <TextField name="phone" label="Phone" type="tel" inputMode="tel" defaultValue={values.phone} error={e.phone} placeholder="(201) 555-0142" />
        <TextField name="website" label="Website" inputMode="url" defaultValue={values.website} error={e.website} placeholder="example.com" />
        <TextField name="instagram" label="Instagram" defaultValue={values.instagram} error={e.instagram} placeholder="@studioname" />
      </Section>

      <Section id="sec-contract" title="Contract &" word="the day" note="Paperwork, and what they need from the venue on the wedding day.">
        <TextField name="contractSignedOn" label="Contract signed" type="date" defaultValue={values.contractSignedOn} error={e.contractSignedOn} />
        <TextField
          name="contractUrl"
          label="Link to the contract"
          inputMode="url"
          defaultValue={values.contractUrl}
          error={e.contractUrl}
          placeholder="https://"
          hint="DocuSign, Google Drive, Dropbox…"
        />
        <Field id="f-arrivalTime" label="Wedding-day arrival" error={e.arrivalTime}>
          <input
            id="f-arrivalTime"
            name="arrivalTime"
            type="time"
            defaultValue={values.arrivalTime}
            aria-invalid={e.arrivalTime ? true : undefined}
            aria-describedby={e.arrivalTime ? "f-arrivalTime-error" : arrivalNoteId}
            className={`${inputClass} num`}
          />
          {e.arrivalTime ? null : (
            <p id={arrivalNoteId} aria-live="polite" className={`text-[13px] ${early ? "text-gold-ink" : "text-muted"}`}>
              {early
                ? `Heads up: that's before ${opens}, when the venue opens to vendors.`
                : `The venue opens to vendors at ${opens}.`}
            </p>
          )}
        </Field>
        <TextField
          name="mealsRequired"
          label="Meals for their team"
          type="number"
          inputMode="numeric"
          defaultValue={values.mealsRequired}
          error={e.mealsRequired}
          hint="Counted in the headcount once they're booked, while that setting is on."
        />
      </Section>

      <Section id="sec-notes" title="Our" word="notes" note="Anything worth remembering about them.">
        <TextareaField name="notes" label="Notes" rows={4} defaultValue={values.notes} error={e.notes} className="sm:col-span-2" />
      </Section>
    </div>
  );
}
