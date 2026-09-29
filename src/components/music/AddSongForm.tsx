"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { FormMessage, TextField } from "@/components/form/Fields";
import { SubmitButton } from "@/components/form/SubmitButton";
import { buttonClass } from "@/components/ui/Button";
import type { MusicMoment } from "@/generated/prisma/enums";
import { idleState, type ActionState } from "@/lib/forms";

type SaveAction = (prev: ActionState, form: FormData) => Promise<ActionState>;

/**
 * "Add a song" under a moment: a quiet link that opens a short form. It stays open after
 * adding, so a prelude or a must-play list can be filled in one go.
 */
export function AddSongForm({
  action,
  moment,
  label = "Add a song",
  placeholder,
}: {
  action: SaveAction;
  moment: MusicMoment;
  label?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(action, idleState);
  const form = useRef<HTMLFormElement>(null);
  const e = state.errors ?? {};
  const prefix = `new-${moment}-`;

  // Opening the form (or adding a song) puts the cursor back in the song box.
  useEffect(() => {
    if (open) form.current?.querySelector<HTMLInputElement>("input[name=title]")?.focus();
  }, [open, state]);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${buttonClass("quiet")} justify-self-start`}>
        <span aria-hidden>+</span> {label}
      </button>
    );
  }
  return (
    <form ref={form} action={formAction} className="grid gap-4 rounded-[3px] border border-rule bg-ivory/50 p-4">
      <input type="hidden" name="moment" value={moment} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="title" label="Song" idPrefix={prefix} required error={e.title} placeholder={placeholder} />
        <TextField name="artist" label="Artist (optional)" idPrefix={prefix} error={e.artist} />
      </div>
      <TextField name="notes" label="Notes (optional)" idPrefix={prefix} error={e.notes} placeholder="Live version, clean edit, start at the chorus" />
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
