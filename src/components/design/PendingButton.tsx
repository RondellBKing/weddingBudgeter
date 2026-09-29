"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/** A submit button that disables itself while its form's action runs (no double clicks). */
export function PendingButton({
  children,
  className,
  disabled = false,
  label,
  title,
}: {
  children: ReactNode;
  className: string;
  disabled?: boolean;
  /** Accessible name, for icon-only buttons. */
  label?: string;
  title?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} aria-label={label} title={title} className={className}>
      {children}
    </button>
  );
}
