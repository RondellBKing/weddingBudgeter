"use client";

import { useState, type ReactNode } from "react";
import { buttonClass } from "@/components/ui/Button";

/**
 * Two-step button for anything destructive: the first click asks, the second one does it.
 * `action` is a Server Action, usually bound to an id: deleteThing.bind(null, id).
 */
export function ConfirmButton({
  action,
  children,
  question = "Are you sure?",
  confirmLabel = "Yes, delete",
  size = "sm",
  variant = "danger",
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  question?: string;
  confirmLabel?: string;
  size?: "sm" | "md";
  /** "quiet" shows the first step as a small text link (for rows in a list). */
  variant?: "danger" | "quiet";
}) {
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className={variant === "quiet" ? "text-[12px] text-muted underline-offset-4 hover:text-brick hover:underline" : buttonClass("danger", size)}
      >
        {children}
      </button>
    );
  }
  return (
    <form action={action} className="inline-flex flex-wrap items-center gap-2" role="group" aria-label={question}>
      <span className="text-[13px] text-brick">{question}</span>
      <button type="submit" className={buttonClass("danger", size, "bg-brick-wash")}>
        {confirmLabel}
      </button>
      <button type="button" onClick={() => setArmed(false)} className={buttonClass("secondary", size)}>
        Cancel
      </button>
    </form>
  );
}
