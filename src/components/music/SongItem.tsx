"use client";

import { useActionState, useState } from "react";
import { ConfirmButton } from "@/components/form/ConfirmButton";
import { FormMessage, SelectField, TextField } from "@/components/form/Fields";
import { SubmitButton } from "@/components/form/SubmitButton";
import { buttonClass } from "@/components/ui/Button";
import type { SongView } from "@/lib/data/music";
import { idleState, type ActionState } from "@/lib/forms";
import { MUSIC_MOMENT_LABEL, optionsFrom } from "@/lib/labels";
import { MoveButtons } from "./MoveButtons";
import { RowLayout } from "./RowLayout";

type SaveAction = (prev: ActionState, form: FormData) => Promise<ActionState>;
type FormAction = (form: FormData) => void | Promise<void>;

const MOMENT_OPTIONS = optionsFrom(MUSIC_MOMENT_LABEL);

/** One song: title, artist and notes, with reorder arrows. Edit opens the fields and the delete. */
export function SongItem({
  song,
  save,
  remove,
  up,
  down,
}: {
  song: SongView;
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
  const prefix = `song-${song.id}-`;

  return (
    <li className="border-b border-rule py-3 first:pt-0 last:border-b-0 last:pb-0">
      <RowLayout
        body={
          <>
            <p className="text-[15px] leading-snug">{song.title}</p>
            {song.artist ? <p className="text-[13px] text-cocoa">{song.artist}</p> : null}
            {song.notes ? <p className="mt-0.5 text-[13px] whitespace-pre-line text-muted">{song.notes}</p> : null}
          </>
        }
        actions={
          <>
            <MoveButtons up={up} down={down} name={song.title} />
            {editing ? null : (
              <button type="button" onClick={() => setEditing(true)} className={`${buttonClass("quiet")} ml-1 py-0`}>
                Edit<span className="sr-only"> {song.title}</span>
              </button>
            )}
          </>
        }
      />

      {editing ? (
        <div className="mt-3 grid gap-4 rounded-[3px] border border-rule bg-ivory/50 p-4">
          <form action={action} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="title" label="Song" idPrefix={prefix} defaultValue={song.title} required error={e.title} />
              <TextField name="artist" label="Artist (optional)" idPrefix={prefix} defaultValue={song.artist} error={e.artist} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                name="notes"
                label="Notes (optional)"
                idPrefix={prefix}
                defaultValue={song.notes}
                error={e.notes}
                placeholder="Start at the second chorus"
              />
              <SelectField name="moment" label="Moment" idPrefix={prefix} options={MOMENT_OPTIONS} defaultValue={song.moment} error={e.moment} />
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
            <ConfirmButton action={remove} question="Delete this song?">
              Delete song
            </ConfirmButton>
          </div>
        </div>
      ) : null}
    </li>
  );
}
