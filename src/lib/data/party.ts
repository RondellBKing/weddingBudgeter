import "server-only";
import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { requireSession } from "../auth/require-session";
import { fromDbDate, type CalendarDate } from "../dates";
import { prisma } from "../db";
import {
  attireStatus,
  displayNames,
  dressMenu,
  styleMenuFor,
  type AttireStatus,
  type DressMenu,
  type OptionMenu,
  type OutfitType,
  type PartyRole,
  type PartySide,
  type ShoeStatus,
} from "../domain/party";
import { parseSizes, type Sizes } from "../domain/party-sizes";
import { loadPlan } from "./plan";

// Loaders for the wedding party pages. Each one checks the session first.

export type DutyView = {
  id: string;
  title: string;
  dueDate: CalendarDate | null;
  done: boolean;
  completedAt: Date | null;
};

export type MemberView = {
  id: string;
  /** Display name ("Bridesmaid 2" until a name is filled in). */
  name: string;
  isPlaceholder: boolean;
  /** What's actually saved, for the edit form. */
  savedName: string | null;
  role: PartyRole;
  side: PartySide;
  outfitType: OutfitType;
  sortOrder: number;
  menu: DressMenu | null;
  styleMenu: "A" | "B" | null;
  email: string | null;
  phone: string | null;
  askedOn: CalendarDate | null;
  acceptedOn: CalendarDate | null;
  chosenStyleId: string | null;
  styleName: string | null;
  sizingSubmittedOn: CalendarDate | null;
  orderedOn: CalendarDate | null;
  arrivedOn: CalendarDate | null;
  alteredOn: CalendarDate | null;
  readyOn: CalendarDate | null;
  sizes: Sizes;
  attirePaid: boolean;
  shoeOptionId: string | null;
  shoeName: string | null;
  shoeOwnedDescription: string | null;
  shoeStatus: ShoeStatus;
  hairPlan: string | null;
  accessoriesConfirmed: boolean;
  giftIdea: string | null;
  giftPurchased: boolean;
  lodgingBooked: boolean;
  notes: string | null;
  status: AttireStatus;
  duties: DutyView[];
};

export type OptionView = { id: string; menu: OptionMenu; name: string; description: string; color: string };

const memberInclude = {
  chosenStyle: { select: { name: true } },
  shoeOption: { select: { name: true } },
  duties: { orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }] },
} satisfies Prisma.WeddingPartyMemberInclude;

async function fetchMembers() {
  return prisma.weddingPartyMember.findMany({ orderBy: { sortOrder: "asc" }, include: memberInclude });
}

type MemberRow = Awaited<ReturnType<typeof fetchMembers>>[number];

function toView(m: MemberRow, names: ReturnType<typeof displayNames>): MemberView {
  return {
    id: m.id,
    ...names.get(m.id)!,
    savedName: m.name,
    role: m.role,
    side: m.side,
    outfitType: m.outfitType,
    sortOrder: m.sortOrder,
    menu: dressMenu(m.role, m.outfitType),
    styleMenu: styleMenuFor(m.role, m.outfitType),
    email: m.email,
    phone: m.phone,
    askedOn: fromDbDate(m.askedOn),
    acceptedOn: fromDbDate(m.acceptedOn),
    chosenStyleId: m.chosenStyleId,
    styleName: m.chosenStyle?.name ?? null,
    sizingSubmittedOn: fromDbDate(m.sizingSubmittedOn),
    orderedOn: fromDbDate(m.orderedOn),
    arrivedOn: fromDbDate(m.arrivedOn),
    alteredOn: fromDbDate(m.alteredOn),
    readyOn: fromDbDate(m.readyOn),
    sizes: parseSizes(m.sizes),
    attirePaid: m.attirePaid,
    shoeOptionId: m.shoeOptionId,
    shoeName: m.shoeOption?.name ?? null,
    shoeOwnedDescription: m.shoeOwnedDescription,
    shoeStatus: m.shoeStatus,
    hairPlan: m.hairPlan,
    accessoriesConfirmed: m.accessoriesConfirmed,
    giftIdea: m.giftIdea,
    giftPurchased: m.giftPurchased,
    lodgingBooked: m.lodgingBooked,
    notes: m.notes,
    status: attireStatus(m),
    duties: m.duties.map((t) => ({
      id: t.id,
      title: t.title,
      dueDate: fromDbDate(t.dueDate),
      done: t.status === "DONE",
      completedAt: t.completedAt,
    })),
  };
}

async function loadOptions(): Promise<OptionView[]> {
  const options = await prisma.attireOption.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  return options.map((o) => ({ id: o.id, menu: o.menu, name: o.name, description: o.description, color: o.color }));
}

/** Everything /party shows: the roster with derived statuses, their duties, and the menus. */
export async function loadPartyOverview() {
  await requireSession();
  const plan = await loadPlan();
  const [rows, options] = await Promise.all([fetchMembers(), loadOptions()]);
  const names = displayNames(rows);
  return { plan, members: rows.map((m) => toView(m, names)), options };
}

/** One person, or null if the id doesn't exist. Cached per request (the page and its metadata share it). */
export const loadPartyMember = cache(async (id: string) => {
  await requireSession();
  const plan = await loadPlan();
  const [rows, options] = await Promise.all([fetchMembers(), loadOptions()]);
  const index = rows.findIndex((m) => m.id === id);
  if (index < 0) return null;
  // Placeholder numbering ("Bridesmaid 3") depends on the whole roster.
  const names = displayNames(rows);
  const neighbor = (i: number) => (rows[i] ? { id: rows[i].id, name: names.get(rows[i].id)!.name } : null);
  return {
    plan,
    member: toView(rows[index], names),
    options,
    /** The people before and after in roster order, for stepping through everyone. */
    prev: neighbor(index - 1),
    next: neighbor(index + 1),
  };
});
