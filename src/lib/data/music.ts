import "server-only";
import type { MusicMoment } from "@/generated/prisma/enums";
import { requireSession } from "../auth/require-session";
import { prisma } from "../db";

// Loaders for /music and its printout. Each one checks the session first.

export type SongView = {
  id: string;
  moment: MusicMoment;
  title: string;
  artist: string | null;
  notes: string | null;
  sortOrder: number;
};

export type ProcessionalView = { id: string; walkers: string; notes: string | null; sortOrder: number };

/** The order rows are shown in: their number, then when they were added. Actions reorder in the same order. */
export const LIST_ORDER = [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }, { id: "asc" as const }];

export async function loadMusic(): Promise<{ songs: SongView[]; processional: ProcessionalView[]; partySize: number }> {
  await requireSession();
  const [songs, processional, partySize] = await Promise.all([
    prisma.songRequest.findMany({
      select: { id: true, moment: true, title: true, artist: true, notes: true, sortOrder: true },
      orderBy: LIST_ORDER,
    }),
    prisma.processionalEntry.findMany({ select: { id: true, walkers: true, notes: true, sortOrder: true }, orderBy: LIST_ORDER }),
    prisma.weddingPartyMember.count(),
  ]);
  return { songs, processional, partySize };
}
