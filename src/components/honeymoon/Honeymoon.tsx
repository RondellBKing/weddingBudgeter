"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { ConfirmButton } from "@/components/form/ConfirmButton";
import { FormMessage, TextareaField, TextField } from "@/components/form/Fields";
import { SubmitButton } from "@/components/form/SubmitButton";
import { buttonClass } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { HoneymoonIdeaView } from "@/lib/data/honeymoon";
import { idleState, type ActionState } from "@/lib/forms";

type SaveAction = (prev: ActionState, form: FormData) => Promise<ActionState>;
type FormAction = (form: FormData) => void | Promise<void>;

/** The two dates. Leave both blank and save to clear them. */
export function TripDatesForm({ action, departOn, returnOn }: { action: SaveAction; departOn: string | null; returnOn: string | null }) {
  const [state, formAction] = useActionState(action, idleState);
  const e = state.errors ?? {};
  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField idPrefix="trip-" name="departOn" type="date" label="We leave" defaultValue={departOn ?? ""} error={e.departOn} />
        <TextField idPrefix="trip-" name="returnOn" type="date" label="We're home" defaultValue={returnOn ?? ""} error={e.returnOn} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton size="sm">Save dates</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

function Star({ favorite, name }: { favorite: boolean; name: string }) {
  const { pending } = useFormStatus();
  const shown = pending ? !favorite : favorite;
  return (
    <button
      type="submit"
      aria-pressed={favorite}
      aria-label={`Favorite: ${name}`}
      title={favorite ? "Remove from favorites" : "Add to favorites"}
      className="grid size-9 place-items-center rounded-full border border-rule bg-paper transition-colors hover:border-rule-strong"
    >
      <Icon
        name="star"
        size={18}
        className={`transition-colors ${shown ? "fill-desert-rose text-desert-rose" : "fill-transparent text-cocoa"} ${pending ? "opacity-70" : ""}`}
      />
    </button>
  );
}

function IdeaFields({ prefix, idea, errors }: { prefix: string; idea?: HoneymoonIdeaView; errors: Record<string, string> }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_8rem]">
        <TextField idPrefix={prefix} name="name" label="Where" required placeholder="Santorini" defaultValue={idea?.name ?? ""} error={errors.name} />
        <TextField idPrefix={prefix} name="place" label="Region" placeholder="Greek islands" defaultValue={idea?.place ?? ""} error={errors.place} />
        <TextField
          idPrefix={prefix}
          name="flightHours"
          label="Flight (hours)"
          inputMode="numeric"
          placeholder="11"
          defaultValue={idea?.flightHours?.toString() ?? ""}
          error={errors.flightHours}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField idPrefix={prefix} name="flight" label="Getting there" placeholder="One stop through Athens" defaultValue={idea?.flight ?? ""} error={errors.flight} />
        <TextField idPrefix={prefix} name="weather" label="In mid-April" placeholder="Low 70s, sea still cool" defaultValue={idea?.weather ?? ""} error={errors.weather} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextareaField idPrefix={prefix} name="why" label="Why we'd love it" rows={2} defaultValue={idea?.why ?? ""} error={errors.why} />
        <TextareaField idPrefix={prefix} name="watchOut" label="Worth knowing" rows={2} defaultValue={idea?.watchOut ?? ""} error={errors.watchOut} />
      </div>
    </>
  );
}

/** One place on the shortlist: a star to keep it, "choose this one", and its details. */
export function IdeaCard({
  idea,
  favorite,
  choose,
  save,
  remove,
}: {
  idea: HoneymoonIdeaView;
  favorite: FormAction;
  choose: FormAction;
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
  const prefix = `idea-${idea.id}-`;

  return (
    <article
      aria-labelledby={`${prefix}h`}
      className={`relative grid content-start gap-4 rounded-[3px] border bg-paper px-5 py-5 sm:px-6 ${
        idea.isChosen ? "border-desert-rose/70 ring-1 ring-dusty-rose/50" : "border-rule"
      }`}
    >
      <header className="flex items-start justify-between gap-4">
        <div className="grid min-w-0 gap-1">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {idea.place ? <span className="label-caps text-[10px] text-rose-ink">{idea.place}</span> : null}
            {idea.isChosen ? (
              <span className="text-[10px] font-semibold tracking-[0.14em] text-garden-ink uppercase">Our honeymoon</span>
            ) : null}
            {idea.isDemo ? <span className="text-[10px] font-semibold tracking-[0.12em] text-gold-ink uppercase">Demo</span> : null}
          </p>
          <h3 id={`${prefix}h`} className="font-display text-[28px] leading-tight">
            {idea.name}
          </h3>
        </div>
        <form action={favorite}>
          <Star favorite={idea.isFavorite} name={idea.name} />
        </form>
      </header>

      {editing ? (
        <div className="grid gap-4 rounded-[3px] border border-rule bg-ivory/50 p-4">
          <form action={action} className="grid gap-4">
            <IdeaFields prefix={prefix} idea={idea} errors={e} />
            <div className="flex flex-wrap items-center gap-3">
              <SubmitButton size="sm">Save</SubmitButton>
              <button type="button" onClick={() => setEditing(false)} className={buttonClass("secondary", "sm")}>
                Cancel
              </button>
              {state.ok ? null : <FormMessage state={state} />}
            </div>
          </form>
          <div className="border-t border-rule pt-4">
            <ConfirmButton action={remove} question={`Take ${idea.name} off the list?`} confirmLabel="Yes, remove">
              Remove from the list
            </ConfirmButton>
          </div>
        </div>
      ) : (
        <>
          <dl className="grid gap-3 text-[14px] leading-relaxed">
            {idea.weather ? (
              <div className="grid gap-0.5">
                <dt className="label-caps text-[9.5px]">In mid-April</dt>
                <dd className="text-chocolate">{idea.weather}</dd>
              </div>
            ) : null}
            {idea.flight ? (
              <div className="grid gap-0.5">
                <dt className="label-caps text-[9.5px]">Getting there</dt>
                <dd className="text-chocolate">{idea.flight}</dd>
              </div>
            ) : null}
            {idea.why ? (
              <div className="grid gap-0.5">
                <dt className="label-caps text-[9.5px]">Why go</dt>
                <dd className="text-cocoa">{idea.why}</dd>
              </div>
            ) : null}
            {idea.watchOut ? (
              <div className="grid gap-0.5">
                <dt className="label-caps text-[9.5px]">Worth knowing</dt>
                <dd className="text-cocoa">{idea.watchOut}</dd>
              </div>
            ) : null}
          </dl>
          <footer className="mt-auto flex flex-wrap items-center gap-3 border-t border-rule pt-4">
            <form action={choose}>
              {idea.isChosen ? (
                <SubmitButton size="sm" variant="quiet" pendingLabel="Saving…">
                  Undo our choice
                </SubmitButton>
              ) : (
                <SubmitButton size="sm" variant="secondary" pendingLabel="Saving…">
                  Choose this one
                </SubmitButton>
              )}
            </form>
            <button type="button" onClick={() => setEditing(true)} className={buttonClass("quiet")}>
              Edit<span className="sr-only"> {idea.name}</span>
            </button>
          </footer>
        </>
      )}
    </article>
  );
}

/** "Add a place": opens a short form; clears and closes after adding. */
export function AddIdeaForm({ action }: { action: SaveAction }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(async (prev: ActionState, form: FormData) => {
    const result = await action(prev, form);
    if (result.ok) setOpen(false);
    return result;
  }, idleState);
  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setOpen(true)} className={buttonClass("secondary", "sm")}>
          Add a place
        </button>
        {state.ok && state.message ? <FormMessage state={state} /> : null}
      </div>
    );
  }
  return (
    <form action={formAction} className="grid gap-4 rounded-[3px] border border-rule bg-paper p-5">
      <IdeaFields prefix="idea-new-" errors={state.errors ?? {}} />
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton size="sm" pendingLabel="Adding…">
          Add to the list
        </SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className={buttonClass("secondary", "sm")}>
          Cancel
        </button>
        {state.ok ? null : <FormMessage state={state} />}
      </div>
    </form>
  );
}
