import Link from "next/link";
import { markDecor } from "@/app/(app)/design/actions";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Ring } from "@/components/ui/Ring";
import type { DecorRow } from "@/lib/data/design";
import { daysBetween, formatDate, relativeDays, type CalendarDate } from "@/lib/dates";
import {
  decorStatus,
  decorSummary,
  groupByArea,
  nextDecorStep,
  DECOR_STEP_LABEL,
  type DecorStatus,
  type DecorStatusKey,
  type DecorTone,
} from "@/lib/domain/design";
import { DECOR_SOURCE_LABEL, DESIGN_AREA_LABEL, valuesOf } from "@/lib/labels";
import { DecorDot, DecorStatusBadge } from "./DecorStatusBadge";
import { PendingButton } from "./PendingButton";

const AREAS = valuesOf(DESIGN_AREA_LABEL);

export function newDecorHref(area: string | null) {
  const q = new URLSearchParams();
  if (area) q.set("area", area);
  return `/design/decor/new${q.size ? `?${q}` : ""}`;
}

const editHref = (id: string) => `/design/decor/${id}`;

type Row = DecorRow & { status: DecorStatus };

// ─── Summary ────────────────────────────────────────────────────────────────────

const COUNTS: Array<{ label: string; keys: DecorStatusKey[]; tone: DecorTone }> = [
  { label: "Ideas", keys: ["idea"], tone: "neutral" },
  { label: "Ordered", keys: ["ordered"], tone: "progress" },
  { label: "Received", keys: ["received"], tone: "on-track" },
  { label: "To go back", keys: ["return-due", "return-overdue"], tone: "due-soon" },
  { label: "Returned", keys: ["returned"], tone: "on-track" },
];

function Summary({ items, today }: { items: DecorRow[]; today: CalendarDate }) {
  const s = decorSummary(items, today);
  const byId = new Map(items.map((i) => [i.id, i]));
  return (
    <Card as="section" aria-labelledby="decor-summary-h" className="grid gap-6 p-6 sm:p-8">
      <h2 id="decor-summary-h" className="sr-only">
        Where everything stands
      </h2>
      <div className="grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-10">
        <Ring
          size={132}
          thickness={9}
          total={s.total}
          label={`${s.inHand} of ${s.total} pieces in hand`}
          segments={[{ label: "In hand", value: s.inHand, className: "stroke-garden" }]}
        >
          <div className="grid gap-0.5">
            <span className="num font-display text-3xl leading-none">
              {s.inHand}
              <span className="text-lg text-muted">/{s.total}</span>
            </span>
            <span className="text-[11px] text-muted">in hand</span>
          </div>
        </Ring>
        <dl className="grid grid-cols-3 gap-x-4 gap-y-5 sm:grid-cols-5">
          {COUNTS.map((c) => (
            <div key={c.label} className="flex flex-col-reverse justify-end gap-1.5">
              <dt className="label-caps flex items-center gap-1.5 text-[10px]">
                <DecorDot tone={c.tone} />
                {c.label}
              </dt>
              <dd className="num font-display text-[34px] leading-none">{c.keys.reduce((n, k) => n + s.counts[k], 0)}</dd>
            </div>
          ))}
        </dl>
      </div>

      {s.overdue.length > 0 ? (
        <div className="relative grid gap-3 overflow-hidden rounded-[3px] border border-brick/35 bg-paper px-5 py-5 sm:px-6">
          <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-brick" />
          <h3 className="flex items-center gap-2 font-sans text-[11px] font-semibold tracking-[0.14em] text-brick uppercase">
            <Icon name="clock" size={14} />
            Return overdue: {s.overdue.length} {s.overdue.length === 1 ? "piece" : "pieces"}
          </h3>
          <ul className="grid">
            {s.overdue.map((o) => {
              const item = byId.get(o.id)!;
              return (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-rule py-3 last:border-b-0 last:pb-0">
                  <p className="min-w-0 text-[14px]">
                    <Link href={editHref(o.id)} className="text-chocolate underline-offset-4 hover:underline">
                      {o.name}
                    </Link>
                    <span className="block text-[13px] text-brick">
                      {decorStatus(item, today).detail}
                      {item.vendor ? `. Goes back to ${item.vendor.name}` : ""}
                    </span>
                  </p>
                  <QuickAction id={o.id} step="returned" name={o.name} />
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-rule pt-5 text-[14px] text-cocoa">
          <Icon name="check" size={15} className="text-garden-ink" />
          <span className="text-garden-ink">Nothing overdue.</span>
          {s.nextReturn ? (
            <span>
              Next to go back: {s.nextReturn.name}, by {formatDate(s.nextReturn.returnBy, "weekday-medium")} (
              {relativeDays(daysBetween(today, s.nextReturn.returnBy)).toLowerCase()}).
            </span>
          ) : (
            <span>No rentals or borrowed pieces out right now.</span>
          )}
        </p>
      )}
    </Card>
  );
}

// ─── Rows ───────────────────────────────────────────────────────────────────────

function QuickAction({ id, step, name }: { id: string; step: NonNullable<ReturnType<typeof nextDecorStep>>; name: string }) {
  return (
    <form action={markDecor.bind(null, id, step)}>
      <PendingButton className={buttonClass("secondary", "sm", "whitespace-nowrap")}>
        {DECOR_STEP_LABEL[step]}
        <span className="sr-only">: {name}</span>
      </PendingButton>
    </form>
  );
}

function SourceCell({ row }: { row: Row }) {
  return (
    <>
      <span className="block">{DECOR_SOURCE_LABEL[row.source]}</span>
      {row.vendor ? (
        <Link href={`/vendors/${row.vendor.id}`} className="block text-muted underline-offset-4 hover:text-rose-ink hover:underline">
          {row.vendor.name}
        </Link>
      ) : null}
    </>
  );
}

function BudgetCell({ row }: { row: Row }) {
  return row.budgetItem ? (
    <Link href={`/budget/items/${row.budgetItem.id}`} className="underline-offset-4 hover:text-rose-ink hover:underline">
      {row.budgetItem.description}
      <span className="block text-muted">{row.budgetItem.categoryName}</span>
    </Link>
  ) : (
    <span className="text-muted">Not linked</span>
  );
}

function Name({ row }: { row: Row }) {
  return (
    <>
      <Link href={editHref(row.id)} className="font-medium text-chocolate underline-offset-4 hover:underline">
        {row.name}
      </Link>
      {row.quantity > 1 ? <span className="num ml-1.5 whitespace-nowrap text-muted">× {row.quantity}</span> : null}
      {row.isDemo ? <span className="ml-2 text-[10px] font-semibold tracking-[0.12em] text-gold-ink uppercase">Demo</span> : null}
    </>
  );
}

function Actions({ row, stacked = false }: { row: Row; stacked?: boolean }) {
  const step = nextDecorStep(row);
  return (
    <div className={stacked ? "flex flex-wrap items-center justify-between gap-x-4 gap-y-2" : "grid justify-items-end gap-2"}>
      {step ? <QuickAction id={row.id} step={step} name={row.name} /> : stacked ? <span /> : null}
      <Link href={editHref(row.id)} className="text-[13px] text-rose-ink hover:text-chocolate">
        Edit<span className="sr-only"> {row.name}</span>
      </Link>
    </div>
  );
}

/** Phones and tablets: each piece is a small stacked card. */
function StackedRows({ rows }: { rows: Row[] }) {
  return (
    <ul className="xl:hidden">
      {rows.map((r) => (
        <li key={r.id} className="grid gap-3 border-b border-rule py-5 last:border-b-0">
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 font-sans text-[15px] leading-snug">
              <Name row={r} />
            </h3>
            <span className="shrink-0 pt-0.5">
              <DecorStatusBadge status={r.status} />
            </span>
          </div>
          {r.status.detail ? <p className="-mt-1.5 text-[13px] text-muted">{r.status.detail}</p> : null}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px] sm:grid-cols-3">
            <div className="grid content-start gap-0.5">
              <dt className="label-caps text-[10px]">Source</dt>
              <dd>
                <SourceCell row={r} />
              </dd>
            </div>
            <div className="grid content-start gap-0.5">
              <dt className="label-caps text-[10px]">Budget item</dt>
              <dd>
                <BudgetCell row={r} />
              </dd>
            </div>
          </dl>
          {r.notes ? <p className="line-clamp-3 text-[13px] leading-relaxed text-cocoa">{r.notes}</p> : null}
          <Actions row={r} stacked />
        </li>
      ))}
    </ul>
  );
}

/** Wide screens: a real table. */
function TableRows({ rows, caption }: { rows: Row[]; caption: string }) {
  return (
    <table className="w-full text-[13px] max-xl:hidden">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b border-rule">
          {["Piece", "Source", "Budget item", "Status"].map((h) => (
            <th key={h} scope="col" className="label-caps py-3 pr-5 text-left font-medium">
              {h}
            </th>
          ))}
          <th scope="col" className="py-3 text-right">
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-rule align-top last:border-b-0">
            <td className="w-[30%] py-4 pr-5">
              <span className="text-[14px]">
                <Name row={r} />
              </span>
              {r.notes ? <p className="mt-1 line-clamp-2 leading-relaxed text-muted">{r.notes}</p> : null}
            </td>
            <td className="w-[17%] py-4 pr-5">
              <SourceCell row={r} />
            </td>
            <td className="w-[19%] py-4 pr-5">
              <BudgetCell row={r} />
            </td>
            <td className="py-4 pr-5">
              <DecorStatusBadge status={r.status} />
              {r.status.detail ? <p className="mt-1 text-muted">{r.status.detail}</p> : null}
            </td>
            <td className="py-3.5 text-right">
              <Actions row={r} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Everything that has to reach the venue, grouped by area, with a derived summary on top. */
export function DecorView({ items, today }: { items: DecorRow[]; today: CalendarDate }) {
  if (items.length === 0) {
    return (
      <EmptyState icon="design" title="Every piece, in its" word="place">
        <p>
          Candleholders, chargers, linens, the welcome sign: list each piece that has to reach the venue, where it comes
          from, and when it arrives. Rentals and borrowed pieces get a return date.
        </p>
        <div>
          <Link href={newDecorHref(null)} className={buttonClass("primary")}>
            Add the first piece
          </Link>
        </div>
      </EmptyState>
    );
  }

  const rows: Row[] = items.map((i) => ({ ...i, status: decorStatus(i, today) }));
  const groups = groupByArea(rows, AREAS);

  return (
    <div className="grid gap-8 sm:gap-10">
      <Summary items={items} today={today} />
      {groups.map((g) => {
        const label = DESIGN_AREA_LABEL[g.area];
        return (
          <Card key={g.area} as="section" aria-labelledby={`decor-${g.area}`} className="px-5 pt-5 pb-2 sm:px-8 sm:pt-6">
            <div className="flex items-baseline justify-between gap-4 border-b border-rule pb-3 xl:border-b-0 xl:pb-0">
              <h2 id={`decor-${g.area}`} className="text-[28px] leading-tight italic sm:text-[30px]">
                {label}
              </h2>
              <div className="flex shrink-0 items-baseline gap-4">
                <span className="num label-caps text-[10px]">
                  {g.items.length} {g.items.length === 1 ? "piece" : "pieces"}
                </span>
                <Link href={newDecorHref(g.area)} className="text-[13px] text-rose-ink hover:text-chocolate">
                  Add<span className="sr-only"> to {label}</span>
                </Link>
              </div>
            </div>
            <StackedRows rows={g.items} />
            <TableRows rows={g.items} caption={`${label}: décor and rentals`} />
          </Card>
        );
      })}
    </div>
  );
}
