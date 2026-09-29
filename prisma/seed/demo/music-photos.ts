import type { Prisma } from "../../../src/generated/prisma/client";
import type { MusicMoment } from "../../../src/generated/prisma/enums";
import type { Db } from "../../../src/lib/db-client";
import { draftProcessional } from "../../../src/lib/domain/music";
import { STANDARD_SHOT_LIST, templateRows } from "../../../src/lib/domain/photos";

// Sample rows for /music and /photos (isDemo = true). The couple's entrance and the last dance
// are left empty on purpose, so "Still to choose" has something to show.

const SONGS: Array<{ moment: MusicMoment; title: string; artist?: string; notes?: string }> = [
  { moment: "PRELUDE", title: "Canon in D", artist: "Johann Pachelbel", notes: "String quartet" },
  { moment: "PRELUDE", title: "Clair de Lune", artist: "Claude Debussy" },
  { moment: "PRELUDE", title: "Can't Help Falling in Love", artist: "Elvis Presley", notes: "Quartet arrangement" },
  { moment: "PROCESSIONAL", title: "A Thousand Years", artist: "Christina Perri", notes: "Quartet arrangement, one verse per three pairs" },
  { moment: "RECESSIONAL", title: "Signed, Sealed, Delivered I'm Yours", artist: "Stevie Wonder", notes: "Start on the horns" },
  { moment: "COCKTAIL_HOUR", title: "Golden", artist: "Jill Scott" },
  { moment: "COCKTAIL_HOUR", title: "Sweet Love", artist: "Anita Baker" },
  { moment: "GRAND_ENTRANCE", title: "Crazy in Love", artist: "Beyoncé", notes: "Straight into the chorus" },
  { moment: "FIRST_DANCE", title: "At Last", artist: "Etta James" },
  { moment: "PARENT_DANCE", title: "What a Wonderful World", artist: "Louis Armstrong" },
  { moment: "CAKE_CUTTING", title: "Sugar", artist: "Maroon 5" },
  { moment: "SEND_OFF", title: "September", artist: "Earth, Wind & Fire" },
  { moment: "MUST_PLAY", title: "Before I Let Go", artist: "Frankie Beverly and Maze", notes: "The whole room will want this" },
  { moment: "MUST_PLAY", title: "Love on Top", artist: "Beyoncé" },
  { moment: "MUST_PLAY", title: "Cupid Shuffle", artist: "Cupid" },
  { moment: "DO_NOT_PLAY", title: "The Chicken Dance" },
  { moment: "DO_NOT_PLAY", title: "Macarena", artist: "Los del Río" },
];

// A shorter sample shot list: every must-have from the standard list, plus a few others.
const EXTRA_SHOTS = new Set(["Both pairs of shoes", "Couple with the bride's immediate family", "Walking together through the gardens"]);

export async function seedDemoMusicPhotos(db: Db): Promise<Record<string, number>> {
  const next = new Map<MusicMoment, number>();
  const songs = SONGS.map((s) => {
    const sortOrder = next.get(s.moment) ?? 0;
    next.set(s.moment, sortOrder + 1);
    return { ...s, sortOrder, isDemo: true };
  });
  await db.songRequest.createMany({ data: songs });

  // The sample processional is the draft from the real wedding party rows.
  const members = await db.weddingPartyMember.findMany({
    select: { id: true, name: true, side: true, role: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  });
  const processional = draftProcessional(members).map((l, sortOrder) => ({ ...l, sortOrder, isDemo: true }));
  await db.processionalEntry.createMany({ data: processional });

  const sample = STANDARD_SHOT_LIST.filter((s) => s.isMustHave || EXTRA_SHOTS.has(s.description));
  const shots = templateRows(sample).map((s) => ({ ...s, isDemo: true }));
  await db.shotListItem.createMany({ data: shots });

  return { songs: songs.length, processional: processional.length, shots: shots.length };
}

/** Runs inside wipeDemo's transaction, before demo guests and vendors are removed. */
export async function wipeDemoMusicPhotos(tx: Prisma.TransactionClient): Promise<Record<string, number>> {
  const songs = await tx.songRequest.deleteMany({ where: { isDemo: true } });
  const processional = await tx.processionalEntry.deleteMany({ where: { isDemo: true } });
  const shots = await tx.shotListItem.deleteMany({ where: { isDemo: true } });
  return { songs: songs.count, processional: processional.count, shots: shots.count };
}
