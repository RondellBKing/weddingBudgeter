"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { MoveButtons } from "@/components/music/MoveButtons";
import { RowLayout } from "@/components/music/RowLayout";
import { ConfirmButton } from "@/components/form/ConfirmButton";
import { CheckboxField, FormMessage, SelectField, TextField } from "@/components/form/Fields";
import { SubmitButton } from "@/components/form/SubmitButton";
import { buttonClass } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { ShotView } from "@/lib/data/photos";
import { idleState, type ActionState } from "@/lib/forms";
import { optionsFrom, SHOT_MOMENT_LABEL } from "@/lib/labels";

type SaveAction = (prev: ActionState, form: FormData) => Promise<ActionState>;
type FormAction = (form: FormData) => void | Promise<void>;

const MOMENT_OPTIONS = optionsFrom(SHOT_MOMENT_LABEL);

function StarButton({ on, description }: { on: boolean; description: string }) {
  const { pending } = useFormStatus();
  // While saving, show the state it's about to become.
  const shown = pending ? !on : on;
  return (
    <button
      type="submit"
      disabled={pending}
      aria-pressed={on}
      aria-label={`Must-have: ${description}`}
      title={on ? "Must-have. Click to unmark" : "Mark as a must-have"}
      className={`-m-1 grid size-9 shrink-0 place-items-center rounded-full transition-colors hover:bg-linen disabled:cursor-wait ${
        shown ? "text-gold" : "text-rule-strong hover:text-gold"
      }`}
    >
      <Icon name="star" size={19} fill={shown ? "currentColor" : "none"} strokeWidth={shown ? 1.2 : 1.4} />
    </button>
  );
}

/** A shot on the list: star for must-have, the description, who's in it, reorder and edit. */
export function ShotItem({
  shot,
  number,
  save,
  toggle,
  remove,
  up,
  down,
}: {
  shot: ShotView;
  /** Family groupings are numbered, because their order matters on the day. */
  number: number | null;
  save: SaveAction;
  toggle: FormAction;
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
  const prefix = `shot-${shot.id}-`;

  return (
    <li className="border-b border-rule py-3 first:pt-0 last:border-b-0 last:pb-0">
      <RowLayout
        lead={
          <form action={toggle} className="flex">
            <StarButton on={shot.isMustHave} description={shot.description} />
          </form>
        }
        body={
          <>
            <p className="text-[15px] leading-snug">
              {number !== null ? <span className="num mr-1.5 text-muted">{number}.</span> : null}
              {shot.description}
            </p>
            {shot.people ? (
              <p className="mt-0.5 flex items-start gap-1.5 text-[13px] text-cocoa">
                <Icon name="guests" size={14} className="mt-[2px] shrink-0 text-muted" />
                <span>
                  <span className="sr-only">Who&apos;s in it: </span>
                  {shot.people}
                </span>
              </p>
            ) : null}
          </>
        }
        meta={
          shot.isMustHave ? (
            <p className="text-[10.5px] font-semibold tracking-[0.12em] text-gold-ink uppercase sm:mt-1">Must-have</p>
          ) : null
        }
        actions={
          <>
            <MoveButtons up={up} down={down} name={shot.description} />
            {editing ? null : (
              <button type="button" onClick={() => setEditing(true)} className={`${buttonClass("quiet")} ml-1 py-0`}>
                Edit<span className="sr-only"> {shot.description}</span>
              </button>
            )}
          </>
        }
      />

      {editing ? (
        <div className="mt-3 grid gap-4 rounded-[3px] border border-rule bg-ivory/50 p-4">
          <form action={action} className="grid gap-4">
            <TextField name="description" label="The shot" idPrefix={prefix} defaultValue={shot.description} required error={e.description} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                name="people"
                label="Who's in it (optional)"
                idPrefix={prefix}
                defaultValue={shot.people}
                error={e.people}
                hint="Names help the photographer's assistant gather everyone."
              />
              <SelectField name="moment" label="Moment" idPrefix={prefix} options={MOMENT_OPTIONS} defaultValue={shot.moment} error={e.moment} />
            </div>
            <CheckboxField name="isMustHave" label="Must-have" idPrefix={prefix} defaultChecked={shot.isMustHave} />
            <div className="flex flex-wrap items-center gap-3">
              <SubmitButton size="sm">Save</SubmitButton>
              <button type="button" onClick={() => setEditing(false)} className={buttonClass("secondary", "sm")}>
                Cancel
              </button>
              {state.ok ? null : <FormMessage state={state} />}
            </div>
          </form>
          <div className="border-t border-rule pt-4">
            <ConfirmButton action={remove} question="Delete this shot?">
              Delete shot
            </ConfirmButton>
          </div>
        </div>
      ) : null}
    </li>
  );
}
