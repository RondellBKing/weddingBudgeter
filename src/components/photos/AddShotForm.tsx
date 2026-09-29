"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CheckboxField, FormMessage, SelectField, TextField } from "@/components/form/Fields";
import { SubmitButton } from "@/components/form/SubmitButton";
import { buttonClass } from "@/components/ui/Button";
import type { ShotMoment } from "@/generated/prisma/enums";
import { idleState, type ActionState } from "@/lib/forms";
import { optionsFrom, SHOT_MOMENT_LABEL } from "@/lib/labels";

type SaveAction = (prev: ActionState, form: FormData) => Promise<ActionState>;

/**
 * "Add a shot": a quiet link that opens a short form. Under a moment the moment is fixed;
 * without one (the empty list) the form asks for it. Stays open for adding several.
 */
export function AddShotForm({
  action,
  moment,
  label = "Add a shot",
  placeholder,
  align = "start",
}: {
  action: SaveAction;
  moment?: ShotMoment;
  label?: string;
  placeholder?: string;
  /** Where the closed "Add a shot" link sits in its grid. */
  align?: "start" | "center";
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(action, idleState);
  const form = useRef<HTMLFormElement>(null);
  const e = state.errors ?? {};
  const prefix = `new-${moment ?? "any"}-`;

  // Opening the form (or adding a shot) puts the cursor back in the description.
  useEffect(() => {
    if (open) form.current?.querySelector<HTMLInputElement>("input[name=description]")?.focus();
  }, [open, state]);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${buttonClass("quiet")} ${align === "center" ? "justify-self-center" : "justify-self-start"}`}>
        <span aria-hidden>+</span> {label}
      </button>
    );
  }
  return (
    <form ref={form} action={formAction} className="grid gap-4 rounded-[3px] border border-rule bg-ivory/50 p-4 text-left">
      {moment ? <input type="hidden" name="moment" value={moment} /> : null}
      <div className={`grid gap-4 ${moment ? "" : "sm:grid-cols-[minmax(0,1fr)_14rem]"}`}>
        <TextField name="description" label="The shot" idPrefix={prefix} required error={e.description} placeholder={placeholder} />
        {moment ? null : (
          <SelectField name="moment" label="Moment" idPrefix={prefix} options={optionsFrom(SHOT_MOMENT_LABEL)} defaultValue="FAMILY" error={e.moment} />
        )}
      </div>
      <TextField name="people" label="Who's in it (optional)" idPrefix={prefix} error={e.people} placeholder="Names, so they can be gathered" />
      <CheckboxField name="isMustHave" label="Must-have" idPrefix={prefix} />
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton size="sm" variant="secondary" pendingLabel="Adding…">
          Add
        </SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className={buttonClass("quiet")}>
          Done
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
