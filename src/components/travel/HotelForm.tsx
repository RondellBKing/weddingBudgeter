"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { TravelFormState } from "@/app/(app)/travel/actions";
import { FormMessage, MoneyField, SelectField, TextareaField, TextField } from "@/components/form/Fields";
import { SubmitButton } from "@/components/form/SubmitButton";
import { buttonClass } from "@/components/ui/Button";
import { idleState } from "@/lib/forms";

export type HotelFormValues = {
  name: string;
  address: string;
  phone: string;
  bookingUrl: string;
  groupCode: string;
  roomsHeld: string;
  nightlyRate: string;
  cutoffDate: string;
  checkIn: string;
  checkOut: string;
  vendorId: string;
  notes: string;
};

export function HotelForm({
  action,
  values,
  vendors,
  weddingDateLabel,
  submitLabel,
}: {
  action: (prev: TravelFormState, form: FormData) => Promise<TravelFormState>;
  values: HotelFormValues;
  vendors: Array<{ value: string; label: string }>;
  /** "Thursday, April 13, 2028", for the date hints. */
  weddingDateLabel: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, idleState as TravelFormState);
  const e = state.errors ?? {};
  const typed = state.values;
  const v = (k: keyof HotelFormValues) => (typed ? (typed[k] ?? "") : values[k]);

  return (
    // Remount with the typed values after a failed save, so the selects keep them.
    <form key={typed ? JSON.stringify(typed) : "form"} action={formAction} className="grid gap-9">
      <fieldset className="grid gap-5">
        <legend className="float-left mb-1 w-full font-display text-2xl">
          The <em className="italic">hotel</em>
        </legend>
        <TextField name="name" label="Hotel" required defaultValue={v("name")} error={e.name} placeholder="The hotel's name" />
        <TextField name="address" label="Address (optional)" defaultValue={v("address")} error={e.address} placeholder="Street, town" />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField name="phone" label="Phone (optional)" type="tel" defaultValue={v("phone")} error={e.phone} placeholder="(201) 555-0142" />
          <TextField name="bookingUrl" label="Booking link (optional)" inputMode="url" defaultValue={v("bookingUrl")} error={e.bookingUrl} placeholder="hotel.com/our-group" />
        </div>
      </fieldset>

      <fieldset className="grid gap-5 border-t border-rule pt-8">
        <legend className="float-left mb-1 w-full font-display text-2xl">
          The <em className="italic">block</em>
        </legend>
        <div className="grid gap-5 sm:grid-cols-3">
          <TextField name="groupCode" label="Group code" defaultValue={v("groupCode")} error={e.groupCode} placeholder="Optional" />
          <TextField name="roomsHeld" label="Rooms held" type="number" inputMode="numeric" defaultValue={v("roomsHeld")} error={e.roomsHeld} placeholder="Optional" />
          <MoneyField name="nightlyRate" label="Nightly rate" defaultValue={v("nightlyRate")} error={e.nightlyRate} placeholder="Optional" />
        </div>
        <TextField
          name="cutoffDate"
          label="Cutoff date"
          type="date"
          defaultValue={v("cutoffDate")}
          error={e.cutoffDate}
          hint="The last day guests can book at the group rate. The page counts down to it."
          className="sm:max-w-sm"
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField name="checkIn" label="Check-in" type="date" defaultValue={v("checkIn")} error={e.checkIn} hint={`The wedding is ${weddingDateLabel}.`} />
          <TextField name="checkOut" label="Check-out" type="date" defaultValue={v("checkOut")} error={e.checkOut} />
        </div>
      </fieldset>

      <fieldset className="grid gap-5 border-t border-rule pt-8">
        <legend className="float-left mb-1 w-full font-display text-2xl">
          Vendor &amp; <em className="italic">notes</em>
        </legend>
        <SelectField
          name="vendorId"
          label="Vendor"
          options={vendors}
          placeholder="No vendor"
          defaultValue={v("vendorId")}
          error={e.vendorId}
          hint="If the hotel is also on the vendor list (for a contract or a courtesy block)."
          className="sm:max-w-md"
        />
        <TextareaField name="notes" label="Notes (optional)" rows={3} defaultValue={v("notes")} error={e.notes} placeholder="Who we spoke to, shuttle times, parking" />
      </fieldset>

      <div className="flex flex-wrap items-center gap-4 border-t border-rule pt-7">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link href="/travel#hotels" className={buttonClass("secondary")}>
          Cancel
        </Link>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
