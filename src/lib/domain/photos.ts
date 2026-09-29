// The photographer's shot list: the moments in the order the day runs, the standard list we
// start from, and the counts shown on the page. Pure functions, no database.
import type { ShotMoment } from "../../generated/prisma/enums";

/** The day in order. "Other" is for anything that doesn't fit a moment. */
export const SHOT_MOMENTS: ShotMoment[] = [
  "DETAILS",
  "GETTING_READY",
  "FIRST_LOOK",
  "CEREMONY",
  "FAMILY",
  "WEDDING_PARTY",
  "COUPLE",
  "COCKTAIL_HOUR",
  "RECEPTION",
  "OTHER",
];

/** The moments gathered into the parts of the day, for the page and the printout. */
export const SHOT_PARTS: Array<{ key: string; lead: string; word: string; moments: ShotMoment[] }> = [
  { key: "before", lead: "Before the", word: "ceremony", moments: ["DETAILS", "GETTING_READY", "FIRST_LOOK"] },
  { key: "ceremony", lead: "The", word: "ceremony", moments: ["CEREMONY"] },
  { key: "portraits", lead: "The", word: "portraits", moments: ["FAMILY", "WEDDING_PARTY", "COUPLE"] },
  { key: "party", lead: "Cocktails &", word: "reception", moments: ["COCKTAIL_HOUR", "RECEPTION"] },
  { key: "other", lead: "Anything", word: "else", moments: ["OTHER"] },
];

export type TemplateShot = { moment: ShotMoment; description: string; people: string | null; isMustHave: boolean };

const shot = (moment: ShotMoment, description: string, people: string | null = null, isMustHave = false): TemplateShot => ({
  moment,
  description,
  people,
  isMustHave,
});
const must = (moment: ShotMoment, description: string, people: string | null = null) => shot(moment, description, people, true);

// Sunset in River Vale on April 13 is about 7:30 PM, so the best light is the half hour before.
export const GOLDEN_HOUR_NOTE = "Golden hour portraits. Sunset is around 7:30 PM in mid-April, so step out with the photographer at about 7:00 for 15 minutes";

/**
 * The family groupings, in the order that keeps the fewest people moving: the bride's side
 * builds up from the grandparents (who can sit down once their side is done), both families
 * join for one big photo, the groom's side peels away, then the parents.
 * Everyone is described by role, so the couple can add names in "people".
 */
const FAMILY: TemplateShot[] = [
  must("FAMILY", "Couple with the bride's grandparents", "Bride's grandparents"),
  shot("FAMILY", "Couple with the bride's parents and grandparents", "Bride's parents and grandparents"),
  shot("FAMILY", "Couple with the bride's immediate family", "Bride's parents, grandparents, siblings, and siblings' partners and children"),
  shot("FAMILY", "Couple with the bride's extended family", "Bride's parents, grandparents, siblings and their families, aunts, uncles and cousins"),
  must("FAMILY", "Couple with both families", "Both families: parents, grandparents, siblings and their families, aunts, uncles and cousins"),
  shot("FAMILY", "Couple with the groom's extended family", "Groom's parents, grandparents, siblings and their families, aunts, uncles and cousins"),
  shot("FAMILY", "Couple with the groom's immediate family", "Groom's parents, grandparents, siblings, and siblings' partners and children"),
  shot("FAMILY", "Couple with the groom's parents and grandparents", "Groom's parents and grandparents"),
  must("FAMILY", "Couple with the groom's grandparents", "Groom's grandparents"),
  must("FAMILY", "Couple with the groom's parents", "Groom's parents"),
  shot("FAMILY", "The groom with their parents", "Groom's parents"),
  must("FAMILY", "Couple with both sets of parents", "Both sets of parents"),
  must("FAMILY", "Couple with the bride's parents", "Bride's parents"),
  shot("FAMILY", "The bride with their parents", "Bride's parents"),
];

/** A planner's standard list. Must-haves are the shots that can't be missed or redone. */
export const STANDARD_SHOT_LIST: TemplateShot[] = [
  must("DETAILS", "Both wedding bands, with the engagement ring"),
  shot("DETAILS", "The invitation suite: invitation, envelope, reply card and any extras"),
  shot("DETAILS", "Both pairs of shoes"),
  shot("DETAILS", "Flowers: bouquets, boutonnieres and corsages"),
  shot("DETAILS", "Our wedding attire on the hanger, before we get dressed"),
  shot("DETAILS", "Jewelry, cufflinks, watches and fragrance"),
  shot("DETAILS", "Heirlooms, and anything borrowed or blue"),
  shot("DETAILS", "The broom, decorated for jumping the broom"),
  shot("DETAILS", "Vow books and any letters to each other"),
  must("DETAILS", "The ceremony space, set and empty, before guests arrive"),

  shot("GETTING_READY", "Hair and makeup, the final touches"),
  must("GETTING_READY", "Getting dressed: the last button, zip or cufflink"),
  shot("GETTING_READY", "Putting on the shoes"),
  shot("GETTING_READY", "Reading a letter or opening a gift from each other"),
  shot("GETTING_READY", "Each of us with our attendants while we get ready", "The wedding party"),
  must("GETTING_READY", "Parents seeing each of us dressed for the first time", "Both sets of parents"),
  shot("GETTING_READY", "A quiet portrait of each of us, dressed and ready"),

  must("FIRST_LOOK", "The first look: the walk up, the tap on the shoulder, the turn"),
  shot("FIRST_LOOK", "Both of our faces, close, in the moment"),
  shot("FIRST_LOOK", "A few quiet minutes together afterward"),

  shot("CEREMONY", "The ceremony space full of guests, from the back"),
  shot("CEREMONY", "The officiant and attendants at the front as the processional begins"),
  shot("CEREMONY", "Each pair walking down the aisle", "The wedding party"),
  must("CEREMONY", "The walk down the aisle, and the face waiting at the front"),
  must("CEREMONY", "Vows and the ring exchange"),
  must("CEREMONY", "The first kiss"),
  must("CEREMONY", "Jumping the broom, from the front and from the aisle"),
  must("CEREMONY", "The recessional, back up the aisle together"),
  shot("CEREMONY", "Parents and grandparents watching", "Both sets of parents and grandparents"),
  shot("CEREMONY", "A wide shot of the whole ceremony from the back"),

  ...FAMILY,

  must("WEDDING_PARTY", "The whole wedding party with the two of us", "Everyone in the wedding party"),
  shot("WEDDING_PARTY", "The whole wedding party, candid and having fun", "Everyone in the wedding party"),
  shot("WEDDING_PARTY", "The bride with their attendants", "Maid of honor, matron of honor, bridesman and bridesmaids"),
  shot("WEDDING_PARTY", "The groom with their attendants", "Best man and groomsmen"),
  shot("WEDDING_PARTY", "The two of us with the honor attendants", "Best man, maid of honor and matron of honor"),
  shot("WEDDING_PARTY", "Each of us with each attendant, one quick frame each", "Everyone in the wedding party"),

  must("COUPLE", "Portraits of the two of us right after the ceremony"),
  shot("COUPLE", "Full-length portraits that show all of our attire"),
  shot("COUPLE", "Close-ups: hands, rings and the details of what we're wearing"),
  shot("COUPLE", "Walking together through the gardens"),
  must("COUPLE", GOLDEN_HOUR_NOTE),
  shot("COUPLE", "An evening portrait with the venue lit up"),

  shot("COCKTAIL_HOUR", "Guests mingling, candid"),
  shot("COCKTAIL_HOUR", "The bar, the food and the signature drinks"),
  shot("COCKTAIL_HOUR", "The escort cards and cocktail hour décor"),
  shot("COCKTAIL_HOUR", "The musicians or DJ at work"),

  must("RECEPTION", "The room, set and empty, before guests come in"),
  shot("RECEPTION", "Centerpieces, place settings and our table"),
  shot("RECEPTION", "The cake, before it's cut"),
  must("RECEPTION", "Our grand entrance"),
  must("RECEPTION", "The first dance"),
  must("RECEPTION", "Parent dances"),
  shot("RECEPTION", "Toasts, and the faces listening"),
  must("RECEPTION", "Cake cutting"),
  shot("RECEPTION", "The dance floor, full and candid"),
  shot("RECEPTION", "Table photos as we visit each table"),
  must("RECEPTION", "The last dance"),
  must("RECEPTION", "The send-off"),
];

/** The template as rows to insert, numbered 0, 1, 2… within each moment. */
export function templateRows(list: TemplateShot[] = STANDARD_SHOT_LIST): Array<TemplateShot & { sortOrder: number }> {
  const next = new Map<ShotMoment, number>();
  return list.map((s) => {
    const sortOrder = next.get(s.moment) ?? 0;
    next.set(s.moment, sortOrder + 1);
    return { ...s, sortOrder };
  });
}

export type ShotCounts = { total: number; mustHaves: number; family: number };

/** Total shots, must-haves, and family groupings (the ones that need people gathered). */
export function shotCounts(shots: Array<{ moment: ShotMoment; isMustHave: boolean }>): ShotCounts {
  return {
    total: shots.length,
    mustHaves: shots.filter((s) => s.isMustHave).length,
    family: shots.filter((s) => s.moment === "FAMILY").length,
  };
}
