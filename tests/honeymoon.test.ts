import { describe, expect, it } from "vitest";
import { buildChecklist, HONEYMOON_IDEAS, SETTINGS } from "../prisma/seed/data";
import { cd, formatDate } from "../src/lib/dates";
import { groupIdeas, passportValidUntil, SHORT_FLIGHT_HOURS, suggestedTrip, tripDatesError, tripNights } from "../src/lib/domain/honeymoon";

describe("the honeymoon dates", () => {
  it("suggests leaving two days after the wedding for eight nights: Saturday to Sunday", () => {
    const { departOn, returnOn } = suggestedTrip(SETTINGS.weddingDate);
    expect(departOn).toBe("2028-04-15");
    expect(returnOn).toBe("2028-04-23");
    expect(formatDate(departOn, "weekday-long")).toMatch(/^Saturday/);
    expect(formatDate(returnOn, "weekday-long")).toMatch(/^Sunday/);
    expect(tripNights(departOn, returnOn)).toBe(8);
  });

  it("only takes dates that make sense", () => {
    const wedding = cd("2028-04-13");
    expect(tripDatesError(wedding, null, null)).toBeNull();
    expect(tripDatesError(wedding, cd("2028-04-15"), cd("2028-04-23"))).toBeNull();
    expect(tripDatesError(wedding, cd("2028-04-13"), cd("2028-04-20"))).toBeNull(); // leaving that night is fine
    expect(tripDatesError(wedding, cd("2028-04-15"), null)).toMatch(/both/);
    expect(tripDatesError(wedding, cd("2028-04-10"), cd("2028-04-20"))).toMatch(/after the wedding/);
    expect(tripDatesError(wedding, cd("2028-04-20"), cd("2028-04-20"))).toMatch(/comes after/);
    expect(tripDatesError(wedding, cd("2028-04-15"), cd("2028-07-15"))).toMatch(/60 nights/);
  });

  it("asks for passports valid six months past the trip", () => {
    expect(passportValidUntil(cd("2028-04-23"))).toBe("2028-10-23");
  });
});

describe("the shortlist", () => {
  const idea = (name: string, flightHours: number | null, sortOrder = 0) => ({ name, flightHours, sortOrder });

  it("splits into a short flight, a long one and ideas without a flight time", () => {
    const groups = groupIdeas([idea("Maldives", 20, 5), idea("St. Lucia", 5, 0), idea("Somewhere", null, 9), idea("Turks", 4, 1)]);
    expect(groups.map((g) => g.key)).toEqual(["short", "long", "own"]);
    expect(groups[0].ideas.map((i) => i.name)).toEqual(["St. Lucia", "Turks"]);
    expect(groupIdeas([idea("Maui", 11)]).map((g) => g.key)).toEqual(["long"]);
  });

  it("seeds three short and three long trips, each with weather and the flight", () => {
    const short = HONEYMOON_IDEAS.filter((i) => i.flightHours <= SHORT_FLIGHT_HOURS);
    expect(short).toHaveLength(3);
    expect(HONEYMOON_IDEAS).toHaveLength(6);
    for (const i of HONEYMOON_IDEAS) {
      expect(i.weather, i.name).not.toBe("");
      expect(i.flight, i.name).toMatch(/hour/);
    }
    expect(new Set(HONEYMOON_IDEAS.map((i) => i.key)).size).toBe(HONEYMOON_IDEAS.length);
  });

  it("has a booking checklist timed for Easter week", () => {
    const tasks = buildChecklist().filter((t) => t.area === "HONEYMOON");
    const keys = tasks.map((t) => t.key);
    for (const k of ["honeymoon-choose", "honeymoon-passports", "honeymoon", "honeymoon-flights", "honeymoon-insurance"]) expect(keys, k).toContain(k);
    const due = (k: string) => tasks.find((t) => t.key === k)!.dueDate!;
    // Choose before booking, book the resort before the flights open, all well before the wedding.
    expect(due("honeymoon-choose") < due("honeymoon")).toBe(true);
    expect(due("honeymoon") <= due("honeymoon-flights")).toBe(true);
    expect(tasks.find((t) => t.key === "honeymoon-choose")?.isMilestone).toBe(true);
  });
});
