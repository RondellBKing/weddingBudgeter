import "server-only";
import { requireSession } from "../auth/require-session";
import { fromDbDate } from "../dates";
import { prisma } from "../db";
import { groupIdeas, passportValidUntil, suggestedTrip, tripNights } from "../domain/honeymoon";
import { loadPlan } from "./plan";

/** The trip as saved: the dates (or null) and the chosen destination's name. */
export async function loadTrip() {
  await requireSession();
  const [s, chosen] = await Promise.all([
    prisma.weddingSettings.findUnique({ where: { id: 1 }, select: { honeymoonDepartOn: true, honeymoonReturnOn: true } }),
    prisma.honeymoonIdea.findFirst({ where: { isChosen: true }, select: { id: true, name: true, place: true } }),
  ]);
  const departOn = s?.honeymoonDepartOn ? fromDbDate(s.honeymoonDepartOn) : null;
  const returnOn = s?.honeymoonReturnOn ? fromDbDate(s.honeymoonReturnOn) : null;
  return { departOn, returnOn, nights: departOn && returnOn ? tripNights(departOn, returnOn) : null, chosen };
}

export type HoneymoonIdeaView = {
  id: string;
  name: string;
  place: string | null;
  flightHours: number | null;
  flight: string | null;
  weather: string | null;
  why: string | null;
  watchOut: string | null;
  isFavorite: boolean;
  isChosen: boolean;
  isDemo: boolean;
  sortOrder: number;
};

/** Everything the Honeymoon page shows. */
export async function loadHoneymoon() {
  await requireSession();
  const [plan, trip, ideas, tasks] = await Promise.all([
    loadPlan(),
    loadTrip(),
    prisma.honeymoonIdea.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.task.findMany({
      where: { area: "HONEYMOON" },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { title: "asc" }],
      select: { id: true, title: true, dueDate: true, status: true, isMilestone: true },
    }),
  ]);
  const views: HoneymoonIdeaView[] = ideas.map((i) => ({
    id: i.id,
    name: i.name,
    place: i.place,
    flightHours: i.flightHours,
    flight: i.flight,
    weather: i.weather,
    why: i.why,
    watchOut: i.watchOut,
    isFavorite: i.isFavorite,
    isChosen: i.isChosen,
    isDemo: i.isDemo,
    sortOrder: i.sortOrder,
  }));
  return {
    plan,
    trip,
    suggestion: suggestedTrip(plan.settings.weddingDate),
    passportUntil: trip.returnOn ? passportValidUntil(trip.returnOn) : null,
    groups: groupIdeas(views),
    favorites: views.filter((v) => v.isFavorite).length,
    tasks: tasks.map((t) => ({ id: t.id, title: t.title, dueDate: t.dueDate ? fromDbDate(t.dueDate) : null, done: t.status === "DONE", isMilestone: t.isMilestone })),
  };
}
