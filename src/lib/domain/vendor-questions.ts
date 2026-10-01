import type { VendorCategory } from "./vendors";

// The interview guide: the questions a planner asks each kind of vendor, written for this
// wedding (a Thursday in Holy Week and Passover, at The Estate at Florentine Gardens, the 6:00 AM
// vendor access, the colors, jumping the broom). Pure data and functions; nothing is stored here.

export type QuestionTopic = { topic: string; questions: string[] };
export type GuideQuestion = { topic: string; text: string };

/** Asked of every vendor first: can they do the date, and for how much. */
const AVAILABILITY: QuestionTopic = {
  topic: "Date and price",
  questions: [
    "Are you available on Thursday, April 13, 2028? It's Holy Thursday, during Passover.",
    "Do you charge less for a Thursday than a Saturday? What is your Thursday rate?",
    "What exactly is included in that price, and what costs extra?",
    "Are there travel, setup or early-start fees, and is tax added on top?",
  ],
};

/** Asked of every vendor once the price makes sense. */
const CONTRACT: QuestionTopic = {
  topic: "Contract and payments",
  questions: [
    "What deposit holds the date, and when is each payment due?",
    "How can we pay, and is there a fee for paying by card?",
    "What happens if we need to postpone or cancel? And if you have to cancel?",
    "Do you carry liability insurance, and can you send a certificate to the venue?",
  ],
};

/** Asked of every vendor who works the wedding day itself. */
const ON_THE_DAY: QuestionTopic = {
  topic: "On the day",
  questions: [
    "Have you worked at The Estate at Florentine Gardens before?",
    "Who exactly will be there on the day, and who steps in if they're sick?",
    "What time would you arrive, and how long do you need to set up and pack up? The venue opens to vendors at 6:00 AM.",
    "Will your team need meals, and how many? Vendor meals may count toward the venue's 125.",
    "What do you charge if the day runs over?",
    "Can we speak with two couples you worked with recently?",
  ],
};

/** What each kind of vendor needs asked, beyond the questions for everyone. */
const BY_CATEGORY: Record<VendorCategory, QuestionTopic[]> = {
  VENUE: [
    {
      topic: "Headcount and the package",
      questions: [
        "Do vendor meals count toward the 125 included people? (4–6 meals, up to $1,200 if they do)",
        "Is the $200 per person above 125 before or after NJ sales tax and service charge?",
        "How are children counted and priced?",
        "When is the final headcount due?",
        "What does the package include: cake, bar, linens, ceremony chairs?",
        "What does each vendor meal cost?",
      ],
    },
    {
      topic: "The ceremony and the weather",
      questions: [
        "What is the indoor rain backup for the ceremony, and how many people does it hold?",
        "Who makes the weather call for an outdoor ceremony, and by when?",
        "Is there a sound system and microphone for the ceremony?",
      ],
    },
    {
      topic: "Timing",
      questions: [
        "When can we get into the getting-ready suites that morning?",
        "Can we drop off décor on Wednesday, April 12, and can it stay overnight?",
        "What time does the reception have to end, and when must everything be out?",
        "Is there a music curfew or a sound limit?",
      ],
    },
    {
      topic: "Food and bar",
      questions: [
        "When is the tasting, and how many people can come?",
        "How many hours is the bar open, and when is last call?",
        "Is there a fee to cut and serve a cake from another baker?",
        "Can our families bring a Guyanese dish or a black cake?",
        "Can you prepare kosher-for-Passover meals for guests who need them?",
      ],
    },
    {
      topic: "Rules and staff",
      questions: [
        "Are candles, sparklers, confetti or petals allowed?",
        "Do outside vendors need to send you insurance certificates?",
        "Who is our banquet manager on the day, and what does the maître d' handle?",
        "How many cars can park, and is valet included?",
      ],
    },
  ],
  PLANNER: [
    {
      topic: "Their service",
      questions: [
        "Do you offer full planning, partial planning or day-of coordination? What does each include?",
        "When would you start working with us, and how many meetings or calls are included?",
        "Do you design the look (flowers, décor, lighting), or coordinate only?",
        "How many weddings do you take the same week? Will you have another during Holy Week 2028?",
        "Who would be our main contact, and how quickly do you usually reply?",
      ],
    },
    {
      topic: "Our vendors",
      questions: [
        "Which vendors do you work with often at The Estate at Florentine Gardens?",
        "Do you receive commissions or referral fees from vendors you recommend?",
        "Will you review our vendor contracts before we sign them?",
      ],
    },
    {
      topic: "Running the day",
      questions: [
        "Will you run the rehearsal on Wednesday, April 12?",
        "Will you build the wedding-day timeline and share it with every vendor?",
        "How many of your team will be there, and from what time until what time?",
        "Will you cue jumping the broom, and a kwe kwe if we have one?",
        "How do you handle a vendor who is late or doesn't show?",
        "Who packs up our décor, gifts and personal items at the end of the night?",
      ],
    },
  ],
  CATERING: [
    {
      topic: "The menu",
      questions: [
        "Is catering included with the venue, or can we bring our own caterer?",
        "Which service styles do you offer: plated, stations, family style?",
        "When is the tasting, and how many people can come?",
        "Can you cook Guyanese dishes, or work from a family recipe?",
        "How do you handle allergies, vegetarian, kosher-for-Passover and children's meals?",
      ],
    },
    {
      topic: "Service",
      questions: [
        "How many servers and bartenders per guest?",
        "When is the final headcount due?",
        "What do vendor meals cost?",
        "Can we take leftovers home at the end of the night?",
      ],
    },
  ],
  PHOTOGRAPHY: [
    {
      topic: "Style and coverage",
      questions: [
        "Can we see two or three complete weddings you've photographed, not only highlights?",
        "How would you describe your style: posed, documentary, editorial or a mix?",
        "How many hours of coverage are included, and what does an extra hour cost?",
        "Is a second photographer included, and who is it?",
        "How do you photograph an evening reception in low light?",
        "Have you photographed jumping the broom? Where will you stand for it?",
        "Is an engagement session included?",
      ],
    },
    {
      topic: "What we receive",
      questions: [
        "How many edited photos should we expect, and how soon?",
        "How are photos delivered, and how long does the online gallery stay up?",
        "Do we get print rights? Are albums included or extra?",
        "How do you back up every photo, and for how long do you keep them?",
      ],
    },
    {
      topic: "Planning together",
      questions: [
        "Will you work from our shot list and family groupings?",
        "Sunset is around 7:30 PM in mid-April. How much time do you need for our portraits?",
      ],
    },
  ],
  VIDEOGRAPHY: [
    {
      topic: "The films",
      questions: [
        "Can we watch two full wedding films, not only highlight reels?",
        "What's included: a highlight film, the full ceremony, the toasts, raw footage?",
        "How do you record clear audio of the vows and toasts?",
        "Can we choose the music in our film?",
        "How long until we receive the films, and how are they delivered?",
      ],
    },
    {
      topic: "On the day",
      questions: [
        "How many videographers will there be? Do you use drones, and does the venue allow them?",
        "Have you worked alongside our photographer before?",
      ],
    },
  ],
  FLORAL: [
    {
      topic: "The design",
      questions: [
        "Can we see weddings you've designed at The Estate at Florentine Gardens?",
        "Which flowers are at their best in mid-April in Dusty Rose, Desert Rose and soft neutrals?",
        "What's included: bouquets, boutonnieres, corsages, the ceremony, centerpieces, cake flowers?",
        "Will you decorate our broom for jumping the broom?",
        "Do your vases and holders come in gold? We're using gold only, no silver.",
        "Is a mock-up centerpiece included before the wedding?",
      ],
    },
    {
      topic: "Easter week",
      questions: [
        "Easter week is peak season for flowers. Will prices or availability change that week?",
        "When do you deliver and set up, and when do you collect anything rented?",
        "Can ceremony flowers move to the reception?",
      ],
    },
  ],
  MUSIC_DJ: [
    {
      topic: "The music",
      questions: [
        "Can we see you perform at a wedding, live or on video?",
        "Can you play the music our families love, including Caribbean and Guyanese favorites?",
        "How do you use our must-play and do-not-play lists? Do you take requests from guests?",
        "Do you also emcee? How do you introduce the wedding party and the two of us?",
      ],
    },
    {
      topic: "Equipment",
      questions: [
        "Do you bring microphones for the ceremony, the toasts and the readings?",
        "Can you cover the ceremony, cocktail hour and reception if they're in different rooms?",
        "Is dance-floor lighting or uplighting included, or extra?",
        "How much space and power do you need?",
      ],
    },
  ],
  MUSIC_CEREMONY: [
    {
      topic: "The music",
      questions: [
        "Which instruments, and can we hear a recording of the group?",
        "Will you learn a song that isn't in your repertoire? Is there a fee?",
        "How long do you play: prelude, processional, recessional, cocktail hour?",
        "Can you cue the processional, our entrances, jumping the broom and the recessional with the officiant?",
        "Do you play for a Guyanese kwe kwe, or know drummers who do?",
      ],
    },
    {
      topic: "Setting up",
      questions: [
        "Do you need power, chairs or cover? What if the ceremony is outside and it's cold or it rains?",
      ],
    },
  ],
  CAKE: [
    {
      topic: "The cake",
      questions: [
        "Can we have a tasting, and how many flavors can we try?",
        "How is the price worked out: per slice, per tier, per design?",
        "Can you make a Guyanese black cake, or a tier of one?",
        "Can you match our design and work with flowers from our florist?",
        "Do you make other desserts for a dessert table?",
        "Do you offer allergy-friendly options?",
      ],
    },
    {
      topic: "Delivery",
      questions: [
        "Do you deliver and set up, and at what time?",
        "Is a cake stand and knife included, or do we rent them?",
        "Will you be open Easter week, and does that change your price?",
      ],
    },
  ],
  ATTIRE: [
    {
      topic: "Ordering",
      questions: [
        "How long does it take to arrive after ordering? We need it well before April 2028.",
        "Can it be rushed if needed, and what does that cost?",
        "What is the return or exchange policy?",
      ],
    },
    {
      topic: "Fittings",
      questions: [
        "How many fittings are included, and what do alterations cost?",
        "Do you steam and press it before the wedding?",
        "For suits: rent or buy? How do people who live far away get measured?",
        "Can a suit and bow tie match Dusty Rose for the bridesman?",
        "When must rentals be picked up and returned? The day after is Good Friday.",
      ],
    },
  ],
  BEAUTY: [
    {
      topic: "The look",
      questions: [
        "Is a trial included, and when can we book it?",
        "Do you have experience with every hair texture and skin tone in our wedding party?",
        "Do you bring lashes, and will someone stay for touch-ups?",
      ],
    },
    {
      topic: "The morning",
      questions: [
        "How many people can you get ready, and how many stylists will come?",
        "What time would you start that morning, and how long does each person take?",
        "Will you work in the venue's getting-ready suites?",
        "Is there a minimum number of services, or an early-start fee?",
      ],
    },
  ],
  STATIONERY: [
    {
      topic: "The suite",
      questions: [
        "What is your timeline for save-the-dates and invitations?",
        "How many proofs are included?",
        "Can foil and accents be gold, not silver?",
        "Do you offer calligraphy or guest addressing?",
        "Can you add a hotel and travel card, and say \"Thursday\" clearly?",
      ],
    },
    {
      topic: "Mailing and the day",
      questions: [
        "Do you mail invitations, and what will the postage be?",
        "Do you make day-of paper: programs, menus, place cards and signs?",
      ],
    },
  ],
  RENTALS: [
    {
      topic: "What we need",
      questions: [
        "Can we see the linens, chairs and tableware in person?",
        "Do you offer lounge furniture, a tent or heaters for the rain plan?",
        "Is there a minimum order?",
      ],
    },
    {
      topic: "Delivery and return",
      questions: [
        "What are the delivery, setup and pickup times?",
        "Is pickup that night, or the next day? The next day is Good Friday.",
        "What happens if something is damaged or missing? Is there a damage waiver?",
      ],
    },
  ],
  TRANSPORT: [
    {
      topic: "The vehicles",
      questions: [
        "Which vehicles, how many people does each seat, and can we see them?",
        "What is the minimum number of hours, and is the driver's gratuity included?",
        "Can you run guest shuttles between the hotel and the venue?",
        "What happens if a vehicle breaks down?",
        "Will the driver plan for Holy Week and Easter traffic to River Vale?",
      ],
    },
  ],
  OFFICIANT: [
    {
      topic: "The ceremony",
      questions: [
        "Are you available on Holy Thursday? Does it conflict with your own services?",
        "Can you legally officiate in New Jersey, and will you file the marriage license?",
        "Will you meet with us beforehand? Can we write our own vows?",
        "Will you introduce jumping the broom and explain what it means?",
        "Will you lead the rehearsal on Wednesday, April 12?",
        "How long is a typical ceremony? Can we see a sample script?",
      ],
    },
  ],
  LODGING: [
    {
      topic: "The block",
      questions: [
        "How many rooms can you hold for Wednesday and Thursday nights?",
        "What is the group rate, and how does it compare with your public rate?",
        "When is the cutoff date, and what happens to rooms nobody books?",
        "Are we responsible for unbooked rooms (attrition)?",
        "Easter weekend is busy. Will the group rate hold all week?",
      ],
    },
    {
      topic: "Our guests",
      questions: [
        "Can you send a booking link with our group code?",
        "Is there a shuttle or parking near the venue?",
        "Can you hand out our welcome bags at check-in, and is there a fee?",
        "Can guests have a late checkout on Friday?",
      ],
    },
  ],
  OTHER: [],
};

/**
 * The full interview for a kind of vendor, in the order to ask it: the date and price, what's
 * particular to that vendor, the contract, then the day. The venue is booked, so it skips the
 * first and third; a hotel isn't at the wedding, so it skips the day.
 */
export function guideFor(category: VendorCategory): QuestionTopic[] {
  const own = BY_CATEGORY[category];
  if (category === "VENUE") return own;
  if (category === "LODGING") return [...own, CONTRACT];
  return [AVAILABILITY, ...own, CONTRACT, ON_THE_DAY];
}

/** The questions everyone gets, for the top of the guide. */
export const FOR_EVERY_VENDOR: QuestionTopic[] = [AVAILABILITY, CONTRACT, ON_THE_DAY];

/** What's particular to each kind of vendor (empty for "Other"). */
export function particularTo(category: VendorCategory): QuestionTopic[] {
  return BY_CATEGORY[category];
}

/** The guide as a flat list, in order. */
export function standardQuestions(category: VendorCategory): GuideQuestion[] {
  return guideFor(category).flatMap((t) => t.questions.map((text) => ({ topic: t.topic, text })));
}

const normal = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** Guide questions this vendor doesn't have yet (matched on wording, ignoring case and spacing). */
export function missingQuestions(category: VendorCategory, existing: Array<{ text: string }>): GuideQuestion[] {
  const have = new Set(existing.map((q) => normal(q.text)));
  return standardQuestions(category).filter((q) => !have.has(normal(q.text)));
}

/** Questions grouped by topic in the order they first appear; ones without a topic go last. */
export function groupByTopic<T extends { topic: string | null }>(questions: T[], ownLabel = "Our own questions"): Array<{ topic: string; questions: T[] }> {
  const groups = new Map<string, T[]>();
  for (const q of questions) {
    const key = q.topic ?? "";
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(q);
  }
  const named = [...groups.entries()].filter(([k]) => k !== "").map(([topic, qs]) => ({ topic, questions: qs }));
  const own = groups.get("");
  return own ? [...named, { topic: ownLabel, questions: own }] : named;
}
