import { describe, expect, it } from "vitest";
import {
  FOR_EVERY_VENDOR,
  groupByTopic,
  guideFor,
  missingQuestions,
  particularTo,
  standardQuestions,
} from "../src/lib/domain/vendor-questions";
import { VENDOR_CATEGORIES } from "../src/lib/domain/vendors";

const topics = (category: Parameters<typeof guideFor>[0]) => guideFor(category).map((t) => t.topic);

describe("the interview guide", () => {
  it("has its own questions for every kind of vendor but Other", () => {
    for (const c of VENDOR_CATEGORIES) {
      if (c === "OTHER") expect(particularTo(c)).toEqual([]);
      else expect(particularTo(c).length, c).toBeGreaterThan(0);
    }
  });

  it("never asks the same thing twice of one vendor, and never leaves a topic empty", () => {
    for (const c of VENDOR_CATEGORIES) {
      const texts = standardQuestions(c).map((q) => q.text.toLowerCase());
      expect(new Set(texts).size, c).toBe(texts.length);
      for (const t of guideFor(c)) expect(t.questions.length, `${c}: ${t.topic}`).toBeGreaterThan(0);
    }
  });

  it("asks date and price first and the day last, for a vendor still being chosen", () => {
    const t = topics("PHOTOGRAPHY");
    expect(t[0]).toBe("Date and price");
    expect(t.at(-2)).toBe("Contract and payments");
    expect(t.at(-1)).toBe("On the day");
  });

  it("skips what the signed venue and a hotel don't need", () => {
    expect(topics("VENUE")).not.toContain("Date and price");
    expect(topics("VENUE")).not.toContain("Contract and payments");
    expect(topics("LODGING")).toContain("Contract and payments");
    expect(topics("LODGING")).not.toContain("On the day");
    expect(topics("OTHER")).toEqual(FOR_EVERY_VENDOR.map((t) => t.topic));
  });

  it("asks about the real date, a Thursday, and the venue's 6:00 AM access", () => {
    const all = standardQuestions("FLORAL").map((q) => q.text);
    expect(all.some((q) => q.includes("Thursday, April 13, 2028"))).toBe(true);
    expect(all.some((q) => q.includes("6:00 AM"))).toBe(true);
    // Nothing assumes a Saturday wedding.
    expect(VENDOR_CATEGORIES.flatMap((c) => standardQuestions(c)).some((q) => /saturday wedding|on saturday/i.test(q.text))).toBe(false);
  });

  it("keeps the venue questions the couple started with", () => {
    const venue = standardQuestions("VENUE").map((q) => q.text);
    expect(venue).toContain("Is the $200 per person above 125 before or after NJ sales tax and service charge?");
    expect(venue).toContain("What is the indoor rain backup for the ceremony, and how many people does it hold?");
  });

  it("covers jumping the broom where it matters", () => {
    for (const c of ["OFFICIANT", "PHOTOGRAPHY", "PLANNER", "MUSIC_CEREMONY"] as const) {
      expect(standardQuestions(c).some((q) => /jumping the broom/i.test(q.text)), c).toBe(true);
    }
  });
});

describe("missing questions", () => {
  it("matches wording ignoring case and spacing", () => {
    const [first, second] = standardQuestions("CAKE");
    const have = [{ text: `  ${first.text.toUpperCase()}  ` }, { text: second.text.replace(/ /g, "   ") }];
    const missing = missingQuestions("CAKE", have);
    expect(missing).toHaveLength(standardQuestions("CAKE").length - 2);
    expect(missing.map((q) => q.text)).not.toContain(first.text);
  });

  it("is empty once every guide question is there", () => {
    expect(missingQuestions("MUSIC_DJ", standardQuestions("MUSIC_DJ"))).toEqual([]);
  });
});

describe("grouping a vendor's questions", () => {
  it("keeps topics in the order they first appear, with our own questions last", () => {
    const groups = groupByTopic([
      { id: "a", topic: "Date and price" },
      { id: "b", topic: null },
      { id: "c", topic: "The menu" },
      { id: "d", topic: "Date and price" },
    ]);
    expect(groups.map((g) => g.topic)).toEqual(["Date and price", "The menu", "Our own questions"]);
    expect(groups[0].questions.map((q) => q.id)).toEqual(["a", "d"]);
  });

  it("has no extra group when every question has a topic", () => {
    expect(groupByTopic([{ topic: "On the day" }]).map((g) => g.topic)).toEqual(["On the day"]);
    expect(groupByTopic([])).toEqual([]);
  });
});
