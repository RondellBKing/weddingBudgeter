"use client";

import { useActionState } from "react";
import { quickAddTimelineItem, type TimelineFormState } from "@/app/(app)/timeline/actions";
import { TextField } from "@/components/form/Fields";
import { SubmitButton } from "@/components/form/SubmitButton";

const initial: TimelineFormState = { ok: true, message: "" };

/** What, start, end on one line. Where, who and notes can be added on the item itself. */
export function TimelineQuickAdd({ date, dayName }: { date: string; dayName: string }) {
  const [state, action] = useActionState(quickAddTimelineItem, initial);
  const e = state.errors ?? {};
  const v = state.ok ? {} : (state.values ?? {});
  return (
    // Remount with the typed values after a failed save; a successful one starts fresh.
    <form key={state.values ? JSON.stringify(state.values) : state.message || "form"} action={action} aria-label={`Add to ${dayName}`}>
      <input type="hidden" name="date" value={date} />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-[minmax(0,1fr)_8.75rem_8.75rem_auto] sm:items-start">
        <TextField
          name="title"
          label={`Add to ${dayName}`}
          placeholder="Sparkler send-off"
          required
          defaultValue={v.title}
          error={e.title}
          className="col-span-2 sm:col-span-1"
          idPrefix="quick-"
        />
        <TextField name="startTime" label="Starts" type="time" required defaultValue={v.startTime} error={e.startTime} idPrefix="quick-" />
        <TextField name="endTime" label="Ends (optional)" type="time" defaultValue={v.endTime} error={e.endTime} idPrefix="quick-" />
        <div className="col-span-2 grid content-start gap-1.5 sm:col-span-1">
          <span aria-hidden className="label-caps hidden select-none sm:block">
            &nbsp;
          </span>
          <SubmitButton pendingLabel="Adding…" className="w-full py-[11px] sm:w-auto">
            Add
          </SubmitButton>
        </div>
      </div>
      <p role="status" aria-live="polite" className={`text-sm not-empty:mt-3 ${state.ok ? "text-garden-ink" : "text-brick"}`}>
        {state.message}
      </p>
    </form>
  );
}
