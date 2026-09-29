"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { DesignFormState } from "@/app/(app)/design/actions";
import { CheckboxField, FormMessage, SelectField, TextareaField, TextField } from "@/components/form/Fields";
import { SubmitButton } from "@/components/form/SubmitButton";
import { buttonClass } from "@/components/ui/Button";
import { parseHttpUrl } from "@/lib/domain/design";
import { DESIGN_AREA_LABEL, optionsFrom } from "@/lib/labels";
import { InspirationImage } from "./InspirationImage";

export type InspirationFormValues = {
  area: string;
  title: string;
  imageUrl: string;
  sourceUrl: string;
  notes: string;
  isFavorite: boolean;
};

const AREA_OPTIONS = optionsFrom(DESIGN_AREA_LABEL);
const initial: DesignFormState = { ok: true, message: "" };

export function InspirationForm({
  action,
  values,
  back,
  submitLabel,
}: {
  action: (prev: DesignFormState, form: FormData) => Promise<DesignFormState>;
  values: InspirationFormValues;
  back: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, initial);
  const e = state.errors ?? {};
  const typed = state.values;
  const v = (k: Exclude<keyof InspirationFormValues, "isFavorite">) => (typed ? (typed[k] ?? "") : values[k]);
  const favorite = typed ? typed.isFavorite === "on" : values.isFavorite;
  const [imageInput, setImageInput] = useState(v("imageUrl"));
  const preview = parseHttpUrl(imageInput);

  return (
    // Remount with the typed values after a failed save, so the selects keep them.
    <form
      key={typed ? JSON.stringify(typed) : "form"}
      action={formAction}
      className="grid gap-9"
      onChange={(ev) => {
        const field = (ev.currentTarget.elements.namedItem("imageUrl") as HTMLInputElement | null)?.value ?? "";
        if (field !== imageInput) setImageInput(field);
      }}
    >
      <input type="hidden" name="back" value={back} />
      <div className="grid gap-8 sm:grid-cols-[minmax(0,1fr)_13rem] sm:gap-10">
        <fieldset className="grid content-start gap-5">
          <legend className="float-left mb-1 w-full font-display text-2xl">
            The <em className="italic">picture</em>
          </legend>
          <TextField
            name="imageUrl"
            label="Image link"
            inputMode="url"
            defaultValue={v("imageUrl")}
            error={e.imageUrl}
            placeholder="https://…/photo.jpg"
            hint="Copy the image address (right-click or long-press the picture). It shows on the board."
          />
          <TextField
            name="sourceUrl"
            label="Where it came from"
            inputMode="url"
            defaultValue={v("sourceUrl")}
            error={e.sourceUrl}
            placeholder="https://www.pinterest.com/pin/…"
            hint="The page itself: Pinterest, Instagram, a vendor's site."
          />
        </fieldset>

        <figure className="grid content-start gap-2">
          <div className="relative aspect-[4/5] w-full max-w-[9.5rem] overflow-hidden rounded-[3px] border border-rule bg-linen sm:max-w-[13rem]">
            {preview ? (
              <InspirationImage
                key={preview}
                src={preview}
                alt="Preview of the image link"
                fallback={
                  <p className="grid size-full place-items-center p-4 text-center text-[13px] leading-relaxed text-cocoa">
                    That link doesn&apos;t open a picture. Copy the image address itself, not the page.
                  </p>
                }
              />
            ) : (
              <p className="grid size-full place-items-center p-4 text-center text-[13px] leading-relaxed text-muted">
                Paste an image link to see it here.
              </p>
            )}
          </div>
          <figcaption className="label-caps text-[10px]">Preview</figcaption>
        </figure>
      </div>

      <fieldset className="grid gap-5 border-t border-rule pt-8">
        <legend className="float-left mb-1 w-full font-display text-2xl">
          A few <em className="italic">words</em>
        </legend>
        <div className="grid gap-5 sm:grid-cols-[14rem_minmax(0,1fr)]">
          <SelectField name="area" label="Area" options={AREA_OPTIONS} defaultValue={v("area")} error={e.area} />
          <TextField name="title" label="Title (optional)" defaultValue={v("title")} error={e.title} placeholder="Candlelit long tables" />
        </div>
        <TextareaField
          name="notes"
          label="What we love about it (optional)"
          rows={3}
          defaultValue={v("notes")}
          error={e.notes}
          placeholder="The low candlelight, and the napkins tied with silk ribbon."
        />
        <CheckboxField name="isFavorite" label="A favorite" hint="Favorites are the ones to show the florist and designer." defaultChecked={favorite} />
      </fieldset>

      <div className="flex flex-wrap items-center gap-4 border-t border-rule pt-7">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link href={back} className={buttonClass("secondary")}>
          Cancel
        </Link>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
