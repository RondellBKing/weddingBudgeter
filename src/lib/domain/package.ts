import type { InclusionStatus, PackageSection } from "../../generated/prisma/enums";
import { PACKAGE_SECTION_LABEL } from "../labels";

// What a vendor's package covers, grouped the way a planner reads a contract. Pure functions.

export type PackageLine = {
  id: string;
  section: PackageSection;
  name: string;
  status: InclusionStatus;
  notes: string | null;
  /** What the package lets us pick here; null when there's nothing to pick. */
  choice: string | null;
  /** What we picked. */
  chosen: string | null;
  sortOrder: number;
};

const SECTION_ORDER = Object.keys(PACKAGE_SECTION_LABEL) as PackageSection[];

/** Sections in contract order (the space, ceremony, cocktail hour, dinner…), only those with lines. */
export function groupPackage<T extends PackageLine>(lines: T[]): Array<{ section: PackageSection; label: string; lines: T[] }> {
  return SECTION_ORDER.map((section) => ({
    section,
    label: PACKAGE_SECTION_LABEL[section],
    lines: lines.filter((l) => l.section === section).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
  })).filter((g) => g.lines.length > 0);
}

export type PackageSummary = Record<InclusionStatus, number> & { total: number };

export function packageSummary(lines: Array<{ status: InclusionStatus }>): PackageSummary {
  const s: PackageSummary = { INCLUDED: 0, EXTRA_COST: 0, NOT_INCLUDED: 0, TO_CONFIRM: 0, total: lines.length };
  for (const l of lines) s[l.status]++;
  return s;
}

/** "12 included · 1 costs extra · 14 to confirm", leaving out the zeros. */
export function summaryWords(s: PackageSummary): string {
  const parts = [
    s.INCLUDED ? `${s.INCLUDED} included` : null,
    s.EXTRA_COST ? `${s.EXTRA_COST} ${s.EXTRA_COST === 1 ? "costs" : "cost"} extra` : null,
    s.NOT_INCLUDED ? `${s.NOT_INCLUDED} not included` : null,
    s.TO_CONFIRM ? `${s.TO_CONFIRM} to confirm` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Nothing listed yet";
}

/** Lines that leave us something to pick and haven't been picked yet, in contract order. Lines marked not included don't count. */
export function openChoices<T extends PackageLine>(lines: T[]): T[] {
  return groupPackage(lines)
    .flatMap((g) => g.lines)
    .filter((l) => l.choice !== null && l.chosen === null && l.status !== "NOT_INCLUDED");
}

/** Split for display: what's in (or still to confirm), and what the contract marks not included. */
export function splitIncluded<T extends PackageLine>(lines: T[]): { inPackage: T[]; notIncluded: T[] } {
  return { inPackage: lines.filter((l) => l.status !== "NOT_INCLUDED"), notIncluded: lines.filter((l) => l.status === "NOT_INCLUDED") };
}

/** The next position at the end of a section. */
export function nextPackageOrder(lines: Array<{ sortOrder: number }>): number {
  return lines.reduce((m, l) => Math.max(m, l.sortOrder), -1) + 1;
}
