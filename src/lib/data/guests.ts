import "server-only";
import { z } from "zod";
import { requireSession } from "../auth/require-session";
import { prisma } from "../db";
import { IMPORT_FIELDS, type ExistingGuest, type SavedMapping } from "../domain/guest-import";
import {
  coupleOnList,
  partyOnList,
  partyRoles,
  type BudgetBasis,
  type GuestListItem,
  type PartyMemberRef,
} from "../domain/guests";
import { displayNames, ROLE_LABEL } from "../domain/party";
import { loadPlan, type Plan } from "./plan";

// Loaders for the guest pages and the import. Each one checks the session first.

/** The inputs to the headcount → overage → contingency pipeline, from the loaded plan. */
export function budgetBasis(plan: Plan): BudgetBasis {
  return {
    rule: plan.rule,
    totalBudgetCents: plan.settings.totalBudgetCents,
    headcountTarget: plan.settings.headcountTarget,
    vendorMeals: plan.headcount.vendorMeals,
    categories: plan.budget.categories.map((c) => ({
      id: c.id,
      name: c.name,
      estimateCents: c.estimateCents,
      sortOrder: c.sortOrder,
      isContingency: c.isContingency,
      isClosed: c.isClosed,
    })),
    items: plan.items,
  };
}

/** When the headcount overage payment is due, for the headcount card. */
export function overageDueDate(plan: Plan) {
  return plan.items.flatMap((i) => i.payments).find((p) => p.amountRule === "HEADCOUNT_OVERAGE")?.dueDate ?? null;
}

async function loadPartyRefs(): Promise<PartyMemberRef[]> {
  const members = await prisma.weddingPartyMember.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, role: true, guestId: true },
  });
  const names = displayNames(members);
  return members.map((m) => ({
    id: m.id,
    name: m.name,
    roleLabel: ROLE_LABEL[m.role],
    displayName: names.get(m.id)?.name ?? ROLE_LABEL[m.role],
    guestId: m.guestId,
  }));
}

export async function loadGuestList() {
  await requireSession();
  const plan = await loadPlan();
  const [rows, party, meals] = await Promise.all([
    prisma.guest.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      include: {
        seat: { select: { seatNumber: true, table: { select: { label: true } } } },
        plusOneOf: { select: { id: true, fullName: true } },
      },
    }),
    loadPartyRefs(),
    prisma.vendor.aggregate({ where: { status: "BOOKED" }, _sum: { mealsRequired: true } }),
  ]);

  const roles = partyRoles(
    party,
    rows.map((g) => ({ id: g.id, fullName: g.fullName, relationship: g.relationship })),
  );

  const guests: GuestListItem[] = rows.map((g) => ({
    id: g.id,
    fullName: g.fullName,
    householdName: g.householdName,
    side: g.side,
    relationship: g.relationship,
    isChild: g.isChild,
    plusOneOf: g.plusOneOf,
    rsvpStatus: g.rsvpStatus,
    mealChoice: g.mealChoice,
    dietaryNotes: g.dietaryNotes,
    notes: g.notes,
    externalId: g.externalId,
    isDemo: g.isDemo,
    seat: g.seat ? { tableLabel: g.seat.table.label, seatNumber: g.seat.seatNumber } : null,
    partyRole: roles.get(g.id) ?? null,
  }));

  const named = rows.map((g) => ({ id: g.id, fullName: g.fullName, relationship: g.relationship }));
  return {
    plan,
    guests,
    couple: coupleOnList([plan.settings.partnerOneName, plan.settings.partnerTwoName], named),
    party: partyOnList(party, named),
    /** Meals booked vendors need, whether or not the setting counts them. */
    vendorMeals: meals._sum.mealsRequired ?? 0,
    overageDue: overageDueDate(plan),
  };
}

export type GuestDetail = NonNullable<Awaited<ReturnType<typeof loadGuest>>>;

export async function loadGuest(id: string) {
  await requireSession();
  const g = await prisma.guest.findUnique({
    where: { id },
    include: {
      seat: { select: { seatNumber: true, table: { select: { label: true } } } },
      plusOnes: { select: { id: true, fullName: true } },
      partyMember: { select: { role: true } },
    },
  });
  if (!g) return null;
  return {
    id: g.id,
    fullName: g.fullName,
    householdName: g.householdName,
    side: g.side,
    relationship: g.relationship,
    isChild: g.isChild,
    plusOneOfId: g.plusOneOfId,
    plusOnes: g.plusOnes,
    rsvpStatus: g.rsvpStatus,
    mealChoice: g.mealChoice,
    dietaryNotes: g.dietaryNotes,
    notes: g.notes,
    externalId: g.externalId,
    lastImportedAt: g.lastImportedAt,
    isDemo: g.isDemo,
    seat: g.seat ? { tableLabel: g.seat.table.label, seatNumber: g.seat.seatNumber } : null,
    partyRole: g.partyMember ? ROLE_LABEL[g.partyMember.role] : null,
  };
}

/** Choices for the guest form: who they could be a plus-one of, and existing household names. */
export async function loadGuestFormOptions(excludeId?: string) {
  await requireSession();
  const guests = await prisma.guest.findMany({
    where: excludeId ? { id: { not: excludeId } } : undefined,
    select: { id: true, fullName: true, householdName: true },
    orderBy: [{ householdName: "asc" }, { fullName: "asc" }],
  });
  return {
    plusOneChoices: guests.map((g) => ({ value: g.id, label: `${g.fullName} · ${g.householdName}` })),
    households: [...new Set(guests.map((g) => g.householdName))].sort((a, b) => a.localeCompare(b)),
  };
}

const sideEnum = z.enum(["BRIDE_SIDE", "GROOM_SIDE", "BOTH"]);
const savedMappingSchema = z.object({
  columns: z.partialRecord(z.enum(IMPORT_FIELDS), z.string()),
  sideValues: z.record(z.string(), sideEnum).default({}),
  headers: z.array(z.string()).default([]),
});

/** The column mapping from the last import, if it still reads cleanly. */
export async function loadLastImport(): Promise<{ at: Date; fileName: string | null; mapping: SavedMapping | null } | null> {
  await requireSession();
  const last = await prisma.guestImport.findFirst({ orderBy: { at: "desc" } });
  if (!last) return null;
  const parsed = savedMappingSchema.safeParse(last.mapping);
  return { at: last.at, fileName: last.fileName, mapping: parsed.success ? parsed.data : null };
}

/** Everything the import compares against, read fresh for each preview and commit. */
export async function loadImportBasis() {
  await requireSession();
  const plan = await loadPlan();
  const [guests, party] = await Promise.all([
    prisma.guest.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        fullName: true,
        householdName: true,
        side: true,
        relationship: true,
        rsvpStatus: true,
        mealChoice: true,
        dietaryNotes: true,
        externalId: true,
        lastImportedAt: true,
        isDemo: true,
      },
    }),
    loadPartyRefs(),
  ]);
  const existing: ExistingGuest[] = guests;
  return {
    plan,
    existing,
    party,
    partners: [plan.settings.partnerOneName, plan.settings.partnerTwoName],
    basis: budgetBasis(plan),
  };
}
