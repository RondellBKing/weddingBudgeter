import { z } from "zod";
import { fromDbDate } from "../dates";
import { zDate, zMoney, zOptionalText, zText, zTime, type ActionState } from "../forms";
import { centsToInputValue } from "../money";
import { isLikelyEmail, isLikelyPhone, normalizeInstagram, normalizeWebUrl } from "./vendor-contact";
import { VENDOR_CATEGORIES, VENDOR_STATUSES, type VendorCategory, type VendorStatus } from "./vendors";

// The add/edit vendor form: what its fields hold as strings, and the schema that turns them
// into a database row. Shared by the Server Action and the tests.

export type VendorFormValues = {
  name: string;
  category: string;
  alsoCovers: string[];
  status: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  instagram: string;
  quoted: string;
  contractSignedOn: string;
  contractUrl: string;
  arrivalTime: string;
  mealsRequired: string;
  notes: string;
};

/** What the save action returns: on a validation error, the submitted strings come back so the
 * form can show them again instead of resetting. */
export type VendorFormState = ActionState & { values?: VendorFormValues };

export const EMPTY_VENDOR_VALUES: VendorFormValues = {
  name: "",
  category: "",
  alsoCovers: [],
  status: "RESEARCHING",
  contactName: "",
  email: "",
  phone: "",
  website: "",
  instagram: "",
  quoted: "",
  contractSignedOn: "",
  contractUrl: "",
  arrivalTime: "",
  mealsRequired: "0",
  notes: "",
};

/** A saved vendor → the strings its edit form starts with. */
export function vendorFormValues(v: {
  name: string;
  category: VendorCategory;
  alsoCovers: VendorCategory[];
  status: VendorStatus;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  quotedCents: number | null;
  contractSignedOn: Date | null;
  contractUrl: string | null;
  arrivalTime: string | null;
  mealsRequired: number;
  notes: string | null;
}): VendorFormValues {
  return {
    name: v.name,
    category: v.category,
    alsoCovers: v.alsoCovers,
    status: v.status,
    contactName: v.contactName ?? "",
    email: v.email ?? "",
    phone: v.phone ?? "",
    website: v.website ?? "",
    instagram: v.instagram ? `@${v.instagram}` : "",
    quoted: centsToInputValue(v.quotedCents),
    contractSignedOn: fromDbDate(v.contractSignedOn) ?? "",
    contractUrl: v.contractUrl ?? "",
    arrivalTime: v.arrivalTime ?? "",
    mealsRequired: String(v.mealsRequired),
    notes: v.notes ?? "",
  };
}

/** FormData → the raw strings, with the repeated "alsoCovers" checkboxes as a list. */
export function readVendorForm(form: FormData): VendorFormValues {
  const text = (key: keyof VendorFormValues) => {
    const v = form.get(key);
    return typeof v === "string" ? v : "";
  };
  return {
    name: text("name"),
    category: text("category"),
    alsoCovers: form.getAll("alsoCovers").filter((v): v is string => typeof v === "string"),
    status: text("status"),
    contactName: text("contactName"),
    email: text("email"),
    phone: text("phone"),
    website: text("website"),
    instagram: text("instagram"),
    quoted: text("quoted"),
    contractSignedOn: text("contractSignedOn"),
    contractUrl: text("contractUrl"),
    arrivalTime: text("arrivalTime"),
    mealsRequired: text("mealsRequired"),
    notes: text("notes"),
  };
}

/** Optional text that must pass a check; the check may also normalize it. */
function zChecked(max: number, check: (s: string) => string | null, message: string) {
  return zOptionalText(max).transform((s, ctx) => {
    if (s === null) return null;
    const out = check(s);
    if (out === null) {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return out;
  });
}

const categoryEnum = z.enum(VENDOR_CATEGORIES as [VendorCategory, ...VendorCategory[]], { error: "Pick a category" });
const statusEnum = z.enum(VENDOR_STATUSES as [VendorStatus, ...VendorStatus[]], { error: "Pick a status" });

export const vendorSchema = z
  .object({
    name: zText(120),
    category: categoryEnum,
    status: statusEnum,
    alsoCovers: z.array(z.enum(VENDOR_CATEGORIES as [VendorCategory, ...VendorCategory[]], { error: "Pick from the list" })),
    contactName: zOptionalText(120),
    email: zChecked(200, (s) => (isLikelyEmail(s) ? s : null), "Enter an email like name@example.com"),
    phone: zChecked(40, (s) => (isLikelyPhone(s) ? s : null), "Enter a phone number like (201) 555-0142"),
    website: zChecked(500, normalizeWebUrl, "Enter a web address like florist.com"),
    instagram: zChecked(200, normalizeInstagram, "Enter a handle like @studioname"),
    quoted: zMoney,
    contractSignedOn: zDate,
    contractUrl: zChecked(1000, normalizeWebUrl, "Paste the full link, starting with https://"),
    arrivalTime: zTime,
    mealsRequired: z
      .string()
      .optional()
      .transform((s, ctx) => {
        const t = (s ?? "").trim();
        if (t === "") return 0;
        if (!/^\d{1,3}$/.test(t) || Number(t) > 50) {
          ctx.addIssue({ code: "custom", message: "A whole number from 0 to 50" });
          return z.NEVER;
        }
        return Number(t);
      }),
    notes: zOptionalText(4000),
  })
  .transform((v) => ({
    ...v,
    // The main category is never also an extra one, and each extra is listed once.
    alsoCovers: VENDOR_CATEGORIES.filter((c) => c !== v.category && v.alsoCovers.includes(c)),
  }));

export type ParsedVendor = z.output<typeof vendorSchema>;
