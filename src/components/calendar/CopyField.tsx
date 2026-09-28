"use client";

import { useRef, useState } from "react";
import { buttonClass } from "@/components/ui/Button";

/** A read-only link with a Copy button. Falls back to selecting the text when the clipboard API isn't available. */
export function CopyField({ id, label, value }: { id: string; label: string; value: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "copied" | "manual">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch {
      const el = input.current;
      if (!el) return;
      el.focus();
      el.select();
      // Older browsers (and http:// pages) have no async clipboard.
      const ok = typeof document.execCommand === "function" && document.execCommand("copy");
      setStatus(ok ? "copied" : "manual");
    }
    window.setTimeout(() => setStatus("idle"), 2500);
  }

  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="label-caps">
        {label}
      </label>
      <div className="flex min-w-0 gap-2">
        <input
          ref={input}
          id={id}
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          className="num min-w-0 flex-1 truncate rounded-[3px] border border-rule-strong bg-ivory/60 px-3 py-2 text-[13px] text-cocoa focus:border-desert-rose"
        />
        <button type="button" onClick={copy} className={buttonClass("secondary", "sm", "shrink-0")}>
          {status === "copied" ? "Copied" : "Copy"}
        </button>
      </div>
      <p role="status" aria-live="polite" className="text-[12px] text-muted empty:hidden">
        {status === "copied" ? "Link copied." : status === "manual" ? "Press Ctrl+C (⌘C on a Mac) to copy the selected link." : ""}
      </p>
    </div>
  );
}
