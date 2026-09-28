"use client";

import { useFormStatus } from "react-dom";
import { setTaskStatus } from "@/app/(app)/tasks/actions";
import { TASK_STATUS_LABEL, optionsFrom } from "@/lib/labels";

const OPTIONS = optionsFrom(TASK_STATUS_LABEL);

/** Move a board card to another column. Applies as soon as it changes. */
export function StatusSelect({ id, status, title }: { id: string; status: string; title: string }) {
  return (
    <form action={setTaskStatus.bind(null, id)} className="flex shrink-0 items-center gap-2">
      <Inner id={id} status={status} title={title} />
    </form>
  );
}

function Inner({ id, status, title }: { id: string; status: string; title: string }) {
  const { pending } = useFormStatus();
  return (
    <>
      <label htmlFor={`status-${id}`} className="sr-only">
        Status of “{title}”
      </label>
      <select
        id={`status-${id}`}
        name="status"
        defaultValue={status}
        disabled={pending}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="max-w-full appearance-none rounded-[3px] border border-rule bg-paper bg-[length:9px] bg-[right_0.4rem_center] bg-no-repeat py-1 pr-5 pl-2 text-[11.5px] text-cocoa hover:border-rule-strong focus:border-desert-rose disabled:opacity-60"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%235C4033' stroke-width='1.4'/%3E%3C/svg%3E\")",
        }}
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="text-[12px] text-rose-ink underline">
          Move
        </button>
      </noscript>
    </>
  );
}
