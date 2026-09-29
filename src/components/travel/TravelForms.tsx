"use client";

import { useActionState } from "react";
import { saveBagItem, saveShuttle, type TravelFormState } from "@/app/(app)/travel/actions";
import { FormMessage, SelectField, TextField } from "@/components/form/Fields";
import { SubmitButton } from "@/components/form/SubmitButton";
import { idleState } from "@/lib/forms";
import { useCloseEditor } from "./RowEditor";

// The small inline forms on Hotels & Travel. Adding stays open and clears for the next one;
// editing closes once saved. A failed save keeps what was typed.

type Option = { value: string; label: string };

/** Wraps a save action so an inline editor closes after a successful save. */
function useSave(save: (prev: TravelFormState, form: FormData) => Promise<TravelFormState>) {
  const close = useCloseEditor();
  return useActionState(async (prev: TravelFormState, form: FormData) => {
    const result = await save(prev, form);
    if (result.ok && close) close();
    return result;
  }, idleState as TravelFormState);
}

/** Remount after each add (fresh fields) and after each failure (typed values as defaults). */
function formKey(state: TravelFormState) {
  return state.values ? JSON.stringify(state.values) : `saved-${state.nonce ?? 0}`;
}

export type ShuttleValues = {
  date: string;
  departTime: string;
  fromPlace: string;
  toPlace: string;
  seats: string;
  vendorId: string;
  notes: string;
};

export function ShuttleForm({
  id,
  values,
  vendors,
  idPrefix,
}: {
  /** Null to add a new run. */
  id: string | null;
  values: ShuttleValues;
  vendors: Option[];
  idPrefix: string;
}) {
  const [state, action] = useSave((prev, form) => saveShuttle(id, prev, form));
  const e = state.errors ?? {};
  const typed = state.values;
  const v = (k: keyof ShuttleValues) => (typed ? (typed[k] ?? "") : values[k]);

  return (
    <form key={formKey(state)} action={action} aria-label={id ? "Edit shuttle run" : "Add a shuttle run"} className="@container grid gap-4">
      <div className="grid gap-4 @md:grid-cols-2 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.6fr)]">
        <TextField idPrefix={idPrefix} name="date" label="Date" type="date" required defaultValue={v("date")} error={e.date} />
        <TextField idPrefix={idPrefix} name="departTime" label="Leaves at" type="time" required defaultValue={v("departTime")} error={e.departTime} />
        <TextField
          idPrefix={idPrefix}
          name="seats"
          label="Seats (optional)"
          type="number"
          inputMode="numeric"
          defaultValue={v("seats")}
          error={e.seats}
          className="@md:col-span-2 @3xl:col-span-1"
        />
      </div>
      <div className="grid gap-4 @md:grid-cols-2">
        <TextField idPrefix={idPrefix} name="fromPlace" label="From" required placeholder="The hotel" defaultValue={v("fromPlace")} error={e.fromPlace} />
        <TextField idPrefix={idPrefix} name="toPlace" label="To" required placeholder="The Estate at Florentine Gardens" defaultValue={v("toPlace")} error={e.toPlace} />
      </div>
      <div className="grid gap-4 @md:grid-cols-2">
        <SelectField idPrefix={idPrefix} name="vendorId" label="Vendor" placeholder="No vendor" options={vendors} defaultValue={v("vendorId")} error={e.vendorId} />
        <TextField idPrefix={idPrefix} name="notes" label="Notes (optional)" placeholder="Pickup at the side entrance" defaultValue={v("notes")} error={e.notes} />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton size="sm" pendingLabel={id ? "Saving…" : "Adding…"}>
          {id ? "Save" : "Add run"}
        </SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export type BagItemValues = { name: string; perBag: string; orderedOn: string; receivedOn: string; notes: string };

export function BagItemForm({ id, values, idPrefix }: { id: string | null; values: BagItemValues; idPrefix: string }) {
  const [state, action] = useSave((prev, form) => saveBagItem(id, prev, form));
  const e = state.errors ?? {};
  const typed = state.values;
  const v = (k: keyof BagItemValues) => (typed ? (typed[k] ?? "") : values[k]);

  return (
    <form key={formKey(state)} action={action} aria-label={id ? "Edit item" : "Add an item"} className="@container grid gap-4">
      <div className="grid gap-4 @md:grid-cols-[minmax(0,1fr)_7rem]">
        <TextField idPrefix={idPrefix} name="name" label="Item" required placeholder="Bottled water" defaultValue={v("name")} error={e.name} />
        <TextField idPrefix={idPrefix} name="perBag" label="Per bag" type="number" inputMode="numeric" required defaultValue={v("perBag")} error={e.perBag} />
      </div>
      <div className="grid gap-4 @md:grid-cols-2 @3xl:grid-cols-[minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,1.2fr)]">
        <TextField idPrefix={idPrefix} name="orderedOn" label="Ordered on" type="date" defaultValue={v("orderedOn")} error={e.orderedOn} />
        <TextField idPrefix={idPrefix} name="receivedOn" label="Received on" type="date" defaultValue={v("receivedOn")} error={e.receivedOn} />
        <TextField
          idPrefix={idPrefix}
          name="notes"
          label="Notes (optional)"
          placeholder="Where to buy, or who's bringing it"
          defaultValue={v("notes")}
          error={e.notes}
          className="@md:col-span-2 @3xl:col-span-1"
        />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton size="sm" pendingLabel={id ? "Saving…" : "Adding…"}>
          {id ? "Save" : "Add item"}
        </SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
