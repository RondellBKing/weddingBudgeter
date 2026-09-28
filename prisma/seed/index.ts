// Real seed: `npm run seed`.
//
// Safe to re-run. Every row is keyed by `seedKey` and upserted with an empty update, so running
// it again never duplicates anything and never overwrites something you've edited in the app.
// (It will re-create a seeded row you deleted.)

import "dotenv/config";
import { randomBytes } from "node:crypto";
import { toDbDate } from "../../src/lib/dates";
import { createPrismaClient } from "../../src/lib/db-client";
import {
  ATTIRE_OPTIONS,
  buildChecklist,
  CATEGORIES,
  DECISIONS,
  SETTINGS,
  VENUE,
  VENUE_ITEM,
  VENUE_PAYMENTS,
  VENUE_QUESTIONS,
  WEDDING_PARTY,
} from "./data";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set.");
const db = createPrismaClient(url);

async function main() {
  await db.$transaction(
    async (tx) => {
      await tx.weddingSettings.upsert({
        where: { id: 1 },
        update: {},
        create: {
          id: 1,
          ...SETTINGS,
          weddingDate: toDbDate(SETTINGS.weddingDate),
          dressSizingDeadline: toDbDate(SETTINGS.dressSizingDeadline),
        },
      });

      await tx.authState.upsert({
        where: { id: 1 },
        update: {},
        create: { id: 1, sessionEpoch: 1, icsToken: randomBytes(24).toString("base64url") },
      });

      const categoryIds = new Map<string, string>();
      for (const [i, c] of CATEGORIES.entries()) {
        const row = await tx.budgetCategory.upsert({
          where: { seedKey: c.key },
          update: {},
          create: {
            seedKey: c.key,
            name: c.name,
            estimateCents: c.estimateCents,
            sortOrder: i,
            isContingency: Boolean(c.isContingency),
          },
        });
        categoryIds.set(c.key, row.id);
      }

      const venue = await tx.vendor.upsert({
        where: { seedKey: VENUE.key },
        update: {},
        create: {
          seedKey: VENUE.key,
          name: VENUE.name,
          category: VENUE.category,
          status: VENUE.status,
          contractSignedOn: toDbDate(VENUE.contractSignedOn),
          notes: VENUE.notes,
        },
      });

      const venueItem = await tx.budgetItem.upsert({
        where: { seedKey: VENUE_ITEM.key },
        update: {},
        create: {
          seedKey: VENUE_ITEM.key,
          categoryId: categoryIds.get("venue")!,
          vendorId: venue.id,
          description: VENUE_ITEM.description,
          estimateCents: VENUE_ITEM.estimateCents,
          contractedCents: VENUE_ITEM.contractedCents,
        },
      });

      for (const p of VENUE_PAYMENTS) {
        await tx.payment.upsert({
          where: { seedKey: p.key },
          update: {},
          create: {
            seedKey: p.key,
            budgetItemId: venueItem.id,
            sequence: p.sequence,
            kind: p.kind,
            amountCents: p.amountCents,
            amountRule: p.amountRule ?? null,
            isEstimate: Boolean(p.isEstimate),
            dueDate: toDbDate(p.dueDate),
            paidDate: p.paidDate ? toDbDate(p.paidDate) : null,
            notes: p.notes,
          },
        });
      }

      for (const [i, text] of VENUE_QUESTIONS.entries()) {
        await tx.vendorQuestion.upsert({
          where: { seedKey: `venue-question-${i + 1}` },
          update: {},
          create: { seedKey: `venue-question-${i + 1}`, vendorId: venue.id, text, sortOrder: i },
        });
      }

      for (const [i, m] of WEDDING_PARTY.entries()) {
        await tx.weddingPartyMember.upsert({
          where: { seedKey: m.key },
          update: {},
          create: { seedKey: m.key, side: m.side, role: m.role, outfitType: m.outfitType, sortOrder: i },
        });
      }

      for (const [i, o] of ATTIRE_OPTIONS.entries()) {
        await tx.attireOption.upsert({
          where: { seedKey: o.key },
          update: {},
          create: { seedKey: o.key, menu: o.menu, name: o.name, description: o.description, color: o.color, sortOrder: i },
        });
      }

      for (const d of DECISIONS) {
        await tx.decision.upsert({
          where: { seedKey: d.key },
          update: {},
          create: {
            seedKey: d.key,
            decidedOn: toDbDate(d.decidedOn),
            title: d.title,
            decision: d.decision,
            rationale: d.rationale ?? null,
            decidedBy: "BOTH",
            vendorId: d.linkVenue ? venue.id : null,
          },
        });
      }

      for (const t of buildChecklist()) {
        await tx.task.upsert({
          where: { seedKey: t.key },
          update: {},
          create: {
            seedKey: t.key,
            title: t.title,
            notes: t.notes ?? null,
            dueDate: toDbDate(t.dueDate),
            owner: t.owner ?? "BOTH",
            priority: t.priority ?? "MEDIUM",
            area: t.area,
            isMilestone: Boolean(t.isMilestone),
            vendorId: t.linkVenue ? venue.id : null,
            status: t.doneOn ? "DONE" : "NOT_STARTED",
            // Midday in New York, so it reads as that day in every view.
            completedAt: t.doneOn ? new Date(`${t.doneOn}T16:00:00Z`) : null,
          },
        });
      }
    },
    { timeout: 60_000 },
  );

  const [categories, payments, tasks, party, options] = await Promise.all([
    db.budgetCategory.count(),
    db.payment.count(),
    db.task.count(),
    db.weddingPartyMember.count(),
    db.attireOption.count(),
  ]);
  console.log(
    `Seeded: ${categories} budget categories, ${payments} payments, ${tasks} tasks, ` +
      `${party} wedding party members, ${options} attire options.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
