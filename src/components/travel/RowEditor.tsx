"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { buttonClass } from "@/components/ui/Button";

// Edit a row in place. The server renders the row and its form; this only shows or hides the
// form. The form closes itself after a successful save through useCloseEditor().

const CloseContext = createContext<(() => void) | null>(null);

/** Inside a RowEditor or Reveal: closes it. Null anywhere else. */
export function useCloseEditor() {
  return useContext(CloseContext);
}

export function RowEditor({
  children,
  editor,
  actions,
  label,
}: {
  /** The row as it reads. */
  children: ReactNode;
  /** The edit form. */
  editor: ReactNode;
  /** Extra one-tap buttons shown beside Edit. */
  actions?: ReactNode;
  /** What's being edited, for screen readers ("the 3:15 PM shuttle"). */
  label: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-2.5">
        <div className="min-w-0 flex-1 basis-60">{children}</div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className={buttonClass("secondary", "sm")}
          >
            {open ? "Close" : "Edit"}
            <span className="sr-only"> {label}</span>
          </button>
        </div>
      </div>
      {open ? (
        <div className="rounded-[3px] border border-rule bg-ivory/45 p-4 sm:p-5">
          <CloseContext.Provider value={() => setOpen(false)}>{editor}</CloseContext.Provider>
        </div>
      ) : null}
    </div>
  );
}

/** A button that opens a form panel ("Add a shuttle run"). Starts open when there's nothing yet. */
export function Reveal({ label, children, defaultOpen = false }: { label: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!open) {
    return (
      <div>
        <button type="button" onClick={() => setOpen(true)} aria-expanded={false} className={buttonClass("secondary", "sm")}>
          <span aria-hidden className="text-[15px] leading-none">+</span> {label}
        </button>
      </div>
    );
  }
  return (
    <div className="grid gap-4 rounded-[3px] border border-rule bg-ivory/45 p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-display text-[22px] leading-tight">{label}</h3>
        <button type="button" onClick={() => setOpen(false)} aria-expanded className="text-[13px] text-rose-ink hover:text-chocolate">
          Close
        </button>
      </div>
      {children}
    </div>
  );
}
