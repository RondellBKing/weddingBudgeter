// Vendor labels, list filtering and ordering, and the coverage view: which categories have
// someone booked. Pure functions only; the pages and loaders feed them database rows.

export type VendorCategory =
  | "VENUE" | "CATERING" | "PHOTOGRAPHY" | "VIDEOGRAPHY" | "FLORAL" | "MUSIC_DJ" | "MUSIC_CEREMONY"
  | "CAKE" | "ATTIRE" | "BEAUTY" | "STATIONERY" | "RENTALS" | "TRANSPORT" | "OFFICIANT" | "LODGING" | "OTHER";

export const VENDOR_CATEGORY_LABEL: Record<VendorCategory, string> = {
  VENUE: "Venue",
  CATERING: "Catering",
  PHOTOGRAPHY: "Photography",
  VIDEOGRAPHY: "Videography",
  FLORAL: "Florist",
  MUSIC_DJ: "DJ",
  MUSIC_CEREMONY: "Ceremony music",
  CAKE: "Cake & dessert",
  ATTIRE: "Attire",
  BEAUTY: "Hair & makeup",
  STATIONERY: "Stationery",
  RENTALS: "Rentals",
  TRANSPORT: "Transportation",
  OFFICIANT: "Officiant",
  LODGING: "Hotel block",
  OTHER: "Other",
};

export const VENDOR_STATUS_LABEL = {
  RESEARCHING: "Researching",
  CONTACTED: "Contacted",
  QUOTED: "Quoted",
  BOOKED: "Booked",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
} as const;

export type VendorStatus = keyof typeof VENDOR_STATUS_LABEL;

/** Plain-language hint for each status, shown in the form. */
export const VENDOR_STATUS_HINT: Record<VendorStatus, string> = {
  RESEARCHING: "On our list to look into",
  CONTACTED: "We've reached out",
  QUOTED: "They sent a price",
  BOOKED: "Hired, contract signed or deposit paid",
  DECLINED: "We passed, or they're not available",
  CANCELLED: "Was booked, now cancelled",
};

export const VENDOR_CATEGORIES = Object.keys(VENDOR_CATEGORY_LABEL) as VendorCategory[];
export const VENDOR_STATUSES = Object.keys(VENDOR_STATUS_LABEL) as VendorStatus[];

export function isVendorCategory(value: unknown): value is VendorCategory {
  return typeof value === "string" && (VENDOR_CATEGORIES as string[]).includes(value);
}

export function isVendorStatus(value: unknown): value is VendorStatus {
  return typeof value === "string" && (VENDOR_STATUSES as string[]).includes(value);
}

/** Booked, still talking (researching / contacted / quoted), or closed (declined / cancelled). */
export type StatusGroup = "booked" | "talking" | "closed";

export function statusGroup(status: VendorStatus): StatusGroup {
  if (status === "BOOKED") return "booked";
  if (status === "DECLINED" || status === "CANCELLED") return "closed";
  return "talking";
}

// ─── Coverage ──────────────────────────────────────────────────────────────────

type CoverageVendor = {
  id?: string;
  name: string;
  category: VendorCategory;
  alsoCovers: VendorCategory[];
  status: VendorStatus;
};

export type CoverageRow = {
  category: VendorCategory;
  label: string;
  /** Names of booked vendors covering this category. */
  booked: string[];
  /** Booked vendors, and whether they cover it as their main category or as an extra. */
  bookedVendors: Array<{ id?: string; name: string; via: "category" | "also" }>;
  /** Vendors we're still talking to for this category. */
  inProgress: number;
};

/**
 * Every category except Other, with who is booked for it. A vendor's `alsoCovers` counts
 * (an all-inclusive venue covers Catering), so a category can be covered without its own vendor.
 */
export function coverage(vendors: CoverageVendor[]): CoverageRow[] {
  return VENDOR_CATEGORIES.filter((c) => c !== "OTHER").map((category) => {
    const covering = vendors.filter((v) => coversCategory(v, category));
    const booked = covering.filter((v) => v.status === "BOOKED");
    const inProgress = covering.filter((v) => statusGroup(v.status) === "talking");
    return {
      category,
      label: VENDOR_CATEGORY_LABEL[category],
      booked: booked.map((v) => v.name),
      bookedVendors: booked.map((v) => ({
        id: v.id,
        name: v.name,
        via: v.category === category ? ("category" as const) : ("also" as const),
      })),
      inProgress: inProgress.length,
    };
  });
}

export function coversCategory(v: { category: VendorCategory; alsoCovers: VendorCategory[] }, category: VendorCategory) {
  return v.category === category || v.alsoCovers.includes(category);
}

// ─── List filters and order ────────────────────────────────────────────────────

export type VendorFilters = { category: VendorCategory | null; status: VendorStatus | null };

type SearchValue = string | string[] | undefined;

/** Read the list filters from the URL. Anything unrecognized is ignored. */
export function parseVendorFilters(params: { category?: SearchValue; status?: SearchValue }): VendorFilters {
  const first = (v: SearchValue) => (Array.isArray(v) ? v[0] : v);
  const category = first(params.category);
  const status = first(params.status);
  return {
    category: isVendorCategory(category) ? category : null,
    status: isVendorStatus(status) ? status : null,
  };
}

/** Category matches a vendor's own category or one it also covers. */
export function filterVendors<V extends { category: VendorCategory; alsoCovers: VendorCategory[]; status: VendorStatus }>(
  vendors: V[],
  filters: VendorFilters,
): V[] {
  return vendors.filter(
    (v) =>
      (filters.category === null || coversCategory(v, filters.category)) &&
      (filters.status === null || v.status === filters.status),
  );
}

/** The URL for a set of filters ("/vendors?category=FLORAL"). */
export function vendorListHref(filters: Partial<VendorFilters>): string {
  const q = new URLSearchParams();
  if (filters.category) q.set("category", filters.category);
  if (filters.status) q.set("status", filters.status);
  const s = q.toString();
  return s ? `/vendors?${s}` : "/vendors";
}

const STATUS_ORDER: Record<VendorStatus, number> = {
  BOOKED: 0,
  QUOTED: 1,
  CONTACTED: 2,
  RESEARCHING: 3,
  DECLINED: 4,
  CANCELLED: 5,
};

/** Booked first, then the furthest along; within a status by category, then name. */
export function sortVendors<V extends { name: string; category: VendorCategory; status: VendorStatus }>(vendors: V[]): V[] {
  return vendors
    .slice()
    .sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        VENDOR_CATEGORIES.indexOf(a.category) - VENDOR_CATEGORIES.indexOf(b.category) ||
        a.name.localeCompare(b.name, "en-US", { sensitivity: "base" }),
    );
}

// ─── Wedding-day arrival ───────────────────────────────────────────────────────

/** True when an "HH:MM" arrival is earlier than the venue lets vendors in. */
export function arrivesBeforeAccess(arrival: string | null | undefined, venueAccessTime: string): boolean {
  if (!arrival || !/^\d{2}:\d{2}$/.test(arrival) || !/^\d{2}:\d{2}$/.test(venueAccessTime)) return false;
  return arrival < venueAccessTime;
}
