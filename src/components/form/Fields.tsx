import type { ReactNode } from "react";

// Form fields with real labels, hints and error messages wired to aria attributes.
// Plain markup, so they work in server and client components alike.

export const inputClass =
  "w-full rounded-[3px] border border-rule-strong bg-paper px-3 py-2.5 text-[15px] text-chocolate placeholder:text-muted/70 focus:border-desert-rose aria-[invalid=true]:border-brick";

type Common = { name: string; label: string; hint?: string; error?: string; className?: string };

export function Field({
  id,
  label,
  hint,
  error,
  children,
  className = "",
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid content-start gap-1.5 ${className}`}>
      <label htmlFor={id} className="label-caps">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-[13px] text-brick">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, error?: string, hint?: string) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

export function TextField({
  name,
  label,
  hint,
  error,
  className,
  defaultValue,
  type = "text",
  placeholder,
  required,
  inputMode,
  autoComplete,
}: Common & {
  defaultValue?: string | number | null;
  type?: "text" | "email" | "tel" | "url" | "number" | "date" | "time";
  placeholder?: string;
  required?: boolean;
  inputMode?: "text" | "decimal" | "numeric" | "email" | "tel" | "url";
  autoComplete?: string;
}) {
  const id = `f-${name}`;
  return (
    <Field id={id} label={label} hint={hint} error={error} className={className}>
      <input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        required={required}
        inputMode={inputMode}
        autoComplete={autoComplete ?? "off"}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={`${inputClass} ${type === "number" || type === "date" || type === "time" ? "num" : ""}`}
      />
    </Field>
  );
}

/** Dollar amount. The server parses it into integer cents. */
export function MoneyField(props: Common & { defaultValue?: string | null; placeholder?: string; required?: boolean }) {
  const id = `f-${props.name}`;
  return (
    <Field id={id} label={props.label} hint={props.hint} error={props.error} className={props.className}>
      <div className="relative">
        <span aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">
          $
        </span>
        <input
          id={id}
          name={props.name}
          inputMode="decimal"
          defaultValue={props.defaultValue ?? ""}
          placeholder={props.placeholder ?? "0.00"}
          required={props.required}
          autoComplete="off"
          aria-invalid={props.error ? true : undefined}
          aria-describedby={describedBy(id, props.error, props.hint)}
          className={`${inputClass} num pl-7`}
        />
      </div>
    </Field>
  );
}

export function SelectField({
  name,
  label,
  hint,
  error,
  className,
  defaultValue,
  options,
  placeholder,
  required,
}: Common & {
  defaultValue?: string | null;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  required?: boolean;
}) {
  const id = `f-${name}`;
  return (
    <Field id={id} label={label} hint={hint} error={error} className={className}>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={`${inputClass} appearance-none bg-[length:12px] bg-[right_0.9rem_center] bg-no-repeat pr-9`}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%235C4033' stroke-width='1.4'/%3E%3C/svg%3E\")",
        }}
      >
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function TextareaField({
  name,
  label,
  hint,
  error,
  className,
  defaultValue,
  rows = 3,
  placeholder,
}: Common & { defaultValue?: string | null; rows?: number; placeholder?: string }) {
  const id = `f-${name}`;
  return (
    <Field id={id} label={label} hint={hint} error={error} className={className}>
      <textarea
        id={id}
        name={name}
        rows={rows}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={`${inputClass} leading-relaxed`}
      />
    </Field>
  );
}

export function CheckboxField({
  name,
  label,
  hint,
  defaultChecked,
  className = "",
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked?: boolean;
  className?: string;
}) {
  const id = `f-${name}`;
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <input
        id={id}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="mt-1 size-4 shrink-0 accent-desert-rose"
      />
      <div className="grid gap-0.5">
        <label htmlFor={id} className="text-[15px]">
          {label}
        </label>
        {hint ? (
          <p id={`${id}-hint`} className="text-[13px] text-muted">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Status line under a form. */
export function FormMessage({ state }: { state: { ok: boolean; message: string } }) {
  return (
    <p role="status" aria-live="polite" className={`text-sm ${state.ok ? "text-garden-ink" : "text-brick"}`}>
      {state.message}
    </p>
  );
}
