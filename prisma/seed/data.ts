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
  venueAddress: "97 Rivervale Road, River Vale, NJ 07675",
  ceremonyTime: "18:00", // the contract: ceremony 6:00–6:30 PM, reception 6:30 PM to midnight
  venueAccessTime: "06:00",
  headcountTarget: 125, // everyone eating, including the couple and the 14 attendants
  totalBudgetCents: 10_000_000,
  includedHeadcount: 125,
  perPersonOverageCents: 20_000,
  overageTaxPpm: 0,
  vendorMealsCountTowardHeadcount: true,
  dressSizingDeadline: DRESS_SIZING_DEADLINE,
} as const;

/**
 * Starting estimates. Bridesmaids' dresses are handled outside this app, so they're not here. Nor
 * are ceremony music (the venue's piano and flute) or the cake (its four-tier cake and plated
 * dessert): the signed contract includes both.
 */
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
  contactName: "Samantha Mayor",
  email: "info@florentinegardens.com",
  phone: "201-666-0444",
  // The contract includes dinner, the four-tier cake and the ceremony pianist and flutist.
  alsoCovers: ["CATERING", "CAKE", "MUSIC_CEREMONY"] as const,
  notes:
    "Contract signed by DocuSign 4/17–4/18/2026 (Samantha Mayor signed for the Estate). Ceremony 6:00–6:30 PM, " +
    "cocktail hour 6:30–7:30 PM, reception until midnight. Vendors from 6:00 AM, out by 1:30 AM. " +
    "$47,500 before tax for up to 125 adults; $54,000 with tax and the maître d' fee. $200 per adult above 125, due 4/1/2028.",
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
  { key: "venue-payment-2", sequence: 2, kind: "INSTALLMENT", amountCents: 1_000_000, dueDate: cd("2026-10-19"), notes: "Second payment (moved from 7/19/2026, initialed on the contract)" },
  { key: "venue-payment-3", sequence: 3, kind: "INSTALLMENT", amountCents: 1_500_000, dueDate: cd("2027-10-19"), notes: "Third payment" },
  { key: "venue-payment-4", sequence: 4, kind: "FINAL", amountCents: 1_565_000, dueDate: cd("2028-03-13"), notes: "Final payment to reach the contract minimum" },
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

// ─── The venue package ─────────────────────────────────────────────────────────

type PackageSeed = {
  key: string;
  section: "SPACE" | "CEREMONY" | "COCKTAIL_HOUR" | "DINNER" | "DESSERT" | "BAR" | "TABLES" | "SUITES" | "STAFF" | "GUESTS" | "PRICING" | "OTHER";
  name: string;
  status: "INCLUDED" | "EXTRA_COST" | "NOT_INCLUDED" | "TO_CONFIRM";
  notes?: string;
  /** What the package lets us pick here, still to be decided. */
  choice?: string;
};

const MARKED_NO = "On the contract, marked No. Ask the price if you want to add it.";
const NOT_LISTED = "Not on the contract. Ask the venue.";

/**
 * The venue package, line by line from the signed contract (two pages, DocuSign 4/17–4/18/2026):
 * everything circled Yes, every option marked No (so you can see what could be added), the choices
 * the package leaves to you, and the usual items the contract doesn't mention (to ask).
 */
export const VENUE_PACKAGE: PackageSeed[] = [
  // The space and the day
  { key: "venue-pkg-event-125", section: "SPACE", name: "The wedding for up to 125 adults", status: "INCLUDED", notes: "The contract says 100–125 adults. The 125 counts everyone eating, including the two of you and the wedding party." },
  { key: "venue-pkg-rooms", section: "SPACE", name: "Grand Ballroom, Pavilion, suites and Great Hall", status: "INCLUDED", notes: "The rooms circled on the contract; the Oak Room is crossed out. Ask which room holds the ceremony, the cocktail hour and the reception." },
  { key: "venue-pkg-full-day", section: "SPACE", name: "The estate for the full day", status: "INCLUDED", notes: "The full-day estate fee is included, so no other event shares the day." },
  { key: "venue-pkg-schedule", section: "SPACE", name: "Ceremony 6:00–6:30 PM, cocktail hour 6:30–7:30 PM, reception until midnight", status: "INCLUDED", notes: "Guests arrive at 5:30 PM." },
  { key: "venue-pkg-vendor-access", section: "SPACE", name: "Vendor and setup access from 6:00 AM", status: "INCLUDED", notes: "Typed onto the contract. Every vendor must be packed up and gone within 90 minutes of the end, so by 1:30 AM." },
  { key: "venue-pkg-dance-floor", section: "SPACE", name: "Dance floor", status: "TO_CONFIRM", notes: NOT_LISTED },
  { key: "venue-pkg-lighting", section: "SPACE", name: "Lighting and uplighting", status: "TO_CONFIRM", notes: NOT_LISTED },

  // Ceremony
  { key: "venue-pkg-ceremony", section: "CEREMONY", name: "Ceremony at the estate", status: "INCLUDED", notes: "The ceremony fee is included." },
  { key: "venue-pkg-ceremony-music", section: "CEREMONY", name: "Live piano and flute for the ceremony", status: "INCLUDED", notes: "Included, so the budget has no separate ceremony-music line. Put the songs on the Music page.", choice: "The songs: prelude, processional, jumping the broom and the recessional" },
  { key: "venue-pkg-ceremony-setup", section: "CEREMONY", name: "Ceremony chairs and setup", status: "TO_CONFIRM", notes: NOT_LISTED },
  { key: "venue-pkg-rain-space", section: "CEREMONY", name: "Indoor ceremony space if it rains", status: "TO_CONFIRM", notes: "Not on the contract. Ask which room, and how many people it holds." },
  { key: "venue-pkg-coffee-before", section: "CEREMONY", name: "Coffee service before the ceremony", status: "NOT_INCLUDED", notes: "Left blank on the contract." },

  // Cocktail hour, 6:30–7:30 PM
  { key: "venue-pkg-cocktail-music", section: "COCKTAIL_HOUR", name: "Live piano and saxophone", status: "INCLUDED", choice: "Any songs you'd like them to play" },
  { key: "venue-pkg-hors-doeuvres", section: "COCKTAIL_HOUR", name: "Butler-passed hors d'oeuvres", status: "INCLUDED", choice: "Which hors d'oeuvres" },
  { key: "venue-pkg-cold-table", section: "COCKTAIL_HOUR", name: "Cold table presentations", status: "INCLUDED" },
  { key: "venue-pkg-cheese", section: "COCKTAIL_HOUR", name: "Fromage and cheese display", status: "INCLUDED" },
  { key: "venue-pkg-sommelier", section: "COCKTAIL_HOUR", name: "Sommelier and wine display", status: "INCLUDED" },
  { key: "venue-pkg-charcuterie", section: "COCKTAIL_HOUR", name: "Italian charcuterie", status: "INCLUDED" },
  { key: "venue-pkg-flatbread", section: "COCKTAIL_HOUR", name: "Artisanal flatbread station", status: "INCLUDED" },
  { key: "venue-pkg-raw-bar", section: "COCKTAIL_HOUR", name: "Chilled seafood raw bar", status: "INCLUDED" },
  { key: "venue-pkg-stations", section: "COCKTAIL_HOUR", name: "Three presentation stations", status: "INCLUDED", choice: "Which three stations" },
  { key: "venue-pkg-chaffing", section: "COCKTAIL_HOUR", name: "A chafing-dish station: one theme, four items", status: "INCLUDED", notes: "The contract calls it a silver chafing station. Ask for gold chafers, since the wedding is gold only.", choice: "The theme and its four items" },
  { key: "venue-pkg-ice", section: "COCKTAIL_HOUR", name: "Two ice sculptures", status: "INCLUDED", choice: "The two designs" },
  { key: "venue-pkg-specialty-drinks", section: "COCKTAIL_HOUR", name: "Specialty drink bar", status: "INCLUDED", choice: "The specialty drinks" },
  { key: "venue-pkg-sushi", section: "COCKTAIL_HOUR", name: "Sushi bar", status: "NOT_INCLUDED", notes: MARKED_NO },
  { key: "venue-pkg-caviar", section: "COCKTAIL_HOUR", name: "Chilled vodka and caviar", status: "NOT_INCLUDED", notes: MARKED_NO },
  { key: "venue-pkg-mozzarella", section: "COCKTAIL_HOUR", name: "Mozzarella station", status: "NOT_INCLUDED", notes: MARKED_NO },

  // Dinner
  { key: "venue-pkg-dinner", section: "DINNER", name: "A served dinner", status: "INCLUDED", notes: "Continental service is circled, not the buffet." },
  { key: "venue-pkg-appetizer", section: "DINNER", name: "Appetizer course", status: "INCLUDED", choice: "The appetizer" },
  { key: "venue-pkg-entrees", section: "DINNER", name: "Three entrées for guests to choose from: meat, chicken and fish", status: "INCLUDED", notes: "Each guest picks one. Their picks come from the RSVP app onto the Meals page.", choice: "One meat, one chicken and one fish" },
  { key: "venue-pkg-sides", section: "DINNER", name: "A vegetable, and a potato or rice", status: "INCLUDED", choice: "One vegetable, and one potato or rice" },
  { key: "venue-pkg-kids-meals", section: "DINNER", name: "Children's meals", status: "INCLUDED" },
  { key: "venue-pkg-special-meals", section: "DINNER", name: "Vegetarian, vegan and special meals", status: "INCLUDED" },
  { key: "venue-pkg-vendor-meals", section: "DINNER", name: "Vendor meals", status: "TO_CONFIRM", notes: "Not on the contract. Ask the price, and whether they count toward the 125." },
  { key: "venue-pkg-kosher", section: "DINNER", name: "Kosher meals", status: "NOT_INCLUDED", notes: "Marked No. The wedding falls during Passover, so if any guests keep kosher for Passover, ask the venue what it can arrange." },
  { key: "venue-pkg-intermezzo", section: "DINNER", name: "Intermezzo between courses", status: "NOT_INCLUDED", notes: "Left blank on the contract." },

  // Cake and dessert
  { key: "venue-pkg-cake", section: "DESSERT", name: "Four-tier wedding cake", status: "INCLUDED", notes: "Included, so the budget has no separate cake line.", choice: "Flavors, fillings and the design" },
  { key: "venue-pkg-plated-dessert", section: "DESSERT", name: "Individual plated dessert", status: "INCLUDED", choice: "The dessert" },
  { key: "venue-pkg-coffee", section: "DESSERT", name: "Coffee and tea", status: "INCLUDED" },
  { key: "venue-pkg-espresso", section: "DESSERT", name: "Cappuccino and espresso", status: "INCLUDED" },
  { key: "venue-pkg-cordial", section: "DESSERT", name: "Cordial cart", status: "INCLUDED" },
  { key: "venue-pkg-send-off", section: "DESSERT", name: "Send-off station", status: "INCLUDED", notes: "A treat for guests on their way out.", choice: "What it serves" },
  { key: "venue-pkg-dessert-platters", section: "DESSERT", name: "Dessert sampler platters", status: "NOT_INCLUDED", notes: MARKED_NO },
  { key: "venue-pkg-passed-desserts", section: "DESSERT", name: "Hand-passed desserts", status: "NOT_INCLUDED", notes: MARKED_NO },
  { key: "venue-pkg-sheet-cake", section: "DESSERT", name: "Sheet cake with an inscription", status: "NOT_INCLUDED", notes: MARKED_NO },
  { key: "venue-pkg-viennese", section: "DESSERT", name: "Viennese table", status: "NOT_INCLUDED", notes: MARKED_NO },
  { key: "venue-pkg-dessert-stations", section: "DESSERT", name: "Dessert stations", status: "NOT_INCLUDED", notes: MARKED_NO },
  { key: "venue-pkg-cigars", section: "DESSERT", name: "Cigar roller", status: "NOT_INCLUDED", notes: MARKED_NO },

  // Bar
  { key: "venue-pkg-bar", section: "BAR", name: "Open bar, 6:30 PM to midnight", status: "INCLUDED", notes: "Premium liquor, and unlimited wine, beer and soda." },
  { key: "venue-pkg-champagne-greeting", section: "BAR", name: "Champagne greeting as guests arrive", status: "INCLUDED", notes: "At 5:30 PM." },
  { key: "venue-pkg-champagne", section: "BAR", name: "Champagne toast", status: "INCLUDED" },

  // Tables
  { key: "venue-pkg-linens", section: "TABLES", name: "Table linens", status: "INCLUDED", choice: "The linen colors" },
  { key: "venue-pkg-tableware", section: "TABLES", name: "Tables, chairs, china, glassware and flatware", status: "TO_CONFIRM", notes: NOT_LISTED },
  { key: "venue-pkg-centerpieces", section: "TABLES", name: "Centerpieces or table décor", status: "TO_CONFIRM", notes: "Not on the contract. Ask the venue; if not, they come from the florist (Floral & decor in the budget)." },
  { key: "venue-pkg-paper", section: "TABLES", name: "Printed menus, table numbers and place cards", status: "TO_CONFIRM", notes: "Not on the contract. Ask the venue; if not, they come from the stationer." },

  // Getting ready
  { key: "venue-pkg-suites", section: "SUITES", name: "Getting-ready suites from 9 AM", status: "INCLUDED", notes: "The contract has you both arriving at 9 AM." },
  { key: "venue-pkg-meals-day", section: "SUITES", name: "Breakfast and lunch on the day", status: "INCLUDED", notes: "Written in by hand next to the full-day estate fee.", choice: "What's served, and for how many" },

  // Staff
  { key: "venue-pkg-servers", section: "STAFF", name: "One server per table", status: "INCLUDED" },
  { key: "venue-pkg-service-charge", section: "STAFF", name: "Taxable service charge", status: "INCLUDED", notes: "Written as included on the contract." },
  { key: "venue-pkg-maitre-d", section: "STAFF", name: "Maître d' and staff fee", status: "EXTRA_COST", notes: "$3,350, due April 1, 2028, on the payment schedule. The contract's schedule writes it as a tip; it's mandatory, so it's counted as a service charge." },
  { key: "venue-pkg-coordinator", section: "STAFF", name: "Banquet manager or day-of coordinator on site", status: "TO_CONFIRM", notes: "Not on the contract. Ask who runs the day for the venue." },
  { key: "venue-pkg-security", section: "STAFF", name: "Estate security", status: "NOT_INCLUDED", notes: "Marked No." },

  // For guests
  { key: "venue-pkg-valet", section: "GUESTS", name: "Valet parking", status: "INCLUDED" },
  { key: "venue-pkg-coat-check", section: "GUESTS", name: "Coat check", status: "TO_CONFIRM", notes: NOT_LISTED },
  { key: "venue-pkg-late-night", section: "GUESTS", name: "Late-night snack", status: "TO_CONFIRM", notes: "Not on the contract. Ask the venue; the send-off station may cover it." },

  // Pricing and terms
  { key: "venue-pkg-price", section: "PRICING", name: "$47,500 before tax for up to 125 adults", status: "INCLUDED", notes: "With 6.625% NJ sales tax and the $3,350 maître d' fee, $54,000 in all, in four payments plus the fee." },
  { key: "venue-pkg-overage", section: "PRICING", name: "$200 for each adult above 125", status: "EXTRA_COST", notes: "Due April 1, 2028 and worked out from the guest list. The contract adds NJ sales tax after its prices, so ask whether the 6.625% applies here too. If it does, set Tax on the overage in Settings." },
  { key: "venue-pkg-children", section: "PRICING", name: "Children: $100 under 12, free under 3", status: "EXTRA_COST", notes: "Ask whether children count toward the 125. Until you know, the headcount prices every guest as an adult, so it errs high." },
  { key: "venue-pkg-outside-vendors", section: "PRICING", name: "Outside vendor fee: $100", status: "EXTRA_COST", notes: "Written as +100 on the contract. Ask whether it's per vendor: with eight or so outside vendors that could be $800, and it isn't in the budget yet." },
  { key: "venue-pkg-terms", section: "PRICING", name: "The contract's additional terms", status: "TO_CONFIRM", notes: "The contract says more terms follow on later pages, but the signed copy has two pages. Ask the venue for the full terms." },
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
  {
    key: "decision-jumping-the-broom",
    decidedOn: cd("2026-09-29"),
    title: "We're jumping the broom",
    decision: "We'll jump the broom at the end of the ceremony, after we're pronounced married and before the recessional.",
  },
];

/** The wedding palette, from choices already made (attire menus, shoes, metals). */
export const PALETTE: Array<{ key: string; name: string; hex: string; usage: string }> = [
  { key: "palette-dusty-rose", name: "Dusty Rose", hex: "#D9A3A0", usage: "Bridesmaids' dresses (Menu A) and the bridesman's bow tie" },
  { key: "palette-desert-rose", name: "Desert Rose", hex: "#B5706B", usage: "Maid and matron of honor dresses (Menu B)" },
  { key: "palette-chocolate", name: "Chocolate Brown", hex: "#3E2B22", usage: "Patent shoes" },
  { key: "palette-gold", name: "Gold", hex: "#B8912F", usage: "All metals. No silver." },
];

// ─── The honeymoon shortlist ──────────────────────────────────────────────────

/**
 * Places that are at their best in mid-April, for leaving soon after a Thursday wedding in New
 * Jersey: three a short flight away and three worth the long one. Flight times are rough, from
 * the New York airports.
 */
export const HONEYMOON_IDEAS: Array<{
  key: string;
  name: string;
  place: string;
  flightHours: number;
  flight: string;
  weather: string;
  why: string;
  watchOut: string;
}> = [
  {
    key: "honeymoon-st-lucia",
    name: "St. Lucia",
    place: "Eastern Caribbean",
    flightHours: 5,
    flight: "About 4½ hours nonstop from JFK.",
    weather: "Dry season: sunny, mid-80s °F, warm sea.",
    why: "The Pitons, rainforest and some of the Caribbean's most romantic resorts, many with private plunge pools.",
    watchOut: "Easter week is high season. The west-coast resorts are an hour or more over winding roads from the main airport.",
  },
  {
    key: "honeymoon-turks-caicos",
    name: "Turks and Caicos",
    place: "Caribbean",
    flightHours: 4,
    flight: "About 3½ hours nonstop from Newark or JFK.",
    weather: "Dry and sunny, low-to-mid 80s °F.",
    why: "Grace Bay's calm turquoise water and white sand: the easiest, most restful beach week.",
    watchOut: "One of the priciest islands, and flat: more a beach trip than an adventure.",
  },
  {
    key: "honeymoon-riviera-maya",
    name: "Riviera Maya",
    place: "Mexican Caribbean",
    flightHours: 4,
    flight: "About 4 hours nonstop to Cancún from Newark or JFK.",
    weather: "Dry, hot and sunny, upper 80s °F.",
    why: "Adults-only resorts, cenotes to swim in, Mayan ruins and Tulum's beaches, for less than most islands.",
    watchOut: "Seaweed (sargassum) can wash up from spring into summer; ask resorts how they handle it. Easter week is busy.",
  },
  {
    key: "honeymoon-maui",
    name: "Maui",
    place: "Hawaii",
    flightHours: 11,
    flight: "About 11–12 hours, nonstop in season or with one stop.",
    weather: "Spring: dry on the sunny side of the island, low 80s °F.",
    why: "Beaches, the road to Hana and sunrise on Haleakalā, and no passport needed.",
    watchOut: "Six hours behind New York, and the longest flight you can take without leaving the country.",
  },
  {
    key: "honeymoon-amalfi",
    name: "Amalfi Coast",
    place: "Southern Italy",
    flightHours: 9,
    flight: "About 8–9 hours to Rome or Naples, then a drive down the coast.",
    weather: "Spring: mid-60s °F, flowers and lemons, too cool for most to swim.",
    why: "Cliffside villages, long lunches, Capri and Positano before the summer crowds.",
    watchOut: "Many hotels reopen for the season around Easter, so check yours is open. Italy travels on Easter Monday too.",
  },
  {
    key: "honeymoon-maldives",
    name: "The Maldives",
    place: "Indian Ocean",
    flightHours: 20,
    flight: "About 20 hours with one connection (Dubai, Doha or Istanbul), then a seaplane or boat.",
    weather: "End of the dry season: hot and sunny, with calm, clear water.",
    why: "An overwater villa, the reef off your deck, and complete privacy.",
    watchOut: "The longest trip after a big week, and the most expensive. Seaplanes only fly by day, so a late arrival can mean a night near the airport.",
  },
];

// ─── Planning checklist, generated backwards from the wedding date ────────────

type Area =
  | "PLANNING" | "BUDGET" | "VENUE" | "VENDORS" | "ATTIRE" | "WEDDING_PARTY" | "GUESTS"
  | "STATIONERY" | "CEREMONY" | "RECEPTION" | "BEAUTY" | "TRAVEL" | "HONEYMOON" | "LEGAL" | "DAY_OF" | "OTHER";

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
    { key: "wedding-inbox", title: "Set up a shared wedding email and a folder for every contract", dueDate: cd("2026-10-15"), area: "PLANNING", notes: "One place for contracts, receipts and vendor emails, so either of you can answer a vendor." },
    { key: "vision-brief", title: "Write our vision: the feel, colors, must-haves and what we don't want", dueDate: cd("2026-10-31"), area: "PLANNING", priority: "HIGH", notes: "One page to hand every designer, florist and photographer so their proposals start from the same picture." },
    { key: "vendor-preview-prep", title: "Prepare for the venue's vendor preview (Nov 16, 6 PM)", dueDate: cd("2026-11-13"), area: "VENUE", linkVenue: true, notes: "Bring the venue's open items (marked \"to confirm\" on its package list), our budget per category, and a short list of vendors to meet." },
    { key: "interview-coordinators", title: "Interview designers and day-of coordinators", dueDate: cd("2026-11-16"), area: "VENDORS", priority: "HIGH", notes: "Meeting one at the vendor preview on Nov 16. Ask what's included, when they start, how many events they take that week, and their Thursday rate." },

    // 18–12 months
    { key: "honeymoon-choose", title: "Choose the honeymoon destination and dates", dueDate: months(15), area: "HONEYMOON", priority: "HIGH", isMilestone: true, notes: "Easter week is spring break, the busiest time to fly to the Caribbean and Mexico. Decide early so you can book the day flights open. The shortlist is on the Honeymoon page." },
    { key: "honeymoon-passports", title: "Check both passports for the honeymoon", dueDate: months(14), area: "HONEYMOON", notes: "Each needs to stay valid for six months past the day you're home. Book tickets in the names on your passports today; if either of you changes names, update the passport after the trip." },
    { key: "guest-list-draft", title: "Draft the guest list (125 people total, including us and the wedding party)", dueDate: months(18), area: "GUESTS", priority: "HIGH", notes: "Every person above 125 costs $200. 145 people uses up the $4,000 contingency." },
    { key: "ask-wedding-party", title: "Propose to the wedding party", dueDate: months(18), area: "WEDDING_PARTY", priority: "HIGH", isMilestone: true, notes: "Ask each of the 14 to stand with you. Many couples give a small proposal box. Add their names on the Wedding Party page." },
    { key: "book-coordinator", title: "Book the designer / day-of coordinator", dueDate: months(16), area: "VENDORS", priority: "HIGH", isMilestone: true, notes: "Full designers start right away; many day-of coordinators take over 6–8 weeks before the wedding." },
    { key: "insurance", title: "Buy wedding insurance (liability and cancellation)", dueDate: months(16), area: "BUDGET", notes: "Ask the venue whether they require a liability certificate from you." },
    { key: "holy-week-vendors", title: "Confirm each vendor works on Holy Thursday and during Passover week", dueDate: months(16), area: "VENDORS", notes: "Some vendors observe Holy Week or Passover, and Easter week is peak season for florists and bakeries. Ask before signing." },
    { key: "contract-checks", title: "Before signing any contract, check cancellation, overtime, weekday pricing and payment dates", dueDate: months(15), area: "VENDORS", notes: "Add every deposit and installment to the Budget as scheduled payments when you sign." },
    { key: "thursday-rates", title: "Get each vendor's Thursday rate in writing", dueDate: months(17), area: "VENDORS", notes: "Weekday rates are often lower than Saturday rates. Ask every vendor." },
    { key: "book-photographer", title: "Book the photographer", dueDate: months(15), area: "VENDORS", priority: "HIGH", isMilestone: true, notes: "12–18 months out." },
    { key: "book-videographer", title: "Book the videographer", dueDate: months(14), area: "VENDORS", priority: "HIGH" },
    { key: "book-dj", title: "Book the DJ", dueDate: months(13), area: "VENDORS", priority: "HIGH" },
    { key: "ceremony-time", title: "Choose the ceremony start time", dueDate: months(12), area: "CEREMONY", priority: "HIGH", notes: "Holy Thursday has evening church services and Passover's first seders are April 10 and 11. A daytime or early-evening ceremony lets more guests come." },
    { key: "book-stationer", title: "Choose the stationer and calligrapher", dueDate: months(12), area: "STATIONERY" },
    { key: "engagement-photos", title: "Engagement photos (often part of the photography package)", dueDate: months(12), area: "VENDORS", isMilestone: true },
    { key: "dress-shopping", title: "Wedding dress shopping", dueDate: months(13), area: "ATTIRE", priority: "HIGH", isMilestone: true, notes: "Start 12 to 14 months out, so the dress can be ordered about 9 months before the wedding." },
    { key: "hotel-block", title: "Reserve a hotel room block (Wednesday and Thursday nights)", dueDate: months(12), area: "TRAVEL", priority: "HIGH", isMilestone: true, notes: "The wedding is the Thursday before Easter (Easter is April 16, 2028), during Passover. Expect high hotel and travel demand that week." },
    { key: "book-officiant", title: "Book the officiant", dueDate: months(12), area: "CEREMONY", priority: "HIGH", notes: "April 13, 2028 is Holy Thursday. If your officiant is clergy, confirm they can officiate that day." },
    { key: "rsvp-app", title: "Set up the RSVP app and wedding website", dueDate: months(11), area: "GUESTS" },
    { key: "book-florist", title: "Book the florist", dueDate: months(11), area: "VENDORS" },
    { key: "kwe-kwe-decide", title: "Decide on a Guyanese kwe kwe: whether, when and where", dueDate: months(10), area: "RECEPTION", priority: "HIGH", isMilestone: true, notes: "Traditionally the night before the wedding, with call-and-response songs, drumming and dancing. That night is the rehearsal dinner (Wednesday, April 12), so the choices are: make the rehearsal dinner the kwe kwe, give it its own night earlier that week, or hold it during the reception. Passover seders are the evenings of April 10 and 11. Record what you decide in Decisions." },
    { key: "collect-addresses", title: "Collect every guest's mailing address", dueDate: months(11), area: "GUESTS" },

    // 10–6 months
    { key: "save-the-dates", title: "Mail save-the-dates", dueDate: months(10), area: "STATIONERY", priority: "HIGH", isMilestone: true, notes: "Say \"Thursday\" clearly so guests can request the day off and book travel early." },
    { key: "registry", title: "Set up the gift registry", dueDate: months(10), area: "GUESTS" },
    { key: "website-travel", title: "Add travel details to the website: hotels, airports, getting to the venue", dueDate: months(10), area: "GUESTS", notes: "Good Friday (April 14) is a NJ state holiday and Easter weekend is a heavy travel weekend. Tell guests to book early." },
    { key: "lighting", title: "Decide on lighting and draping; ask what the venue includes", dueDate: months(10), area: "RECEPTION", linkVenue: true },
    { key: "bride-dress", title: "Order the wedding dress", dueDate: months(9), area: "ATTIRE", priority: "HIGH", isMilestone: true, notes: "9–12 months out." },
    { key: "book-beauty", title: "Book hair and makeup", dueDate: months(9), area: "BEAUTY" },
    { key: "welcome-event", title: "Decide on a welcome event or day-after brunch", dueDate: months(9), area: "RECEPTION", notes: "The day after is Good Friday, which may clash with services. Folding a welcome into the Wednesday rehearsal dinner avoids that." },
    { key: "rentals", title: "Book any rentals the venue doesn't include (lounge furniture, extra décor)", dueDate: months(8), area: "RECEPTION", notes: "Linens come with the venue. Confirm the tables, chairs and tableware on the venue's package list first." },
    { key: "honeymoon", title: "Book the honeymoon resort", dueDate: months(12), area: "HONEYMOON", priority: "HIGH", isMilestone: true, notes: "Tell them it's your honeymoon: many resorts add a welcome or an upgrade." },
    { key: "honeymoon-flights", title: "Book the honeymoon flights", dueDate: months(11), area: "HONEYMOON", priority: "HIGH", notes: "Airlines open seats about 11 months ahead, and Easter weekend fills fast." },
    { key: "honeymoon-insurance", title: "Buy travel insurance for the honeymoon", dueDate: months(10), area: "HONEYMOON", notes: "Soon after booking, so it covers what you've already paid." },
    { key: "florist-proposal", title: "Review the florist's design proposal", dueDate: months(7), area: "VENDORS" },
    { key: "kwe-kwe-leader", title: "If we're having a kwe kwe: find a kwe kwe leader and drummers", dueDate: months(7), area: "VENDORS", notes: "Ask family first; elders often know who leads the songs. Add them as a vendor once booked." },
    { key: "book-transport", title: "Book transportation", dueDate: months(6), area: "VENDORS" },
    { key: "groom-attire-shopping", title: "Groom's attire shopping", dueDate: months(7), area: "ATTIRE", isMilestone: true, notes: "Choose the look first, so the groom's side's suits and the bridesman's suit (with its Dusty Rose bow tie) can match it." },
    { key: "shuttles", title: "Book guest shuttles between the hotel and the venue", dueDate: months(5), area: "TRAVEL" },
    { key: "broom", title: "Choose or make the broom for jumping the broom", dueDate: months(5), area: "CEREMONY", notes: "Many couples decorate it with ribbon and flowers in the wedding colors (Dusty Rose, Desert Rose, gold; no silver) and keep it as a keepsake. Add it under Vision & Décor." },
    { key: "cake", title: "Choose the four-tier cake and the plated dessert", dueDate: months(6), area: "RECEPTION", linkVenue: true, notes: "Both come with the venue. Pick the cake's flavors, fillings and design, and the dessert, and record them on the venue's package list." },
    { key: "sizing-reminder", title: "Remind the wedding party: dress selection and sizing due Nov 7", dueDate: addDays(DRESS_SIZING_DEADLINE, -30), area: "WEDDING_PARTY", priority: "HIGH" },
    { key: "sizing-deadline", title: "Dress selection and sizing due from every attendant", dueDate: DRESS_SIZING_DEADLINE, area: "WEDDING_PARTY", priority: "HIGH", isMilestone: true, owner: "WEDDING_PARTY" },
    { key: "approve-shoes", title: "Approve any shoes attendants already own (chocolate brown patent, 3.5\" or higher)", dueDate: DRESS_SIZING_DEADLINE, area: "WEDDING_PARTY" },
    { key: "order-dresses", title: "Bride orders all attendant dresses from Azazie", dueDate: addDays(DRESS_SIZING_DEADLINE, 7), area: "ATTIRE", priority: "HIGH", isMilestone: true, notes: "Order them together so the dye lots match." },
    { key: "rehearsal-dinner", title: "Book the rehearsal dinner (Wednesday, April 12)", dueDate: months(5), area: "RECEPTION" },

    // 4–2 months
    { key: "tasting", title: "Menu tasting with the venue", dueDate: months(4), area: "RECEPTION", isMilestone: true, linkVenue: true, notes: "Bring the open choices from the venue's package list: hors d'oeuvres, the three stations, the chafing station, the appetizer, the entrées, the sides and the dessert." },
    { key: "invitation-proofs", title: "Approve invitation proofs", dueDate: weeks(14), area: "STATIONERY" },
    { key: "design-walkthrough", title: "Design walkthrough at the venue with the designer and florist", dueDate: months(3), area: "VENUE", linkVenue: true },
    { key: "first-fitting", title: "First wedding dress fitting", dueDate: months(3), area: "ATTIRE" },
    { key: "beauty-trial", title: "Hair and makeup trial", dueDate: months(3), area: "BEAUTY" },
    { key: "readers-toasts", title: "Ask readers and anyone giving a toast", dueDate: months(3), area: "CEREMONY" },
    { key: "broom-people", title: "Ask who will hold and lay down the broom, and who will share its history", dueDate: months(3), area: "CEREMONY", notes: "Often an elder or a family member. A few words on the tradition help guests who haven't seen it before." },
    { key: "party-gifts", title: "Choose gifts for the wedding party", dueDate: months(3), area: "WEDDING_PARTY" },
    { key: "suits", title: "Reserve suits for the groom's side and the bridesman", dueDate: months(4), area: "ATTIRE" },
    { key: "groom-attire", title: "Order the groom's attire", dueDate: months(4), area: "ATTIRE" },
    { key: "bridal-shower", title: "Bridal shower (if we're having one)", dueDate: months(3), area: "WEDDING_PARTY", owner: "WEDDING_PARTY", isMilestone: true, notes: "Usually hosted by family or the wedding party, two to three months before the wedding." },
    { key: "bands", title: "Buy wedding bands", dueDate: months(3), area: "ATTIRE" },
    { key: "invitations", title: "Mail invitations", dueDate: weeks(10), area: "STATIONERY", priority: "HIGH", isMilestone: true, notes: "8–10 weeks out." },
    { key: "rain-plan", title: "Rain plan: decide on a tent or the indoor backup", dueDate: months(2), area: "VENUE", priority: "HIGH", isMilestone: true, linkVenue: true, notes: "A tent for this many people usually costs far more than the $2,500 rentals line." },
    { key: "passover-meals", title: "Check whether any guests need kosher-for-Passover meals", dueDate: months(2), area: "RECEPTION", linkVenue: true, notes: "Passover runs from the evening of April 10 through April 18, 2028. Kosher meals aren't in the venue contract, so ask the venue what it can arrange." },
    { key: "bachelor-bachelorette", title: "Bachelor and bachelorette parties", dueDate: months(2), area: "WEDDING_PARTY", owner: "WEDDING_PARTY", isMilestone: true, notes: "Usually one to three months before, hosted by the best man and the maid and matron of honor. Keep them clear of Holy Week and Passover (April 9 to 18, 2028)." },
    { key: "ceremony-plan", title: "Plan the ceremony: vows, readings, order of service", dueDate: months(2), area: "CEREMONY" },
    { key: "timeline-draft", title: "Draft the wedding-day timeline", dueDate: weeks(8), area: "DAY_OF", priority: "HIGH", isMilestone: true },
    { key: "hotel-cutoff", title: "Remind guests before the hotel block cutoff", dueDate: months(2), area: "TRAVEL" },
    { key: "parent-gifts", title: "Choose gifts or letters for parents", dueDate: months(2), area: "OTHER" },
    { key: "menu-final", title: "Finalize the menu and bar with the venue", dueDate: weeks(6), area: "RECEPTION", linkVenue: true },
    { key: "paper-goods", title: "Order escort cards, place cards, table numbers, menus and signs", dueDate: weeks(6), area: "STATIONERY" },
    { key: "processional", title: "Set the processional order: who walks, with whom, to which song", dueDate: weeks(6), area: "CEREMONY" },
    { key: "kwe-kwe-plan", title: "If we're having a kwe kwe: plan the songs, food and each family's part", dueDate: weeks(6), area: "RECEPTION", notes: "Add it to the Timeline on its day, and tell the photographer if it should be covered." },

    // Final month
    { key: "rsvp-deadline", title: "RSVP deadline", dueDate: months(1), area: "GUESTS", priority: "HIGH", isMilestone: true },
    { key: "music-lists", title: "Send the DJ the key songs, must-play and do-not-play lists", dueDate: weeks(4), area: "RECEPTION" },
    { key: "broom-cues", title: "Tell the officiant, photographer, videographer and DJ where the broom jump happens", dueDate: weeks(4), area: "CEREMONY", notes: "Right after you're pronounced married, before the recessional. The photographers need a clear line from the front and from the aisle, and the DJ needs the song cue." },
    { key: "vendor-insurance", title: "Collect vendors' insurance certificates if the venue requires them", dueDate: weeks(4), area: "VENDORS", linkVenue: true },
    { key: "point-person", title: "Name the day-of point person for vendor questions", dueDate: weeks(4), area: "DAY_OF", notes: "Your coordinator if you have one. Otherwise someone who isn't in the wedding party." },
    { key: "attendant-alterations", title: "Attendants finish their alterations", dueDate: weeks(4), area: "WEDDING_PARTY", owner: "WEDDING_PARTY", notes: "Alterations are each person's own cost." },
    { key: "dietary", title: "Send the venue every guest's dietary needs and allergies", dueDate: weeks(3), area: "RECEPTION", linkVenue: true },
    { key: "shot-list", title: "Send the photographer the shot list and family groupings", dueDate: weeks(3), area: "VENDORS" },
    { key: "beauty-schedule", title: "Set the hair and makeup schedule for the morning", dueDate: weeks(3), area: "BEAUTY" },
    { key: "final-walkthrough", title: "Final walkthrough at the venue: layout, timing, deliveries", dueDate: weeks(3), area: "VENUE", isMilestone: true, linkVenue: true },
    { key: "final-headcount", title: "Give the venue the final headcount", dueDate: weeks(2), area: "VENUE", priority: "HIGH", isMilestone: true, linkVenue: true, notes: "Confirm the exact date in the contract. The overage payment is due April 1." },
    { key: "marriage-license", title: "Apply for the NJ marriage license", dueDate: weeks(2), area: "LEGAL", priority: "HIGH", isMilestone: true, notes: "NJ has a 72-hour waiting period and the license is good for 30 days after it's issued. Apply between about March 12 and April 9, 2028." },
    { key: "timeline-final", title: "Send the final timeline to every vendor and the wedding party", dueDate: weeks(2), area: "DAY_OF", priority: "HIGH", isMilestone: true },
    { key: "final-fitting", title: "Final wedding dress fitting", dueDate: weeks(2), area: "ATTIRE" },
    { key: "final-payments", title: "Make every final vendor payment due before the wedding", dueDate: weeks(2), area: "BUDGET", priority: "HIGH" },
    { key: "vendor-arrivals", title: "Confirm every vendor's arrival time (venue opens at 6:00 AM)", dueDate: weeks(2), area: "DAY_OF" },
    { key: "seating-final", title: "Finish the seating chart", dueDate: days(10), area: "GUESTS", isMilestone: true },
    { key: "send-floor-plan", title: "Send the venue the floor plan and seating chart", dueDate: weeks(1), area: "VENUE", linkVenue: true },
    { key: "honeymoon-extras", title: "Book honeymoon transfers, dinners and excursions", dueDate: weeks(8), area: "HONEYMOON" },
    { key: "honeymoon-pack", title: "Pack for the honeymoon, set out-of-office replies and hold the mail", dueDate: weeks(1), area: "HONEYMOON" },
    { key: "welcome-bags", title: "Assemble the hotel welcome bags", dueDate: weeks(1), area: "TRAVEL", notes: "Drop them at the hotel with a list of names by Tuesday, April 11." },
    { key: "tips-envelopes", title: "Prepare final payments and tip envelopes", dueDate: weeks(1), area: "BUDGET", notes: "The maître d' fee is already a mandatory service charge. Don't tip venue staff twice." },
    { key: "weather-call", title: "Weather call: ceremony outside or inside", dueDate: weeks(1), area: "VENUE", priority: "HIGH", isMilestone: true, linkVenue: true },
    { key: "emergency-kit", title: "Pack the day-of emergency kit", dueDate: days(3), area: "DAY_OF", notes: "Sewing kit, safety pins, stain remover, pain relievers, chargers, tissues, flats, snacks and water." },
    { key: "wedding-bags", title: "Pack the overnight bags and the wedding-morning bag", dueDate: days(2), area: "DAY_OF" },
    { key: "drop-off", title: "Drop off décor, signs, favors and the guest book at the venue", dueDate: days(1), area: "VENUE", linkVenue: true, notes: "Ask the venue when items can come in. Vendors can arrive from 6:00 AM on the day." },
    { key: "rings-license", title: "Hand the rings to the best man and the license to the officiant", dueDate: days(1), area: "CEREMONY" },
    { key: "rehearsal", title: "Rehearsal and rehearsal dinner", dueDate: days(1), area: "CEREMONY", isMilestone: true },
    { key: "wedding-day", title: "Wedding day", dueDate: WEDDING_DATE, area: "DAY_OF", isMilestone: true },

    // After
    { key: "return-rentals", title: "Return suit rentals and rented items", dueDate: addDays(WEDDING_DATE, 4), area: "DAY_OF" },
    { key: "attire-care", title: "Clean and preserve the wedding attire", dueDate: addDays(WEDDING_DATE, 14), area: "ATTIRE" },
    { key: "certified-copies", title: "Order certified copies of the marriage certificate", dueDate: addDays(WEDDING_DATE, 21), area: "LEGAL", notes: "The officiant files the license; copies come from the registrar where you applied." },
    { key: "close-budget", title: "Close out the budget: last payments, refunds and deposits", dueDate: addMonths(WEDDING_DATE, 1), area: "BUDGET" },
    { key: "name-change", title: "Update names on IDs and accounts (if either of us is changing names)", dueDate: addMonths(WEDDING_DATE, 1), area: "LEGAL" },
    { key: "vendor-reviews", title: "Write reviews for the vendors", dueDate: addMonths(WEDDING_DATE, 1), area: "VENDORS" },
    { key: "album", title: "Choose album photos when the gallery arrives", dueDate: addMonths(WEDDING_DATE, 3), area: "OTHER" },
    { key: "thank-yous", title: "Send thank-you notes", dueDate: addMonths(WEDDING_DATE, 2), area: "OTHER" },
  ];
}
