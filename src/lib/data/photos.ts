import "server-only";
import type { ShotMoment } from "@/generated/prisma/enums";
import { requireSession } from "../auth/require-session";
import { prisma } from "../db";
import { LIST_ORDER } from "./music";

// Loaders for /photos and its printout. Each one checks the session first.

export type ShotView = {
  id: string;
  moment: ShotMoment;
  description: string;
  people: string | null;
  isMustHave: boolean;
  sortOrder: number;
};

export async function loadShots(): Promise<ShotView[]> {
  await requireSession();
  return prisma.shotListItem.findMany({
    select: { id: true, moment: true, description: true, people: true, isMustHave: true, sortOrder: true },
    orderBy: LIST_ORDER,
  });
}
