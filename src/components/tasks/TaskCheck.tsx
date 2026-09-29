"use client";

import { useFormStatus } from "react-dom";
import { setTaskDone } from "@/app/(app)/tasks/actions";
import { TickBox } from "@/components/ui/TickBox";

/** The tick box beside a task: one click ticks it done, another unticks it. */
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
      className="group grid size-7 place-items-center rounded-[3px]"
    >
      <TickBox checked={shown} hoverable dimmed={pending} />
    </button>
  );
}
