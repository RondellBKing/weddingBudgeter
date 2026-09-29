import { describe, expect, it } from "vitest";
import { cd } from "../src/lib/dates";
import {
  giftTotals,
  matchGuests,
  newestFirst,
  searchKey,
  thankYousOwed,
  thankYouState,
  thankYouWriteBy,
  waitedLabel,
} from "../src/lib/domain/gifts";

const wedding = cd("2028-04-13");

describe("thank-you guideline", () => {
  it("gives gifts before the wedding about two weeks", () => {
    expect(thankYouWriteBy(cd("2027-11-01"), wedding)).toEqual({ writeBy: cd("2027-11-15"), rule: "before-wedding" });
    // The day before the wedding is still "before".
    expect(thankYouWriteBy(cd("2028-04-12"), wedding)).toEqual({ writeBy: cd("2028-04-26"), rule: "before-wedding" });
  });

  it("gives gifts at or after the wedding about three months from the wedding", () => {
    expect(thankYouWriteBy(cd("2028-04-13"), wedding)).toEqual({ writeBy: cd("2028-07-13"), rule: "after-wedding" });
    expect(thankYouWriteBy(cd("2028-05-20"), wedding)).toEqual({ writeBy: cd("2028-07-13"), rule: "after-wedding" });
  });

  it("never makes a late-arriving gift late on arrival", () => {
    expect(thankYouWriteBy(cd("2028-07-10"), wedding)).toEqual({ writeBy: cd("2028-07-24"), rule: "after-wedding" });
  });

  it("is on time, then 'this week' for the last seven days, then late", () => {
    const by = cd("2027-11-15");
    expect(thankYouState(by, cd("2027-11-07"))).toEqual({ state: "on-time", daysLeft: 8 });
    expect(thankYouState(by, cd("2027-11-08"))).toEqual({ state: "soon", daysLeft: 7 });
    // Nov 7, 2027 is a 25-hour day in New York; still whole calendar days.
    expect(thankYouState(by, cd("2027-11-15"))).toEqual({ state: "soon", daysLeft: 0 });
    expect(thankYouState(by, cd("2027-11-16"))).toEqual({ state: "late", daysLeft: -1 });
  });
});

describe("how long a gift has waited", () => {
  it("uses days, then weeks, then months", () => {
    expect(waitedLabel(0)).toBe("Arrived today");
    expect(waitedLabel(1)).toBe("Waiting 1 day");
    expect(waitedLabel(13)).toBe("Waiting 13 days");
    expect(waitedLabel(14)).toBe("Waiting 2 weeks");
    expect(waitedLabel(59)).toBe("Waiting 8 weeks");
    expect(waitedLabel(60)).toBe("Waiting 2 months");
    expect(waitedLabel(100)).toBe("Waiting 3 months");
  });
});

describe("thank-yous still to write", () => {
  const today = cd("2027-12-01");
  const gifts = [
    { id: "thanked", receivedOn: cd("2027-10-01"), thankYouSentOn: cd("2027-10-09") },
    { id: "recent", receivedOn: cd("2027-11-28"), thankYouSentOn: null },
    { id: "oldest", receivedOn: cd("2027-10-20"), thankYouSentOn: null },
    { id: "same-day-a", receivedOn: cd("2027-11-20"), thankYouSentOn: null },
    { id: "same-day-b", receivedOn: cd("2027-11-20"), thankYouSentOn: null },
  ];

  it("lists only gifts with no thank-you, oldest first", () => {
    const owed = thankYousOwed(gifts, wedding, today);
    expect(owed.map((g) => g.id)).toEqual(["oldest", "same-day-a", "same-day-b", "recent"]);
    expect(owed[0]).toMatchObject({ waitedDays: 42, writeBy: "2027-11-03", state: "late", daysLeft: -28 });
    expect(owed[1]).toMatchObject({ waitedDays: 11, state: "soon", daysLeft: 3 });
    expect(owed[3]).toMatchObject({ waitedDays: 3, state: "on-time" });
  });

  it("totals received, sent and still to write", () => {
    expect(giftTotals(gifts, wedding, today)).toEqual({ received: 5, thanked: 1, toWrite: 4, late: 1 });
    expect(giftTotals([], wedding, today)).toEqual({ received: 0, thanked: 0, toWrite: 0, late: 0 });
  });

  it("orders the full log newest first", () => {
    expect(newestFirst(gifts).map((g) => g.id)[0]).toBe("recent");
  });
});

describe("finding a guest to link", () => {
  const people = [
    { id: "1", fullName: "Ava Rivera", householdName: "The Rivera Household" },
    { id: "2", fullName: "Marcus Brooks", householdName: "The Brooks Family" },
    { id: "3", fullName: "Zoë O'Neil", householdName: "O'Neil" },
    { id: "4", fullName: "Jada Rivers", householdName: "The Brooks Family" },
  ].map((g) => ({ ...g, key: searchKey(`${g.fullName} ${g.householdName}`) }));

  it("ignores case, accents and apostrophes", () => {
    expect(searchKey("Zoë O'Neil")).toBe("zoe oneil");
    expect(matchGuests(people, "zoe oneil").map((g) => g.id)).toEqual(["3"]);
  });

  it("matches names and households, name matches first", () => {
    expect(matchGuests(people, "riv").map((g) => g.id)).toEqual(["1", "4"]);
    expect(matchGuests(people, "brooks").map((g) => g.id)).toEqual(["2", "4"]);
    expect(matchGuests(people, "jada brooks").map((g) => g.id)).toEqual(["4"]);
  });

  it("returns nothing for an empty search and caps the list", () => {
    expect(matchGuests(people, "  ")).toEqual([]);
    expect(matchGuests(people, "a", 2)).toHaveLength(2);
  });
});
