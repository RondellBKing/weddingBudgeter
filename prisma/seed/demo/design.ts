import { addDays, todayIn, toDbDate } from "../../../src/lib/dates";
import type { Prisma } from "../../../src/generated/prisma/client";
import type { DecorSource, DesignArea } from "../../../src/generated/prisma/enums";
import type { Db } from "../../../src/lib/db-client";
import { VENUE, VENUE_ITEM, WEDDING_DATE } from "../data";

// Sample rows for Vision & Décor (isDemo = true). Inspiration has no image links, so the preview
// never depends on outside sites: the board shows its designed placeholders instead. No demo
// palette colors: the real palette is already seeded.

const pins = (q: string) => `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(q)}`;

const INSPIRATION: Array<{ area: DesignArea; title: string; notes?: string; source?: string; favorite?: boolean }> = [
  {
    area: "OVERALL",
    title: "Candlelit garden romance",
    notes: "Warm and low-lit. Blush and chocolate with gold, lots of candles, nothing cold.",
    source: pins("candlelit garden wedding blush gold"),
    favorite: true,
  },
  { area: "OVERALL", title: "Spring in River Vale", notes: "Early April light. Soft, fresh, a little romantic.", source: pins("spring estate wedding new jersey") },
  {
    area: "CEREMONY",
    title: "Aisle lined with low garden roses",
    notes: "Meadow-style clusters along the aisle instead of bows on chairs.",
    source: pins("aisle meadow flowers wedding"),
    favorite: true,
  },
  { area: "CEREMONY", title: "Arch draped in dusty rose chiffon", source: pins("ceremony arch dusty rose chiffon") },
  { area: "COCKTAIL_HOUR", title: "Champagne tower in gold coupes", notes: "For the first toast of cocktail hour." },
  {
    area: "FLOWERS",
    title: "Garden roses, ranunculus and eucalyptus",
    notes: "Dusty rose and desert rose with a little greenery. Nothing too tight or round.",
    source: pins("garden rose ranunculus bouquet dusty rose"),
    favorite: true,
  },
  { area: "TABLESCAPE", title: "Gold-rim chargers on chocolate linen", notes: "Blush napkins, gold flatware, taper candles down the middle." },
  { area: "LIGHTING", title: "Taper candles in gold holders", source: pins("gold taper candle holders wedding reception") },
  { area: "CAKE", title: "Textured buttercream with sugar flowers", notes: "Four tiers, ivory, one cascade of blush sugar roses." },
  { area: "STATIONERY", title: "Letterpress on cotton paper, gold foil monogram", source: pins("letterpress wedding invitation gold foil monogram") },
  { area: "ATTIRE", title: "Mix-and-match Dusty Rose", notes: "Menu A dresses side by side, chocolate patent heels." },
  { area: "WELCOME", title: "Welcome bags with Jersey treats", notes: "Saltwater taffy, a local coffee, a note from us." },
];

type DecorSeed = {
  name: string;
  area: DesignArea;
  quantity: number;
  source: DecorSource;
  vendor?: "venue" | "florist";
  linkVenueBudget?: boolean;
  orderedOn?: number;
  receivedOn?: number;
  /** Days from today, or "after-wedding" (the Monday after). */
  returnBy?: number | "after-wedding";
  returnedOn?: number;
  notes?: string;
};

// Day offsets from today, so the demo always shows every status.
const DECOR: DecorSeed[] = [
  {
    name: "Gold Chiavari chairs",
    area: "RECEPTION",
    quantity: 125,
    source: "VENUE",
    vendor: "venue",
    linkVenueBudget: true,
    orderedOn: -30,
    notes: "Included with the venue. Confirm the cushion color at the walkthrough.",
  },
  { name: "Uplighting, warm amber", area: "LIGHTING", quantity: 12, source: "RENTAL", notes: "Warm only, no cool white." },
  { name: "Gold taper candleholders", area: "LIGHTING", quantity: 24, source: "PURCHASE", orderedOn: -12, receivedOn: -3 },
  {
    name: "Mock-up linens (samples)",
    area: "TABLESCAPE",
    quantity: 3,
    source: "RENTAL",
    orderedOn: -20,
    receivedOn: -14,
    returnBy: -2,
    notes: "Chocolate, blush and ivory samples for the mock-up table.",
  },
  {
    name: "Gold-rim chargers (mock-up table)",
    area: "TABLESCAPE",
    quantity: 8,
    source: "RENTAL",
    orderedOn: -10,
    receivedOn: -4,
    returnBy: 5,
  },
  { name: "Table numbers in gold frames", area: "STATIONERY", quantity: 16, source: "PURCHASE" },
  { name: "Welcome sign, gold mirror", area: "STATIONERY", quantity: 1, source: "DIY", orderedOn: -5, notes: "Mirror bought; lettering still to do." },
  { name: "Ceremony arch flowers", area: "CEREMONY", quantity: 1, source: "VENDOR", vendor: "florist" },
  {
    name: "Brass lanterns for the entrance",
    area: "CEREMONY",
    quantity: 6,
    source: "BORROWED",
    orderedOn: -2,
    returnBy: "after-wedding",
    notes: "From a friend. Pick up the week of the wedding.",
  },
  {
    name: "Vintage cake stand (tasting)",
    area: "CAKE",
    quantity: 1,
    source: "BORROWED",
    receivedOn: -40,
    returnBy: -25,
    returnedOn: -26,
    notes: "Borrowed for the cake tasting photos.",
  },
];

export async function seedDemoDesign(db: Db): Promise<Record<string, number>> {
  const today = todayIn();
  const on = (offset: number | "after-wedding" | undefined): Date | null =>
    offset === undefined ? null : toDbDate(offset === "after-wedding" ? addDays(WEDDING_DATE, 4) : addDays(today, offset));

  const [venue, venueItem, florist] = await Promise.all([
    db.vendor.findUnique({ where: { seedKey: VENUE.key }, select: { id: true } }),
    db.budgetItem.findUnique({ where: { seedKey: VENUE_ITEM.key }, select: { id: true } }),
    db.vendor.findFirst({ where: { isDemo: true, category: "FLORAL" }, select: { id: true } }),
  ]);

  const inspiration = await db.inspirationItem.createMany({
    data: INSPIRATION.map((p, i) => ({
      area: p.area,
      title: p.title,
      notes: p.notes ?? null,
      sourceUrl: p.source ?? null,
      isFavorite: p.favorite ?? false,
      sortOrder: i,
      isDemo: true,
    })),
  });

  const decor = await db.decorItem.createMany({
    data: DECOR.map((d, i) => ({
      name: d.name,
      area: d.area,
      quantity: d.quantity,
      source: d.source,
      vendorId: d.vendor === "venue" ? (venue?.id ?? null) : d.vendor === "florist" ? (florist?.id ?? null) : null,
      budgetItemId: d.linkVenueBudget ? (venueItem?.id ?? null) : null,
      orderedOn: on(d.orderedOn),
      receivedOn: on(d.receivedOn),
      returnBy: on(d.returnBy),
      returnedOn: on(d.returnedOn),
      notes: d.notes ?? null,
      sortOrder: i,
      isDemo: true,
    })),
  });

  return { inspiration: inspiration.count, decor: decor.count };
}

/** Runs inside wipeDemo's transaction, before demo guests and vendors are removed. */
export async function wipeDemoDesign(tx: Prisma.TransactionClient): Promise<Record<string, number>> {
  const decor = await tx.decorItem.deleteMany({ where: { isDemo: true } });
  const inspiration = await tx.inspirationItem.deleteMany({ where: { isDemo: true } });
  const palette = await tx.paletteColor.deleteMany({ where: { isDemo: true } });
  return { decor: decor.count, inspiration: inspiration.count, paletteColors: palette.count };
}
