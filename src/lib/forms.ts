import { z } from "zod";
import { parseCalendarDate, type CalendarDate } from "./dates";
import { parseMoneyToCents } from "./money";

// Shared pieces for Server Action forms: the state they return and zod fields that turn raw
// form strings into cents, calendar dates and booleans. Every action still calls
// requireSession() itself.

export type ActionState = { ok: boolean; message: string; errors?: Record<string, string> };
export const idleState: ActionState = { ok: true, message: "" };

/** Turn a zod failure into per-field messages. */
export function fieldErrors(error: z.ZodError): ActionState {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return { ok: false, message: "Check the highlighted fields.", errors };
}

/** FormData → plain object (repeated keys keep the last value; unchecked boxes are absent). */
export function formObject(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string") out[k] = v;
  return out;
}

const blankToNull = (s: string) => (s.trim() === "" ? null : s.trim());

export const zText = (max = 200) => z.string().trim().min(1, "Required").max(max, `Keep it under ${max} characters`);
export const zOptionalText = (max = 2000) =>
  z
    .string()
    .max(max, `Keep it under ${max} characters`)
    .optional()
    .transform((s) => (s === undefined ? null : blankToNull(s)));

/** Optional money field → integer cents or null. */
export const zMoney = z
  .string()
  .optional()
  .transform((s, ctx) => {
    if (s === undefined || s.trim() === "") return null;
    const cents = parseMoneyToCents(s);
    if (cents === null || cents < 0) {
      ctx.addIssue({ code: "custom", message: "Enter an amount like 1,250 or 1,250.50" });
      return z.NEVER;
    }
    return cents;
  });

/** Required money field → integer cents. */
export const zRequiredMoney = z.string().transform((s, ctx) => {
  const cents = parseMoneyToCents(s);
  if (cents === null || cents < 0) {
    ctx.addIssue({ code: "custom", message: "Enter an amount like 1,250 or 1,250.50" });
    return z.NEVER;
  }
  return cents;
});

/** Optional <input type="date"> → CalendarDate or null. */
export const zDate = z
  .string()
  .optional()
  .transform((s, ctx): CalendarDate | null => {
    if (s === undefined || s.trim() === "") return null;
    const d = parseCalendarDate(s);
    if (!d) {
      ctx.addIssue({ code: "custom", message: "Pick a date" });
      return z.NEVER;
    }
    return d;
  });

export const zRequiredDate = z.string().transform((s, ctx): CalendarDate => {
  const d = parseCalendarDate(s);
  if (!d) {
    ctx.addIssue({ code: "custom", message: "Pick a date" });
    return z.NEVER;
  }
  return d;
});

/** Optional <input type="time"> → "HH:MM" or null. */
export const zTime = z
  .string()
  .optional()
  .transform((s, ctx) => {
    if (s === undefined || s.trim() === "") return null;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.trim())) {
      ctx.addIssue({ code: "custom", message: "Use a time like 16:30" });
      return z.NEVER;
    }
    return s.trim();
  });

/** Checkbox → boolean ("on" when checked, absent when not). */
export const zCheckbox = z
  .string()
  .optional()
  .transform((s) => s === "on" || s === "true");

export const zInt = (min = 0, max = 100_000) =>
  z.coerce.number().int("Whole number").min(min, `At least ${min}`).max(max, `At most ${max}`);

/** Optional id from a <select> ("" → null). */
export const zOptionalId = z
  .string()
  .optional()
  .transform((s) => (s === undefined || s.trim() === "" ? null : s.trim()));
