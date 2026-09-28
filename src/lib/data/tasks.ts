import "server-only";
import { requireSession } from "../auth/require-session";
import { fromDbDate } from "../dates";
import { prisma } from "../db";
import { displayNames } from "../domain/party";
import type { TaskRow } from "../domain/tasks";
import { loadPlan } from "./plan";

// Loaders for the task pages. Each one checks the session first.

type Option = { value: string; label: string };

async function partyNames() {
  const members = await prisma.weddingPartyMember.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, role: true },
  });
  const names = displayNames(members);
  return members.map((m) => ({ id: m.id, name: names.get(m.id)!.name }));
}

function toRow(
  t: {
    id: string;
    title: string;
    notes: string | null;
    dueDate: Date | null;
    owner: TaskRow["owner"];
    status: TaskRow["status"];
    priority: TaskRow["priority"];
    area: TaskRow["area"];
    isMilestone: boolean;
    vendorId: string | null;
    partyMemberId: string | null;
    vendor: { name: string } | null;
  },
  partyName: Map<string, string>,
): TaskRow {
  return {
    id: t.id,
    title: t.title,
    notes: t.notes,
    dueDate: fromDbDate(t.dueDate),
    owner: t.owner,
    status: t.status,
    priority: t.priority,
    area: t.area,
    isMilestone: t.isMilestone,
    vendorId: t.vendorId,
    vendorName: t.vendor?.name ?? null,
    partyMemberId: t.partyMemberId,
    partyMemberName: t.partyMemberId ? (partyName.get(t.partyMemberId) ?? null) : null,
  };
}

/** Every task, with vendor and wedding party names resolved. */
export async function loadTasks() {
  await requireSession();
  const plan = await loadPlan();
  const [tasks, party] = await Promise.all([
    prisma.task.findMany({
      orderBy: [{ dueDate: "asc" }, { isMilestone: "desc" }, { title: "asc" }],
      include: { vendor: { select: { name: true } } },
    }),
    partyNames(),
  ]);
  const names = new Map(party.map((p) => [p.id, p.name]));
  return { plan, tasks: tasks.map((t) => toRow(t, names)) };
}

/** Choices for the task form's vendor and wedding party selects. */
export async function loadTaskOptions(): Promise<{ vendors: Option[]; party: Option[] }> {
  await requireSession();
  const [vendors, party] = await Promise.all([
    prisma.vendor.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    partyNames(),
  ]);
  return {
    vendors: vendors.map((v) => ({ value: v.id, label: v.name })),
    party: party.map((p) => ({ value: p.id, label: p.name })),
  };
}

/** One task for the edit page, or null if it doesn't exist (any more). */
export async function loadTask(id: string) {
  await requireSession();
  const [task, party] = await Promise.all([
    prisma.task.findUnique({ where: { id }, include: { vendor: { select: { name: true } } } }),
    partyNames(),
  ]);
  if (!task) return null;
  return {
    ...toRow(task, new Map(party.map((p) => [p.id, p.name]))),
    completedAt: task.completedAt,
    isSeeded: task.seedKey !== null,
  };
}
