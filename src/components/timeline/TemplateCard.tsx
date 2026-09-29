"use client";

import { useActionState } from "react";
import type { TimelineFormState } from "@/app/(app)/timeline/actions";
import { CheckboxField, TextField } from "@/components/form/Fields";
import { SubmitButton } from "@/components/form/SubmitButton";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Divider, Sprig } from "@/components/ui/Ornaments";

const initial: TimelineFormState = { ok: true, message: "" };

type Action = (prev: TimelineFormState, form: FormData) => Promise<TimelineFormState>;

function Status({ state }: { state: TimelineFormState }) {
  return (
    <p role="status" aria-live="polite" className={`text-sm ${state.ok ? "text-garden-ink" : "text-brick"}`}>
      {state.ok ? state.message : state.errors ? "" : state.message}
    </p>
  );
}

/** Offered while the wedding day is empty: one question, the ceremony time. */
export function WeddingTemplateCard({
  action,
  ceremonyTime,
  venueAccess,
}: {
  action: Action;
  ceremonyTime: string | null;
  /** "6:00 AM" */
  venueAccess: string;
}) {
  const [state, formAction] = useActionState(action, initial);
  const e = state.errors ?? {};
  const typed = state.ok ? null : state.values;
  return (
    <Card framed className="overflow-hidden px-6 py-10 sm:px-12 sm:py-12" aria-labelledby="template-h">
      <Sprig className="pointer-events-none absolute -top-2 -left-8 w-36 opacity-70 sm:w-44" />
      <Sprig flip="xy" className="pointer-events-none absolute -right-8 -bottom-2 w-36 opacity-70 sm:w-44" />
      <div className="relative mx-auto grid max-w-xl justify-items-center gap-4 text-center">
        <span className="grid size-12 place-items-center rounded-full border border-gold/60 text-rose-ink">
          <Icon name="timeline" size={22} />
        </span>
        <h2 id="template-h" className="text-[32px] leading-tight sm:text-[38px]">
          Start from a <em className="italic">template</em>
        </h2>
        <Divider className="w-28" />
        <p className="text-[15px] leading-relaxed text-cocoa">
          Enter the ceremony time for a full draft of the day, from vendor setup (the venue opens at{" "}
          {venueAccess.replace(" ", " ")}) to the send-off. Change or delete any line after.
        </p>
        <form key={typed ? JSON.stringify(typed) : "form"} action={formAction} className="mt-2 grid w-full max-w-sm gap-5 text-left">
          <TextField
            name="ceremonyTime"
            label="When does the ceremony start?"
            type="time"
            required
            defaultValue={typed?.ceremonyTime ?? ceremonyTime ?? ""}
            error={e.ceremonyTime}
            hint={ceremonyTime ? "From Settings. Change it here if it's moved." : "Built for anything from 10:00 AM to 7:00 PM."}
            idPrefix="tpl-"
          />
          <CheckboxField
            name="firstLook"
            label="Include a first look"
            hint="A private moment before the ceremony, so most photos are done before guests arrive."
            defaultChecked={typed ? typed.firstLook === "on" : true}
            idPrefix="tpl-"
          />
          <div className="grid gap-3">
            <SubmitButton pendingLabel="Drafting…" className="w-full">
              Draft the wedding day
            </SubmitButton>
            <Status state={state} />
          </div>
        </form>
      </div>
    </Card>
  );
}

/** Offered while the rehearsal day is empty: drop-off, rehearsal, rehearsal dinner. */
export function RehearsalTemplateCard({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, initial);
  const e = state.errors ?? {};
  const typed = state.ok ? null : state.values;
  return (
    <Card className="grid gap-5 p-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] sm:gap-10 sm:p-8" aria-labelledby="rehearsal-template-h">
      <div className="grid content-start gap-2">
        <p className="label-caps text-rose-ink">Start from a template</p>
        <h2 id="rehearsal-template-h" className="text-[28px] leading-tight">
          Rehearsal, then <em className="italic">dinner</em>
        </h2>
        <p className="text-[15px] leading-relaxed text-cocoa">
          Enter when the rehearsal starts for a draft with a décor drop-off an hour before, the rehearsal itself, and the
          rehearsal dinner after.
        </p>
      </div>
      <form key={typed ? JSON.stringify(typed) : "form"} action={formAction} className="grid content-start gap-4">
        <TextField
          name="rehearsalTime"
          label="When does the rehearsal start?"
          type="time"
          required
          defaultValue={typed?.rehearsalTime ?? ""}
          error={e.rehearsalTime}
          hint="Often late afternoon, like 5:00 PM."
          idPrefix="rtpl-"
        />
        <SubmitButton pendingLabel="Drafting…" className="w-full">
          Draft the rehearsal day
        </SubmitButton>
        <Status state={state} />
      </form>
    </Card>
  );
}
