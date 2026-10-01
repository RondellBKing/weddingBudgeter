import "server-only";
import { cache } from "react";
import { requireSession } from "../auth/require-session";
import { compareDates, fromDbDate, todayIn, type CalendarDate } from "../dates";
import { prisma } from "../db";
import { vendorMoney } from "../domain/vendor-money";
import { vendorFormValues } from "../domain/vendor-form";
import { missingQuestions } from "../domain/vendor-questions";
import { sortVendors, type VendorCategory } from "../domain/vendors";
import { loadPlan, type Plan } from "./plan";

// Loaders for the vendor pages. Every amount comes from the plan (budget items and payments),
// never from a stored total. Each loader checks the session first.

function moneyFor(plan: Plan, vendorId: string) {
  return vendorMoney(vendorId, {
    items: plan.items,
    totals: plan.budget.itemTotals,
    ctx: { headcountOverageCents: plan.headroom.overageCents },
    today: plan.today,
  });
}

export async function loadVendorList() {
  await requireSession();
  const plan = await loadPlan();
  const rows = await prisma.vendor.findMany({
    include: { _count: { select: { questions: { where: { answer: null } } } } },
  });
  const vendors = sortVendors(
    rows.map((v) => ({
      id: v.id,
      name: v.name,
      category: v.category,
      alsoCovers: v.alsoCovers,
      status: v.status,
      contactName: v.contactName,
      quotedCents: v.quotedCents,
      isDemo: v.isDemo,
      openQuestions: v._count.questions,
      money: moneyFor(plan, v.id),
    })),
  );
  return { plan, vendors };
}

export type VendorListItem = Awaited<ReturnType<typeof loadVendorList>>["vendors"][number];

/** One vendor with everything its page shows. Cached per request (metadata and page share it). */
export const loadVendor = cache(async (id: string) => {
  await requireSession();
  const plan = await loadPlan();
  const v = await prisma.vendor.findUnique({
    where: { id },
    include: {
      questions: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      log: { orderBy: [{ at: "desc" }, { createdAt: "desc" }] },
      tasks: { orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { title: "asc" }] },
      events: true,
      packageItems: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!v) return null;

  const tz = plan.settings.timezone;
  const categoryName = new Map(plan.budget.categories.map((c) => [c.id, c.name]));

  const events = v.events
    .map((e) => ({
      id: e.id,
      title: e.title,
      type: e.type,
      location: e.location,
      allDayDate: fromDbDate(e.allDayDate),
      startAt: e.startAt,
      endAt: e.endAt,
      /** The day it happens on the wedding's calendar. */
      date: (e.allDayDate ? fromDbDate(e.allDayDate) : todayIn(tz, e.startAt!)) as CalendarDate,
    }))
    .sort((a, b) => compareDates(a.date, b.date) || (a.startAt?.getTime() ?? 0) - (b.startAt?.getTime() ?? 0));

  return {
    plan,
    vendor: {
      id: v.id,
      name: v.name,
      category: v.category,
      alsoCovers: v.alsoCovers,
      status: v.status,
      contactName: v.contactName,
      email: v.email,
      phone: v.phone,
      website: v.website,
      instagram: v.instagram,
      quotedCents: v.quotedCents,
      contractSignedOn: fromDbDate(v.contractSignedOn),
      contractUrl: v.contractUrl,
      arrivalTime: v.arrivalTime,
      mealsRequired: v.mealsRequired,
      notes: v.notes,
      isDemo: v.isDemo,
    },
    money: moneyFor(plan, v.id),
    categoryName,
    questions: v.questions.map((q) => ({
      id: q.id,
      text: q.text,
      topic: q.topic,
      answer: q.answer,
      answeredOn: fromDbDate(q.answeredOn),
    })),
    log: v.log.map((n) => ({ id: n.id, at: n.at, author: n.author, body: n.body })),
    tasks: v.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      dueDate: fromDbDate(t.dueDate),
      status: t.status,
      isMilestone: t.isMilestone,
    })),
    events,
    packageLines: v.packageItems.map((p) => ({
      id: p.id,
      section: p.section,
      name: p.name,
      status: p.status,
      notes: p.notes,
      sortOrder: p.sortOrder,
    })),
  };
});

/**
 * The interview guide's page: the wedding facts for its header, how many vendors of each kind we
 * have, and, for one kind, each vendor with how far its interview has got.
 */
export async function loadInterviewGuide(category: VendorCategory | null) {
  await requireSession();
  const plan = await loadPlan();
  const [counts, rows] = await Promise.all([
    prisma.vendor.groupBy({ by: ["category"], _count: { _all: true } }),
    category
      ? prisma.vendor.findMany({
          where: { category },
          select: { id: true, name: true, category: true, status: true, questions: { select: { text: true, answer: true } } },
        })
      : Promise.resolve([]),
  ]);
  const vendorCount = new Map<VendorCategory, number>(counts.map((c) => [c.category, c._count._all]));
  const vendors = sortVendors(rows).map((v) => ({
    id: v.id,
    name: v.name,
    status: v.status,
    asked: v.questions.length,
    answered: v.questions.filter((q) => q.answer !== null).length,
    missing: missingQuestions(v.category, v.questions).length,
  }));
  return { settings: plan.settings, today: plan.today, vendorCount, vendors };
}

export type VendorDetail = NonNullable<Awaited<ReturnType<typeof loadVendor>>>;

export async function loadVendorForEdit(id: string) {
  await requireSession();
  const plan = await loadPlan();
  const v = await prisma.vendor.findUnique({ where: { id } });
  if (!v) return null;
  return {
    id: v.id,
    name: v.name,
    values: vendorFormValues(v),
    venueAccessTime: plan.settings.venueAccessTime,
    linkedItemCount: plan.items.filter((i) => i.vendorId === v.id).length,
  };
}

export async function loadNewVendorDefaults() {
  await requireSession();
  const plan = await loadPlan();
  return { venueAccessTime: plan.settings.venueAccessTime };
}
