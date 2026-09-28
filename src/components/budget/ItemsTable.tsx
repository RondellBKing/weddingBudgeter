"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { saveItemField } from "@/app/(app)/budget/actions";
import { InlineEdit } from "@/components/budget/InlineEdit";
import { inputClass } from "@/components/form/Fields";
import { formatDate, type CalendarDate } from "@/lib/dates";
import { filterItemRows, sortItemRows, type ItemTableRow, type SortKey } from "@/lib/domain/payments";
import { centsToInputValue, formatCents } from "@/lib/money";

const COLUMNS: Array<{ key: SortKey; label: string; numeric?: boolean }> = [
  { key: "category", label: "Category" },
  { key: "description", label: "Item" },
  { key: "vendor", label: "Vendor" },
  { key: "estimate", label: "Estimate", numeric: true },
  { key: "contracted", label: "Contracted", numeric: true },
  { key: "paid", label: "Paid", numeric: true },
  { key: "leftToPay", label: "Left to pay", numeric: true },
  { key: "nextDue", label: "Next due", numeric: true },
];

const money = (c: number | null) => (c === null ? "—" : formatCents(c));

export function ItemsTable({
  rows,
  categories,
  vendors,
}: {
  rows: ItemTableRow[];
  categories: Array<{ id: string; name: string }>;
  vendors: Array<{ id: string; name: string }>;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "category", dir: "asc" });
  const [categoryId, setCategoryId] = useState("");
  const [vendorId, setVendorId] = useState("");

  const shown = useMemo(
    () => sortItemRows(filterItemRows(rows, { categoryId, vendorId }), sort.key, sort.dir),
    [rows, categoryId, vendorId, sort],
  );
  const totals = shown.reduce(
    (t, r) => ({
      estimate: t.estimate + (r.estimateCents ?? 0),
      contracted: t.contracted + (r.contractedCents ?? 0),
      paid: t.paid + r.paid,
      left: t.left + r.leftToPay,
    }),
    { estimate: 0, contracted: 0, paid: 0, left: 0 },
  );

  const sortBy = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  const editMoney = (r: ItemTableRow, field: "estimate" | "contracted") => (
    <InlineEdit
      kind="money"
      align="right"
      label={`${field === "estimate" ? "estimate" : "contracted amount"} for ${r.description}`}
      value={centsToInputValue(field === "estimate" ? r.estimateCents : r.contractedCents)}
      display={money(field === "estimate" ? r.estimateCents : r.contractedCents)}
      onSave={(v) => saveItemField(r.id, field, v)}
    />
  );

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end gap-4">
        <label className="grid gap-1.5">
          <span className="label-caps">Category</span>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={`${inputClass} w-56 py-2`}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="label-caps">Vendor</span>
          <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className={`${inputClass} w-56 py-2`}>
            <option value="">All vendors</option>
            <option value="none">No vendor yet</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        <p className="pb-2 text-[13px] text-muted">Click an amount or a name to change it.</p>
      </div>

      {shown.length === 0 ? (
        <p className="border-y border-rule py-6 text-center text-cocoa">No budget items match.</p>
      ) : (
        <>
          {/* Phones: stacked rows */}
          <ul className="sm:hidden">
            {shown.map((r) => (
              <li key={r.id} className="grid gap-1.5 border-b border-rule py-4 last:border-b-0">
                <div className="flex items-baseline justify-between gap-3">
                  <Link href={`/budget/items/${r.id}`} className="min-w-0 text-[15px] underline-offset-4 hover:underline">
                    {r.description}
                  </Link>
                  <span className="shrink-0 text-xs text-muted">{r.categoryName}</span>
                </div>
                {r.vendorName ? <p className="text-xs text-muted">{r.vendorName}</p> : null}
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <dt className="label-caps self-center text-[10px]">Estimate</dt>
                  <dd className="num text-right">{editMoney(r, "estimate")}</dd>
                  <dt className="label-caps self-center text-[10px]">Contracted</dt>
                  <dd className="num text-right">{editMoney(r, "contracted")}</dd>
                  <dt className="label-caps text-[10px]">Paid · left</dt>
                  <dd className="num text-right">
                    {formatCents(r.paid)} · {formatCents(r.leftToPay)}
                  </dd>
                  {r.nextDue ? (
                    <>
                      <dt className="label-caps text-[10px]">Next due</dt>
                      <dd className="num text-right">{formatDate(r.nextDue as CalendarDate, "medium")}</dd>
                    </>
                  ) : null}
                </dl>
              </li>
            ))}
          </ul>

          {/* Wider screens: a real table */}
          <div className="max-sm:hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-chocolate/70">
                  {COLUMNS.map((c) => {
                    const active = sort.key === c.key;
                    return (
                      <th
                        key={c.key}
                        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                        className={`py-2 font-medium ${c.numeric ? "px-2 text-right" : "pr-3 text-left"}`}
                      >
                        <button
                          type="button"
                          onClick={() => sortBy(c.key)}
                          className={`label-caps inline-flex items-center gap-1 ${active ? "text-chocolate" : ""}`}
                        >
                          {c.label}
                          <span aria-hidden className="text-[9px]">
                            {active ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                          </span>
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} className="border-b border-rule align-baseline last:border-b-0">
                    <td className="py-3 pr-3 text-cocoa">{r.categoryName}</td>
                    <td className="py-3 pr-3">
                      <span className="flex items-baseline gap-2">
                        <InlineEdit
                          label={`name of ${r.description}`}
                          value={r.description}
                          display={r.description}
                          onSave={(v) => saveItemField(r.id, "description", v)}
                        />
                        <Link href={`/budget/items/${r.id}`} className="shrink-0 text-xs text-rose-ink hover:text-chocolate">
                          Payments
                        </Link>
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-cocoa">{r.vendorName ?? <span className="text-muted">—</span>}</td>
                    <td className="num px-2 py-3 text-right">{editMoney(r, "estimate")}</td>
                    <td className="num px-2 py-3 text-right">{editMoney(r, "contracted")}</td>
                    <td className="num px-2 py-3 text-right">{money(r.paid || null)}</td>
                    <td className="num px-2 py-3 text-right">{money(r.leftToPay || null)}</td>
                    <td className="num py-3 pl-2 text-right whitespace-nowrap text-cocoa">
                      {r.nextDue ? formatDate(r.nextDue as CalendarDate, "medium") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-chocolate/70 font-medium">
                  <td className="label-caps py-3 pr-3" colSpan={3}>
                    {shown.length} {shown.length === 1 ? "item" : "items"}
                  </td>
                  <td className="num px-2 py-3 text-right">{formatCents(totals.estimate)}</td>
                  <td className="num px-2 py-3 text-right">{formatCents(totals.contracted)}</td>
                  <td className="num px-2 py-3 text-right">{formatCents(totals.paid)}</td>
                  <td className="num px-2 py-3 text-right">{formatCents(totals.left)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
