import "server-only";
import { requireSession } from "../auth/require-session";
import { fromDbDate, todayIn, type CalendarDate } from "../dates";
import { prisma } from "../db";
import { buildAgenda, type AgendaItem } from "../domain/agenda";
import { resolvePaymentAmount } from "../domain/budget";
import { attireStatus, displayNames, dressMenu, type AttireStatus, type DressMenu, type PartyRole } from "../domain/party";
import { loadPlan } from "./plan";

// Read-only loaders for the preview pages. Each one checks the session first.

export async function loadVendorsPage() {
  await requireSession();
  const plan = await loadPlan();
  const vendors = await prisma.vendor.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: { questions: { orderBy: { sortOrder: "asc" } } },
  });
  return {
    plan,
    vendors: vendors.map((v) => {
      const items = plan.items.filter((i) => i.vendorId === v.id);
      const totals = items.map((i) => plan.budget.itemTotals.get(i.id)!);
      const nextDue = plan.nextPayments.find((p) => p.item.vendorId === v.id) ?? null;
      return {
        id: v.id,
        name: v.name,
        category: v.category,
        alsoCovers: v.alsoCovers,
        status: v.status,
        contractSignedOn: fromDbDate(v.contractSignedOn),
        arrivalTime: v.arrivalTime,
        mealsRequired: v.mealsRequired,
        quotedCents: v.quotedCents,
        notes: v.notes,
        isDemo: v.isDemo,
        committed: totals.reduce((s, t) => s + t.committed, 0),
        paid: totals.reduce((s, t) => s + t.paid, 0),
        paymentCount: items.reduce((s, i) => s + i.payments.length, 0),
        paidCount: items.reduce((s, i) => s + i.payments.filter((p) => p.paidDate).length, 0),
        nextDue,
        questions: v.questions.map((q) => ({ id: q.id, text: q.text, answer: q.answer, answeredOn: fromDbDate(q.answeredOn) })),
      };
    }),
  };
}

export type PartyMemberView = {
  id: string;
  name: string;
  isPlaceholder: boolean;
  role: PartyRole;
  side: "BRIDE_SIDE" | "GROOM_SIDE";
  outfitType: "DRESS" | "SUIT";
  menu: DressMenu | null;
  styleName: string | null;
  status: AttireStatus;
  sizingSent: boolean;
};

export async function loadPartyPage() {
  await requireSession();
  const plan = await loadPlan();
  const [members, options] = await Promise.all([
    prisma.weddingPartyMember.findMany({ orderBy: { sortOrder: "asc" }, include: { chosenStyle: true } }),
    prisma.attireOption.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  const names = displayNames(members);
  const view: PartyMemberView[] = members.map((m) => ({
    id: m.id,
    ...names.get(m.id)!,
    role: m.role,
    side: m.side,
    outfitType: m.outfitType,
    menu: dressMenu(m.role, m.outfitType),
    styleName: m.chosenStyle?.name ?? null,
    status: attireStatus(m),
    sizingSent: Boolean(m.sizingSubmittedOn),
  }));
  return { plan, members: view, options };
}

export async function loadTasksPage() {
  await requireSession();
  const plan = await loadPlan();
  const tasks = await prisma.task.findMany({
    orderBy: [{ dueDate: "asc" }, { isMilestone: "desc" }, { title: "asc" }],
    include: { vendor: { select: { name: true } } },
  });
  return {
    plan,
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      notes: t.notes,
      dueDate: fromDbDate(t.dueDate),
      done: t.status === "DONE",
      status: t.status,
      priority: t.priority,
      isMilestone: t.isMilestone,
      owner: t.owner,
      vendorName: t.vendor?.name ?? null,
    })),
  };
}

export async function loadCalendarPage(): Promise<{ today: CalendarDate; items: AgendaItem[]; weddingDate: CalendarDate }> {
  await requireSession();
  const plan = await loadPlan();
  const { settings, today } = plan;
  const [tasks, events] = await Promise.all([
    prisma.task.findMany({ where: { status: { not: "DONE" }, dueDate: { not: null } } }),
    prisma.calendarEvent.findMany(),
  ]);
  const items = buildAgenda(
    {
      payments: plan.items.flatMap((item) =>
        item.payments.map((p) => ({
          id: p.id,
          dueDate: p.dueDate,
          paidDate: p.paidDate,
          title: item.vendorName ?? item.description,
          detail:
            p.kind === "OVERAGE"
              ? "Headcount overage (estimate)"
              : p.kind === "SERVICE_CHARGE"
                ? "Maître d' service charge"
                : p.sequence
                  ? `Payment ${p.sequence} of ${item.payments.length}`
                  : "Payment",
          amountCents: resolvePaymentAmount(p, { headcountOverageCents: plan.headroom.overageCents }),
        })),
      ),
      tasks: tasks.map((t) => ({
        id: t.id,
        dueDate: fromDbDate(t.dueDate),
        title: t.title,
        isMilestone: t.isMilestone,
        done: false,
      })),
      events: events.map((e) => ({
        id: e.id,
        date: e.allDayDate ? fromDbDate(e.allDayDate) : todayIn(settings.timezone, e.startAt!),
        title: e.title,
        detail: e.location ?? undefined,
      })),
    },
    today,
  );
  return { today, items, weddingDate: settings.weddingDate };
}
