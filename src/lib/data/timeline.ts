import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { requireSession } from "../auth/require-session";
import { fromDbDate } from "../dates";
import { prisma } from "../db";
import { displayNames, ROLE_LABEL, SIDE_LABEL } from "../domain/party";
import type { ArrivalVendor, TimelineEntry } from "../domain/timeline";
import { sortVendors, statusGroup, VENDOR_CATEGORY_LABEL } from "../domain/vendors";
import { loadPlan } from "./plan";

// Loaders for the run of show, the rain plan and the day-of binder. Vendor arrivals and the venue
// opening are not stored as items: the pages derive them from vendors and settings.

const itemInclude = { vendor: { select: { id: true, name: true } } } satisfies Prisma.TimelineItemInclude;
type ItemWithVendor = Prisma.TimelineItemGetPayload<{ include: typeof itemInclude }>;

function toEntry(i: ItemWithVendor): TimelineEntry {
  return {
    id: i.id,
    date: fromDbDate(i.date),
    startTime: i.startTime,
    endTime: i.endTime,
    title: i.title,
    location: i.location,
    lead: i.lead,
    involves: i.involves,
    notes: i.notes,
    vendor: i.vendor,
    isDemo: i.isDemo,
  };
}

async function allItems(): Promise<TimelineEntry[]> {
  const rows = await prisma.timelineItem.findMany({
    include: itemInclude,
    orderBy: [{ date: "asc" }, { startTime: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toEntry);
}

async function rainPlan(): Promise<string | null> {
  const s = await prisma.weddingSettings.findUnique({ where: { id: 1 }, select: { rainPlan: true } });
  return s?.rainPlan ?? null;
}

/** Booked vendors, for derived arrivals and the contact sheet. */
async function bookedVendors() {
  const rows = await prisma.vendor.findMany({
    where: { status: "BOOKED" },
    select: {
      id: true,
      name: true,
      category: true,
      alsoCovers: true,
      status: true,
      contactName: true,
      phone: true,
      email: true,
      arrivalTime: true,
      mealsRequired: true,
      isDemo: true,
    },
  });
  return sortVendors(rows);
}

export async function loadTimeline() {
  await requireSession();
  const plan = await loadPlan();
  const [items, vendors, rain] = await Promise.all([allItems(), bookedVendors(), rainPlan()]);
  return { plan, items, arrivals: vendors.map(toArrival), rainPlan: rain };
}

function toArrival(v: BinderVendor): ArrivalVendor {
  return { id: v.id, name: v.name, category: v.category, status: v.status, arrivalTime: v.arrivalTime };
}

export async function loadTimelineItem(id: string): Promise<TimelineEntry | null> {
  await requireSession();
  const row = await prisma.timelineItem.findUnique({ where: { id }, include: itemInclude });
  return row ? toEntry(row) : null;
}

/** Vendors for the item form: everyone still in play, booked first, plus the linked one. */
export async function loadTimelineVendorOptions(currentVendorId: string | null = null) {
  await requireSession();
  const rows = await prisma.vendor.findMany({ select: { id: true, name: true, category: true, status: true } });
  return sortVendors(rows.filter((v) => statusGroup(v.status) !== "closed" || v.id === currentVendorId)).map((v) => ({
    value: v.id,
    label: `${v.name} · ${VENDOR_CATEGORY_LABEL[v.category]}${v.status === "BOOKED" ? "" : " (not booked)"}`,
  }));
}

export type BinderVendor = Awaited<ReturnType<typeof bookedVendors>>[number];

/** Everything the printable day-of binder shows. */
export async function loadBinder() {
  await requireSession();
  const plan = await loadPlan();
  const [items, vendors, rain, members] = await Promise.all([
    allItems(),
    bookedVendors(),
    rainPlan(),
    prisma.weddingPartyMember.findMany({
      select: { id: true, name: true, role: true, side: true, phone: true, email: true, sortOrder: true },
      orderBy: [{ side: "asc" }, { sortOrder: "asc" }],
    }),
  ]);
  const names = displayNames(members);
  const party = members.map((m) => ({
    id: m.id,
    name: names.get(m.id)!.name,
    isPlaceholder: names.get(m.id)!.isPlaceholder,
    role: ROLE_LABEL[m.role],
    side: SIDE_LABEL[m.side],
    phone: m.phone,
    email: m.email,
  }));
  return { plan, items, vendors, arrivals: vendors.map(toArrival), rainPlan: rain, party };
}
