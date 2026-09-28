"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import {
  CheckboxField,
  Field,
  FormMessage,
  inputClass,
  SelectField,
  TextareaField,
  TextField,
} from "@/components/form/Fields";
import { SubmitButton } from "@/components/form/SubmitButton";
import { MENU_STYLE } from "@/components/party/menu";
import {
  dressMenu,
  HAIR_STYLES,
  OUTFIT_LABEL,
  ROLE_LABEL,
  SIDE_LABEL,
  stepLabel,
  styleMenuFor,
  type DateStepKey,
  type OutfitType,
  type PartyRole,
  type PartySide,
  type ShoeStatus,
} from "@/lib/domain/party";
import { SIZE_INPUT_PREFIX, sizeFieldsFor, type SizeKey, type Sizes } from "@/lib/domain/party-sizes";
import { optionsFrom, SHOE_STATUS_LABEL } from "@/lib/labels";
import type { MemberFormState } from "../actions";

export type MemberFormValues = {
  name: string;
  email: string;
  phone: string;
  role: PartyRole;
  side: PartySide;
  outfitType: OutfitType;
  askedOn: string;
  acceptedOn: string;
  chosenStyleId: string;
  sizingSubmittedOn: string;
  orderedOn: string;
  arrivedOn: string;
  alteredOn: string;
  readyOn: string;
  sizes: Sizes;
  attirePaid: boolean;
  shoeOptionId: string;
  shoeOwnedDescription: string;
  shoeStatus: ShoeStatus;
  hairPlan: string;
  accessoriesConfirmed: boolean;
  giftIdea: string;
  giftPurchased: boolean;
  lodgingBooked: boolean;
  notes: string;
};

type Opt = { id: string; name: string; description: string };

const initial: MemberFormState = { ok: true, message: "" };

const MENU_HINT = {
  A: "Menu A · Dusty Rose, the bridesmaids' menu.",
  B: "Menu B · Desert Rose, for the maid and matron of honor.",
} as const;

const PROGRESS_DATES: DateStepKey[] = ["sizingSubmittedOn", "orderedOn", "arrivedOn", "alteredOn", "readyOn"];

function Section({ title, word, children, note }: { title: string; word: string; children: React.ReactNode; note?: React.ReactNode }) {
  return (
    // first-of-type, not first: React puts hidden action inputs at the start of the form.
    <fieldset className="grid gap-5 border-t border-rule pt-8 first-of-type:border-t-0 first-of-type:pt-0">
      <legend className="float-left mb-1 w-full font-display text-[26px] leading-tight">
        {title} <em className="italic">{word}</em>
      </legend>
      {note ? <div className="-mt-2 max-w-prose text-sm leading-relaxed text-cocoa">{note}</div> : null}
      {children}
    </fieldset>
  );
}

export function MemberForm({
  action,
  values,
  menus,
}: {
  action: (prev: MemberFormState, form: FormData) => Promise<MemberFormState>;
  values: MemberFormValues;
  menus: { A: Opt[]; B: Opt[]; SHOES: Opt[] };
}) {
  const [state, formAction] = useActionState(action, initial);
  const [role, setRole] = useState<PartyRole>(values.role);
  const [outfitType, setOutfitType] = useState<OutfitType>(values.outfitType);
  const formRef = useRef<HTMLFormElement>(null);
  const e = state.errors ?? {};

  const styleMenu = styleMenuFor(role, outfitType);
  const menu = dressMenu(role, outfitType);
  const styleOptions = styleMenu ? menus[styleMenu] : [];
  const savedStyle = styleOptions.some((o) => o.id === values.chosenStyleId) ? values.chosenStyleId : "";
  const isDress = outfitType === "DRESS";

  // After a failed save, move focus to the first field that needs attention.
  useEffect(() => {
    if (!state.ok) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);

  function onChange(ev: FormEvent<HTMLFormElement>) {
    const t = ev.target as HTMLSelectElement;
    if (t.name === "role") setRole(t.value as PartyRole);
    if (t.name === "outfitType") setOutfitType(t.value as OutfitType);
  }

  // Submit without React's automatic form reset, so nothing typed is lost if a field needs fixing.
  function onSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const data = new FormData(ev.currentTarget);
    startTransition(() => formAction(data));
  }

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} onChange={onChange} className="grid gap-10">
      <Section title="Who they" word="are">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <TextField
            name="name"
            label="Name"
            defaultValue={values.name}
            error={e.name}
            hint="Leave blank to keep the placeholder name."
            autoComplete="off"
          />
          <TextField name="email" label="Email" type="email" inputMode="email" defaultValue={values.email} error={e.email} />
          <TextField name="phone" label="Phone" type="tel" inputMode="tel" defaultValue={values.phone} error={e.phone} />
          <SelectField name="role" label="Role" defaultValue={values.role} error={e.role} options={optionsFrom(ROLE_LABEL)} />
          <SelectField name="side" label="Side" defaultValue={values.side} error={e.side} options={optionsFrom(SIDE_LABEL)} />
          <SelectField
            name="outfitType"
            label="Wears"
            defaultValue={values.outfitType}
            error={e.outfitType}
            options={optionsFrom(OUTFIT_LABEL).map((o) => ({ ...o, label: o.value === "DRESS" ? "A dress" : "A suit" }))}
            hint="The attire steps follow this, not the side."
          />
        </div>
      </Section>

      <Section title="Asking" word="them">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <TextField name="askedOn" label="Asked on" type="date" defaultValue={values.askedOn} error={e.askedOn} />
          <TextField name="acceptedOn" label="Said yes on" type="date" defaultValue={values.acceptedOn} error={e.acceptedOn} />
        </div>
      </Section>

      <Section
        title="Their"
        word="outfit"
        note={
          <p className="flex items-start gap-2.5">
            <span aria-hidden className={`mt-[0.45em] size-2.5 shrink-0 rounded-full ${menu ? MENU_STYLE[menu].swatch : "bg-chocolate"}`} />
            <span>
              {menu === "C"
                ? "Menu C: a suit rental, shoes that match the groom's party, and a Dusty Rose bow tie gifted by the bride."
                : menu
                  ? `${MENU_STYLE[menu].label}. Azazie, stretch satin, floor length. The bride orders it after the sizing deadline.`
                  : "A suit rental, matching the groom's party."}
            </span>
          </p>
        }
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {styleMenu ? (
            <SelectField
              key={`style-${styleMenu}`}
              name="chosenStyleId"
              label="Dress style"
              placeholder="Not chosen yet"
              defaultValue={savedStyle}
              error={e.chosenStyleId}
              hint={MENU_HINT[styleMenu]}
              options={styleOptions.map((o) => ({ value: o.id, label: `${o.name} · ${o.description.split(". ")[0]}` }))}
            />
          ) : null}
          {PROGRESS_DATES.map((key) => (
            <TextField
              key={key}
              name={key}
              label={`${stepLabel(key, outfitType)} on`}
              type="date"
              defaultValue={values[key]}
              error={e[key]}
            />
          ))}
        </div>
        {!isDress ? (
          <CheckboxField
            name="attirePaid"
            label="Suit rental paid"
            defaultChecked={values.attirePaid}
            hint="Dress costs are handled outside this app."
          />
        ) : null}
      </Section>

      <Section
        title="Their"
        word="sizes"
        note={
          isDress
            ? "From Azazie's size chart. Measure hollow to hem in the heels they'll wear on the day."
            : "For the suit rental. Leave anything the rental shop doesn't need blank."
        }
      >
        <div key={`sizes-${outfitType}`} className="grid grid-cols-2 gap-5 lg:grid-cols-3">
          {sizeFieldsFor(outfitType).map((f) => (
            <TextField
              key={f.key}
              name={SIZE_INPUT_PREFIX + f.key}
              label={f.label}
              placeholder={f.placeholder}
              hint={f.hint}
              defaultValue={values.sizes[f.key as SizeKey] ?? ""}
            />
          ))}
        </div>
      </Section>

      {isDress ? (
        <Section
          title="Their"
          word="shoes"
          note="Chocolate brown patent, 3.5 inch heel or higher. A pair they already own is welcome once it's approved."
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <SelectField
              name="shoeOptionId"
              label="Shoe from the menu"
              placeholder="None yet"
              defaultValue={values.shoeOptionId}
              error={e.shoeOptionId}
              options={menus.SHOES.map((o) => ({ value: o.id, label: o.name }))}
            />
            <TextField
              name="shoeOwnedDescription"
              label="Or a pair they own"
              placeholder="e.g. Brown patent pumps, 4 in"
              defaultValue={values.shoeOwnedDescription}
              error={e.shoeOwnedDescription}
            />
            <SelectField
              name="shoeStatus"
              label="Shoe status"
              defaultValue={values.shoeStatus}
              error={e.shoeStatus}
              options={optionsFrom(SHOE_STATUS_LABEL)}
            />
          </div>
        </Section>
      ) : null}

      <Section title="The finishing" word="touches">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="f-hairPlan"
            label="Hair plan"
            hint="Their own natural or protective style, elegant and off the face."
            error={e.hairPlan}
          >
            <input
              id="f-hairPlan"
              name="hairPlan"
              list="hair-styles"
              defaultValue={values.hairPlan}
              autoComplete="off"
              placeholder="Pick one or describe it"
              aria-invalid={e.hairPlan ? true : undefined}
              aria-describedby={e.hairPlan ? "f-hairPlan-error" : "f-hairPlan-hint"}
              className={inputClass}
            />
            <datalist id="hair-styles">
              {HAIR_STYLES.map((h) => (
                <option key={h} value={h} />
              ))}
            </datalist>
          </Field>
          <TextField name="giftIdea" label="Gift idea" defaultValue={values.giftIdea} error={e.giftIdea} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <CheckboxField
            name="accessoriesConfirmed"
            label="Accessories confirmed"
            hint="Yellow gold only, no silver."
            defaultChecked={values.accessoriesConfirmed}
          />
          <CheckboxField name="giftPurchased" label="Gift purchased" defaultChecked={values.giftPurchased} />
          <CheckboxField name="lodgingBooked" label="Lodging booked" defaultChecked={values.lodgingBooked} />
        </div>
      </Section>

      <Section title="Our" word="notes">
        <TextareaField name="notes" label="Notes" rows={4} defaultValue={values.notes} error={e.notes} />
      </Section>

      <div className="grid gap-4 border-t border-rule pt-6">
        <div className="flex flex-wrap items-center gap-4">
          <SubmitButton>Save changes</SubmitButton>
          {state.message ? <FormMessage state={state} /> : null}
        </div>
        {state.ok && state.warnings && state.warnings.length > 0 ? (
          <div className="grid gap-1.5 border-l-2 border-gold py-1 pl-4">
            <p className="label-caps text-gold-ink">Worth a second look</p>
            <ul className="grid gap-1 text-sm text-cocoa">
              {state.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </form>
  );
}
