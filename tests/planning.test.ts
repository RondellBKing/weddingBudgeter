import { describe, expect, it } from "vitest";
import { cd } from "../src/lib/dates";
import { chapterRanges, journeyStats, planningChapters, type JourneyEntry } from "../src/lib/domain/planning";

const W = cd("2028-04-13");
const e = (id: string, date: string, kind: JourneyEntry["kind"] = "milestone", done = false): JourneyEntry => ({
  id,
  kind,
  date: cd(date),
  title: id,
  notes: null,
  done,
  href: "/tasks",
});

describe("planning timeline", () => {
  it("counts chapters back from the wedding, with no gaps between them", () => {
    const r = chapterRanges(W);
    expect(r.map((c) => c.key)).toEqual(["foundations", "twelve", "nine", "six", "three", "final", "week", "day", "after"]);
    for (let i = 1; i < r.length; i++) expect(r[i].from).toBe(r[i - 1].until);
    expect(r.find((c) => c.key === "twelve")!.from).toBe("2027-04-13");
    expect(r.find((c) => c.key === "week")!.from).toBe("2028-04-06");
    expect(r.find((c) => c.key === "day")).toMatchObject({ from: "2028-04-13", until: "2028-04-14" });
  });

  it("puts each entry in its chapter, in date order, milestones first on a shared day", () => {
    const chapters = planningChapters(
      [
        e("wedding", "2028-04-13"),
        e("preview", "2026-11-16", "appointment"),
        e("contract", "2026-04-18", "milestone", true),
        e("party", "2026-10-13"),
        e("rehearsal", "2028-04-12"),
        e("same-day-appt", "2026-10-13", "appointment"),
        e("thanks", "2028-06-13"),
      ],
      W,
      cd("2026-09-29"),
    );
    expect(chapters.map((c) => c.key)).toEqual(["foundations", "week", "day", "after"]);
    expect(chapters[0].entries.map((x) => x.id)).toEqual(["contract", "party", "same-day-appt", "preview"]);
  });

  it("marks where today falls: after the contract, before what's still ahead", () => {
    const [first] = planningChapters([e("contract", "2026-04-18", "milestone", true), e("party", "2026-10-13")], W, cd("2026-09-29"));
    expect(first.current).toBe(true);
    expect(first.todayAt).toBe(1);
  });

  it("keeps an empty chapter when today is in it, so the marker still shows", () => {
    const chapters = planningChapters([e("contract", "2026-04-18", "milestone", true)], W, cd("2027-05-01"));
    const current = chapters.find((c) => c.current)!;
    expect(current.key).toBe("twelve");
    expect(current.entries).toHaveLength(0);
    expect(current.todayAt).toBe(0);
  });

  it("sums up what's done and what's next", () => {
    const s = journeyStats(
      [e("contract", "2026-04-18", "milestone", true), e("preview", "2026-11-16", "appointment"), e("party", "2026-10-13"), e("late", "2026-09-01")],
      cd("2026-09-29"),
    );
    expect(s).toMatchObject({ milestones: 3, done: 1, appointmentsAhead: 1 });
    expect(s.next?.id).toBe("party");
  });
});
