import "server-only";
import { requireSession } from "../auth/require-session";
import { fromDbDate, type CalendarDate } from "../dates";
import { prisma } from "../db";
import { bagCount, groupShuttles, sortHotels, type BagCount, type ShuttleDay } from "../domain/travel";
import { VENDOR_CATEGORY_LABEL, type VendorCategory } from "../domain/vendors";
import { loadPlan } from "./plan";

// Loaders for Hotels & Travel. Each one checks the session first.

export type HotelView = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  bookingUrl: string | null;
  groupCode: string | null;
  roomsHeld: number | null;
  nightlyRateCents: number | null;
  cutoffDate: CalendarDate | null;
  checkIn: CalendarDate | null;
  checkOut: CalendarDate | null;
  vendor: { id: string; name: string } | null;
  notes: string | null;
  isDemo: boolean;
};

export type ShuttleView = {
  id: string;
  date: CalendarDate;
  departTime: string;
  fromPlace: string;
  toPlace: string;
  seats: number | null;
  vendor: { id: string; name: string } | null;
  notes: string | null;
  isDemo: boolean;
};

export type BagItemView = {
  id: string;
  name: string;
  perBag: number;
  orderedOn: CalendarDate | null;
  receivedOn: CalendarDate | null;
  notes: string | null;
  isDemo: boolean;
};

export type VendorOption = { value: string; label: string };

const vendorSelect = { select: { id: true, name: true } } as const;

type HotelRow = NonNullable<Awaited<ReturnType<typeof findHotel>>>;

function findHotel(id: string) {
  return prisma.hotelBlock.findUnique({ where: { id }, include: { vendor: vendorSelect } });
}

function toHotel(h: HotelRow): HotelView {
  return {
    id: h.id,
    name: h.name,
    address: h.address,
    phone: h.phone,
    bookingUrl: h.bookingUrl,
    groupCode: h.groupCode,
    roomsHeld: h.roomsHeld,
    nightlyRateCents: h.nightlyRateCents,
    cutoffDate: fromDbDate(h.cutoffDate),
    checkIn: fromDbDate(h.checkIn),
    checkOut: fromDbDate(h.checkOut),
    vendor: h.vendor,
    notes: h.notes,
    isDemo: h.isDemo,
  };
}

/**
 * Every vendor for a picker, the most relevant category first ("Hotel block" vendors for a
 * hotel, transportation for a shuttle), then A to Z, each labeled with its category.
 */
export async function loadVendorOptions(prefer: VendorCategory): Promise<VendorOption[]> {
  await requireSession();
  const vendors = await prisma.vendor.findMany({ select: { id: true, name: true, category: true }, orderBy: { name: "asc" } });
  return vendors
    .sort((a, b) => Number(b.category === prefer) - Number(a.category === prefer))
    .map((v) => ({ value: v.id, label: `${v.name} · ${VENDOR_CATEGORY_LABEL[v.category]}` }));
}

export async function loadTravel(): Promise<{
  today: CalendarDate;
  weddingDate: CalendarDate;
  hotels: HotelView[];
  shuttleDays: Array<ShuttleDay<ShuttleView>>;
  bagItems: BagItemView[];
  bags: BagCount;
  transportVendors: VendorOption[];
}> {
  await requireSession();
  const plan = await loadPlan();
  const [hotels, shuttles, items, guests, transportVendors] = await Promise.all([
    prisma.hotelBlock.findMany({ include: { vendor: vendorSelect } }),
    prisma.shuttleRun.findMany({ include: { vendor: vendorSelect }, orderBy: [{ date: "asc" }, { departTime: "asc" }, { createdAt: "asc" }] }),
    prisma.welcomeBagItem.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.guest.findMany({ select: { householdName: true, rsvpStatus: true } }),
    loadVendorOptions("TRANSPORT"),
  ]);

  return {
    today: plan.today,
    weddingDate: plan.settings.weddingDate,
    hotels: sortHotels(hotels.map(toHotel)),
    shuttleDays: groupShuttles(
      shuttles.map(
        (s): ShuttleView => ({
          id: s.id,
          date: fromDbDate(s.date),
          departTime: s.departTime,
          fromPlace: s.fromPlace,
          toPlace: s.toPlace,
          seats: s.seats,
          vendor: s.vendor,
          notes: s.notes,
          isDemo: s.isDemo,
        }),
      ),
    ),
    bagItems: items.map((i) => ({
      id: i.id,
      name: i.name,
      perBag: i.perBag,
      orderedOn: fromDbDate(i.orderedOn),
      receivedOn: fromDbDate(i.receivedOn),
      notes: i.notes,
      isDemo: i.isDemo,
    })),
    bags: bagCount(guests),
    transportVendors,
  };
}

export async function loadHotel(id: string): Promise<HotelView | null> {
  await requireSession();
  const h = await findHotel(id);
  return h ? toHotel(h) : null;
}
