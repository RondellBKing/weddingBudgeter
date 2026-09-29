"use client";

import { useActionState, useState } from "react";
import { ConfirmButton } from "@/components/form/ConfirmButton";
import { FormMessage, TextField } from "@/components/form/Fields";
import { SubmitButton } from "@/components/form/SubmitButton";
import { buttonClass } from "@/components/ui/Button";
import type { ProcessionalView } from "@/lib/data/music";
import { idleState, type ActionState } from "@/lib/forms";
import { MoveButtons } from "./MoveButtons";
import { RowLayout } from "./RowLayout";

type SaveAction = (prev: ActionState, form: FormData) => Promise<ActionState>;
type FormAction = (form: FormData) => void | Promise<void>;

/** One line of the processional: its place, who walks, and any note. */
export function ProcessionalItem({
  entry,
  position,
  save,
  remove,
  up,
  down,
}: {
  entry: ProcessionalView;
  position: number;
  save: SaveAction;
  remove: FormAction;
  up: FormAction | null;
  down: FormAction | null;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState(async (prev: ActionState, form: FormData) => {
    const result = await save(prev, form);
    if (result.ok) setEditing(false);
    return result;
  }, idleState);
  const e = state.errors ?? {};
  const prefix = `walk-${entry.id}-`;

  return (
    <li className="border-b border-rule py-3.5 first:pt-0 last:border-b-0 last:pb-0">
      <RowLayout
        lead={
          <span className="num block w-7 pt-0.5 text-right font-display text-[22px] leading-none text-rose-ink sm:w-9 sm:text-[26px]" aria-hidden>
            {position}
          </span>
        }
        body={
          <>
            <p className="text-[15px] leading-snug">
              <span className="sr-only">{position}. </span>
              {entry.walkers}
            </p>
            {entry.notes ? <p className="mt-0.5 text-[13px] text-muted">{entry.notes}</p> : null}
          </>
        }
        actions={
          <>
            <MoveButtons up={up} down={down} name={entry.walkers} />
            {editing ? null : (
              <button type="button" onClick={() => setEditing(true)} className={`${buttonClass("quiet")} ml-1 py-0`}>
                Edit<span className="sr-only"> {entry.walkers}</span>
              </button>
            )}
          </>
        }
      />

      {editing ? (
        <div className="mt-3 grid gap-4 rounded-[3px] border border-rule bg-ivory/50 p-4 sm:ml-13">
          <form action={action} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="walkers" label="Who walks" idPrefix={prefix} defaultValue={entry.walkers} required error={e.walkers} />
              <TextField name="notes" label="Notes (optional)" idPrefix={prefix} defaultValue={entry.notes} error={e.notes} />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <SubmitButton size="sm">Save</SubmitButton>
              <button type="button" onClick={() => setEditing(false)} className={buttonClass("secondary", "sm")}>
                Cancel
              </button>
              {state.ok ? null : <FormMessage state={state} />}
            </div>
          </form>
          <div className="border-t border-rule pt-4">
            <ConfirmButton action={remove} question="Take this line out of the processional?" confirmLabel="Yes, remove">
              Remove from the processional
            </ConfirmButton>
          </div>
        </div>
      ) : null}
    </li>
  );
}

/** Add a line at the end of the processional. */
export function AddProcessionalForm({ action }: { action: SaveAction }) {
  const [state, formAction] = useActionState(action, idleState);
  const e = state.errors ?? {};
  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
        <TextField name="walkers" label="Who walks" idPrefix="new-walk-" required error={e.walkers} placeholder="Ring bearer and flower girl" />
        <TextField name="notes" label="Notes (optional)" idPrefix="new-walk-" error={e.notes} placeholder="Walk together, just before the couple" />
        <SubmitButton variant="secondary" pendingLabel="Adding…" className="justify-self-start">
          Add
        </SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
