import type { OutfitType } from "./party";

// Sizes live in WeddingPartyMember.sizes as a small JSON object of strings, keyed by the fields
// below. Values are kept as typed ("A8", 36", 5'6") because people measure in different ways.
// Dress sizes and suit sizes are separate sets; switching someone's outfit never erases the other set.

export type SizeField = { key: string; label: string; placeholder: string; hint?: string };

export const DRESS_SIZE_FIELDS = [
  { key: "dressSize", label: "Dress size", placeholder: "e.g. A8", hint: "Azazie size, from their chart" },
  { key: "bust", label: "Bust", placeholder: "e.g. 36 in" },
  { key: "waist", label: "Waist", placeholder: "e.g. 29 in" },
  { key: "hips", label: "Hips", placeholder: "e.g. 39 in" },
  { key: "hollowToHem", label: "Hollow to hem", placeholder: "e.g. 60 in", hint: "Measured in the heels they'll wear" },
  { key: "height", label: "Height", placeholder: "e.g. 5 ft 6 in", hint: "Barefoot" },
] as const satisfies readonly SizeField[];

export const SUIT_SIZE_FIELDS = [
  { key: "jacket", label: "Jacket", placeholder: "e.g. 40R" },
  { key: "pantsWaist", label: "Pants waist", placeholder: "e.g. 32 in" },
  { key: "pantsInseam", label: "Pants inseam", placeholder: "e.g. 30 in" },
  { key: "shirtNeck", label: "Shirt neck", placeholder: "e.g. 15.5 in" },
  { key: "shirtSleeve", label: "Shirt sleeve", placeholder: "e.g. 33 in" },
  { key: "shoeSize", label: "Shoe size", placeholder: "e.g. 10.5" },
] as const satisfies readonly SizeField[];

export type DressSizeKey = (typeof DRESS_SIZE_FIELDS)[number]["key"];
export type SuitSizeKey = (typeof SUIT_SIZE_FIELDS)[number]["key"];
export type SizeKey = DressSizeKey | SuitSizeKey;
export type Sizes = Partial<Record<SizeKey, string>>;

/** Form inputs are named with this prefix ("size_bust"). */
export const SIZE_INPUT_PREFIX = "size_";
export const SIZE_MAX_LENGTH = 40;

export function sizeFieldsFor(outfitType: OutfitType): readonly SizeField[] {
  return outfitType === "DRESS" ? DRESS_SIZE_FIELDS : SUIT_SIZE_FIELDS;
}

const ALL_KEYS = new Set<string>([...DRESS_SIZE_FIELDS, ...SUIT_SIZE_FIELDS].map((f) => f.key));

function clean(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return null;
  const s = value.replace(/\s+/g, " ").trim().slice(0, SIZE_MAX_LENGTH).trim();
  return s === "" ? null : s;
}

/** Whatever is in the JSON column → only known keys with non-blank string values. */
export function parseSizes(raw: unknown): Sizes {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Sizes = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!ALL_KEYS.has(k)) continue;
    const value = clean(v);
    if (value !== null) out[k as SizeKey] = value;
  }
  return out;
}

/** The size inputs for one outfit type, read from a submitted form. */
export function sizesFromForm(form: Record<string, string | undefined>, outfitType: OutfitType): Sizes {
  const out: Sizes = {};
  for (const f of sizeFieldsFor(outfitType)) {
    const value = clean(form[SIZE_INPUT_PREFIX + f.key]);
    if (value !== null) out[f.key as SizeKey] = value;
  }
  return out;
}

/**
 * New JSON for the column: the submitted sizes for the current outfit replace that outfit's
 * set, and the other outfit's saved sizes are kept. Null when nothing is left.
 */
export function mergeSizes(existing: unknown, submitted: Sizes, outfitType: OutfitType): Sizes | null {
  const current = new Set<string>(sizeFieldsFor(outfitType).map((f) => f.key));
  const kept = Object.entries(parseSizes(existing)).filter(([k]) => !current.has(k));
  const fresh = Object.entries(parseSizes(submitted)).filter(([k]) => current.has(k));
  const merged = Object.fromEntries([...kept, ...fresh]) as Sizes;
  return Object.keys(merged).length > 0 ? merged : null;
}

/** Label/value pairs for the outfit's fields that have a value, in form order. */
export function sizeSummary(sizes: Sizes, outfitType: OutfitType): Array<{ key: string; label: string; value: string }> {
  return sizeFieldsFor(outfitType).flatMap((f) => {
    const value = sizes[f.key as SizeKey];
    return value ? [{ key: f.key, label: f.label, value }] : [];
  });
}
