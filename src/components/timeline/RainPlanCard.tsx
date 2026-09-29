"use client";

import { useActionState, useState } from "react";
import { saveRainPlan } from "@/app/(app)/timeline/actions";
import { TextareaField } from "@/components/form/Fields";
import { SubmitButton } from "@/components/form/SubmitButton";
import { buttonClass } from "@/components/ui/Button";
import { Card, CardHeading } from "@/components/ui/Card";
import type { ActionState } from "@/lib/forms";

const initial: ActionState = { ok: true, message: "" };

const PLACEHOLDER = [
  "If rain is forecast, the ceremony moves to …",
  "Cocktail hour moves to …",
  "Who makes the call: …",
  "Decide by: … (the venue needs to know by …)",
  "Who tells the vendors and the wedding party: …",
].join("\n");

/** settings.rainPlan: what moves where, who decides, by when. */
export function RainPlanCard({ plan, className = "" }: { plan: string | null; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useActionState(async (prev: ActionState, form: FormData) => {
    const result = await saveRainPlan(prev, form);
    if (result.ok) setEditing(false);
    return result;
  }, initial);

  return (
    <Card className={`grid content-start gap-5 p-6 sm:p-8 ${className}`} aria-labelledby="rain-h">
      <CardHeading
        id="rain-h"
        title="Rain plan"
        action={
          !editing && plan ? (
            <button type="button" onClick={() => setEditing(true)} className={buttonClass("secondary", "sm")}>
              Edit
            </button>
          ) : undefined
        }
      />

      {editing ? (
        <form action={formAction} className="grid gap-4">
          <TextareaField
            name="rainPlan"
            label="What happens if it rains"
            rows={7}
            defaultValue={plan}
            placeholder={PLACEHOLDER}
            hint="What moves where, who decides, and by when."
            error={state.ok ? undefined : state.errors?.rainPlan}
          />
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton size="sm">Save the rain plan</SubmitButton>
            <button type="button" onClick={() => setEditing(false)} className={buttonClass("secondary", "sm")}>
              Cancel
            </button>
          </div>
        </form>
      ) : plan ? (
        <p className="max-w-prose text-[15px] leading-relaxed whitespace-pre-line text-cocoa">{plan}</p>
      ) : (
        <div className="grid justify-items-start gap-4">
          <p className="max-w-prose text-[15px] leading-relaxed text-cocoa">
            No rain plan yet. It&apos;s April in New Jersey, so a few lines now make the weather call easy:
          </p>
          <ul className="grid gap-1.5 text-[14px] text-cocoa">
            {["Where the ceremony and cocktail hour move", "Who makes the call", "By when, and who tells everyone"].map((t) => (
              <li key={t} className="flex items-baseline gap-2.5">
                <span aria-hidden className="size-1.5 shrink-0 translate-y-[-2px] rotate-45 bg-gold/70" />
                {t}
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setEditing(true)} className={buttonClass("secondary", "sm")}>
            Write the rain plan
          </button>
        </div>
      )}

      <p role="status" aria-live="polite" className={`text-sm empty:hidden ${state.ok ? "text-garden-ink" : "text-brick"}`}>
        {editing ? "" : state.message}
      </p>
    </Card>
  );
}
