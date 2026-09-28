// Real wedding data. Confirmed facts only; see CLAUDE.md. Used by the seed and by the tests,
// so the numbers the tests check are the numbers in the database.

import { addDays, addMonths, cd, type CalendarDate } from "../../src/lib/dates";

export const WEDDING_DATE = cd("2028-04-13"); // Thursday
export const DRESS_SIZING_DEADLINE = cd("2027-11-07"); // Sunday

export const SETTINGS = {
  partnerOneName: "Rondell",
  partnerTwoName: "Capri",
  weddingDate: WEDDING_DATE,
  timezone: "America/New_York",
  venueName: "The Estate at Florentine Gardens",
  venueAddress: "River Vale, New Jersey",
  venueAccessTime: "06:00",
  headcountTarget: 125, // everyone eating, including the couple and the 14 attendants
  totalBudgetCents: 10_000_000,
  includedHeadcount: 125,
  perPersonOverageCents: 20_000,
  overageTaxPpm: 0,
  vendorMealsCountTowardHeadcount: true,
  dressSizingDeadline: DRESS_SIZING_DEADLINE,
} as const;

/** Starting estimates. Bridesmaids' dresses are handled outside this app, so they're not here. */
export const CATEGORIES: Array<{ key: string; name: string; estimateCents: number; isContingency?: boolean }> = [
  { key: "venue", name: "Venue", estimateCents: 5_400_000 },
  { key: "floral", name: "Floral & decor", estimateCents: 700_000 },
  { key: "photography", name: "Photography", estimateCents: 650_000 },
  { key: "videography", name: "Videography", estimateCents: 400_000 },
  { key: "contingency", name: "Contingency buffer", estimateCents: 400_000, isContingency: true },
  { key: "music-dj", name: "Music / DJ", estimateCents: 300_000 },
  { key: "bride-attire", name: "Bride's attire + alterations", estimateCents: 300_000 },
  { key: "bands", name: "Wedding bands", estimateCents: 250_000 },
  { key: "rentals", name: "Rentals & rain contingency", estimateCents: 250_000 },
  { key: "rehearsal-dinner", name: "Rehearsal dinner", estimateCents: 250_000 },
  { key: "beauty", name: "Beauty — hair & makeup", estimateCents: 180_000 },
  { key: "stationery", name: "Stationery", estimateCents: 140_000 },
  { key: "gifts", name: "Gifts — party + parents", estimateCents: 130_000 },
  { key: "transportation", name: "Transportation", estimateCents: 120_000 },
  { key: "cake", name: "Cake & dessert", estimateCents: 90_000 },
  { key: "ceremony-music", name: "Ceremony music", estimateCents: 70_000 },
  { key: "groom-attire", name: "Groom's attire", estimateCents: 70_000 },
  { key: "favors", name: "Favors & welcome bags", estimateCents: 60_000 },
  { key: "officiant", name: "Officiant", estimateCents: 60_000 },
  { key: "misc", name: "Misc & marriage license", estimateCents: 50_000 },
];

export const VENUE = {
  key: "venue-florentine-gardens",
  name: "The Estate at Florentine Gardens",
  category: "VENUE",
  status: "BOOKED",
  contractSignedOn: cd("2026-04-18"),
  notes:
    "Contract signed by DocuSign 4/17–4/18/2026. Vendor and setup arrival allowed from 6:00 AM. " +
    "Includes 125 people; $200 per person above 125, due 4/1/2028.",
} as const;

export const VENUE_ITEM = {
  key: "venue-contract",
  description: "Venue contract (125 people included)",
  estimateCents: 5_400_000,
  contractedCents: 5_400_000,
} as const;

export type SeedPayment = {
  key: string;
  sequence: number;
  kind: "DEPOSIT" | "INSTALLMENT" | "FINAL" | "OVERAGE" | "SERVICE_CHARGE";
  amountCents: number | null;
  amountRule?: "HEADCOUNT_OVERAGE";
  isEstimate?: boolean;
  dueDate: CalendarDate;
  paidDate?: CalendarDate;
  notes: string;
};

export const VENUE_PAYMENTS: SeedPayment[] = [
  { key: "venue-payment-1", sequence: 1, kind: "DEPOSIT", amountCents: 1_000_000, dueDate: cd("2026-04-19"), paidDate: cd("2026-04-18"), notes: "Deposit on signing" },
  { key: "venue-payment-2", sequence: 2, kind: "INSTALLMENT", amountCents: 1_000_000, dueDate: cd("2026-10-19"), notes: "Second payment" },
  { key: "venue-payment-3", sequence: 3, kind: "INSTALLMENT", amountCents: 1_500_000, dueDate: cd("2027-10-19"), notes: "Third payment" },
  { key: "venue-payment-4", sequence: 4, kind: "FINAL", amountCents: 1_565_000, dueDate: cd("2028-03-03"), notes: "Final payment to reach the contract minimum" },
  {
    key: "venue-payment-5",
    sequence: 5,
    kind: "OVERAGE",
    amountCents: null,
    amountRule: "HEADCOUNT_OVERAGE",
    isEstimate: true,
    dueDate: cd("2028-04-01"),
    notes: "Headcount overage: $200 per person above 125. Recalculates from the current headcount.",
  },
  {
    key: "venue-payment-6",
    sequence: 6,
    kind: "SERVICE_CHARGE",
    amountCents: 335_000,
    dueDate: cd("2028-04-01"),
    notes: "Maître d' / staff service fee. Mandatory service charge, not a discretionary tip.",
  },
];

export const VENUE_QUESTIONS: string[] = [
  "Do vendor meals count toward the 125 included people? (4–6 meals, up to $1,200 if they do)",
  "Is the $200 per person above 125 before or after NJ sales tax and service charge?",
  "How are children counted and priced?",
  "When is the final headcount due?",
  "What does the package include: cake, bar, linens, ceremony chairs?",
  "What is the indoor rain backup for the ceremony, and how many people does it hold?",
  "What does each vendor meal cost?",
];

/** Appointments the couple has booked. Times are New York wall-clock times. */
export const APPOINTMENTS: Array<{
  key: string;
  title: string;
  type: "SITE_VISIT" | "MEETING" | "APPOINTMENT" | "TASTING" | "FITTING";
  date: CalendarDate;
  time: string;
  notes?: string;
  atVenue?: boolean;
}> = [
  {
    key: "event-venue-vendor-preview-2026-11",
    title: "Vendor preview at the venue",
    type: "SITE_VISIT",
    date: cd("2026-11-16"), // Monday
    time: "18:00",
    notes: "Also meeting a possible designer / day-of coordinator.",
    atVenue: true,
  },
];

export const WEDDING_PARTY: Array<{
  key: string;
  side: "BRIDE_SIDE" | "GROOM_SIDE";
  role: "BEST_MAN" | "GROOMSMAN" | "MAID_OF_HONOR" | "MATRON_OF_HONOR" | "BRIDESMAN" | "BRIDESMAID";
  outfitType: "DRESS" | "SUIT";
}> = [
  { key: "party-best-man", side: "GROOM_SIDE", role: "BEST_MAN", outfitType: "SUIT" },
  ...Array.from({ length: 6 }, (_, i) => ({
    key: `party-groomsman-${i + 1}`,
    side: "GROOM_SIDE" as const,
    role: "GROOMSMAN" as const,
    outfitType: "SUIT" as const,
  })),
  { key: "party-maid-of-honor", side: "BRIDE_SIDE", role: "MAID_OF_HONOR", outfitType: "DRESS" },
  { key: "party-matron-of-honor", side: "BRIDE_SIDE", role: "MATRON_OF_HONOR", outfitType: "DRESS" },
  { key: "party-bridesman", side: "BRIDE_SIDE", role: "BRIDESMAN", outfitType: "SUIT" },
  ...Array.from({ length: 4 }, (_, i) => ({
    key: `party-bridesmaid-${i + 1}`,
    side: "BRIDE_SIDE" as const,
    role: "BRIDESMAID" as const,
    outfitType: "DRESS" as const,
  })),
];

const MENU_A_FABRIC = "Stretch satin, floor length";
export const ATTIRE_OPTIONS: Array<{ key: string; menu: "A" | "B" | "SHOES"; name: string; description: string; color: string }> = [
  { key: "a-maci", menu: "A", name: "Maci", description: `V-neck A-line. ${MENU_A_FABRIC}`, color: "Dusty Rose" },
  { key: "a-cheryl", menu: "A", name: "Cheryl", description: `Mermaid. ${MENU_A_FABRIC}`, color: "Dusty Rose" },
  { key: "a-johana", menu: "A", name: "Johana", description: `Off-the-shoulder mermaid. ${MENU_A_FABRIC}`, color: "Dusty Rose" },
  { key: "a-soren", menu: "A", name: "Soren", description: `Pleated A-line. ${MENU_A_FABRIC}`, color: "Dusty Rose" },
  { key: "a-kiaryn", menu: "A", name: "Kiaryn", description: `Pleated mermaid. ${MENU_A_FABRIC}`, color: "Dusty Rose" },
  { key: "a-mai", menu: "A", name: "Mai", description: `Sleek sheath. ${MENU_A_FABRIC}`, color: "Dusty Rose" },
  { key: "b-sonel", menu: "B", name: "Sonel", description: `Strapless mermaid. ${MENU_A_FABRIC}`, color: "Desert Rose" },
  { key: "b-aretha", menu: "B", name: "Aretha", description: `Strapless A-line. ${MENU_A_FABRIC}`, color: "Desert Rose" },
  { key: "b-nira", menu: "B", name: "Nira", description: `Corset mermaid. ${MENU_A_FABRIC}`, color: "Desert Rose" },
  { key: "b-agustina", menu: "B", name: "Agustina", description: `Corset mermaid. ${MENU_A_FABRIC}`, color: "Desert Rose" },
  { key: "shoe-platform-stiletto", menu: "SHOES", name: "Platform Stiletto", description: "The reference shoe", color: "Chocolate brown patent, 3.5\"+ heel" },
  { key: "shoe-minimal-strappy", menu: "SHOES", name: "Minimal Strappy Stiletto", description: "Minimal straps", color: "Chocolate brown patent, 3.5\"+ heel" },
  { key: "shoe-ankle-strap", menu: "SHOES", name: "Ankle Strap Open-Toe Heel", description: "Open toe with ankle strap", color: "Chocolate brown patent, 3.5\"+ heel" },
  { key: "shoe-block-heel", menu: "SHOES", name: "Block Heel", description: "Comfort option", color: "Chocolate brown patent, 3.5\"+ heel" },
];

export const DECISIONS: Array<{ key: string; decidedOn: CalendarDate; title: string; decision: string; rationale?: string; linkVenue?: boolean }> = [
  {
    key: "decision-venue",
    decidedOn: cd("2026-04-18"),
    title: "Venue: The Estate at Florentine Gardens",
    decision:
      "Signed the venue contract by DocuSign (4/17–4/18/2026). $54,000 fixed, 125 people included, $200 per person above 125.",
    linkVenue: true,
  },
  {
    key: "decision-date",
    decidedOn: cd("2026-04-18"),
    title: "Wedding date: Thursday, April 13, 2028",
    decision: "Thursday, April 13, 2028. Rehearsal dinner on Wednesday, April 12.",
  },
  {
    key: "decision-dresses-outside-budget",
    decidedOn: cd("2026-09-28"),
    title: "Bridesmaids' dresses handled outside this budget",
    decision: "Dress purchases are handled separately and are not tracked in the $100,000 budget.",
  },
];

// ─── Planning checklist, generated backwards from the wedding date ────────────

type Area =
  | "PLANNING" | "BUDGET" | "VENUE" | "VENDORS" | "ATTIRE" | "WEDDING_PARTY" | "GUESTS"
  | "STATIONERY" | "CEREMONY" | "RECEPTION" | "BEAUTY" | "TRAVEL" | "LEGAL" | "DAY_OF" | "OTHER";

export type SeedTask = {
  key: string;
  title: string;
  dueDate: CalendarDate;
  area: Area;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  isMilestone?: boolean;
  owner?: "RONDELL" | "CAPRI" | "BOTH" | "VENDOR" | "WEDDING_PARTY";
  notes?: string;
  linkVenue?: boolean;
  doneOn?: CalendarDate;
};

const months = (n: number) => addMonths(WEDDING_DATE, -n);
const weeks = (n: number) => addDays(WEDDING_DATE, -7 * n);
const days = (n: number) => addDays(WEDDING_DATE, -n);

export function buildChecklist(): SeedTask[] {
  return [
    // Already done
    { key: "sign-venue", title: "Sign the venue contract", dueDate: cd("2026-04-18"), area: "VENUE", isMilestone: true, linkVenue: true, doneOn: cd("2026-04-18") },
    { key: "set-date", title: "Set the wedding date", dueDate: cd("2026-04-18"), area: "PLANNING", doneOn: cd("2026-04-18") },

    // Now
    { key: "venue-vendor-meals", title: "Ask the venue whether vendor meals count toward the 125", dueDate: cd("2026-10-12"), area: "VENUE", priority: "HIGH", linkVenue: true, notes: "4–6 vendor meals. If they count, that's up to $1,200 of overage. Ask before payment 2 on 10/19." },

    // 18–12 months
    { key: "guest-list-draft", title: "Draft the guest list (125 people total, including us and the wedding party)", dueDate: months(18), area: "GUESTS", priority: "HIGH", notes: "Every person above 125 costs $200. 145 people uses up the $4,000 contingency." },
    { key: "ask-wedding-party", title: "Ask the wedding party", dueDate: months(18), area: "WEDDING_PARTY" },
    { key: "thursday-rates", title: "Get each vendor's Thursday rate in writing", dueDate: months(17), area: "VENDORS", notes: "Weekday rates are often lower than Saturday rates. Ask every vendor." },
    { key: "book-photographer", title: "Book the photographer", dueDate: months(15), area: "VENDORS", priority: "HIGH", isMilestone: true, notes: "12–18 months out." },
    { key: "book-videographer", title: "Book the videographer", dueDate: months(14), area: "VENDORS", priority: "HIGH" },
    { key: "book-dj", title: "Book the DJ", dueDate: months(13), area: "VENDORS", priority: "HIGH" },
    { key: "hotel-block", title: "Reserve a hotel room block (Wednesday and Thursday nights)", dueDate: months(12), area: "TRAVEL", priority: "HIGH", isMilestone: true, notes: "The wedding is the Thursday before Easter (Easter is April 16, 2028), during Passover. Expect high hotel and travel demand that week." },
    { key: "book-officiant", title: "Book the officiant", dueDate: months(12), area: "CEREMONY", priority: "HIGH", notes: "April 13, 2028 is Holy Thursday. If your officiant is clergy, confirm they can officiate that day." },
    { key: "rsvp-app", title: "Set up the RSVP app and wedding website", dueDate: months(11), area: "GUESTS" },
    { key: "book-florist", title: "Book the florist", dueDate: months(11), area: "VENDORS" },

    // 10–6 months
    { key: "save-the-dates", title: "Mail save-the-dates", dueDate: months(10), area: "STATIONERY", priority: "HIGH", isMilestone: true, notes: "Say \"Thursday\" clearly so guests can request the day off and book travel early." },
    { key: "bride-dress", title: "Order the wedding dress", dueDate: months(9), area: "ATTIRE", priority: "HIGH", isMilestone: true, notes: "9–12 months out." },
    { key: "book-beauty", title: "Book hair and makeup", dueDate: months(9), area: "BEAUTY" },
    { key: "book-transport", title: "Book transportation", dueDate: months(6), area: "VENDORS" },
    { key: "cake", title: "Choose the cake and dessert", dueDate: months(6), area: "RECEPTION", notes: "Check first whether the venue package includes cake." },
    { key: "sizing-reminder", title: "Remind the wedding party: dress selection and sizing due Nov 7", dueDate: addDays(DRESS_SIZING_DEADLINE, -30), area: "WEDDING_PARTY", priority: "HIGH" },
    { key: "sizing-deadline", title: "Dress selection and sizing due from every attendant", dueDate: DRESS_SIZING_DEADLINE, area: "WEDDING_PARTY", priority: "HIGH", isMilestone: true, owner: "WEDDING_PARTY" },
    { key: "order-dresses", title: "Bride orders all attendant dresses from Azazie", dueDate: addDays(DRESS_SIZING_DEADLINE, 7), area: "ATTIRE", priority: "HIGH", isMilestone: true, notes: "Order them together so the dye lots match." },
    { key: "rehearsal-dinner", title: "Book the rehearsal dinner (Wednesday, April 12)", dueDate: months(5), area: "RECEPTION" },

    // 4–2 months
    { key: "tasting", title: "Menu tasting with the venue", dueDate: months(4), area: "RECEPTION", isMilestone: true, linkVenue: true },
    { key: "suits", title: "Reserve suits for the groom's side and the bridesman", dueDate: months(4), area: "ATTIRE" },
    { key: "groom-attire", title: "Get the groom's attire", dueDate: months(4), area: "ATTIRE" },
    { key: "bands", title: "Buy wedding bands", dueDate: months(3), area: "ATTIRE" },
    { key: "invitations", title: "Mail invitations", dueDate: weeks(10), area: "STATIONERY", priority: "HIGH", isMilestone: true, notes: "8–10 weeks out." },
    { key: "rain-plan", title: "Rain plan: decide on a tent or the indoor backup", dueDate: months(2), area: "VENUE", priority: "HIGH", isMilestone: true, linkVenue: true, notes: "A tent for this many people usually costs far more than the $2,500 rentals line." },
    { key: "passover-meals", title: "Check whether any guests need kosher-for-Passover meals", dueDate: months(2), area: "RECEPTION", notes: "Passover runs from the evening of April 10 through April 18, 2028." },
    { key: "ceremony-plan", title: "Plan the ceremony: vows, readings, order of service", dueDate: months(2), area: "CEREMONY" },

    // Final month
    { key: "rsvp-deadline", title: "RSVP deadline", dueDate: months(1), area: "GUESTS", priority: "HIGH", isMilestone: true },
    { key: "final-headcount", title: "Give the venue the final headcount", dueDate: weeks(2), area: "VENUE", priority: "HIGH", isMilestone: true, linkVenue: true, notes: "Confirm the exact date in the contract. The overage payment is due April 1." },
    { key: "marriage-license", title: "Apply for the NJ marriage license", dueDate: weeks(2), area: "LEGAL", priority: "HIGH", isMilestone: true, notes: "NJ has a 72-hour waiting period and the license is good for 30 days after it's issued. Apply between about March 12 and April 9, 2028." },
    { key: "vendor-arrivals", title: "Confirm every vendor's arrival time (venue opens at 6:00 AM)", dueDate: weeks(2), area: "DAY_OF" },
    { key: "seating-final", title: "Finish the seating chart", dueDate: days(10), area: "GUESTS", isMilestone: true },
    { key: "tips-envelopes", title: "Prepare final payments and tip envelopes", dueDate: weeks(1), area: "BUDGET", notes: "The maître d' fee is already a mandatory service charge. Don't tip venue staff twice." },
    { key: "weather-call", title: "Weather call: ceremony outside or inside", dueDate: weeks(1), area: "VENUE", priority: "HIGH", isMilestone: true, linkVenue: true },
    { key: "rehearsal", title: "Rehearsal and rehearsal dinner", dueDate: days(1), area: "CEREMONY", isMilestone: true },
    { key: "wedding-day", title: "Wedding day", dueDate: WEDDING_DATE, area: "DAY_OF", isMilestone: true },

    // After
    { key: "return-rentals", title: "Return suit rentals and rented items", dueDate: addDays(WEDDING_DATE, 4), area: "DAY_OF" },
    { key: "thank-yous", title: "Send thank-you notes", dueDate: addMonths(WEDDING_DATE, 2), area: "OTHER" },
  ];
}
