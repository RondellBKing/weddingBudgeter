"use client";

import { useFormStatus } from "react-dom";
import { setTaskDone } from "@/app/(app)/tasks/actions";
import { Icon } from "@/components/ui/Icon";

/** The round checkbox beside a task: one click ticks it done, another unticks it. */
export function TaskCheck({ id, done, title }: { id: string; done: boolean; title: string }) {
  return (
    <form action={setTaskDone.bind(null, id, !done)} className="-m-1 shrink-0">
      <CheckButton done={done} title={title} />
    </form>
  );
}

function CheckButton({ done, title }: { done: boolean; title: string }) {
  const { pending } = useFormStatus();
  // Show the new state while the server catches up.
  const shown = pending ? !done : done;
  return (
    <button
      type="submit"
      aria-pressed={done}
      aria-label={`Done: ${title}`}
      title={done ? "Mark as not done" : "Mark as done"}
      className="group grid size-7 place-items-center rounded-full"
    >
      <span
        aria-hidden
        className={`grid size-[19px] place-items-center rounded-full border transition-colors ${
          shown
            ? "border-garden bg-garden text-paper"
            : "border-rule-strong bg-paper text-transparent group-hover:border-garden group-hover:text-garden"
        } ${pending ? "opacity-70" : ""}`}
      >
        <Icon name="check" size={12} strokeWidth={2.4} />
      </span>
    </button>
  );
}
