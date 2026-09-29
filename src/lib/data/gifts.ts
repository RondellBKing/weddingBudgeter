import "server-only";
import { requireSession } from "../auth/require-session";
import { fromDbDate, type CalendarDate } from "../dates";
import { prisma } from "../db";
import { giftTotals, newestFirst, searchKey, thankYousOwed, type GuestChoice } from "../domain/gifts";
import { loadPlan } from "./plan";

// Loaders for the gift log. Each one checks the session first.

export type GiftView = {
  id: string;
  fromName: string;
  guest: { id: string; fullName: string; householdName: string } | null;
  description: string;
  receivedOn: CalendarDate;
  thankYouSentOn: CalendarDate | null;
  notes: string | null;
  isDemo: boolean;
  createdAt: Date;
};

const include = { guest: { select: { id: true, fullName: true, householdName: true } } } as const;

type GiftRow = NonNullable<Awaited<ReturnType<typeof findGift>>>;

function findGift(id: string) {
  return prisma.gift.findUnique({ where: { id }, include });
}

function toView(g: GiftRow): GiftView {
  return {
    id: g.id,
    fromName: g.fromName,
    guest: g.guest,
    description: g.description,
    receivedOn: fromDbDate(g.receivedOn),
    thankYouSentOn: fromDbDate(g.thankYouSentOn),
    notes: g.notes,
    isDemo: g.isDemo,
    createdAt: g.createdAt,
  };
}

/** Every guest, household by household, for the "from" picker. Declined guests send gifts too. */
export async function loadGuestChoices(): Promise<GuestChoice[]> {
  await requireSession();
  const guests = await prisma.guest.findMany({
    select: { id: true, fullName: true, householdName: true },
    orderBy: [{ householdName: "asc" }, { fullName: "asc" }],
  });
  return guests.map((g) => ({ ...g, key: searchKey(`${g.fullName} ${g.householdName}`) }));
}

export async function loadGifts() {
  await requireSession();
  const plan = await loadPlan();
  const [rows, guests] = await Promise.all([
    prisma.gift.findMany({ include, orderBy: [{ receivedOn: "asc" }, { createdAt: "asc" }] }),
    loadGuestChoices(),
  ]);
  const gifts = rows.map(toView);
  const { today, settings } = plan;
  return {
    today,
    weddingDate: settings.weddingDate,
    totals: giftTotals(gifts, settings.weddingDate, today),
    owed: thankYousOwed(gifts, settings.weddingDate, today),
    all: newestFirst(gifts),
    guests,
  };
}

export async function loadGift(id: string): Promise<GiftView | null> {
  await requireSession();
  const g = await findGift(id);
  return g ? toView(g) : null;
}
