"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth/require-session";
import { toDbDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { safeReturnPath } from "@/lib/domain/tasks";
import { fieldErrors, formObject, zCheckbox, zDate, zOptionalId, zOptionalText, zText, type ActionState } from "@/lib/forms";
import { OWNER_LABEL, PRIORITY_LABEL, TASK_AREA_LABEL, TASK_STATUS_LABEL, valuesOf } from "@/lib/labels";

// Task mutations. Every one checks the session first. The database enforces that completedAt
// is set exactly when a task is DONE, so every status change sets or clears it too.

export type TaskFormState = ActionState & { values?: Record<string, string> };

const pick = (what: string) => ({ error: `Pick ${what}` });
const zOwner = z.enum(valuesOf(OWNER_LABEL), pick("who owns it"));
const zStatus = z.enum(valuesOf(TASK_STATUS_LABEL), pick("a status"));
const zId = z.string().min(1).max(64);

/** Tasks show up on the dashboard, the task pages and the calendar. */
function refresh() {
  revalidatePath("/", "layout");
}

const safeBack = (back: unknown) => safeReturnPath(back, "/tasks");

const quickSchema = z.object({ title: zText(200), dueDate: zDate, owner: zOwner });

/** The one-line "add a task" form at the top of the list. */
export async function quickAddTask(_prev: TaskFormState, form: FormData): Promise<TaskFormState> {
  await requireSession();
  const raw = formObject(form);
  const parsed = quickSchema.safeParse(raw);
  if (!parsed.success) return { ...fieldErrors(parsed.error), values: raw };
  const v = parsed.data;
  await prisma.task.create({ data: { title: v.title, dueDate: toDbDate(v.dueDate), owner: v.owner, status: "NOT_STARTED" } });
  refresh();
  return { ok: true, message: `Added “${v.title}”.` };
}

const taskSchema = z.object({
  title: zText(200),
  notes: zOptionalText(4000),
  dueDate: zDate,
  owner: zOwner,
  status: zStatus,
  priority: z.enum(valuesOf(PRIORITY_LABEL), pick("a priority")),
  area: z.enum(valuesOf(TASK_AREA_LABEL), pick("an area")),
  vendorId: zOptionalId,
  partyMemberId: zOptionalId,
  isMilestone: zCheckbox,
});

/** Create (id null) or update a task from the full form, then go back to where we came from. */
export async function saveTask(id: string | null, back: string, _prev: TaskFormState, form: FormData): Promise<TaskFormState> {
  await requireSession();
  const raw = formObject(form);
  const parsed = taskSchema.safeParse(raw);
  if (!parsed.success) return { ...fieldErrors(parsed.error), values: raw };
  const v = parsed.data;

  const [existing, vendor, member] = await Promise.all([
    id ? prisma.task.findUnique({ where: { id }, select: { status: true, completedAt: true } }) : null,
    v.vendorId ? prisma.vendor.findUnique({ where: { id: v.vendorId }, select: { id: true } }) : null,
    v.partyMemberId ? prisma.weddingPartyMember.findUnique({ where: { id: v.partyMemberId }, select: { id: true } }) : null,
  ]);
  if (id && !existing) return { ok: false, message: "This task has been deleted.", values: raw };
  const errors: Record<string, string> = {};
  if (v.vendorId && !vendor) errors.vendorId = "That vendor no longer exists. Pick another.";
  if (v.partyMemberId && !member) errors.partyMemberId = "That person is no longer in the wedding party.";
  if (Object.keys(errors).length > 0) return { ok: false, message: "Check the highlighted fields.", errors, values: raw };

  const data = {
    title: v.title,
    notes: v.notes,
    dueDate: toDbDate(v.dueDate),
    owner: v.owner,
    status: v.status,
    priority: v.priority,
    area: v.area,
    vendorId: v.vendorId,
    partyMemberId: v.partyMemberId,
    isMilestone: v.isMilestone,
    // Keep the original completion time when a done task is edited.
    completedAt: v.status === "DONE" ? (existing?.status === "DONE" ? existing.completedAt : new Date()) : null,
  };
  if (id) await prisma.task.update({ where: { id }, data });
  else await prisma.task.create({ data });
  refresh();
  redirect(safeBack(back));
}

/** The round checkbox: tick a task done, or untick it back to "Not started". */
export async function setTaskDone(id: string, done: boolean): Promise<void> {
  await requireSession();
  const taskId = zId.parse(id);
  if (z.boolean().parse(done)) {
    await prisma.task.updateMany({ where: { id: taskId, status: { not: "DONE" } }, data: { status: "DONE", completedAt: new Date() } });
  } else {
    await prisma.task.updateMany({ where: { id: taskId, status: "DONE" }, data: { status: "NOT_STARTED", completedAt: null } });
  }
  refresh();
}

/** Move a card on the board. */
export async function setTaskStatus(id: string, form: FormData): Promise<void> {
  await requireSession();
  const taskId = zId.parse(id);
  const status = zStatus.safeParse(form.get("status"));
  if (!status.success) return;
  if (status.data === "DONE") {
    await prisma.task.updateMany({ where: { id: taskId, status: { not: "DONE" } }, data: { status: "DONE", completedAt: new Date() } });
  } else {
    await prisma.task.updateMany({ where: { id: taskId }, data: { status: status.data, completedAt: null } });
  }
  refresh();
}

/** Bulk "Mark done" for the selected tasks. */
export async function completeTasks(form: FormData): Promise<void> {
  await requireSession();
  const ids = z.array(zId).max(500).parse(form.getAll("ids"));
  if (ids.length === 0) return;
  await prisma.task.updateMany({
    where: { id: { in: ids }, status: { not: "DONE" } },
    data: { status: "DONE", completedAt: new Date() },
  });
  refresh();
}

/** Delete a task (seeded ones too), after the two-step confirm. */
export async function deleteTask(id: string, back: string): Promise<void> {
  await requireSession();
  await prisma.task.deleteMany({ where: { id: zId.parse(id) } });
  refresh();
  redirect(safeBack(back));
}
