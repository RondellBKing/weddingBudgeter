"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { EveryoneChecklist } from "@/components/guests/EveryoneChecklist";
import { RsvpBadge, Tag } from "@/components/guests/bits";
import { buttonClass } from "@/components/ui/Button";
import { Card, CardHeading } from "@/components/ui/Card";
import type { PreviewData, PreviewRow } from "@/app/(app)/guests/import/actions";
import { OWNED_FIELD_LABEL, type FieldChange, type MatchedBy } from "@/lib/domain/guest-import";
import { coupleOnList, isComing, listAfterImport, partyOnList, projectImpact } from "@/lib/domain/guests";
import { GUEST_SIDE_LABEL, RELATIONSHIP_LABEL, RSVP_LABEL } from "@/lib/labels";
import { ImpactCompare } from "./parts";

const MATCHED_BY: Record<MatchedBy, string> = {
  id: "Matched by RSVP app ID",
  "name-household": "Matched by name and household",
  name: "Matched by name",
  couple: "Matched to one of the two of you",
};

function show(change: FieldChange, v: string | null): string {
  if (v === null || v === "") return "none";
  if (change.field === "rsvpStatus") return RSVP_LABEL[v as keyof typeof RSVP_LABEL] ?? v;
  return v;
}

function Warnings({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-1.5 grid gap-1 text-[12.5px] leading-snug text-gold-ink">
      {items.map((w) => (
        <li key={w} className="flex gap-2">
          <span aria-hidden className="mt-[0.45em] size-1.5 shrink-0 rounded-full bg-gold" />
          <span>{w}</span>
        </li>
      ))}
    </ul>
  );
}

function Section({ id, title, count, note, children, action }: { id: string; title: string; count: number; note?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <Card className="grid content-start gap-3 p-6 sm:p-7" aria-labelledby={id}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 id={id} className="text-[24px] leading-tight">
          {title} <span className="num font-sans text-[15px] text-muted">({count})</span>
        </h3>
        {action}
      </div>
      {note ? <p className="text-[13px] leading-relaxed text-muted">{note}</p> : null}
      {children}
    </Card>
  );
}

function RowCheck({ row, checked, onToggle, children }: { row: PreviewRow; checked: boolean; onToggle: () => void; children: ReactNode }) {
  const id = `row-${row.rowNumber}`;
  return (
    <li className="flex gap-3 border-b border-rule py-3 last:border-b-0">
      <input id={id} type="checkbox" checked={checked} onChange={onToggle} className="mt-1 size-4 shrink-0 accent-desert-rose" />
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block cursor-pointer">
          {children}
        </label>
        <Warnings items={row.warnings} />
      </div>
    </li>
  );
}

export function ReviewStep({
  preview,
  accepted,
  onAccept,
  onBack,
  onCommit,
  pending,
  error,
}: {
  preview: PreviewData;
  accepted: ReadonlySet<number>;
  onAccept: (next: Set<number>) => void;
  onBack: () => void;
  onCommit: () => void;
  pending: boolean;
  error: string | null;
}) {
  const { diff, basis, existing } = preview;
  const rows = diff.rows;
  const newRows = rows.filter((r) => r.kind === "new");
  const changed = rows.filter((r) => r.kind === "changed");
  const unchanged = rows.filter((r) => r.kind === "unchanged");
  const problems = rows.filter((r) => r.kind === "problem");
  const selectable = [...newRows, ...changed].map((r) => r.rowNumber);
  const selected = selectable.filter((n) => accepted.has(n)).length;

  const toggle = (n: number) => {
    const next = new Set(accepted);
    if (next.has(n)) next.delete(n);
    else next.add(n);
    onAccept(next);
  };
  const setMany = (list: number[], on: boolean) => {
    const next = new Set(accepted);
    for (const n of list) {
      if (on) next.add(n);
      else next.delete(n);
    }
    onAccept(next);
  };

  const { before, after, couple, party } = useMemo(() => {
    const list = listAfterImport(existing, rows, accepted);
    const comingNow = existing.filter((g) => isComing(g.rsvpStatus)).length;
    return {
      before: projectImpact(basis, comingNow, existing.length > 0),
      after: projectImpact(basis, list.filter((g) => isComing(g.rsvpStatus)).length, list.length > 0),
      couple: coupleOnList(preview.partners, list),
      party: partyOnList(preview.party, list),
    };
  }, [existing, rows, accepted, basis, preview.partners, preview.party]);

  const summary: Array<[string, number, string]> = [
    ["New", newRows.length, "to add"],
    ["Changed", changed.length, "to update"],
    ["Unchanged", unchanged.length, "already match"],
    ["Not in file", diff.counts.missing, "kept as they are"],
    ["Problems", problems.length, "skipped"],
  ];

  const applyBar = (
    <div className="flex flex-wrap items-center gap-3">
      {selectable.length === 0 ? (
        <Link href="/guests" className={buttonClass("primary")}>
          Back to the guest list
        </Link>
      ) : (
        <button type="button" onClick={onCommit} disabled={pending || selected === 0} className={buttonClass("primary")}>
          {pending ? "Saving…" : selected === 0 ? "Nothing selected" : `Apply ${selected} ${selected === 1 ? "change" : "changes"}`}
        </button>
      )}
      <button type="button" onClick={onBack} className={buttonClass("secondary")}>
        Back to columns
      </button>
    </div>
  );

  const selectAll = (list: PreviewRow[]) =>
    list.length > 1 ? (
      <span className="flex gap-3 text-[13px]">
        <button type="button" className="text-rose-ink hover:text-chocolate" onClick={() => setMany(list.map((r) => r.rowNumber), true)}>
          Select all
        </button>
        <button type="button" className="text-rose-ink hover:text-chocolate" onClick={() => setMany(list.map((r) => r.rowNumber), false)}>
          Select none
        </button>
      </span>
    ) : undefined;

  return (
    <div className="grid gap-5">
      <Card className="grid gap-6 p-6 sm:p-8" aria-labelledby="review-h">
        <div className="grid gap-2">
          <h2 id="review-h" className="text-[30px] leading-tight">
            Review the <em className="italic">changes</em>
          </h2>
          <p className="max-w-2xl text-[15px] leading-relaxed text-cocoa">
            Nothing has been saved yet. New guests and changes are selected; untick anything you don&apos;t want. Guests
            missing from the file are never removed.
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-rule bg-rule sm:grid-cols-5">
          {summary.map(([label, n, sub]) => (
            <div
              key={label}
              className={`grid gap-1 px-4 py-4 max-sm:last:col-span-2 ${label === "Problems" && n > 0 ? "bg-brick-wash" : "bg-paper"}`}
            >
              <dt className="label-caps text-[10px]">{label}</dt>
              <dd className={`num font-display text-[34px] leading-none ${label === "Problems" && n > 0 ? "text-brick" : ""}`}>{n}</dd>
              <dd className="text-[12px] text-muted">{sub}</dd>
            </div>
          ))}
        </dl>

        <div className="grid gap-3">
          <CardHeading title="What this does to the headcount" />
          <ImpactCompare before={before} after={after} />
        </div>

        <div className="grid gap-4 border-t border-rule pt-5">
          <CardHeading title="Is everyone eating on the list?" />
          <EveryoneChecklist
            couple={couple}
            party={party}
            vendorMeals={basis.vendorMeals}
            vendorMealsCount
            compact={false}
          />
        </div>

        {diff.ignoredDemo > 0 ? (
          <p className="text-[13px] text-gold-ink">
            {diff.ignoredDemo} demo guests are on the list. The import leaves them alone, but they still count until you
            remove them with npm run demo:wipe.
          </p>
        ) : null}

        <div className="grid gap-3 border-t border-rule pt-5">
          {error ? (
            <p role="alert" className="text-sm text-brick">
              {error}
            </p>
          ) : null}
          {selectable.length === 0 ? (
            <p className="text-[15px] text-garden-ink">Everything in this file already matches the list. There&apos;s nothing to apply.</p>
          ) : (
            <p className="num text-[13px] text-muted">
              {selected} of {selectable.length} selected
            </p>
          )}
          {applyBar}
        </div>
      </Card>

      {newRows.length > 0 ? (
        <Section id="new-h" title="New guests" count={newRows.length} action={selectAll(newRows)}>
          <ul>
            {newRows.map((r) => (
              <RowCheck key={r.rowNumber} row={r} checked={accepted.has(r.rowNumber)} onToggle={() => toggle(r.rowNumber)}>
                <span className="grid gap-1 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_auto] sm:items-baseline sm:gap-4">
                  <span className="min-w-0">
                    <span className="block text-[15px]">{r.fullName}</span>
                    <span className="block text-[12px] text-muted">
                      {r.householdName} · <span className="num">row {r.rowNumber}</span>
                    </span>
                  </span>
                  <span className="min-w-0 text-[13px] text-cocoa">
                    {r.after.side === "BOTH" ? "Both sides" : GUEST_SIDE_LABEL[r.after.side]} · {RELATIONSHIP_LABEL[r.after.relationship]}
                    {r.after.mealChoice ? ` · ${r.after.mealChoice}` : ""}
                    {r.after.dietaryNotes ? <span className="block text-muted">{r.after.dietaryNotes}</span> : null}
                  </span>
                  <span className="sm:justify-self-end">
                    <RsvpBadge status={r.after.rsvpStatus} />
                  </span>
                </span>
              </RowCheck>
            ))}
          </ul>
        </Section>
      ) : null}

      {changed.length > 0 ? (
        <Section
          id="changed-h"
          title="Changes"
          count={changed.length}
          note="Only the name, household, RSVP, meal and dietary notes come from the RSVP app. Side, relationship, notes, plus-ones and seats stay as they are."
          action={selectAll(changed)}
        >
          <ul>
            {changed.map((r) => (
              <RowCheck key={r.rowNumber} row={r} checked={accepted.has(r.rowNumber)} onToggle={() => toggle(r.rowNumber)}>
                <span className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] sm:gap-4">
                  <span className="min-w-0">
                    <span className="block text-[15px]">{r.fullName}</span>
                    <span className="block text-[12px] text-muted">
                      {r.matchedBy ? MATCHED_BY[r.matchedBy] : ""} · <span className="num">row {r.rowNumber}</span>
                    </span>
                  </span>
                  <span className="grid gap-1">
                    {r.changes.map((c) => (
                      <span key={c.field} className="grid items-baseline gap-x-2 text-[13px] sm:grid-cols-[6.5rem_minmax(0,1fr)]">
                        <span className="label-caps text-[10px]">{OWNED_FIELD_LABEL[c.field]}</span>
                        <span className="min-w-0 break-words">
                          <del className="text-muted decoration-rule-strong">{show(c, c.before)}</del>
                          <span aria-hidden className="mx-1.5 text-gold-ink">→</span>
                          <span className="sr-only"> becomes </span>
                          <ins className="text-chocolate no-underline">{show(c, c.after)}</ins>
                        </span>
                      </span>
                    ))}
                  </span>
                </span>
              </RowCheck>
            ))}
          </ul>
        </Section>
      ) : null}

      {problems.length > 0 ? (
        <Section id="problems-h" title="Problems" count={problems.length} note="These rows are skipped. Fix them in the RSVP app and import again.">
          <ul>
            {problems.map((r) => (
              <li key={r.rowNumber} className="grid gap-0.5 border-b border-rule py-3 last:border-b-0 sm:grid-cols-[5rem_minmax(0,1fr)_minmax(0,1.4fr)] sm:gap-4">
                <span className="num text-[13px] text-muted">Row {r.rowNumber}</span>
                <span className={r.fullName ? "text-[15px]" : "text-[15px] text-muted italic"}>{r.fullName || "No name"}</span>
                <span className="text-[13px] text-brick">{r.problems.join(" ")}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {diff.missing.length > 0 ? (
        <Section
          id="missing-h"
          title="On the list, not in this file"
          count={diff.missing.length}
          note="Nobody is removed by an import. If someone is no longer invited, remove them from the guest list yourself. Guests you added here (like the two of you) usually aren't in the RSVP app's export."
        >
          <ul className="grid sm:grid-cols-2 sm:gap-x-8">
            {diff.missing.map((m) => (
              <li key={m.id} className="flex items-baseline justify-between gap-3 border-b border-rule py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-[15px]">{m.fullName}</span>
                  {m.householdName !== m.fullName ? <span className="block truncate text-[12px] text-muted">{m.householdName}</span> : null}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {m.addedHere ? <Tag>Added here</Tag> : null}
                  <RsvpBadge status={m.rsvpStatus} />
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {unchanged.length > 0 ? (
        <Card className="p-6 sm:p-7">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-baseline justify-between gap-4">
              <span className="text-[24px] leading-tight font-display">
                Already up to date <span className="num font-sans text-[15px] text-muted">({unchanged.length})</span>
              </span>
              <span className="text-[13px] text-rose-ink group-open:hidden">Show</span>
              <span className="hidden text-[13px] text-rose-ink group-open:inline">Hide</span>
            </summary>
            <ul className="mt-3 grid gap-x-8 text-[14px] text-cocoa sm:grid-cols-2 lg:grid-cols-3">
              {unchanged.map((r) => (
                <li key={r.rowNumber} className="truncate border-b border-rule py-2">
                  {r.fullName} <span className="text-[12px] text-muted">· {r.householdName}</span>
                </li>
              ))}
            </ul>
          </details>
        </Card>
      ) : null}

      {selectable.length > 3 ? <div className="pt-1">{applyBar}</div> : null}
    </div>
  );
}
