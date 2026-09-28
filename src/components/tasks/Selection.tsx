"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { completeTasks } from "@/app/(app)/tasks/actions";
import { buttonClass } from "@/components/ui/Button";

// Bulk "Mark done": a "Select several" switch shows a small square checkbox on each open task,
// and a bar at the bottom of the list sends the selected ids in one go.

type Selection = {
  selecting: boolean;
  selected: ReadonlySet<string>;
  start: () => void;
  stop: () => void;
  toggle: (id: string, on: boolean) => void;
  selectAll: (ids: string[]) => void;
};

const SelectionContext = createContext<Selection | null>(null);

function useSelection(): Selection {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("Selection components must be inside <SelectionProvider>.");
  return ctx;
}

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

  const toggle = useCallback((id: string, on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const value = useMemo<Selection>(
    () => ({
      selecting,
      selected,
      start: () => setSelecting(true),
      stop: () => {
        setSelecting(false);
        setSelected(new Set());
      },
      toggle,
      selectAll: (ids) => setSelected(new Set(ids)),
    }),
    [selecting, selected, toggle],
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

/** Turns select mode on and off. */
export function SelectToggle({ disabled }: { disabled?: boolean }) {
  const { selecting, start, stop } = useSelection();
  return (
    <button
      type="button"
      onClick={selecting ? stop : start}
      disabled={disabled}
      aria-pressed={selecting}
      className={buttonClass("secondary", "sm", selecting ? "border-chocolate" : "")}
    >
      {selecting ? "Done selecting" : "Select several"}
    </button>
  );
}

/** The square checkbox shown on each open task while selecting. */
export function SelectBox({ id, title }: { id: string; title: string }) {
  const { selecting, selected, toggle } = useSelection();
  if (!selecting) return null;
  return (
    <label className="-m-1 grid size-7 shrink-0 cursor-pointer place-items-center">
      <span className="sr-only">Select “{title}”</span>
      <input
        type="checkbox"
        checked={selected.has(id)}
        onChange={(e) => toggle(id, e.currentTarget.checked)}
        className="size-4 cursor-pointer accent-desert-rose"
      />
    </label>
  );
}

/** Sticks to the bottom of the screen while selecting; marks the selected tasks done. */
export function SelectionBar({ openIds }: { openIds: string[] }) {
  const { selecting, selected, stop, selectAll } = useSelection();
  if (!selecting) return null;
  const ids = openIds.filter((id) => selected.has(id));
  const allChosen = ids.length === openIds.length && openIds.length > 0;

  return (
    <div className="sticky bottom-20 z-20 md:bottom-5">
      <form
        action={async (form) => {
          await completeTasks(form);
          stop();
        }}
        className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[3px] border border-chocolate/80 bg-chocolate px-4 py-3 text-ivory shadow-[0_12px_32px_-12px_rgba(62,43,34,0.55)] sm:px-5"
      >
        {ids.map((id) => (
          <input key={id} type="hidden" name="ids" value={id} />
        ))}
        <p role="status" aria-live="polite" className="order-1 text-sm">
          <span className="num font-display text-xl">{ids.length}</span> {ids.length === 1 ? "task" : "tasks"} selected
        </p>
        {/* Phones: count and Mark done on the first line, the quieter buttons under them. */}
        <div className="order-3 -ml-3 flex w-full items-center gap-1 sm:order-2 sm:ml-auto sm:w-auto">
          <button
            type="button"
            onClick={() => (allChosen ? selectAll([]) : selectAll(openIds))}
            className="rounded-[3px] px-3 py-1.5 text-[12px] font-medium tracking-[0.06em] text-ivory/85 uppercase hover:text-ivory"
          >
            {allChosen ? "Clear" : `Select all ${openIds.length}`}
          </button>
          <button type="button" onClick={stop} className="rounded-[3px] px-3 py-1.5 text-[12px] font-medium tracking-[0.06em] text-ivory/85 uppercase hover:text-ivory">
            Cancel
          </button>
        </div>
        <div className="order-2 ml-auto sm:order-3 sm:ml-0">
          <MarkDoneButton disabled={ids.length === 0} />
        </div>
      </form>
    </div>
  );
}

function MarkDoneButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="rounded-[3px] bg-ivory px-4 py-1.5 text-[12px] font-medium tracking-[0.08em] text-chocolate uppercase hover:bg-paper disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Marking…" : "Mark done"}
    </button>
  );
}
