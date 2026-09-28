"use client";

import { useActionState } from "react";
import { saveSettings, type SettingsState } from "./actions";

type Values = {
  partnerOneName: string;
  partnerTwoName: string;
  ceremonyTime: string;
  venueAddress: string;
  headcountTarget: number;
  totalBudget: string;
  includedHeadcount: number;
  perPersonOverage: string;
  overageTaxPercent: string;
  vendorMealsCountTowardHeadcount: boolean;
};

const initial: SettingsState = { ok: true, message: "" };

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid content-start gap-1.5">
      <label htmlFor={id} className="label-caps">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-[13px] text-brick">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const inputClass =
  "num w-full rounded-[2px] border border-rule-strong bg-paper px-3 py-2.5 text-base text-chocolate aria-[invalid=true]:border-brick";

export function SettingsForm({ values }: { values: Values }) {
  const [state, action, pending] = useActionState(saveSettings, initial);
  const e = state.errors ?? {};
  const described = (id: string, hasHint = false) => (e[id] ? `${id}-error` : hasHint ? `${id}-hint` : undefined);

  return (
    <form action={action} className="grid gap-10">
      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-4 font-display text-2xl">
          The <em className="italic">couple</em>
        </legend>
        <Field id="partnerOneName" label="First name" error={e.partnerOneName}>
          <input id="partnerOneName" name="partnerOneName" defaultValue={values.partnerOneName} className={inputClass} aria-invalid={!!e.partnerOneName} aria-describedby={described("partnerOneName")} />
        </Field>
        <Field id="partnerTwoName" label="Second name" error={e.partnerTwoName}>
          <input id="partnerTwoName" name="partnerTwoName" defaultValue={values.partnerTwoName} className={inputClass} aria-invalid={!!e.partnerTwoName} aria-describedby={described("partnerTwoName")} />
        </Field>
        <Field id="ceremonyTime" label="Ceremony time" hint="24-hour time, like 16:30. Leave blank until it's set." error={e.ceremonyTime}>
          <input id="ceremonyTime" name="ceremonyTime" inputMode="numeric" placeholder="16:30" defaultValue={values.ceremonyTime} className={inputClass} aria-invalid={!!e.ceremonyTime} aria-describedby={described("ceremonyTime", true)} />
        </Field>
        <Field id="venueAddress" label="Venue address" error={e.venueAddress}>
          <input id="venueAddress" name="venueAddress" defaultValue={values.venueAddress} className={inputClass} aria-invalid={!!e.venueAddress} aria-describedby={described("venueAddress")} />
        </Field>
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-4 font-display text-2xl">
          Money &amp; <em className="italic">headcount</em>
        </legend>
        <Field id="totalBudget" label="Total budget" error={e.totalBudget}>
          <input id="totalBudget" name="totalBudget" inputMode="decimal" defaultValue={values.totalBudget} className={inputClass} aria-invalid={!!e.totalBudget} aria-describedby={described("totalBudget")} />
        </Field>
        <Field id="headcountTarget" label="Planned headcount" hint="Everyone eating, including the two of you and the wedding party. Used until the guest list is imported." error={e.headcountTarget}>
          <input id="headcountTarget" name="headcountTarget" type="number" min={0} inputMode="numeric" defaultValue={values.headcountTarget} className={inputClass} aria-invalid={!!e.headcountTarget} aria-describedby={described("headcountTarget", true)} />
        </Field>
        <Field id="includedHeadcount" label="People included by the venue" error={e.includedHeadcount}>
          <input id="includedHeadcount" name="includedHeadcount" type="number" min={0} inputMode="numeric" defaultValue={values.includedHeadcount} className={inputClass} aria-invalid={!!e.includedHeadcount} aria-describedby={described("includedHeadcount")} />
        </Field>
        <Field id="perPersonOverage" label="Cost per person above that" error={e.perPersonOverage}>
          <input id="perPersonOverage" name="perPersonOverage" inputMode="decimal" defaultValue={values.perPersonOverage} className={inputClass} aria-invalid={!!e.perPersonOverage} aria-describedby={described("perPersonOverage")} />
        </Field>
        <Field id="overageTaxPercent" label="Tax on the overage (%)" hint="0 if the per-person cost already includes tax. NJ sales tax is 6.625." error={e.overageTaxPercent}>
          <input id="overageTaxPercent" name="overageTaxPercent" inputMode="decimal" defaultValue={values.overageTaxPercent} className={inputClass} aria-invalid={!!e.overageTaxPercent} aria-describedby={described("overageTaxPercent", true)} />
        </Field>
        <div className="flex items-start gap-3 pt-6">
          <input id="vendorMealsCountTowardHeadcount" name="vendorMealsCountTowardHeadcount" type="checkbox" defaultChecked={values.vendorMealsCountTowardHeadcount} className="mt-1 size-4 accent-desert-rose" aria-describedby="vendorMealsCountTowardHeadcount-hint" />
          <div className="grid gap-1">
            <label htmlFor="vendorMealsCountTowardHeadcount" className="text-[15px]">
              Vendor meals count toward the included headcount
            </label>
            <p id="vendorMealsCountTowardHeadcount-hint" className="text-[13px] text-muted">
              Leave this on until the venue confirms either way.
            </p>
          </div>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-[2px] bg-chocolate px-6 py-3 text-sm font-medium tracking-[0.08em] text-ivory uppercase hover:bg-cocoa disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save settings"}
        </button>
        <p role="status" className={`text-sm ${state.ok ? "text-garden-ink" : "text-brick"}`}>
          {state.message}
        </p>
      </div>
    </form>
  );
}
