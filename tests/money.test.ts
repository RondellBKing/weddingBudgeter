import { describe, expect, it } from "vitest";
import {
  applyPpm,
  centsToInputValue,
  formatCents,
  formatPercent,
  parseMoneyToCents,
  parsePercentToPpm,
  ppmToPercentString,
} from "../src/lib/money";

describe("parseMoneyToCents", () => {
  it.each([
    ["$1,234.56", 123_456],
    ["1234.56", 123_456],
    ["15650", 1_565_000],
    ["$15,650.00", 1_565_000],
    ["0.29", 29], // 0.29 * 100 is 28.999999999999996 in floating point
    ["1.1", 110],
    [".5", 50],
    ["$ 200", 20_000],
    ["-$5.00", -500],
    ["1,000,000.01", 100_000_001],
  ])("parses %s", (input, cents) => {
    expect(parseMoneyToCents(input)).toBe(cents);
  });

  it.each(["", "abc", "1.234", "1,23", "$", "12,34.00", "1.2.3", "--5"])("rejects %j", (input) => {
    expect(parseMoneyToCents(input)).toBeNull();
  });
});

describe("formatCents", () => {
  it("drops cents on whole dollars and keeps them otherwise", () => {
    expect(formatCents(5_400_000)).toBe("$54,000");
    expect(formatCents(1_565_050)).toBe("$15,650.50");
    expect(formatCents(0)).toBe("$0");
  });
  it("can always show cents", () => {
    expect(formatCents(1_565_000, { cents: "always" })).toBe("$15,650.00");
    expect(formatCents(5, { cents: "always" })).toBe("$0.05");
  });
  it("formats negatives with a real minus sign", () => {
    expect(formatCents(-100_000)).toBe("−$1,000");
  });
  it("rounds half up when hiding cents", () => {
    expect(formatCents(149, { cents: "never" })).toBe("$1");
    expect(formatCents(150, { cents: "never" })).toBe("$2");
  });
  it("refuses fractional cents", () => {
    expect(() => formatCents(10.5)).toThrow();
  });
  it("round-trips through the input format", () => {
    expect(parseMoneyToCents(centsToInputValue(1_565_050))).toBe(1_565_050);
  });
});

describe("rates", () => {
  it("applies NJ sales tax in parts per million without float drift", () => {
    expect(applyPpm(20_000, 66_250)).toBe(1_325);
    expect(applyPpm(360_000, 66_250)).toBe(23_850);
  });
  it("parses and prints percentages", () => {
    expect(parsePercentToPpm("6.625")).toBe(66_250);
    expect(parsePercentToPpm("6.625%")).toBe(66_250);
    expect(parsePercentToPpm("0")).toBe(0);
    expect(parsePercentToPpm("abc")).toBeNull();
    expect(ppmToPercentString(66_250)).toBe("6.625");
    expect(ppmToPercentString(0)).toBe("0");
  });
  it("formats percentages", () => {
    expect(formatPercent(5_400_000, 10_000_000)).toBe("54%");
    expect(formatPercent(1, 3, 1)).toBe("33.3%");
  });
});
