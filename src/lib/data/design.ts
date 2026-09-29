import "server-only";
import { requireSession } from "../auth/require-session";
import { fromDbDate, type CalendarDate } from "../dates";
import { prisma } from "../db";
import { DESIGN_AREA_LABEL, valuesOf } from "../labels";
import type { DecorSource, DesignArea } from "@/generated/prisma/enums";

// Loaders for Vision & Décor. Each one checks the session first. Statuses and summaries are
// worked out from these rows in src/lib/domain/design.ts; nothing derived is stored.

const AREA_ORDER = valuesOf(DESIGN_AREA_LABEL);
const areaRank = (a: DesignArea) => AREA_ORDER.indexOf(a);

export type InspirationRow = {
  id: string;
  area: DesignArea;
  title: string | null;
  imageUrl: string | null;
  sourceUrl: string | null;
  notes: string | null;
  isFavorite: boolean;
  isDemo: boolean;
};

export type PaletteRow = { id: string; name: string; hex: string; usage: string | null; isSeeded: boolean };

export type DecorRow = {
  id: string;
  name: string;
  area: DesignArea;
  quantity: number;
  source: DecorSource;
  vendor: { id: string; name: string } | null;
  budgetItem: { id: string; description: string; categoryName: string } | null;
  orderedOn: CalendarDate | null;
  receivedOn: CalendarDate | null;
  returnBy: CalendarDate | null;
  returnedOn: CalendarDate | null;
  notes: string | null;
  isDemo: boolean;
};

const inspirationSelect = {
  id: true,
  area: true,
  title: true,
  imageUrl: true,
  sourceUrl: true,
  notes: true,
  isFavorite: true,
  isDemo: true,
} as const;

/** The board, in area order, then the order things were pinned. */
export async function loadInspiration(): Promise<InspirationRow[]> {
  await requireSession();
  const rows = await prisma.inspirationItem.findMany({
    select: inspirationSelect,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.sort((a, b) => areaRank(a.area) - areaRank(b.area));
}

export async function loadInspirationItem(id: string): Promise<InspirationRow | null> {
  await requireSession();
  return prisma.inspirationItem.findUnique({ where: { id }, select: inspirationSelect });
}

function toPaletteRow(c: { id: string; name: string; hex: string; usage: string | null; seedKey: string | null }): PaletteRow {
  return { id: c.id, name: c.name, hex: c.hex.toUpperCase(), usage: c.usage, isSeeded: c.seedKey !== null };
}

const paletteSelect = { id: true, name: true, hex: true, usage: true, seedKey: true } as const;

/** The palette, in the couple's order. */
export async function loadPalette(): Promise<PaletteRow[]> {
  await requireSession();
  const rows = await prisma.paletteColor.findMany({
    select: paletteSelect,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toPaletteRow);
}

export async function loadPaletteColor(id: string): Promise<PaletteRow | null> {
  await requireSession();
  const c = await prisma.paletteColor.findUnique({ where: { id }, select: paletteSelect });
  return c ? toPaletteRow(c) : null;
}

const decorInclude = {
  vendor: { select: { id: true, name: true } },
  budgetItem: { select: { id: true, description: true, category: { select: { name: true } } } },
} as const;

type DecorWithLinks = Awaited<ReturnType<typeof findDecor>>;

function findDecor(id: string) {
  return prisma.decorItem.findUnique({ where: { id }, include: decorInclude });
}

function toDecorRow(d: NonNullable<DecorWithLinks>): DecorRow {
  return {
    id: d.id,
    name: d.name,
    area: d.area,
    quantity: d.quantity,
    source: d.source,
    vendor: d.vendor,
    budgetItem: d.budgetItem
      ? { id: d.budgetItem.id, description: d.budgetItem.description, categoryName: d.budgetItem.category.name }
      : null,
    orderedOn: fromDbDate(d.orderedOn),
    receivedOn: fromDbDate(d.receivedOn),
    returnBy: fromDbDate(d.returnBy),
    returnedOn: fromDbDate(d.returnedOn),
    notes: d.notes,
    isDemo: d.isDemo,
  };
}

/** Every piece of décor, in area order, then the order it was added. */
export async function loadDecor(): Promise<DecorRow[]> {
  await requireSession();
  const rows = await prisma.decorItem.findMany({
    include: decorInclude,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toDecorRow).sort((a, b) => areaRank(a.area) - areaRank(b.area));
}

export async function loadDecorItem(id: string): Promise<DecorRow | null> {
  await requireSession();
  const d = await findDecor(id);
  return d ? toDecorRow(d) : null;
}

/** The vendor and budget-line pickers on the décor form. */
export async function loadDecorOptions() {
  await requireSession();
  const [vendors, items] = await Promise.all([
    prisma.vendor.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.budgetItem.findMany({
      select: { id: true, description: true, category: { select: { name: true, sortOrder: true } } },
    }),
  ]);
  return {
    vendors: vendors.map((v) => ({ value: v.id, label: v.name })),
    budgetItems: items
      .sort((a, b) => a.category.sortOrder - b.category.sortOrder || a.description.localeCompare(b.description))
      .map((i) => ({ value: i.id, label: `${i.category.name} · ${i.description}` })),
  };
}
