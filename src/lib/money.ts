// Money is always an integer number of cents. Nothing in this file uses floating-point
// arithmetic on money: parsing works on the digit string, and formatting splits the integer.

export type Cents = number;

const MONEY_PATTERN = /^(-)?\$?\s*((?:\d{1,3}(?:,\d{3})+)|\d+)?(?:\.(\d{0,2}))?$/;

/**
 * Parse user input like "$1,234.56", "1234.5", "15650", ".99" into integer cents.
 * Returns null for anything that isn't a clean money amount (including more than 2 decimals).
 */
export function parseMoneyToCents(input: string): Cents | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  const match = MONEY_PATTERN.exec(trimmed);
  if (!match) return null;
  const [, minus, wholeRaw, fracRaw] = match;
  if (wholeRaw === undefined && (fracRaw === undefined || fracRaw === "")) return null;
  const whole = wholeRaw ? Number(wholeRaw.replaceAll(",", "")) : 0;
  const frac = fracRaw ? Number(fracRaw.padEnd(2, "0")) : 0;
  const cents = whole * 100 + frac;
  if (!Number.isSafeInteger(cents)) return null;
  return minus ? -cents : cents;
}

const dollarsFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/**
 * Format cents as dollars. By default whole-dollar amounts drop the cents ("$54,000")
 * and anything with cents shows them ("$15,650.50").
 */
export function formatCents(
  cents: Cents,
  opts: { cents?: "auto" | "always" | "never"; signDisplay?: "auto" | "always" } = {},
): string {
  const mode = opts.cents ?? "auto";
  if (!Number.isInteger(cents)) throw new Error(`formatCents expects integer cents, got ${cents}`);
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const dollars = Math.trunc(abs / 100);
  const rem = abs % 100;
  const showCents = mode === "always" || (mode === "auto" && rem !== 0);
  let body = "$" + dollarsFormatter.format(dollars);
  if (showCents) body += "." + String(rem).padStart(2, "0");
  if (mode === "never" && rem >= 50) {
    body = "$" + dollarsFormatter.format(dollars + 1);
  }
  if (negative) return "−" + body;
  if (opts.signDisplay === "always" && cents > 0) return "+" + body;
  return body;
}

/** Cents → plain editable string for form inputs ("15650.00" style without symbols). */
export function centsToInputValue(cents: Cents | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const s = `${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
  return negative ? `-${s}` : s;
}

/** Round half away from zero for integer division results. */
function roundDiv(numerator: number, denominator: number): number {
  const q = numerator / denominator;
  return q >= 0 ? Math.floor(q + 0.5) : -Math.floor(-q + 0.5);
}

/** Apply a rate expressed in parts per million (6.625% = 66250) to an amount in cents. */
export function applyPpm(cents: Cents, ppm: number): Cents {
  if (!Number.isInteger(cents) || !Number.isInteger(ppm)) {
    throw new Error("applyPpm expects integers");
  }
  return roundDiv(cents * ppm, 1_000_000);
}

/** Percent as a string with a fixed number of decimals, computed without accumulating float error. */
export function formatPercent(part: number, whole: number, decimals = 0): string {
  if (whole === 0) return "0%";
  const scale = 10 ** decimals;
  const scaled = roundDiv(part * 100 * scale, whole);
  return `${(scaled / scale).toFixed(decimals)}%`;
}

/** Percent 0–100 as an integer, for meters. Clamped. */
export function percentInt(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.max(0, Math.min(100, roundDiv(part * 100, whole)));
}

/** Parse a percentage string like "6.625" or "6.625%" into parts per million. */
export function parsePercentToPpm(input: string): number | null {
  const m = /^\s*(\d{1,3})(?:\.(\d{0,4}))?\s*%?\s*$/.exec(input);
  if (!m) return null;
  const whole = Number(m[1]);
  const frac = Number((m[2] ?? "").padEnd(4, "0"));
  return whole * 10_000 + frac;
}

/** Parts per million → percent string for display/inputs ("6.625"). */
export function ppmToPercentString(ppm: number): string {
  const whole = Math.trunc(ppm / 10_000);
  const frac = String(ppm % 10_000).padStart(4, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : String(whole);
}
