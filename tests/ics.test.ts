import { describe, expect, it } from "vitest";
import { cd } from "../src/lib/dates";
import { zonedTimeToInstant } from "../src/lib/domain/zoned-time";
import {
  buildIcs,
  escapeText,
  feedEvents,
  foldLine,
  icsDate,
  icsUtc,
  tokenFromPathSegment,
  tokensMatch,
  type FeedInput,
  type IcsEvent,
} from "../src/lib/ics";

// Runs in TZ=America/New_York, UTC and Pacific/Kiritimati. A date-only item must come out on
// the same day in all three.

const NOW = new Date("2026-09-28T21:30:00.000Z");
const octets = (s: string) => new TextEncoder().encode(s).length;

/** Undo folding (RFC 5545 §3.1) so a property can be read back whole. */
function unfold(ics: string): string[] {
  return ics.replace(/\r\n /g, "").split("\r\n");
}

describe("escaping text", () => {
  it("escapes backslash, semicolon, comma and newlines", () => {
    expect(escapeText("a\\b")).toBe("a\\\\b");
    expect(escapeText("Tasting; bring notes, please")).toBe("Tasting\\; bring notes\\, please");
    expect(escapeText("line one\nline two\r\nline three\rfour")).toBe("line one\\nline two\\nline three\\nfour");
  });

  it("escapes the backslash first so nothing is double-escaped", () => {
    expect(escapeText("\\,")).toBe("\\\\\\,");
    expect(escapeText("C:\\new")).toBe("C:\\\\new");
  });

  it("leaves colons, quotes and accents alone", () => {
    expect(escapeText('Maître d\' fee: "mandatory"')).toBe('Maître d\' fee: "mandatory"');
  });
});

describe("folding long lines", () => {
  it("leaves short lines alone", () => {
    expect(foldLine("SUMMARY:Menu tasting")).toBe("SUMMARY:Menu tasting");
    const exactly75 = "X".repeat(75);
    expect(foldLine(exactly75)).toBe(exactly75);
  });

  it("folds at 75 octets with CRLF and a space", () => {
    const line = `DESCRIPTION:${"a".repeat(200)}`;
    const folded = foldLine(line);
    const parts = folded.split("\r\n");
    expect(parts.length).toBeGreaterThan(2);
    expect(parts.every((p) => octets(p) <= 75)).toBe(true);
    expect(parts.slice(1).every((p) => p.startsWith(" "))).toBe(true);
    expect(octets(parts[0]!)).toBe(75);
    expect(folded.replace(/\r\n /g, "")).toBe(line);
  });

  it("counts bytes, not characters, and never splits a multi-byte character", () => {
    // "î" is 2 bytes, "·" is 2, "💍" is 4 (a surrogate pair in JavaScript).
    const line = `SUMMARY:${"Maître d’ · 💍 ".repeat(12)}`;
    const folded = foldLine(line);
    const parts = folded.split("\r\n");
    expect(parts.every((p) => octets(p) <= 75)).toBe(true);
    // Every piece is valid UTF-8 on its own: no lone surrogates, no replacement characters.
    for (const p of parts) {
      expect(p).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/);
      expect(new TextDecoder().decode(new TextEncoder().encode(p))).toBe(p);
    }
    expect(folded.replace(/\r\n /g, "")).toBe(line);
  });

  it("folds a line made only of 3-byte characters without exceeding the limit", () => {
    const line = `SUMMARY:${"€".repeat(60)}`;
    const parts = foldLine(line).split("\r\n");
    expect(parts.every((p) => octets(p) <= 75)).toBe(true);
    expect(octets(parts[0]!)).toBe(74); // 8 + 22×3; one more "€" would make 77
  });
});

describe("dates and times", () => {
  it("writes calendar dates as YYYYMMDD in every time zone", () => {
    expect(icsDate(cd("2028-04-13"))).toBe("20280413");
    expect(icsDate(cd("2027-11-07"))).toBe("20271107");
    expect(() => icsDate("2027-02-29" as never)).toThrow();
  });

  it("writes instants in UTC with a Z", () => {
    expect(icsUtc(new Date("2028-04-13T20:30:00.000Z"))).toBe("20280413T203000Z");
    expect(icsUtc(new Date("2027-11-07T05:30:15.250Z"))).toBe("20271107T053015Z");
  });
});

describe("the calendar document", () => {
  const events: IcsEvent[] = [
    { uid: "task-abc@wedding-hq", kind: "date", date: cd("2027-11-07"), summary: "Milestone: Dress sizing due", description: "Every attendant, no exceptions", transparent: true },
    { uid: "event-xyz@wedding-hq", kind: "timed", start: new Date("2027-12-13T23:00:00Z"), end: new Date("2027-12-14T01:00:00Z"), summary: "Menu tasting", location: "River Vale, NJ" },
    { uid: "event-open@wedding-hq", kind: "timed", start: new Date("2028-03-12T07:30:00Z"), summary: "No end time" },
    { uid: "payment-p@wedding-hq", kind: "date", date: cd("2028-12-31"), summary: "Year end" },
  ];
  const ics = buildIcs({ name: "Wedding HQ", timezone: "America/New_York", now: NOW, events });
  const lines = unfold(ics);

  it("uses CRLF everywhere, including after the last line", () => {
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  it("has the calendar header", () => {
    expect(lines.slice(0, 4)).toEqual(["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Wedding HQ//Calendar feed//EN", "CALSCALE:GREGORIAN"]);
    expect(lines).toContain("X-WR-CALNAME:Wedding HQ");
    expect(lines).toContain("X-WR-TIMEZONE:America/New_York");
    expect(lines.filter((l) => l === "BEGIN:VEVENT")).toHaveLength(4);
    expect(lines.filter((l) => l === "END:VEVENT")).toHaveLength(4);
  });

  it("stamps every event and keeps UIDs stable", () => {
    expect(lines.filter((l) => l === "DTSTAMP:20260928T213000Z")).toHaveLength(4);
    expect(lines).toContain("UID:task-abc@wedding-hq");
    expect(buildIcs({ name: "Wedding HQ", now: NOW, events })).toBe(buildIcs({ name: "Wedding HQ", now: NOW, events }));
  });

  it("makes date-only items all-day, ending the next day (across a year end too)", () => {
    expect(lines).toContain("DTSTART;VALUE=DATE:20271107");
    expect(lines).toContain("DTEND;VALUE=DATE:20271108");
    expect(lines).toContain("DTSTART;VALUE=DATE:20281231");
    expect(lines).toContain("DTEND;VALUE=DATE:20290101");
    expect(lines).toContain("TRANSP:TRANSPARENT");
  });

  it("writes timed appointments in UTC, with an hour when there's no end", () => {
    expect(lines).toContain("DTSTART:20271213T230000Z");
    expect(lines).toContain("DTEND:20271214T010000Z");
    expect(lines).toContain("DTSTART:20280312T073000Z");
    expect(lines).toContain("DTEND:20280312T083000Z");
    expect(lines).toContain("LOCATION:River Vale\\, NJ");
  });

  it("keeps every physical line within 75 octets", () => {
    const long = buildIcs({
      name: "Wedding HQ",
      now: NOW,
      events: [{ uid: "x@wedding-hq", kind: "date", date: cd("2028-04-13"), summary: "Très long résumé — ".repeat(10), description: "🌿 ".repeat(40) }],
    });
    expect(long.split("\r\n").every((l) => octets(l) <= 75)).toBe(true);
  });
});

describe("a New York appointment on the phone", () => {
  it("is stored and sent as the right UTC instant across the DST change", () => {
    // 1:30 PM on the fall-back day is EST (UTC−5).
    const start = zonedTimeToInstant(cd("2027-11-07"), "13:30").instant;
    const ics = buildIcs({ name: "Wedding HQ", now: NOW, events: [{ uid: "e@wedding-hq", kind: "timed", start, summary: "Fitting" }] });
    expect(unfold(ics)).toContain("DTSTART:20271107T183000Z");
  });
});

describe("what the feed contains", () => {
  const input: FeedInput = {
    couple: "Rondell & Capri",
    weddingDate: cd("2028-04-13"),
    ceremonyTime: "16:30",
    venue: { name: "The Estate at Florentine Gardens", address: "River Vale, NJ" },
    payments: [
      { id: "p2", dueDate: cd("2026-10-19"), title: "The Estate at Florentine Gardens", detail: "Payment 2 of 6", amountCents: 1_000_000, isEstimate: false },
      { id: "p5", dueDate: cd("2028-04-01"), title: "The Estate at Florentine Gardens", detail: "Headcount overage (estimate)", amountCents: 120_000, isEstimate: true },
    ],
    tasks: [
      { id: "t0", dueDate: cd("2026-10-12"), title: "Ask the venue about vendor meals ($200 each)", notes: "If they count, that's up to $1,200 of overage. The $4,000 buffer, ~$1.5k left.", isMilestone: false, ownerLabel: "Both of us" },
      { id: "t1", dueDate: cd("2027-11-07"), title: "Dress selection and sizing due", notes: "From every attendant", isMilestone: true, ownerLabel: "Wedding party" },
      { id: "t2", dueDate: cd("2027-10-13"), title: "Book transportation", notes: null, isMilestone: false, ownerLabel: "Both of us" },
      { id: "wd", dueDate: cd("2028-04-13"), title: "Wedding day", notes: null, isMilestone: true, ownerLabel: "Both of us", isWeddingMarker: true },
    ],
    events: [
      { id: "e1", title: "Menu tasting", typeLabel: "Tasting", allDayDate: null, startAt: new Date("2027-12-13T23:00:00Z"), endAt: null, location: "The Estate", vendorName: "The Estate at Florentine Gardens", notes: "Bring the seating ideas" },
      { id: "e2", title: "Dress shopping", typeLabel: "Fitting", allDayDate: cd("2027-02-06"), startAt: null, endAt: null, location: null, vendorName: null, notes: null },
    ],
  };

  it("includes the wedding day, payments, appointments and open tasks with stable UIDs", () => {
    const uids = feedEvents(input, { includeAmounts: true }).map((e) => e.uid);
    expect(uids).toEqual([
      "wedding-day@wedding-hq",
      "payment-p2@wedding-hq",
      "payment-p5@wedding-hq",
      "event-e1@wedding-hq",
      "event-e2@wedding-hq",
      "task-t0@wedding-hq",
      "task-t1@wedding-hq",
      "task-t2@wedding-hq",
    ]);
  });

  it("hides dollar amounts typed into titles and notes when amounts are off", () => {
    const shared = unfold(buildIcs({ name: "Wedding HQ", now: NOW, events: feedEvents(input, { includeAmounts: false }) }));
    expect(shared).toContain("SUMMARY:To do: Ask the venue about vendor meals ((amount hidden) each)");
    expect(shared).toContain(
      "DESCRIPTION:If they count\\, that's up to (amount hidden) of overage. The (amount hidden) buffer\\, ~(amount hidden) left.\\nOwner: Both of us",
    );
    const full = unfold(buildIcs({ name: "Wedding HQ", now: NOW, events: feedEvents(input, { includeAmounts: true }) }));
    expect(full).toContain("SUMMARY:To do: Ask the venue about vendor meals ($200 each)");
  });

  it("describes the wedding day with the venue and ceremony time", () => {
    const [wedding] = feedEvents(input, { includeAmounts: true });
    expect(wedding).toMatchObject({ kind: "date", date: "2028-04-13", summary: "The wedding of Rondell & Capri" });
    expect(wedding!.location).toBe("The Estate at Florentine Gardens, River Vale, NJ");
    expect(wedding!.description).toContain("Ceremony at 4:30 PM.");
  });

  it("shows amounts by default and none at all with amounts=0", () => {
    const withAmounts = buildIcs({ name: "Wedding HQ", now: NOW, events: feedEvents(input, { includeAmounts: true }) });
    expect(unfold(withAmounts)).toContain("SUMMARY:Payment due: The Estate at Florentine Gardens · $10\\,000");
    expect(withAmounts).toContain("$1\\,200 (estimate)");

    const without = buildIcs({ name: "Wedding HQ", now: NOW, events: feedEvents(input, { includeAmounts: false }) });
    expect(without).not.toContain("$");
    expect(unfold(without)).toContain("SUMMARY:Payment due: The Estate at Florentine Gardens");
    expect(unfold(without)).toContain("DESCRIPTION:Headcount overage (estimate)\\nMark it paid in Wedding HQ once it's sent.");
  });

  it("labels milestones and to-dos and keeps all-day dates on their day", () => {
    const ics = unfold(buildIcs({ name: "Wedding HQ", now: NOW, events: feedEvents(input, { includeAmounts: true }) }));
    expect(ics).toContain("SUMMARY:Milestone: Dress selection and sizing due");
    expect(ics).toContain("SUMMARY:To do: Book transportation");
    expect(ics).toContain("DTSTART;VALUE=DATE:20271107");
    expect(ics).toContain("DTSTART;VALUE=DATE:20270206");
    expect(ics).toContain("DTSTART:20271213T230000Z");
    expect(ics).toContain("DESCRIPTION:Tasting\\nWith The Estate at Florentine Gardens\\nBring the seating ideas");
  });
});

describe("the private link", () => {
  it("strips the .ics suffix", () => {
    expect(tokenFromPathSegment("abc123.ics")).toBe("abc123");
    expect(tokenFromPathSegment("abc123.ICS")).toBe("abc123");
    expect(tokenFromPathSegment("abc123")).toBe("abc123");
    expect(tokenFromPathSegment("a%2Fb.ics")).toBe("a/b");
    expect(tokenFromPathSegment("%E0%A4%A.ics")).toBe("%E0%A4%A");
  });

  it("matches only the exact token", () => {
    const token = "L_kOCsdVGrxHF-fQXudaAcQpaT-Y5xu3";
    expect(tokensMatch(token, token)).toBe(true);
    expect(tokensMatch(token.slice(0, -1), token)).toBe(false);
    expect(tokensMatch(`${token}x`, token)).toBe(false);
    expect(tokensMatch(token.toLowerCase(), token)).toBe(false);
    expect(tokensMatch("", token)).toBe(false);
    expect(tokensMatch(token, "")).toBe(false);
  });
});
