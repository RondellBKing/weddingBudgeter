"use client";

import { useFormStatus } from "react-dom";
import { TickBox } from "@/components/ui/TickBox";

function CheckButton({ done, title }: { done: boolean; title: string }) {
  const { pending } = useFormStatus();
  // While saving, show the state it's about to become.
  const shown = pending ? !done : done;
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={done ? `Mark “${title}” as not done` : `Mark “${title}” as done`}
      aria-pressed={done}
      className="group -m-1.5 grid size-8 shrink-0 place-items-center rounded-[3px] disabled:cursor-wait"
    >
      <TickBox checked={shown} hoverable dimmed={pending} />
    </button>
  );
}

/** Tick box for a duty. `action` is setDutyDone bound to the duty and its new state. */
export function DutyCheck({ action, done, title }: { action: (formData: FormData) => void | Promise<void>; done: boolean; title: string }) {
  return (
    <form action={action} className="flex">
      <CheckButton done={done} title={title} />
    </form>
  );
}
