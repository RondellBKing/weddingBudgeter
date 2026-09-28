"use client";

import { useTransition } from "react";
import { deleteCategory, saveCategoryField, setCategoryClosed } from "@/app/(app)/budget/actions";
import { InlineEdit } from "@/components/budget/InlineEdit";
import { ConfirmButton } from "@/components/form/ConfirmButton";
import { centsToInputValue, formatCents } from "@/lib/money";

export type CategoryRowView = {
  id: string;
  name: string;
  estimateCents: number;
  committed: number;
  paid: number;
  leftToPay: number;
  overrun: number;
  isContingency: boolean;
  isClosed: boolean;
  itemCount: number;
};

function status(c: CategoryRowView, contingencyAvailable: number) {
  if (c.isContingency) return { text: `${formatCents(contingencyAvailable)} available`, cls: "text-gold-ink" };
  if (c.overrun > 0) return { text: `Over by ${formatCents(c.overrun)}`, cls: "text-brick font-medium" };
  if (c.isClosed) return { text: "Closed", cls: "text-muted" };
  if (c.committed > 0) return { text: "Under contract", cls: "text-garden-ink" };
  return { text: "Nothing booked yet", cls: "text-muted" };
}

function RowActions({ c }: { c: CategoryRowView }) {
  const [pending, start] = useTransition();
  if (c.isContingency) return null;
  return (
    <span className={`inline-flex flex-wrap items-center justify-end gap-3 text-xs ${pending ? "opacity-60" : ""}`}>
      <button
        type="button"
        className="text-[12px] text-rose-ink hover:text-chocolate"
        onClick={() => start(() => setCategoryClosed(c.id, !c.isClosed))}
        title={c.isClosed ? "Reopen this category" : "Close it: everything is bought, so any unspent estimate goes back to the contingency"}
      >
        {c.isClosed ? "Reopen" : "Close"}
      </button>
      {c.itemCount === 0 ? (
        <ConfirmButton variant="quiet" action={deleteCategory.bind(null, c.id)} question={`Delete ${c.name}?`} confirmLabel="Delete">
          Delete
        </ConfirmButton>
      ) : null}
    </span>
  );
}

export function CategoryTable({ rows, contingencyAvailable }: { rows: CategoryRowView[]; contingencyAvailable: number }) {
  const nameEdit = (c: CategoryRowView) => (
    <InlineEdit label={`name of ${c.name}`} value={c.name} display={c.name} onSave={(v) => saveCategoryField(c.id, "name", v)} />
  );
  const estimateEdit = (c: CategoryRowView) => (
    <InlineEdit
      kind="money"
      align="right"
      label={`estimate for ${c.name}`}
      value={centsToInputValue(c.estimateCents)}
      display={formatCents(c.estimateCents)}
      onSave={(v) => saveCategoryField(c.id, "estimate", v)}
    />
  );

  return (
    <>
      <ul className="sm:hidden">
        {rows.map((c) => {
          const s = status(c, contingencyAvailable);
          return (
            <li key={c.id} className={`grid gap-1 border-b border-rule py-3.5 last:border-b-0 ${c.isContingency ? "-mx-3 bg-linen/40 px-3" : ""}`}>
              <div className="flex items-baseline justify-between gap-3">
                <span className={c.isContingency ? "border-l-2 border-gold pl-2" : ""}>{nameEdit(c)}</span>
                <span className="num">{estimateEdit(c)}</span>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs">
                <span className={s.cls}>{s.text}</span>
                {c.committed > 0 ? (
                  <span className="num text-muted">
                    {formatCents(c.paid)} paid of {formatCents(c.committed)}
                  </span>
                ) : null}
              </div>
              <RowActions c={c} />
            </li>
          );
        })}
      </ul>

      <table className="w-full text-sm max-sm:hidden">
        <thead>
          <tr className="border-b border-chocolate/70 text-left">
            <th className="label-caps py-2 pr-3 font-medium">Category</th>
            <th className="label-caps px-2 py-2 text-right font-medium">Estimate</th>
            <th className="label-caps px-2 py-2 text-right font-medium">Committed</th>
            <th className="label-caps px-2 py-2 text-right font-medium">Paid</th>
            <th className="label-caps px-2 py-2 text-right font-medium">Left to pay</th>
            <th className="label-caps py-2 pl-2 text-right font-medium">Status</th>
            <th className="w-32 py-2" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const s = status(c, contingencyAvailable);
            return (
              <tr key={c.id} className={`border-b border-rule align-baseline last:border-b-0 ${c.isContingency ? "bg-linen/40" : ""}`}>
                <td className="py-3 pr-3">
                  <span className={c.isContingency ? "border-l-2 border-gold pl-2" : ""}>{nameEdit(c)}</span>
                </td>
                <td className="num px-2 py-3 text-right">{estimateEdit(c)}</td>
                <td className="num px-2 py-3 text-right">{c.committed ? formatCents(c.committed) : "—"}</td>
                <td className="num px-2 py-3 text-right">{c.paid ? formatCents(c.paid) : "—"}</td>
                <td className="num px-2 py-3 text-right">{c.leftToPay ? formatCents(c.leftToPay) : "—"}</td>
                <td className={`py-3 pl-2 text-right ${s.cls}`}>{s.text}</td>
                <td className="py-3 pl-3 text-right">
                  <RowActions c={c} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
