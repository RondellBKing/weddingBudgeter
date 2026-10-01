import type {
  DecorSource,
  DesignArea,
  EventType,
  GuestSide,
  InclusionStatus,
  MusicMoment,
  PackageSection,
  Owner,
  Partner,
  PaymentKind,
  PaymentMethod,
  Priority,
  Relationship,
  RsvpStatus,
  ShoeStatus,
  ShotMoment,
  TableShape,
  TaskArea,
  TaskStatus,
} from "@/generated/prisma/enums";

// Plain-language labels for every enum the screens show, and option lists for <select>s.
// (Vendor labels live in domain/vendors.ts, wedding party labels in domain/party.ts.)

export const OWNER_LABEL: Record<Owner, string> = {
  RONDELL: "Rondell",
  CAPRI: "Capri",
  BOTH: "Both of us",
  VENDOR: "A vendor",
  WEDDING_PARTY: "Wedding party",
};

export const PARTNER_LABEL: Record<Partner, string> = { RONDELL: "Rondell", CAPRI: "Capri", BOTH: "Both of us" };

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  DONE: "Done",
};

export const PRIORITY_LABEL: Record<Priority, string> = { LOW: "Low", MEDIUM: "Medium", HIGH: "High" };

export const TASK_AREA_LABEL: Record<TaskArea, string> = {
  PLANNING: "Planning",
  BUDGET: "Budget",
  VENUE: "Venue",
  VENDORS: "Vendors",
  ATTIRE: "Attire",
  WEDDING_PARTY: "Wedding party",
  GUESTS: "Guests",
  STATIONERY: "Stationery",
  CEREMONY: "Ceremony",
  RECEPTION: "Reception",
  BEAUTY: "Beauty",
  TRAVEL: "Travel",
  LEGAL: "Legal",
  DAY_OF: "Day of",
  OTHER: "Other",
};

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  TASTING: "Tasting",
  FITTING: "Fitting",
  MEETING: "Meeting",
  SITE_VISIT: "Site visit",
  APPOINTMENT: "Appointment",
  DEADLINE: "Deadline",
  OTHER: "Other",
};

export const PAYMENT_KIND_LABEL: Record<PaymentKind, string> = {
  DEPOSIT: "Deposit",
  INSTALLMENT: "Installment",
  FINAL: "Final payment",
  OVERAGE: "Headcount overage",
  SERVICE_CHARGE: "Service charge (mandatory)",
  GRATUITY: "Tip",
  OTHER: "Payment",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CHECK: "Check",
  CARD: "Card",
  ACH: "Bank transfer (ACH)",
  WIRE: "Wire",
  ZELLE: "Zelle",
  CASH: "Cash",
  OTHER: "Other",
};

export const GUEST_SIDE_LABEL: Record<GuestSide, string> = {
  BRIDE_SIDE: "Bride's side",
  GROOM_SIDE: "Groom's side",
  BOTH: "Both",
};

export const RELATIONSHIP_LABEL: Record<Relationship, string> = {
  COUPLE: "The couple",
  FAMILY: "Family",
  FRIEND: "Friend",
  WORK: "Work",
  OTHER: "Other",
};

export const RSVP_LABEL: Record<RsvpStatus, string> = { PENDING: "Pending", ATTENDING: "Attending", DECLINED: "Declined" };

export const TABLE_SHAPE_LABEL: Record<TableShape, string> = {
  ROUND: "Round",
  RECTANGLE: "Rectangle",
  SWEETHEART: "Sweetheart",
  HEAD_TABLE: "Head table",
};

export const SHOE_STATUS_LABEL: Record<ShoeStatus, string> = {
  NOT_SELECTED: "Not selected",
  SELECTED: "Selected",
  SUBMITTED: "Sent for approval",
  APPROVED: "Approved",
  REJECTED: "Not approved",
};

export const MUSIC_MOMENT_LABEL: Record<MusicMoment, string> = {
  PRELUDE: "Prelude (as guests arrive)",
  PROCESSIONAL: "Processional",
  COUPLE_ENTRANCE: "Couple's entrance",
  BROOM_JUMP: "Jumping the broom",
  RECESSIONAL: "Recessional",
  COCKTAIL_HOUR: "Cocktail hour",
  GRAND_ENTRANCE: "Grand entrance",
  FIRST_DANCE: "First dance",
  PARENT_DANCE: "Parent dances",
  CAKE_CUTTING: "Cake cutting",
  LAST_DANCE: "Last dance",
  SEND_OFF: "Send-off",
  MUST_PLAY: "Must play",
  DO_NOT_PLAY: "Do not play",
};

export const SHOT_MOMENT_LABEL: Record<ShotMoment, string> = {
  DETAILS: "Details",
  GETTING_READY: "Getting ready",
  FIRST_LOOK: "First look",
  CEREMONY: "Ceremony",
  FAMILY: "Family",
  WEDDING_PARTY: "Wedding party",
  COUPLE: "The two of us",
  COCKTAIL_HOUR: "Cocktail hour",
  RECEPTION: "Reception",
  OTHER: "Other",
};

export const DESIGN_AREA_LABEL: Record<DesignArea, string> = {
  OVERALL: "Overall look",
  CEREMONY: "Ceremony",
  COCKTAIL_HOUR: "Cocktail hour",
  RECEPTION: "Reception",
  FLOWERS: "Flowers",
  TABLESCAPE: "Tables",
  LIGHTING: "Lighting",
  CAKE: "Cake and desserts",
  STATIONERY: "Paper and signs",
  ATTIRE: "Attire",
  WELCOME: "Welcome and favors",
  OTHER: "Other",
};

export const DECOR_SOURCE_LABEL: Record<DecorSource, string> = {
  VENUE: "Venue provides",
  VENDOR: "Vendor provides",
  RENTAL: "Rental",
  PURCHASE: "Buying",
  DIY: "Making it",
  BORROWED: "Borrowed",
};

export const PACKAGE_SECTION_LABEL: Record<PackageSection, string> = {
  SPACE: "The space",
  CEREMONY: "Ceremony",
  COCKTAIL_HOUR: "Cocktail hour",
  DINNER: "Dinner",
  DESSERT: "Cake and dessert",
  BAR: "Bar",
  TABLES: "Tables and linens",
  SUITES: "Getting-ready suites",
  STAFF: "Staff and service",
  GUESTS: "For guests",
  PRICING: "Pricing and terms",
  OTHER: "Other",
};

export const INCLUSION_STATUS_LABEL: Record<InclusionStatus, string> = {
  INCLUDED: "Included",
  EXTRA_COST: "Costs extra",
  NOT_INCLUDED: "Not included",
  TO_CONFIRM: "To confirm",
};

/** Label map → options for a <select>, in declaration order. */
export function optionsFrom<K extends string>(labels: Record<K, string>): Array<{ value: K; label: string }> {
  return (Object.keys(labels) as K[]).map((value) => ({ value, label: labels[value] }));
}

/** Label map → the list of allowed values, for zod enums. */
export function valuesOf<K extends string>(labels: Record<K, string>): [K, ...K[]] {
  return Object.keys(labels) as [K, ...K[]];
}
