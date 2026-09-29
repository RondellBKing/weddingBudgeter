"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { ConfirmButton } from "@/components/form/ConfirmButton";
import { FormMessage, SelectField, TextareaField, TextField } from "@/components/form/Fields";
import { SubmitButton } from "@/components/form/SubmitButton";
import { buttonClass } from "@/components/ui/Button";
import { TickBox } from "@/components/ui/TickBox";
import type { PackageLine } from "@/lib/domain/package";
import { idleState, type ActionState } from "@/lib/forms";
import { INCLUSION_STATUS_LABEL, PACKAGE_SECTION_LABEL, optionsFrom } from "@/lib/labels";

type SaveAction = (prev: ActionState, form: FormData) => Promise<ActionState>;
type FormAction = (form: FormData) => void | Promise<void>;

const STATUS_TEXT: Record<PackageLine["status"], string> = {
  INCLUDED: "text-garden-ink",
  EXTRA_COST: "text-gold-ink",
  NOT_INCLUDED: "text-cocoa",
  TO_CONFIRM: "text-rose-ink",
};

function TickButton({ included, name }: { included: boolean; name: string }) {
  const { pending } = useFormStatus();
  const shown = pending ? !included : included;
  return (
    <button
      type="submit"
      aria-pressed={included}
      aria-label={`Included: ${name}`}
      title={included ? "Mark as still to confirm" : "Mark as included"}
      className="group -m-1 grid size-7 place-items-center rounded-[3px]"
    >
      <TickBox checked={shown} hoverable dimmed={pending} />
    </button>
  );
}

/** One line of the package: tick it once it's confirmed included; edit the rest inline. */
export function PackageLineRow({
  line,
  toggle,
  save,
  remove,
}: {
  line: PackageLine;
  toggle: FormAction;
  save: SaveAction;
  remove: FormAction;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState(async (prev: ActionState, form: FormData) => {
    const result = await save(prev, form);
    if (result.ok) setEditing(false);
    return result;
  }, idleState);
  const e = state.errors ?? {};
  const prefix = `pkg-${line.id}-`;

  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 border-b border-rule py-3 last:border-b-0">
      <form action={toggle} className="pt-px">
        <TickButton included={line.status === "INCLUDED"} name={line.name} />
      </form>
      <div className="grid min-w-0 gap-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="min-w-0 text-[15px] leading-snug">{line.name}</p>
          <span className="flex items-baseline gap-3">
            <span className={`text-[10px] font-semibold tracking-[0.12em] whitespace-nowrap uppercase ${STATUS_TEXT[line.status]}`}>
              {INCLUSION_STATUS_LABEL[line.status]}
            </span>
            {!editing ? (
              <button type="button" onClick={() => setEditing(true)} className="text-[12px] text-rose-ink hover:text-chocolate">
                Edit<span className="sr-only"> {line.name}</span>
              </button>
            ) : null}
          </span>
        </div>
        {line.notes && !editing ? <p className="max-w-prose text-[13px] leading-relaxed text-muted">{line.notes}</p> : null}

        {editing ? (
          <div className="mt-1 grid gap-4 rounded-[3px] border border-rule bg-ivory/50 p-4">
            <form action={action} className="grid gap-4">
              <TextField idPrefix={prefix} name="name" label="What" required defaultValue={line.name} error={e.name} />
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  idPrefix={prefix}
                  name="status"
                  label="In the package?"
                  options={optionsFrom(INCLUSION_STATUS_LABEL)}
                  defaultValue={line.status}
                  error={e.status}
                />
                <SelectField
                  idPrefix={prefix}
                  name="section"
                  label="Part of the day"
                  options={optionsFrom(PACKAGE_SECTION_LABEL)}
                  defaultValue={line.section}
                  error={e.section}
                />
              </div>
              <TextareaField idPrefix={prefix} name="notes" label="Notes" rows={2} defaultValue={line.notes} error={e.notes} />
              <div className="flex flex-wrap items-center gap-3">
                <SubmitButton size="sm">Save</SubmitButton>
                <button type="button" onClick={() => setEditing(false)} className={buttonClass("secondary", "sm")}>
                  Cancel
                </button>
                {state.ok ? null : <FormMessage state={state} />}
              </div>
            </form>
            <div className="border-t border-rule pt-4">
              <ConfirmButton action={remove} question="Remove this line?" confirmLabel="Yes, remove">
                Remove line
              </ConfirmButton>
            </div>
          </div>
        ) : null}
      </div>
    </li>
  );
}

/** Add a line: what it is, where it belongs, and whether it's included. React clears it after adding. */
export function AddPackageLineForm({ action }: { action: SaveAction }) {
  const [state, formAction] = useActionState(action, idleState);
  const e = state.errors ?? {};
  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem_11rem]">
        <TextField idPrefix="pkg-new-" name="name" label="Add to the list" placeholder="Uplighting in the ballroom" error={e.name} />
        <SelectField
          idPrefix="pkg-new-"
          name="section"
          label="Part of the day"
          options={optionsFrom(PACKAGE_SECTION_LABEL)}
          defaultValue="OTHER"
          error={e.section}
        />
        <SelectField
          idPrefix="pkg-new-"
          name="status"
          label="In the package?"
          options={optionsFrom(INCLUSION_STATUS_LABEL)}
          defaultValue="TO_CONFIRM"
          error={e.status}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton size="sm">Add</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
