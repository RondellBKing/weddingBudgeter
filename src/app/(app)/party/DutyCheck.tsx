"use client";

import { useFormStatus } from "react-dom";
import { Icon } from "@/components/ui/Icon";

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
      className="group -m-1.5 grid size-8 shrink-0 place-items-center rounded-full disabled:cursor-wait"
    >
      <span
        aria-hidden
        className={`grid size-5 place-items-center rounded-full border transition-colors ${
          shown ? "border-garden bg-garden text-paper" : "border-rule-strong bg-paper text-transparent group-hover:border-garden"
        } ${pending ? "opacity-60" : ""}`}
      >
        <Icon name="check" size={13} strokeWidth={2.2} />
      </span>
    </button>
  );
}

/** Round tick box for a duty. `action` is setDutyDone bound to the duty and its new state. */
export function DutyCheck({ action, done, title }: { action: (formData: FormData) => void | Promise<void>; done: boolean; title: string }) {
  return (
    <form action={action} className="flex">
      <CheckButton done={done} title={title} />
    </form>
  );
}
