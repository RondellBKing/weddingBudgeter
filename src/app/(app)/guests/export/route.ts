import { requireSession } from "@/lib/auth/require-session";
import { csvResponse, toCsv } from "@/lib/csv";
import { todayIn } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { groupHouseholds } from "@/lib/domain/guests";
import { GUEST_SIDE_LABEL, RELATIONSHIP_LABEL, RSVP_LABEL } from "@/lib/labels";

// The whole guest list as a CSV, household by household. The column names read straight back
// into the import, so an edited export can be re-imported without re-mapping anything.

export async function GET() {
  await requireSession();
  const [settings, rows] = await Promise.all([
    prisma.weddingSettings.findUnique({ where: { id: 1 }, select: { timezone: true } }),
    prisma.guest.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      include: {
        seat: { select: { seatNumber: true, table: { select: { label: true } } } },
        plusOneOf: { select: { fullName: true } },
      },
    }),
  ]);

  const ordered = groupHouseholds(rows).flatMap((h) => h.guests);
  const csv = toCsv(ordered, [
    { header: "Name", value: (g) => g.fullName },
    { header: "Household", value: (g) => g.householdName },
    { header: "Side", value: (g) => GUEST_SIDE_LABEL[g.side] },
    { header: "Relationship", value: (g) => RELATIONSHIP_LABEL[g.relationship] },
    { header: "Child", value: (g) => (g.isChild ? "Yes" : "") },
    { header: "Plus-one of", value: (g) => g.plusOneOf?.fullName ?? "" },
    { header: "RSVP", value: (g) => (g.rsvpStatus ? RSVP_LABEL[g.rsvpStatus] : "") },
    { header: "Meal", value: (g) => g.mealChoice },
    { header: "Dietary notes", value: (g) => g.dietaryNotes },
    { header: "Notes", value: (g) => g.notes },
    { header: "Table", value: (g) => (g.seat ? g.seat.table.label : "") },
    { header: "Seat", value: (g) => g.seat?.seatNumber ?? "" },
    { header: "RSVP app ID", value: (g) => g.externalId },
  ]);
  return csvResponse(`wedding-guests-${todayIn(settings?.timezone)}.csv`, csv);
}
