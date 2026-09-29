import Link from "next/link";
import { Tag } from "@/components/guests/bits";
import type { DietaryRow, MealSummary, MealTotal } from "@/lib/domain/meals";

// Pieces shared by /meals and its printout, so the venue gets exactly what the page shows.
// `print-rule` / `print-hair` let the print stylesheet darken hairlines on paper.

const n = (x: number) => x.toLocaleString("en-US");

/** Counts by meal choice: attending, pending, total. Four narrow columns that fit a phone. */
export function ChoiceTable({ summary }: { summary: MealSummary }) {
  const { choices, noChoice } = summary;
  return (
    <table className="w-full border-collapse text-[14px] print:text-[10pt]">
      <caption className="sr-only">Meals by choice. Pending guests are counted as coming.</caption>
      <thead>
        <tr className="print-rule border-b border-chocolate/70">
          <th scope="col" className="label-caps pb-2 text-left text-[10px] font-medium">
            Meal
          </th>
          <th scope="col" className="label-caps w-[4.5rem] pb-2 text-right text-[10px] font-medium sm:w-24">
            Attending
          </th>
          <th scope="col" className="label-caps w-[4.25rem] pb-2 text-right text-[10px] font-medium sm:w-24">
            Pending
          </th>
          <th scope="col" className="label-caps w-12 pb-2 text-right text-[10px] font-medium sm:w-20">
            Total
          </th>
        </tr>
      </thead>
      <tbody className="num">
        {choices.map((c) => (
          <tr key={c.key} className="print-hair border-b border-rule">
            <th scope="row" className="py-2.5 pr-2 text-left font-normal break-words print:py-1">
              {c.label}
            </th>
            <td className="py-2.5 text-right print:py-1">{n(c.attending)}</td>
            <td className="py-2.5 text-right text-cocoa print:py-1">{n(c.pending)}</td>
            <td className="py-2.5 text-right font-medium print:py-1">{n(c.total)}</td>
          </tr>
        ))}
        {noChoice.total > 0 ? (
          <tr className="print-hair border-b border-rule text-muted">
            <th scope="row" className="py-2.5 pr-2 text-left font-normal italic print:py-1">
              No choice yet
            </th>
            <td className="py-2.5 text-right print:py-1">{n(noChoice.attending)}</td>
            <td className="py-2.5 text-right print:py-1">{n(noChoice.pending)}</td>
            <td className="py-2.5 text-right print:py-1">{n(noChoice.total)}</td>
          </tr>
        ) : null}
      </tbody>
      <tfoot className="num">
        <tr className="print-rule border-t border-chocolate/70">
          <th scope="row" className="pt-2.5 pr-2 text-left font-medium print:pt-1.5">
            All guests
          </th>
          <td className="pt-2.5 text-right font-medium print:pt-1.5">{n(summary.attending)}</td>
          <td className="pt-2.5 text-right font-medium print:pt-1.5">{n(summary.pending)}</td>
          <td className="pt-2.5 text-right font-semibold print:pt-1.5">{n(summary.guests)}</td>
        </tr>
      </tfoot>
    </table>
  );
}

/** One line under the table about the children in those counts. */
export function ChildrenLine({ summary }: { summary: MealSummary }) {
  const c = summary.children;
  if (c.total === 0) return <p className="text-[13px] text-muted print:text-[9pt]">No children on the list.</p>;
  return (
    <p className="num text-[13px] text-cocoa print:text-[9pt]">
      Includes {n(c.total)} {c.total === 1 ? "child" : "children"} ({n(c.attending)} attending, {n(c.pending)} pending).
    </p>
  );
}

/** Every dietary note. A 4-column grid on wide screens and paper; stacked on phones. */
export function DietaryList({ rows, links = true }: { rows: DietaryRow[]; links?: boolean }) {
  const grid = "sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_5.5rem_minmax(0,1.5fr)] print:grid-cols-[1.6in_1.6in_0.8in_minmax(0,1fr)]";
  return (
    <div className="grid">
      <div aria-hidden className={`label-caps print-rule hidden gap-x-4 border-b border-chocolate/70 pb-2 text-[10px] sm:grid print:grid ${grid}`}>
        <span>Guest</span>
        <span>Household</span>
        <span>Table</span>
        <span>Note</span>
      </div>
      <ul>
        {rows.map((d) => (
          <li
            key={d.id}
            className={`print-hair grid gap-x-4 gap-y-0.5 border-b border-rule py-3 break-inside-avoid last:border-b-0 print:py-1 print:text-[9.5pt] ${grid}`}
          >
            <span className="min-w-0">
              {links ? (
                <Link href={`/guests/${d.id}`} className="underline-offset-4 hover:text-rose-ink hover:underline">
                  {d.fullName}
                </Link>
              ) : (
                d.fullName
              )}
              {d.isChild || d.pending ? (
                <span className="ml-2 inline-flex gap-1.5 align-middle print:hidden">
                  {d.isChild ? <Tag>Child</Tag> : null}
                  {d.pending ? <Tag tone="gold">Pending</Tag> : null}
                </span>
              ) : null}
              {d.isChild || d.pending ? (
                <span className="hidden print:inline">
                  {` (${[d.isChild ? "child" : null, d.pending ? "pending" : null].filter(Boolean).join(", ")})`}
                </span>
              ) : null}
            </span>
            <span className="min-w-0 text-[13px] text-cocoa print:text-[9.5pt]">
              {d.householdName}
              <span className="sm:hidden print:hidden"> · {d.tableLabel ?? "Not seated"}</span>
            </span>
            <span className={`hidden text-[13px] sm:block print:block print:text-[9.5pt] ${d.tableLabel ? "text-cocoa" : "text-muted"}`}>
              {d.tableLabel ?? "Not seated"}
            </span>
            <span className="mt-1 min-w-0 text-[15px] text-chocolate sm:mt-0 print:text-[9.5pt]">
              {d.note}
              {d.mealChoice ? <span className="block text-[12px] text-muted print:text-[8.5pt]">Meal: {d.mealChoice}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type VendorMealRow = { id: string; name: string; categoryLabel: string; mealsRequired: number };

export function VendorMealList({ rows, total, links = true }: { rows: VendorMealRow[]; total: number; links?: boolean }) {
  return (
    <ul className="num grid text-[14px] print:text-[10pt]">
      {rows.map((v) => (
        <li key={v.id} className="print-hair flex items-baseline justify-between gap-4 border-b border-rule py-2.5 print:py-1">
          <span className="min-w-0">
            {links ? (
              <Link href={`/vendors/${v.id}`} className="underline-offset-4 hover:text-rose-ink hover:underline">
                {v.name}
              </Link>
            ) : (
              v.name
            )}
            <span className="ml-2 text-[12px] text-muted print:text-[8.5pt]">{v.categoryLabel}</span>
          </span>
          <span className="shrink-0">{v.mealsRequired}</span>
        </li>
      ))}
      <li className="print-rule flex items-baseline justify-between gap-4 border-t border-chocolate/70 pt-2.5 font-medium print:pt-1.5">
        <span>Vendor meals</span>
        <span>{total}</span>
      </li>
    </ul>
  );
}

/** How the meal total relates to the headcount the budget uses, in a sentence. */
export function HeadcountNote({ total, links = true }: { total: MealTotal; links?: boolean }) {
  const settings = links ? (
    <Link href="/settings" className="text-rose-ink underline underline-offset-4 hover:text-chocolate">
      Settings
    </Link>
  ) : (
    "Settings"
  );
  switch (total.reason) {
    case "same":
      return <>That matches the headcount the budget uses: {n(total.headcount)}.</>;
    case "vendors-not-billed":
      return (
        <>
          The budget&apos;s headcount is {n(total.headcount)}, because the venue doesn&apos;t bill the {n(total.vendorMeals)} vendor{" "}
          {total.vendorMeals === 1 ? "meal" : "meals"} as guests ({settings}). The kitchen still makes them.
        </>
      );
    case "no-guest-list":
      return <>Until a guest list exists, the budget uses the planned headcount of {n(total.headcount)}.</>;
    default:
      return (
        <>
          The budget&apos;s headcount is {n(total.headcount)}, {n(Math.abs(total.difference))} {total.difference > 0 ? "fewer" : "more"}. Reload
          the page; if it stays different, check the vendor meal setting in {settings}.
        </>
      );
  }
}

export const PASSOVER_NOTE =
  "Passover runs from the evening of Monday, April 10 through Tuesday, April 18, 2028, so the wedding falls in the middle of it. Ask guests who keep Passover whether they need kosher-for-Passover meals, and tell the venue early.";
