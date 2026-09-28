"use client";

import { useState, useTransition, type ReactNode } from "react";
import type { ActionState } from "@/lib/forms";

/**
 * Click a value to edit it in place. Enter or leaving the field saves, Escape cancels.
 * `onSave` is a Server Action that validates and returns an ActionState.
 */
export function InlineEdit({
  value,
  display,
  onSave,
  label,
  kind = "text",
  align = "left",
}: {
  value: string;
  display: ReactNode;
  onSave: (next: string) => Promise<ActionState>;
  label: string;
  kind?: "text" | "money";
  align?: "left" | "right";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    if (draft === value) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const res = await onSave(draft);
      if (res.ok) {
        setEditing(false);
        setError(null);
      } else {
        setError(res.message);
      }
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(value);
          setError(null);
          setEditing(true);
        }}
        aria-label={`Edit ${label}`}
        className={`-mx-1.5 rounded-[2px] px-1.5 py-0.5 decoration-rule-strong decoration-dotted underline-offset-4 hover:bg-linen/70 hover:underline ${
          align === "right" ? "text-right" : "text-left"
        } ${pending ? "opacity-60" : ""}`}
      >
        {display}
      </button>
    );
  }

  return (
    <span className={`inline-grid gap-1 ${align === "right" ? "justify-items-end" : ""}`}>
      <span className="relative inline-flex items-center">
        {kind === "money" ? <span className="pointer-events-none absolute left-2 text-muted">$</span> : null}
        <input
          autoFocus
          value={draft}
          aria-label={label}
          aria-invalid={error ? true : undefined}
          inputMode={kind === "money" ? "decimal" : "text"}
          disabled={pending}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
            if (e.key === "Escape") {
              setEditing(false);
              setError(null);
            }
          }}
          className={`rounded-[2px] border border-desert-rose bg-paper py-1 text-sm text-chocolate ${
            kind === "money" ? "num w-28 pr-2 pl-5 text-right" : "w-full min-w-40 px-2"
          }`}
        />
      </span>
      {error ? (
        <span role="alert" className="text-xs text-brick">
          {error}
        </span>
      ) : null}
    </span>
  );
}
