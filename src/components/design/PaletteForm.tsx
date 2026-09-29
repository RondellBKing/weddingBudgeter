"use client";

import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";
import type { DesignFormState } from "@/app/(app)/design/actions";
import { Field, FormMessage, inputClass, TextField } from "@/components/form/Fields";
import { SubmitButton } from "@/components/form/SubmitButton";
import { buttonClass } from "@/components/ui/Button";
import { coolToneNote, parseHex, swatchInk } from "@/lib/domain/design";

export type PaletteFormValues = { name: string; hex: string; usage: string };

const initial: DesignFormState = { ok: true, message: "" };

/** Add or edit a palette color, with a live swatch so you can see the text stays readable. */
export function PaletteForm({
  action,
  values,
  submitLabel,
  cancelHref,
  idPrefix = "",
}: {
  action: (prev: DesignFormState, form: FormData) => Promise<DesignFormState>;
  values: PaletteFormValues;
  submitLabel: string;
  cancelHref?: string;
  idPrefix?: string;
}) {
  const [state, formAction] = useActionState(action, initial);
  const typed = state.values;
  // Fresh fields after each color is added; the typed values after a failed save.
  const formKey = typed ? JSON.stringify(typed) : (state.nonce ?? "form");
  return (
    <PaletteFields
        key={formKey}
        formAction={formAction}
        values={typed ? { name: typed.name ?? "", hex: typed.hex ?? "", usage: typed.usage ?? "" } : state.nonce ? { name: "", hex: "", usage: "" } : values}
        errors={state.errors ?? {}}
        submitLabel={submitLabel}
        cancelHref={cancelHref}
        idPrefix={idPrefix}
        status={<FormMessage state={state} />}
      />
  );
}

function PaletteFields({
  formAction,
  values,
  errors: e,
  submitLabel,
  cancelHref,
  idPrefix,
  status,
}: {
  formAction: (form: FormData) => void;
  values: PaletteFormValues;
  errors: Record<string, string>;
  submitLabel: string;
  cancelHref?: string;
  idPrefix: string;
  status: ReactNode;
}) {
  const [name, setName] = useState(values.name);
  const [hexInput, setHexInput] = useState(values.hex);
  const hex = parseHex(hexInput);
  const ink = hex ? swatchInk(hex) : null;
  const note = hex ? coolToneNote(hex) : null;
  const hexId = `f-${idPrefix}hex`;

  return (
    <form
      action={formAction}
      className="grid gap-7 sm:grid-cols-[minmax(0,1fr)_11rem] sm:gap-10"
      onChange={(ev) => {
        const t: EventTarget = ev.target;
        if (t instanceof HTMLInputElement && t.name === "name") setName(t.value);
      }}
    >
      <div className="grid content-start gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField name="name" label="Name" required idPrefix={idPrefix} defaultValue={values.name} error={e.name} placeholder="Champagne" />
          <Field id={hexId} label="Color" error={e.hex} hint={e.hex ? undefined : "A code like #D9A3A0, or pick one."}>
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label="Pick the color"
                value={(hex ?? "#D9A3A0").toLowerCase()}
                onChange={(ev) => setHexInput(ev.target.value.toUpperCase())}
                className="h-[44px] w-12 shrink-0 cursor-pointer rounded-[3px] border border-rule-strong bg-paper p-1"
              />
              <input
                id={hexId}
                name="hex"
                value={hexInput}
                onChange={(ev) => setHexInput(ev.target.value)}
                required
                maxLength={7}
                spellCheck={false}
                autoComplete="off"
                placeholder="#D9A3A0"
                aria-invalid={e.hex ? true : undefined}
                aria-describedby={e.hex ? `${hexId}-error` : `${hexId}-hint`}
                className={`${inputClass} num uppercase`}
              />
            </div>
          </Field>
        </div>
        <TextField
          name="usage"
          label="Where it's used (optional)"
          idPrefix={idPrefix}
          defaultValue={values.usage}
          error={e.usage}
          placeholder="Napkins, ribbon on the bouquets"
        />
        <div className="flex flex-wrap items-center gap-4 pt-1">
          <SubmitButton>{submitLabel}</SubmitButton>
          {cancelHref ? (
            <Link href={cancelHref} className={buttonClass("secondary")}>
              Cancel
            </Link>
          ) : null}
          {status}
        </div>
      </div>

      <figure className="grid content-start gap-2 max-sm:order-first">
        <div
          className="grid h-28 w-full content-end gap-1 rounded-[3px] border border-rule p-4 sm:aspect-[4/5] sm:h-auto sm:max-w-[11rem]"
          style={hex && ink ? { background: hex, color: ink.color } : undefined}
        >
          {hex && ink ? (
            <>
              <span className="font-display text-[22px] leading-tight">{name.trim() || "New color"}</span>
              <span className="num text-[12px] tracking-[0.08em]">{hex}</span>
            </>
          ) : (
            <span className="text-[13px] text-muted">The swatch shows here.</span>
          )}
        </div>
        <figcaption className="grid gap-1 text-[12px] text-muted">
          <span className="label-caps text-[10px]">Preview</span>
          {note ? <span className="text-gold-ink">{note}</span> : null}
        </figcaption>
      </figure>
    </form>
  );
}
