"use client";

import { useActionState, useState } from "react";
import { ConfirmButton } from "@/components/form/ConfirmButton";
import { Field, FormMessage, inputClass } from "@/components/form/Fields";
import { SubmitButton } from "@/components/form/SubmitButton";
import { buttonClass } from "@/components/ui/Button";
import { TickBox } from "@/components/ui/TickBox";
import { idleState, type ActionState } from "@/lib/forms";

type SaveAction = (prev: ActionState, form: FormData) => Promise<ActionState>;
type FormAction = (form: FormData) => Promise<void>;

export type QuestionView = { id: string; text: string; answer: string | null; answeredLabel: string | null };

/** One "question to ask": open (empty box) or answered (ticked, with the answer). */
export function QuestionItem({
  q,
  save,
  clear,
  remove,
}: {
  q: QuestionView;
  save: SaveAction;
  clear: FormAction;
  remove: FormAction;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState(async (prev: ActionState, form: FormData) => {
    const result = await save(prev, form);
    if (result.ok) setEditing(false);
    return result;
  }, idleState);
  const answered = q.answer !== null;
  const e = state.errors ?? {};
  const base = `q-${q.id}`;

  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3.5 border-b border-rule py-4 first:pt-0 last:border-b-0 last:pb-0">
      <span className="mt-0.5">
        <TickBox checked={answered} />
      </span>

      <div className="grid min-w-0 gap-2">
        <div className="flex items-start justify-between gap-4">
          <p className={`min-w-0 text-[15px] leading-snug ${answered ? "text-cocoa" : ""}`}>
            <span className="sr-only">{answered ? "Answered: " : "Still to ask: "}</span>
            {q.text}
          </p>
          {editing ? null : (
            <button type="button" onClick={() => setEditing(true)} className={`${buttonClass("quiet")} shrink-0 py-0`}>
              {answered ? "Edit" : "Answer"}
              <span className="sr-only">: {q.text}</span>
            </button>
          )}
        </div>

        {answered && !editing ? (
          <div className="grid gap-1">
            <p className="border-l-2 border-dusty-rose pl-3 text-[14px] leading-relaxed whitespace-pre-line text-chocolate">{q.answer}</p>
            {q.answeredLabel ? <p className="pl-3.5 text-xs text-muted">Answered {q.answeredLabel}</p> : null}
          </div>
        ) : null}

        {editing ? (
          <div className="mt-1 grid gap-4 rounded-[3px] border border-rule bg-ivory/50 p-4">
            <form action={action} className="grid gap-4">
              <Field id={`${base}-text`} label="Question" error={e.text}>
                <input
                  id={`${base}-text`}
                  name="text"
                  defaultValue={q.text}
                  required
                  aria-invalid={e.text ? true : undefined}
                  aria-describedby={e.text ? `${base}-text-error` : undefined}
                  className={inputClass}
                />
              </Field>
              <Field id={`${base}-answer`} label="Answer" error={e.answer} hint="Leave it blank while we're still waiting to hear.">
                <textarea
                  id={`${base}-answer`}
                  name="answer"
                  rows={3}
                  defaultValue={q.answer ?? ""}
                  // The person just asked to answer, so put them in the box.
                  autoFocus
                  aria-invalid={e.answer ? true : undefined}
                  aria-describedby={e.answer ? `${base}-answer-error` : `${base}-answer-hint`}
                  className={`${inputClass} leading-relaxed`}
                />
              </Field>
              <div className="flex flex-wrap items-center gap-3">
                <SubmitButton size="sm">Save</SubmitButton>
                <button type="button" onClick={() => setEditing(false)} className={buttonClass("secondary", "sm")}>
                  Cancel
                </button>
                {state.ok ? null : <FormMessage state={state} />}
              </div>
            </form>
            <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-4">
              {answered ? (
                <ConfirmButton
                  action={async (form) => {
                    await clear(form);
                    setEditing(false);
                  }}
                  question="Clear this answer?"
                  confirmLabel="Yes, clear it"
                >
                  Clear answer
                </ConfirmButton>
              ) : null}
              <ConfirmButton action={remove} question="Delete this question?">
                Delete question
              </ConfirmButton>
            </div>
          </div>
        ) : null}
      </div>
    </li>
  );
}

/** One-line form under the checklist. Clears itself after a question is added. */
export function AddQuestionForm({ action }: { action: SaveAction }) {
  const [state, formAction] = useActionState(action, idleState);
  const error = state.errors?.text;
  return (
    <form action={formAction} className="grid gap-2">
      <label htmlFor="new-question" className="label-caps">
        Add a question
      </label>
      <div className="flex gap-2">
        <input
          id="new-question"
          name="text"
          required
          placeholder="What do we need to ask them?"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "new-question-error" : undefined}
          className={`${inputClass} min-w-0 flex-1`}
        />
        <SubmitButton variant="secondary" pendingLabel="Adding…" className="shrink-0">
          Add
        </SubmitButton>
      </div>
      {error ? (
        <p id="new-question-error" className="text-[13px] text-brick">
          {error}
        </p>
      ) : (
        <FormMessage state={state} />
      )}
    </form>
  );
}
