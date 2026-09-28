import { describe, expect, it } from "vitest";
import { centsForCsv, toCsv } from "../src/lib/csv";

describe("CSV export", () => {
  it("quotes commas, quotes and newlines", () => {
    const csv = toCsv([{ a: 'He said "hi", twice', b: "line1\nline2", c: 3 }], [
      { header: "A", value: (r) => r.a },
      { header: "B", value: (r) => r.b },
      { header: "C", value: (r) => r.c },
    ]);
    expect(csv).toBe('A,B,C\r\n"He said ""hi"", twice","line1\nline2",3\r\n');
  });

  it("neutralises spreadsheet formulas in text but not numbers", () => {
    const csv = toCsv([{ t: "=HYPERLINK(1)", n: -5 }], [
      { header: "T", value: (r) => r.t },
      { header: "N", value: (r) => r.n },
    ]);
    expect(csv).toBe("T,N\r\n'=HYPERLINK(1),-5\r\n");
  });

  it("writes money as plain decimals", () => {
    expect(centsForCsv(1_565_000)).toBe("15650.00");
    expect(centsForCsv(5)).toBe("0.05");
    expect(centsForCsv(null)).toBe("");
  });
});
