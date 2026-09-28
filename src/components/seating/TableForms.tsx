"use client";

import { useActionState, useId, useState } from "react";
import { addNumberedTables, createTable, deleteTable, updateTable } from "@/app/(app)/seating/actions";
import { ConfirmButton } from "@/components/form/ConfirmButton";
import { Field, inputClass } from "@/components/form/Fields";
import { SubmitButton } from "@/components/form/SubmitButton";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { DEFAULT_CAPACITY, MAX_CAPACITY, nextTableNumber, suggestLabel, type SeatTable, type TableShape } from "@/lib/domain/seating";
import { idleState, type ActionState } from "@/lib/forms";
import { TABLE_SHAPE_LABEL, optionsFrom } from "@/lib/labels";

// Adding, editing and deleting tables. Each form posts to a Server Action; the page re-renders
// from the database afterwards.

const SHAPES = optionsFrom(TABLE_SHAPE_LABEL);

const SHAPE_HINT: Record<TableShape, string> = {
  ROUND: "Round tables usually seat 8 to 10.",
  RECTANGLE: "Long tables seat guests on both sides.",
  SWEETHEART: "A small table for the two of you.",
  HEAD_TABLE: "The two of you and the 14 attendants, along one side.",
};

export const selectStyle = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%235C4033' stroke-width='1.4'/%3E%3C/svg%3E\")",
};
export const selectClass = `${inputClass} appearance-none bg-[length:12px] bg-[right_0.9rem_center] bg-no-repeat pr-9`;

function Message({ state }: { state: ActionState }) {
  return (
    <p role="status" aria-live="polite" className={`min-h-5 text-[13px] ${state.ok ? "text-garden-ink" : "text-brick"}`}>
      {state.message}
    </p>
  );
}

/** Label, shape and seats. The shape suggests a label and a size until either is typed over. */
function TableFields({
  idPrefix,
  labels,
  initial,
  errors = {},
}: {
  idPrefix: string;
  labels: string[];
  initial?: { label: string; shape: TableShape; capacity: number };
  errors?: Record<string, string>;
}) {
  const [shape, setShape] = useState<TableShape>(initial?.shape ?? "ROUND");
  const [label, setLabel] = useState<string | null>(initial?.label ?? null);
  const [capacity, setCapacity] = useState<string | null>(initial ? String(initial.capacity) : null);
  // Unique per form: the board and the phone list can both have one open.
  const uid = useId().replace(/[^a-z0-9]/gi, "");
  const id = (name: string) => `${idPrefix}-${uid}-${name}`;
  const described = (name: string, hint = false) => (errors[name] ? `${id(name)}-error` : hint ? `${id(name)}-hint` : undefined);

  return (
    <div className="@container">
      <div className="grid gap-4 @sm:grid-cols-[minmax(0,1fr)_6.5rem] @2xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_7rem]">
        <Field id={id("label")} label="Name" error={errors.label} className="@sm:col-span-2 @2xl:col-span-1">
          <input
            id={id("label")}
            name="label"
            value={label ?? suggestLabel(labels, shape)}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={40}
            required
            autoComplete="off"
            aria-invalid={errors.label ? true : undefined}
            aria-describedby={described("label")}
            className={inputClass}
          />
        </Field>
        <Field id={id("shape")} label="Shape" error={errors.shape}>
          <select
            id={id("shape")}
            name="shape"
            value={shape}
            onChange={(e) => setShape(e.target.value as TableShape)}
            aria-invalid={errors.shape ? true : undefined}
            aria-describedby={described("shape")}
            className={selectClass}
            style={selectStyle}
          >
            {SHAPES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id={id("capacity")} label="Seats" error={errors.capacity}>
          <input
            id={id("capacity")}
            name="capacity"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_CAPACITY}
            required
            value={capacity ?? String(DEFAULT_CAPACITY[shape])}
            onChange={(e) => setCapacity(e.target.value)}
            aria-invalid={errors.capacity ? true : undefined}
            aria-describedby={described("capacity")}
            className={`${inputClass} num`}
          />
        </Field>
        <p className="text-[13px] text-muted @sm:col-span-2 @2xl:col-span-3">{SHAPE_HINT[shape]}</p>
      </div>
    </div>
  );
}

/** The "add a table" form, plus the quick "10 round tables of 10" helper. */
export function AddTables({
  tables,
  onDone,
  batch: withBatch = true,
}: {
  tables: SeatTable[];
  onDone?: () => void;
  /** Also offer "Add 10 round tables of 10". */
  batch?: boolean;
}) {
  const labels = tables.map((t) => t.label);
  const [state, action] = useActionState(createTable, idleState);
  const [batch, batchAction] = useActionState(addNumberedTables, idleState);
  // Remount the fields after each table is added, so the next suggestion shows.
  const fieldsKey = labels.join("|");

  return (
    <div className="grid gap-6">
      <form action={action} className="grid gap-4" aria-label="Add a table">
        <TableFields key={fieldsKey} idPrefix="add-table" labels={labels} errors={state.errors} />
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton size="sm" pendingLabel="Adding…">
            Add table
          </SubmitButton>
          {onDone ? (
            <button type="button" onClick={onDone} className={buttonClass("secondary", "sm")}>
              Done
            </button>
          ) : null}
          <Message state={state} />
        </div>
      </form>
      {withBatch ? (
        <form action={batchAction} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-rule pt-5">
          <input type="hidden" name="count" value="10" />
          <input type="hidden" name="capacity" value="10" />
          <SubmitButton variant="secondary" size="sm" pendingLabel="Adding…">
            Add 10 round tables of 10
          </SubmitButton>
          <span className="text-[13px] text-muted">
            Numbered from Table {nextTableNumber(labels)}. Rename any of them later.
          </span>
          <Message state={batch} />
        </form>
      ) : null}
    </div>
  );
}

/** One-click starters for an empty chart. */
export function QuickStart({ tables }: { tables: SeatTable[] }) {
  const labels = tables.map((t) => t.label);
  const [batch, batchAction] = useActionState(addNumberedTables, idleState);
  const [single, singleAction] = useActionState(createTable, idleState);
  const state = single.message ? single : batch;
  return (
    <div className="grid justify-items-center gap-3">
      <form action={batchAction}>
        <input type="hidden" name="count" value="10" />
        <input type="hidden" name="capacity" value="10" />
        <SubmitButton size="sm" pendingLabel="Adding…">
          Add 10 round tables of 10
        </SubmitButton>
      </form>
      <p className="text-[13px] text-muted">or start with the couple&apos;s table</p>
      <div className="flex flex-wrap justify-center gap-3">
        <form action={singleAction}>
          <input type="hidden" name="label" value={suggestLabel(labels, "HEAD_TABLE")} />
          <input type="hidden" name="shape" value="HEAD_TABLE" />
          <input type="hidden" name="capacity" value={DEFAULT_CAPACITY.HEAD_TABLE} />
          <SubmitButton variant="secondary" size="sm" pendingLabel="Adding…">
            Head table for {DEFAULT_CAPACITY.HEAD_TABLE}
          </SubmitButton>
        </form>
        <form action={singleAction}>
          <input type="hidden" name="label" value={suggestLabel(labels, "SWEETHEART")} />
          <input type="hidden" name="shape" value="SWEETHEART" />
          <input type="hidden" name="capacity" value={DEFAULT_CAPACITY.SWEETHEART} />
          <SubmitButton variant="secondary" size="sm" pendingLabel="Adding…">
            Sweetheart table for two
          </SubmitButton>
        </form>
      </div>
      <Message state={state} />
    </div>
  );
}

/** Edit a table in place: name, shape, seats, or delete it. */
export function TableEditor({
  table,
  tables,
  seated,
  onDone,
}: {
  table: SeatTable;
  tables: SeatTable[];
  seated: number;
  onDone: () => void;
}) {
  const [state, action] = useActionState(async (prev: ActionState, form: FormData) => {
    const result = await updateTable(prev, form);
    if (result.ok) onDone();
    return result;
  }, idleState);
  const others = tables.filter((t) => t.id !== table.id).map((t) => t.label);
  const question =
    seated === 0
      ? `Delete ${table.label}?`
      : `Delete ${table.label}? ${seated === 1 ? "Its 1 guest goes" : `Its ${seated} guests go`} back to the unassigned list.`;

  return (
    <div className="grid gap-4">
      <form action={action} className="grid gap-4" aria-label={`Edit ${table.label}`}>
        <input type="hidden" name="id" value={table.id} />
        <TableFields
          idPrefix={`edit-${table.id}`}
          labels={others}
          initial={{ label: table.label, shape: table.shape, capacity: table.capacity }}
          errors={state.errors}
        />
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton size="sm">Save</SubmitButton>
          <button type="button" onClick={onDone} className={buttonClass("secondary", "sm")}>
            Cancel
          </button>
          <Message state={state} />
        </div>
      </form>
      <div className="border-t border-rule pt-4">
        <ConfirmButton action={deleteTable.bind(null, table.id)} question={question} confirmLabel="Yes, delete">
          Delete table
        </ConfirmButton>
      </div>
    </div>
  );
}

/** An empty chart: quick starts, or one table at a time. */
export function FirstTables({ tables }: { tables: SeatTable[] }) {
  return (
    <div className="grid gap-5">
      <EmptyState icon="seating" title="No tables" word="yet">
        <p>
          Start with the usual setup and adjust from there. Every table can be renamed, resized or
          removed later, and guests go back to the unassigned list if their table is deleted.
        </p>
        <div className="pt-2">
          <QuickStart tables={tables} />
        </div>
      </EmptyState>
      <Card className="grid gap-5 p-6 sm:p-7" aria-labelledby="first-table-h">
        <h2 id="first-table-h" className="text-[26px] leading-tight">
          Or add one <em className="italic">table</em>
        </h2>
        <AddTables tables={tables} batch={false} />
      </Card>
    </div>
  );
}
