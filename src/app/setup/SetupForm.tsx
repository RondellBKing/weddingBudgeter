"use client";

import { useActionState, useState } from "react";
import { inputClass } from "@/components/form/Fields";
import { SubmitButton } from "@/components/form/SubmitButton";
import { makeSecrets, type SetupState } from "./actions";

function CopyRow({ name, value }: { name: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="label-caps">Name</span>
      </div>
      <code className="num rounded-[3px] border border-rule bg-ivory/60 px-3 py-2 text-sm">{name}</code>
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="label-caps">Value</span>
        <button
          type="button"
          className="text-[13px] text-rose-ink hover:text-chocolate"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <textarea readOnly value={value} rows={value.length > 100 ? 5 : 3} className={`${inputClass} num text-xs break-all`} onFocus={(e) => e.currentTarget.select()} />
    </div>
  );
}

export function SetupForm() {
  const [state, action] = useActionState<SetupState, FormData>(makeSecrets, { ok: false, message: "" });

  if (state.ok) {
    return (
      <div className="grid gap-6">
        <p className="text-[15px] text-cocoa">
          Now add these two values to Vercel: open your project, then <strong>Settings → Environment Variables</strong>.
          Add each one for <strong>Production</strong>, then go to <strong>Deployments</strong> and choose{" "}
          <strong>Redeploy</strong>. After that, sign in with the passphrase you just chose.
        </p>
        <CopyRow name="APP_PASSWORD_HASH" value={state.passwordHash} />
        <CopyRow name="SESSION_SECRET" value={state.sessionSecret} />
        <p className="text-[13px] text-muted">
          Keep your passphrase somewhere safe, like a password manager. These values can&apos;t be used to work it out.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-4">
      <label className="grid gap-2">
        <span className="label-caps">Choose a passphrase</span>
        <input name="passphrase" type="password" required minLength={16} autoComplete="new-password" className={inputClass} />
      </label>
      <label className="grid gap-2">
        <span className="label-caps">Type it again</span>
        <input name="confirm" type="password" required minLength={16} autoComplete="new-password" className={inputClass} />
      </label>
      <p className="text-[13px] text-muted">
        At least 16 characters. Four or five random words you&apos;ll both remember works well. You&apos;ll share it with
        each other and nobody else.
      </p>
      {state.message ? (
        <p role="alert" className="text-sm text-brick">
          {state.message}
        </p>
      ) : null}
      <SubmitButton pendingLabel="Working…">Continue</SubmitButton>
    </form>
  );
}
